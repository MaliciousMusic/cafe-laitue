// Le café en motion design : chaque boisson apparaît en vue éclatée (ses ingrédients légendés),
// puis se prépare étape par étape : mouture, tassage, extraction sous la machine, lait versé
// au pichet. Pour les cafés au lait, la caméra bascule au-dessus de la tasse et Vincent verse
// un latte art tiré au hasard (cœur, cygne, tulipe ou rosette).
// viewBox de la scène : 0 0 360 300.

import { s, g, svgRoot, uid, rng, f2 } from '../lib/svg.js';
import { anim, EASE, isReduced, settle } from '../lib/motion.js';
import { FONT_DISPLAY, FONT_HAND, BRAND, brandFontsReady } from './stamp.js';
import { DRINKS } from '../data/drinks.js';
import { createLatteArt, buildArt, ART_STYLES } from './latteart.js';
import { createCharacter } from './character.js';
import { channel } from '../lib/sound.js';
import { K, VESSELS, P, lerp, easeInOut, hw, sliceD, vesselBack, vesselFront, strawEl } from './glass.js';

const FONT_UI = '"Bricolage Grotesque", system-ui, sans-serif';
const FONT_CHALK = '"Caveat", "Segoe Print", cursive';
const GAP = 24;
const BASE_Y = 246;
const TOP_LIMIT = 58;
const X_EXPLODED = 112;
const X_ASSEMBLED = 180;
const LABEL_X = 206;
const INK = '#365846';

const LAYER = {
  espresso: ['#4A2616', '#B97842'],
  ristretto: ['#3E1F12', '#A86A38'],
  crema: ['#B97842', '#D5A066'],
  milk: ['#EADAC1', '#F4EADA'],
  milkCold: ['#E4DBC8', '#F7F2E8'],
  foam: ['#FAF5EB', '#FFFDF7'],
  matcha: ['#7EA64E', '#99C166'],
  chai: ['#B7793F', '#CD9459'],
};
const SURFACE = { coffee: ['#DBA66B', '#A5672F'], matcha: ['#A2C563', '#6F9A40'], chai: ['#D8A96F', '#A06A36'] };

// Ce qui coule dans la tasse : étape du procédé, ustensile, couleur du filet, durée
const POUR = {
  espresso: { step: 'extract', tool: 'pf', color: '#5A2E18', ms: 1300 },
  ristretto: { step: 'extract', tool: 'pf', color: '#4A2414', ms: 1100 },
  crema: { step: 'extract', tool: 'pf', color: '#B97842', ms: 420 },
  milk: { step: 'milk', tool: 'pitcher', color: '#F1E6D3', ms: 1100 },
  milkCold: { step: 'milk', tool: 'pitcher', color: '#F6F1E8', ms: 1100 },
  foam: { step: 'milk', tool: 'pitcher', color: '#FFFDF7', ms: 620 },
  matcha: { step: 'matcha', tool: 'jug', color: '#8DB45A', ms: 1000 },
  chai: { step: 'infuse', tool: 'jug', color: '#C58A4F', ms: 1000 },
};
const ART_NAME = { heart: 'un cœur', swan: 'un cygne', tulip: 'une tulipe', rosetta: 'une rosette' };

const pause = (ms) => new Promise((r) => setTimeout(r, isReduced() ? 0 : ms));

// ---------------------------------------------------------------- géométrie de la tasse
function layerEl(v, y0, y1, k) {
  const [side, top] = LAYER[k];
  const w1 = hw(v, y1);
  const topEl = s('ellipse', { cx: 0, cy: -y1, rx: w1, ry: w1 * K, fill: top, class: 'dk-top' });
  const G = g({ class: 'dk-layer' }, [s('path', { d: sliceD(v, y0, y1), fill: side }), topEl]);
  if (k === 'foam') {
    const r = rng(y1);
    for (let i = 0; i < 7; i++) {
      G.append(s('circle', { cx: f2((r() - 0.5) * w1 * 1.4), cy: f2(-y1 + (r() - 0.5) * w1 * K), r: f2(0.8 + r() * 1.2), fill: '#EDE3D2' }));
    }
  }
  if (k === 'crema') {
    G.append(s('path', { d: `M${P(-w1 * 0.5, -y1)}Q${P(0, -y1 - w1 * K * 0.6)} ${P(w1 * 0.5, -y1)}`, fill: 'none', stroke: '#E6B77E', 'stroke-width': 1.4, opacity: 0.8 }));
  }
  return G;
}

function handleEl(v) {
  const y1 = v.h * 0.8;
  const y2 = v.h * 0.26;
  const x1 = hw(v, y1) + 3;
  const x2 = hw(v, y2) + 3;
  const d = `M${P(x1, -y1)}C${P(x1 + 28, -y1 - 2)} ${P(x2 + 26, -y2 + 6)} ${P(x2, -y2)}`;
  return g({ class: 'dk-handle' }, [
    s('path', { d, fill: 'none', stroke: BRAND.forest, 'stroke-width': 9, 'stroke-linecap': 'round' }),
    s('path', { d, fill: 'none', stroke: '#F6F0E0', 'stroke-width': 4.4, 'stroke-linecap': 'round' }),
  ]);
}

function saucerEl(v) {
  const r = v.saucer;
  return g({ class: 'dk-saucer' }, [
    s('ellipse', { cx: 0, cy: 11, rx: r, ry: r * K, fill: '#D8CDB2', stroke: BRAND.forest, 'stroke-width': 2 }),
    s('ellipse', { cx: 0, cy: 6, rx: r, ry: r * K, fill: '#F3ECDB', stroke: BRAND.forest, 'stroke-width': 2 }),
    s('ellipse', { cx: 0, cy: 6, rx: r * 0.56, ry: r * 0.56 * K, fill: 'none', stroke: '#849E83', 'stroke-width': 1.3 }),
  ]);
}

function iceCubes(v, yMin, yMax, seed = 3) {
  const r = rng(seed);
  const G = g({ class: 'dk-ice' });
  const n = 6;
  for (let i = 0; i < n; i++) {
    const y = yMin + ((yMax - yMin) * (i + 0.5)) / n + (r() - 0.5) * 8;
    const w = hw(v, y) - 14;
    const x = (i % 2 ? 1 : -1) * (r() * w * 0.7);
    const sz = 15 + r() * 5;
    G.append(g({ transform: `translate(${f2(x)} ${f2(-y)}) rotate(${f2((r() - 0.5) * 40)})` }, [
      s('rect', { x: -sz / 2, y: -sz / 2, width: sz, height: sz, rx: 3.5, fill: 'rgba(196,226,240,.78)', stroke: '#5F8FA6', 'stroke-width': 1.2 }),
      s('path', { d: `M${-sz / 2 + 3} ${-sz / 2 + 4}h${sz * 0.45}M${-sz / 2 + 3} ${-sz / 2 + 4}v${sz * 0.3}`, stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.95 }),
    ]));
  }
  return G;
}

function steamEl(v) {
  const G = g({ class: 'dk-steam', opacity: 0 });
  [-11, 1, 13].forEach((x, i) => {
    const y0 = -v.h - 10 - hw(v, v.h) * K;
    G.append(s('path', {
      d: `M${x} ${y0}C${x - 8} ${y0 - 10} ${x + 8} ${y0 - 18} ${x} ${y0 - 28}C${x - 7} ${y0 - 36} ${x + 6} ${y0 - 42} ${x} ${y0 - 52}`,
      fill: 'none', stroke: '#B3AC9D', 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.6, class: `dk-steam-${i}`,
    }));
  });
  return G;
}

/** Disque de surface (crème, matcha, chai) + latte art posé sur l'ellipse du haut. */
function artGarnish(v, topY, style, surface = 'coffee', cinnamon = false) {
  const w = hw(v, topY);
  const gid = uid('crema');
  const [c0, c1] = SURFACE[surface] || SURFACE.coffee;
  const G = g({ class: 'dk-garnish dk-art' }, [
    s('defs', {}, s('radialGradient', { id: gid, cx: 0.5, cy: 0.5, r: 0.55 }, [
      s('stop', { offset: 0, 'stop-color': c0 }),
      s('stop', { offset: 1, 'stop-color': c1 }),
    ])),
    s('ellipse', { cx: 0, cy: -topY, rx: w, ry: w * K, fill: `url(#${gid})` }),
  ]);
  const motif = g({ transform: `translate(0 ${f2(-topY)}) scale(${f2(w / 64)} ${f2((w * K) / 64)})` }, buildArt(style, surface));
  G.append(motif);
  if (cinnamon) {
    const r = rng(9);
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2;
      const rr = Math.sqrt(r()) * 0.8;
      G.append(s('circle', { cx: f2(Math.cos(a) * w * rr), cy: f2(-topY + Math.sin(a) * w * K * rr), r: 0.9, fill: '#8A4B22', opacity: 0.7 }));
    }
  }
  return { g: G, setStyle: (st) => motif.replaceChildren(buildArt(st, surface)) };
}

// ---------------------------------------------------------------- ustensiles du procédé
// Chacun a son bec en (0,0) (repère du contenant une fois placé).
function portafilterEl() {
  const head = g({ class: 'dk-group' }, [
    s('rect', { x: -32, y: -44, width: 64, height: 18, rx: 3, fill: '#2C3438' }),
    s('rect', { x: -24, y: -27, width: 48, height: 4, fill: '#8E9AA2' }),
  ]);
  const basket = g({ class: 'dk-pf' }, [
    s('path', { d: 'M-24 -24H24L20 -8H-20Z', fill: '#D7DDE0', stroke: '#6E7A80', 'stroke-width': 1.4, 'stroke-linejoin': 'round' }),
    s('rect', { x: 22, y: -22, width: 48, height: 8, rx: 4, fill: '#1F1F1F' }),
    s('path', { d: 'M-7 -8V-1M7 -8V-1', stroke: '#6E7A80', 'stroke-width': 3.4, 'stroke-linecap': 'round' }),
  ]);
  const tamper = g({ class: 'dk-tamper', opacity: 0 }, [
    s('rect', { x: -19, y: -40, width: 38, height: 9, rx: 2, fill: '#9AA4A9', stroke: '#6E7A80', 'stroke-width': 1.2 }),
    s('path', { d: 'M-6 -40C-6 -52 6 -52 6 -40Z', fill: '#5A3A24' }),
    s('ellipse', { cx: 0, cy: -55, rx: 8, ry: 7, fill: '#6B4A2E' }),
  ]);
  return { g: g({ class: 'dk-espresso' }, [head, basket, tamper]), head, basket, tamper };
}

function pitcherEl(fill, stroke) {
  return g({ class: 'dk-pitcher' }, [
    s('path', { d: 'M0 0Q3 -3 7 -4L9 -30H40L42 6Q42 12 36 12H13Q8 12 8 6Z', fill, stroke, 'stroke-width': 1.4, 'stroke-linejoin': 'round' }),
    s('path', { d: 'M42 -22C56 -22 56 2 42 2', fill: 'none', stroke, 'stroke-width': 4, 'stroke-linecap': 'round' }),
    s('path', { d: 'M14 -26V6', stroke: '#fff', 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.6 }),
  ]);
}

function beanEl() {
  return g({}, [
    s('ellipse', { cx: 0, cy: 0, rx: 3.4, ry: 4.6, fill: '#5A3420' }),
    s('path', { d: 'M-0.6 -3.6C1.4 -1 -1.6 1 0.6 3.6', fill: 'none', stroke: '#C9955E', 'stroke-width': 0.9 }),
  ]);
}

// ---------------------------------------------------------------- construction des boissons
function buildCup(def, iced, style) {
  const variant = iced && def.icedVersion ? { ...def, ...def.icedVersion } : def;
  const v = VESSELS[variant.vessel];
  const root = g({ class: 'dk-drink' });
  const parts = [];
  const add = (el, off, label, anchor, kind, extra = {}) => {
    parts.push({ els: [].concat(el), off, label, anchor, kind, ...extra });
  };
  if (v.saucer) {
    const sc = saucerEl(v);
    root.append(sc);
    add(sc, { x: 0, y: 34 }, { name: 'Soucoupe', sub: 'porcelaine' }, { x: v.saucer * 0.7, y: 8 }, 'saucer');
  }
  const back = vesselBack(v);
  root.append(back);
  const layersG = g({ class: 'dk-layers' });
  root.append(layersG);
  let y = 0;
  const n = variant.layers.length;
  variant.layers.forEach((L, i) => {
    const el = layerEl(v, y, y + L.h, L.k);
    layersG.append(el);
    const mid = y + L.h / 2;
    add(el, { x: 0, y: -(v.h + (i + 1) * GAP) }, { name: L.label, sub: L.sub }, { x: hw(v, mid) + 2, y: -mid }, 'layer', { top: y + L.h + hw(v, y + L.h) * K, lk: L.k, y0: y, y1: y + L.h });
    y += L.h;
  });
  if (variant.ice) {
    const ice = iceCubes(v, 16, Math.min(y, v.h - 30), 5);
    layersG.append(ice);
    const cubes = [...ice.children];
    const ye = -(v.h + (n + 1) * GAP + 8);
    cubes.forEach((c, i) => {
      const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(c.getAttribute('transform'));
      const xa = Number(m[1]);
      const ya = Number(m[2]);
      const wrap = g({ class: 'dk-cube' });
      ice.replaceChild(wrap, c);
      wrap.append(c);
      const last = i === cubes.length - 1;
      add(wrap, { x: -46 + i * 18.5 - xa, y: ye - ya }, last ? { name: variant.ice.label, sub: variant.ice.sub } : null, last ? { x: xa + 10, y: ya } : null, 'ice', { top: -ya + 12 });
    });
  }
  const topY = y;
  // Les filets passent derrière la paroi avant : ils entrent dans la tasse
  const streams = g({ class: 'dk-streams' });
  root.append(streams);
  const front = vesselFront(v);
  root.append(front);
  const vesselLabel = v.ceramic
    ? { name: variant.vessel === 'demitasse' ? 'Tasse à expresso' : 'Tasse', sub: 'vue en coupe' }
    : { name: 'Verre', sub: variant.vessel === 'tall' ? 'grand format' : 'vue en coupe' };
  parts.push({ els: [back, front], off: { x: 0, y: 12 }, label: vesselLabel, anchor: { x: hw(v, v.h * 0.35) + 4, y: -v.h * 0.35 }, kind: 'vessel', vessel: true });
  if (v.handle) {
    const h = handleEl(v);
    root.insertBefore(h, front.nextSibling);
    add(h, { x: 34, y: 6 }, null, null, 'handle');
  }
  let extraTop = 0;
  let art = null;
  const gdef = variant.garnish;
  if (gdef) {
    if (gdef.k === 'art') {
      art = artGarnish(v, topY, style, def.surface, gdef.cinnamon);
      root.append(art.g);
      add(art.g, { x: 0, y: -(v.h + (n + 1) * GAP) }, { name: gdef.label, sub: gdef.sub }, { x: hw(v, topY) * 0.6, y: -topY }, 'garnish', { top: topY + 12 });
    } else if (gdef.k === 'straw') {
      const el = strawEl(v, 36);
      root.insertBefore(el, front);
      add(el, { x: 50, y: -28 }, { name: gdef.label, sub: gdef.sub }, { x: hw(v, v.h) * 0.35 + 12, y: -v.h - 22 }, 'straw');
      extraTop = 36;
    }
  }
  const tools = g({ class: 'dk-tools' });
  root.append(tools);
  const steam = def.hot && !(iced && def.icedVersion) ? steamEl(v) : null;
  if (steam) root.append(steam);
  const height = Math.max(v.h, topY) + extraTop + 10;
  return { root, parts, steam, height, v, topY, art, streams, tools, surface: def.surface, iced: !!(iced && def.icedVersion) };
}

function buildV60(iced) {
  const root = g({ class: 'dk-drink dk-v60' });
  const parts = [];
  const carafeD = 'M-28 0C-44-6-46-44-27-60L-19-68V-76H19V-68L27-60C46-44 44-6 28 0Z';
  const clip = uid('carafe');
  const coffee = s('rect', { x: -48, y: -50, width: 96, height: 52, fill: '#5C3019', class: 'dk-coffee' });
  const carafe = g({ class: 'dk-carafe' }, [
    s('defs', {}, s('clipPath', { id: clip }, s('path', { d: carafeD }))),
    s('ellipse', { cx: 0, cy: 0, rx: 30, ry: 6, fill: 'rgba(18,67,43,.08)' }),
    g({ 'clip-path': `url(#${clip})` }, [coffee]),
    s('path', { d: carafeD, fill: 'rgba(255,255,255,.18)', stroke: BRAND.forest, 'stroke-width': 2.2 }),
    s('path', { d: 'M30-48C52-50 52-16 34-14', fill: 'none', stroke: BRAND.forest, 'stroke-width': 5, 'stroke-linecap': 'round' }),
    s('path', { d: 'M-30-40L-31-12', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.6 }),
    s('path', { d: 'M-16-20H12M-16-32H12', stroke: BRAND.forest, 'stroke-width': 0.8, opacity: 0.4 }),
  ]);
  coffee.style.transformBox = 'fill-box';
  coffee.style.transformOrigin = '50% 100%';
  root.append(carafe);
  parts.push({ els: [carafe], off: { x: 0, y: 10 }, label: { name: 'Carafe', sub: 'pour une à deux tasses' }, anchor: { x: 40, y: -30 }, kind: 'vessel', vessel: true });
  if (iced) {
    const ice = g({ class: 'dk-ice' });
    [[-12, -14], [10, -12], [-2, -28], [14, -30], [-16, -34]].forEach(([x, y], i) => ice.append(g({ transform: `translate(${x} ${y}) rotate(${i * 17})` }, [
      s('rect', { x: -7, y: -7, width: 14, height: 14, rx: 3, fill: 'rgba(196,226,240,.8)', stroke: '#5F8FA6', 'stroke-width': 1.1 }),
    ])));
    root.insertBefore(ice, carafe.nextSibling);
    parts.push({ els: [ice], off: { x: 0, y: -26 }, label: { name: 'Glaçons', sub: 'le café coule dessus' }, anchor: { x: 26, y: -24 }, kind: 'ice', step: 'ice' });
  }
  const dBack = g({ class: 'dk-dripper-back' }, [s('ellipse', { cx: 0, cy: -126, rx: 37, ry: 7.4, fill: '#E7DFCB', stroke: BRAND.forest, 'stroke-width': 2 })]);
  const filter = g({ class: 'dk-filter' }, [
    s('path', { d: 'M-34-131L-10-92H10L34-131L28-128L22-132L16-128L10-132L4-128L-2-132L-8-128L-14-132L-20-128L-26-132Z', fill: '#FBF8F0', stroke: '#D8CFBB', 'stroke-width': 1 }),
  ]);
  const grounds = g({ class: 'dk-grounds' }, [
    s('ellipse', { cx: 0, cy: -118, rx: 26, ry: 5.2, fill: '#6B3E22' }),
    s('ellipse', { cx: -4, cy: -119, rx: 10, ry: 2, fill: '#8A5A36' }),
  ]);
  const dFront = g({ class: 'dk-dripper-front' }, [
    s('ellipse', { cx: 0, cy: -80, rx: 30, ry: 6, fill: '#F2EBDA', stroke: BRAND.forest, 'stroke-width': 2 }),
    s('path', { d: 'M-12-84L-37-126A37 7.4 0 0 0 37-126L12-84Z', fill: 'rgba(244,238,224,.92)', stroke: BRAND.forest, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }),
    s('path', { d: 'M-24-112L-8-90M-12-116L0-90M2-118L8-90M16-116L12-90', stroke: '#C9BFA8', 'stroke-width': 1.2 }),
    s('path', { d: 'M36-118C48-118 48-100 34-102', fill: 'none', stroke: BRAND.forest, 'stroke-width': 4, 'stroke-linecap': 'round' }),
  ]);
  root.append(dBack, filter, grounds, dFront);
  parts.push({ els: [dBack, dFront], off: { x: 0, y: -22 }, label: { name: 'Dripper V60', sub: 'extraction douce' }, anchor: { x: 30, y: -104 }, kind: 'vessel2' });
  parts.push({ els: [filter], off: { x: 0, y: -48 }, label: { name: 'Filtre papier', sub: 'rincé à l’eau chaude' }, anchor: { x: 30, y: -128 }, kind: 'layer', step: 'rinse' });
  parts.push({ els: [grounds], off: { x: 0, y: -72 }, label: { name: 'Mouture', sub: 'grains Kaduck, moulus minute' }, anchor: { x: 26, y: -118 }, kind: 'layer', step: 'grind' });
  const water = g({ class: 'dk-water' }, [
    s('path', { d: 'M0-150C-7-139-8-133-8-130A8 8 0 0 0 8-130C8-133 7-139 0-150Z', fill: '#9CC6D8', stroke: '#5E93AA', 'stroke-width': 1.2 }),
  ]);
  root.append(water);
  parts.push({ els: [water], off: { x: 0, y: -80 }, label: { name: 'Eau à 93 °C', sub: 'versée lentement, en spirale' }, anchor: { x: 10, y: -134 }, kind: 'layer' });
  const stream = s('path', { d: 'M0-200V-122', stroke: '#9CC6D8', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0, class: 'dk-stream' });
  const drops = g({ class: 'dk-drops' }, [0, 1, 2].map((i) => s('ellipse', { cx: 0, cy: -82, rx: 1.8, ry: 2.6, fill: '#5C3019', opacity: 0, class: `dk-drop-${i}` })));
  root.append(stream, drops);
  return { root, parts, height: 136, coffee, stream, drops, water, grounds, v60: true, iced };
}

// ---------------------------------------------------------------- scène
export async function createDrinkScene() {
  await brandFontsReady();
  const svg = svgRoot('0 0 360 300', { preserveAspectRatio: 'xMidYMid meet', class: 'drinks' });
  svg.style.overflow = 'visible';
  const title = s('text', { x: 18, y: 32, 'font-family': FONT_DISPLAY, 'font-size': 22, fill: BRAND.forest, class: 'dk-title' });
  const price = s('text', { x: 18, y: 50, 'font-family': FONT_HAND, 'font-size': 14.5, fill: '#4E6E50', 'letter-spacing': 0.6, class: 'dk-price' });
  const stage = g({ class: 'dk-stage' });
  const labels = g({ class: 'dk-labels' });
  const la = createLatteArt({ C: [180, 152] });
  const avatarLayer = g({ class: 'dk-avatar-layer' });
  svg.append(title, price, stage, labels, la.g, avatarLayer);
  const sfx = channel();

  let cur = null;
  let exploded = false;
  let run = 0;
  let onChange = () => {};
  let artStyle = ART_STYLES[0];
  const idleAnims = [];
  const stopIdle = () => idleAnims.splice(0).forEach((a) => a && a.cancel());
  const begin = () => {
    const my = ++run;
    return () => my === run;
  };
  const step = (k) => onChange({ phase: 'step', step: k });

  const drinkTransform = (st, isExploded) => `translate(${isExploded ? X_EXPLODED : X_ASSEMBLED}px, ${BASE_Y}px) scale(${isExploded ? st.scaleE : st.scaleA})`;

  function computeScales(build) {
    const avail = BASE_Y - TOP_LIMIT;
    let top = build.height;
    build.parts.forEach((p) => {
      if (p.off.y >= 0) return;
      const t = p.top ?? (p.anchor ? -p.anchor.y + 16 : 20);
      top = Math.max(top, t - p.off.y + 6);
    });
    return { e: Math.min(1, (avail + 10) / top), a: Math.min(1.15, avail / (build.height + 14)) };
  }

  function buildLabels(build, sc) {
    labels.replaceChildren();
    const items = build.parts
      .filter((p) => p.label && p.anchor)
      .map((p) => {
        const ax = X_EXPLODED + sc * (p.anchor.x + p.off.x);
        const ay = BASE_Y + sc * (p.anchor.y + p.off.y);
        return { p, ax, ay, ly: ay };
      })
      .sort((a, b) => a.ly - b.ly);
    for (let i = 1; i < items.length; i++) {
      if (items[i].ly - items[i - 1].ly < 27) items[i].ly = items[i - 1].ly + 27;
    }
    const overflow = items.length ? items[items.length - 1].ly - 286 : 0;
    if (overflow > 0) items.forEach((it) => (it.ly -= overflow));
    items.forEach((it) => {
      const G = g({ class: 'dk-label' });
      G.style.opacity = '0';
      const midX = LABEL_X - 16;
      G.append(
        s('path', { d: `M${f2(it.ax + 3)} ${f2(it.ay)}H${f2(Math.max(it.ax + 8, midX - 8))}L${f2(midX)} ${f2(it.ly)}H${LABEL_X - 5}`, fill: 'none', stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
        s('circle', { cx: f2(it.ax + 3), cy: f2(it.ay), r: 2.4, fill: '#E97A2C' }),
        s('text', { x: LABEL_X, y: f2(it.ly + 1), 'font-family': FONT_HAND, 'font-size': 14.5, fill: BRAND.forest, text: it.p.label.name }),
        s('text', { x: LABEL_X, y: f2(it.ly + 13), 'font-family': FONT_UI, 'font-size': 9.6, fill: INK, text: it.p.label.sub || '' }),
      );
      labels.append(G);
      it.p.labelEl = G;
    });
  }

  const setOrigin = (el, o) => {
    el.style.transformBox = 'fill-box';
    el.style.transformOrigin = o;
  };

  function setPartsExploded(build, on) {
    build.parts.forEach((p) => p.els.forEach((el) => {
      el.style.transform = on ? `translate(${p.off.x}px, ${p.off.y}px)` : '';
      el.style.opacity = '';
    }));
  }

  /** Stoppe net la séquence en cours (changement de boisson, bascule…). */
  function hardStop() {
    sfx.cut();
    avatar?.ch.smile(false);
    stopIdle();
    la.reset();
    la.g.getAnimations().forEach((a) => a.cancel());
    la.g.setAttribute('opacity', 0);
    la.g.style.opacity = '';
    la.g.style.transform = '';
    avatarLayer.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    avatarLayer.setAttribute('opacity', 0);
    labels.style.opacity = '';
    if (cur?.build.tools) cur.build.tools.replaceChildren();
    if (cur?.build.streams) cur.build.streams.replaceChildren();
  }

  // ------------------------------------------------------------ vue éclatée
  async function popIn(b) {
    const list = [];
    b.parts.forEach((p, i) => sfx.play('blip', { i: i % 9, delay: 90 + i * 55 }));
    b.parts.forEach((p, i) => p.els.forEach((el) => {
      setOrigin(el, '50% 50%');
      list.push(anim(el, [
        { transform: `translate(${p.off.x}px, ${p.off.y}px) scale(.45) rotate(${i % 2 ? -8 : 8}deg)`, opacity: 0 },
        { transform: `translate(${p.off.x}px, ${p.off.y}px) scale(1) rotate(0deg)`, opacity: 1 },
      ], { duration: 480, delay: i * 55, easing: EASE.back, fill: 'backwards' }));
    }));
    labels.querySelectorAll('.dk-label').forEach((L, i) => list.push(anim(L, [
      { opacity: 0, transform: 'translateX(-10px)' },
      { opacity: 1, transform: 'translateX(0)' },
    ], { duration: 380, delay: 260 + i * 70 })));
    await Promise.all(list.map((a) => settle(a)));
  }

  async function explode(alive) {
    if (!cur) return;
    stopIdle();
    exploded = true;
    sfx.play('whoosh');
    const b = cur.build;
    if (b.steam) b.steam.setAttribute('opacity', 0);
    if (b.v60) {
      b.coffee.style.transform = 'scaleY(0)';
      b.stream.setAttribute('opacity', 0);
      b.water.getAnimations().forEach((a) => a.cancel());
    }
    const list = [anim(cur.wrap, [{ transform: drinkTransform(cur, false) }, { transform: drinkTransform(cur, true) }], { duration: 640, easing: EASE.inOut })];
    b.parts.forEach((p, i) => {
      p.els.forEach((el) => {
        setOrigin(el, '50% 50%');
        el.style.opacity = '';
        list.push(anim(el, [{ transform: 'translate(0px, 0px)' }, { transform: `translate(${p.off.x}px, ${p.off.y}px)` }], { duration: 640, delay: i * 40, easing: EASE.out }));
      });
    });
    labels.querySelectorAll('.dk-label').forEach((L, i) => list.push(anim(L, [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 360, delay: 320 + i * 60 })));
    await Promise.all(list.map((a) => settle(a)));
    return alive();
  }

  // ------------------------------------------------------------ assemblage
  function dockFrames(p) {
    const { x, y } = p.off;
    if (p.kind === 'handle') {
      return [
        { transform: `translate(${x}px, ${y}px) rotate(38deg)` },
        { transform: 'translate(-2px, 0px) rotate(-6deg)', offset: 0.75 },
        { transform: 'translate(0px, 0px) rotate(0deg)' },
      ];
    }
    if (y > 0) {
      return [
        { transform: `translate(${x}px, ${y}px) scale(1, 1)` },
        { transform: 'translate(0px, -4px) scale(1, 1)', offset: 0.7 },
        { transform: 'translate(0px, 1px) scale(1.03, .96)', offset: 0.86 },
        { transform: 'translate(0px, 0px) scale(1, 1)' },
      ];
    }
    return [
      { transform: `translate(${x}px, ${y}px) scale(.97, 1.06)` },
      { transform: 'translate(0px, 2px) scale(1.07, .9)', offset: 0.64 },
      { transform: 'translate(0px, -3px) scale(.98, 1.03)', offset: 0.82 },
      { transform: 'translate(0px, 0px) scale(1, 1)' },
    ];
  }

  function slosh(layer) {
    const top = layer.querySelector('.dk-top');
    if (!top) return;
    setOrigin(top, '50% 50%');
    anim(top, [
      { transform: 'scale(1, 1) rotate(0deg)' },
      { transform: 'scale(1.03, 1.6) rotate(3deg)', offset: 0.3 },
      { transform: 'scale(.99, .75) rotate(-2deg)', offset: 0.65 },
      { transform: 'scale(1, 1) rotate(0deg)' },
    ], { duration: 620, easing: 'ease-out', fill: 'none' });
  }

  /** Pose des pièces (soucoupe, tasse, anse, glaçons…) avec leurs petits bruits. */
  async function dock(list, alive, { gap = 190 } = {}) {
    const b = cur.build;
    const mat = b.v60 || !b.v?.ceramic ? 'glass' : 'ceramic';
    const sound = (p) => {
      if (p.kind === 'saucer') return ['clink', { mat: 'ceramic', i: -3, v: 0.07 }];
      if (p.kind === 'vessel') return ['clink', { mat, i: 0, v: 0.07 }];
      if (p.kind === 'vessel2') return ['clink', { mat: 'ceramic', i: 2, v: 0.05 }];
      if (p.kind === 'handle') return ['clink', { mat: 'ceramic', i: 4, v: 0.035 }];
      if (p.kind === 'ice') return ['ice', { n: 2 }];
      return ['paper', {}];
    };
    const anims = [];
    let t = 0;
    list.forEach((p) => {
      const delay = t;
      t += p.kind === 'ice' ? 110 : gap;
      const [snd, o] = sound(p);
      const dur = p.kind === 'handle' ? 560 : 620;
      sfx.play(snd, { ...o, delay: delay + dur * (p.kind === 'handle' ? 0.62 : p.off.y > 0 ? 0.7 : 0.55) });
      if (p.step) setTimeout(() => alive() && step(p.step), delay);
      p.els.forEach((el) => {
        setOrigin(el, p.kind === 'handle' ? '0% 50%' : '50% 100%');
        el.style.opacity = '';
        anims.push(anim(el, dockFrames(p), { duration: dur, delay, easing: 'cubic-bezier(.5,0,.3,1)' }));
      });
      if (p.labelEl) anims.push(anim(p.labelEl, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-8px)' }], { duration: 260, delay }));
    });
    await Promise.all(anims.map((a) => settle(a)));
    return alive();
  }

  /** Filet entre le bec (x, y0) et la surface (y1), dans le repère du contenant. */
  function streamTo(b, color, w, x, y0) {
    const el = s('path', { fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' });
    b.streams.append(el);
    return { set: (y1) => el.setAttribute('d', `M${f2(x)} ${f2(y0)}L${f2(x)} ${f2(y1)}`), remove: () => el.remove() };
  }

  /** Une couche monte depuis son fond pendant que le filet coule. */
  function grow(layer, ms, alive, onTop) {
    const el = layer.els[0];
    setOrigin(el, '50% 100%');
    el.style.opacity = '';
    if (isReduced()) {
      el.style.transform = '';
      return Promise.resolve(alive());
    }
    el.style.transform = 'translate(0px, 0px) scale(1, 0)';
    return new Promise((resolve) => {
      const t0 = performance.now();
      const frame = (now) => {
        if (!alive()) return resolve(false);
        const k = Math.min(1, (now - t0) / ms);
        el.style.transform = `translate(0px, 0px) scale(1, ${f2(Math.max(0.001, easeInOut(k)))})`;
        onTop(-(layer.y0 + (layer.y1 - layer.y0) * easeInOut(k)));
        if (k < 1) requestAnimationFrame(frame);
        else {
          el.style.transform = '';
          slosh(el);
          resolve(true);
        }
      };
      requestAnimationFrame(frame);
    });
  }

  /** Mouture (et tassage) : le porte-filtre se remplit sous le moulin. */
  async function grind(b, pf, top, alive, tamp) {
    step('grind');
    sfx.play('roll', { dur: 0.45 });
    const beans = [];
    for (let i = 0; i < 6; i++) {
      const bean = g({}, beanEl());
      pf.g.append(bean);
      beans.push(anim(bean, [
        { transform: `translate(${f2((i % 3 - 1) * 9)}px, -110px) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${f2((i % 3 - 1) * 6)}px, -26px) rotate(${i % 2 ? 160 : -140}deg)`, opacity: 1, offset: 0.85 },
        { transform: `translate(${f2((i % 3 - 1) * 6)}px, -20px) rotate(${i % 2 ? 180 : -160}deg)`, opacity: 0 },
      ], { duration: 520, delay: i * 70, easing: EASE.in, fill: 'forwards' }));
    }
    await Promise.all(beans.map((a) => a?.finished.catch(() => {})));
    pf.g.querySelectorAll(':scope > g:not(.dk-group):not(.dk-pf):not(.dk-tamper)').forEach((el) => el.remove());
    if (!alive()) return false;
    if (tamp) {
      step('tamp');
      pf.tamper.setAttribute('opacity', 1);
      await settle(anim(pf.tamper, [
        { transform: 'translateY(-34px)', opacity: 0 },
        { transform: 'translateY(0px)', opacity: 1, offset: 0.55 },
        { transform: 'translateY(3px)', offset: 0.75 },
        { transform: 'translateY(-40px)', opacity: 0 },
      ], { duration: 900, easing: EASE.inOut }));
      sfx.play('clack', { v: 0.08 });
      pf.tamper.setAttribute('opacity', 0);
    }
    void top;
    return alive();
  }

  /** Une séance de versement (un même ustensile pour une ou plusieurs couches). */
  async function pourSession(b, sess, alive) {
    const v = b.v;
    const top = -v.h;
    const kind = POUR[sess.layers[0].lk];
    let tool;
    let spouts;
    if (kind.tool === 'pf') {
      // Porte-filtre au-dessus de la tasse ; la tête de groupe descend, deux filets
      const pf = portafilterEl();
      pf.g.setAttribute('transform', `translate(0 ${f2(top - 34)})`);
      b.tools.append(pf.g);
      pf.head.setAttribute('opacity', 0);
      await settle(anim(pf.basket, [{ transform: 'translate(70px, -10px)', opacity: 0 }, { transform: 'translate(0px, 0px)', opacity: 1 }], { duration: 420, easing: EASE.out }));
      if (!alive()) return false;
      if (!(await grind(b, pf, top, alive, sess.tamp))) return false;
      pf.head.setAttribute('opacity', 1);
      await settle(anim(pf.head, [{ transform: 'translateY(-30px)', opacity: 0 }, { transform: 'translateY(0px)', opacity: 1 }], { duration: 320, easing: EASE.out }));
      sfx.play('clack', { v: 0.06 });
      if (!alive()) return false;
      step(kind.step);
      tool = pf.g;
      spouts = [-7, 7].map((x) => [x, top - 35]);
    } else {
      step(kind.step);
      const steel = kind.tool === 'pitcher';
      const pitcher = pitcherEl(steel ? '#D7DDE0' : '#F3ECDB', steel ? '#6E7A80' : BRAND.forest);
      const sx = -hw(v, v.h) * 0.3;
      const sy = top - 22;
      const holder = g({ transform: `translate(${f2(sx)} ${f2(sy)})` }, pitcher);
      b.tools.append(holder);
      pitcher.style.transformBox = 'view-box';
      pitcher.style.transformOrigin = '0px 0px';
      await settle(anim(pitcher, [
        { transform: 'translate(60px, -40px) rotate(0deg)', opacity: 0 },
        { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(0px, 0px) rotate(-30deg)', opacity: 1 },
      ], { duration: 520, easing: EASE.inOut }));
      if (!alive()) return false;
      tool = holder;
      spouts = [[sx, sy + 2]];
    }
    // Les couches montent l'une après l'autre sous le filet
    const pour = sfx.voice('pour');
    pour.level(kind.tool === 'pf' ? 0.35 : 0.75);
    for (const layer of sess.layers) {
      const k = POUR[layer.lk];
      const lines = spouts.map(([x, y]) => streamTo(b, k.color, kind.tool === 'pf' ? 2.2 : 4.4, x, y));
      const ok = await grow(layer, k.ms, alive, (y1) => lines.forEach((l) => l.set(y1 + 1)));
      lines.forEach((l) => l.remove());
      if (!ok) {
        pour.stop();
        return false;
      }
    }
    pour.stop();
    sfx.play('liquid', { i: 2, v: 0.06 });
    // L'ustensile repart
    await settle(anim(tool, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }));
    tool.remove();
    return alive();
  }

  /** La tasse se prépare : contenant, glaçons, puis chaque liquide versé dans l'ordre. */
  async function brewCup(alive) {
    const b = cur.build;
    // Les ingrédients flottants s'effacent : ils vont être versés
    const floating = b.parts.filter((p) => p.kind === 'layer' || p.kind === 'garnish' || p.kind === 'straw');
    const fade = floating.flatMap((p) => p.els.map((el) => anim(el, [
      { transform: `translate(${p.off.x}px, ${p.off.y}px) scale(1)`, opacity: 1 },
      { transform: `translate(${p.off.x}px, ${p.off.y - 14}px) scale(.6)`, opacity: 0 },
    ], { duration: 320, easing: EASE.in, fill: 'forwards' })));
    const fadeLabels = floating.filter((p) => p.labelEl).map((p) => anim(p.labelEl, [{ opacity: 1 }, { opacity: 0 }], { duration: 260 }));
    sfx.play('gather');
    await Promise.all([...fade.map((a) => a?.finished.catch(() => {})), ...fadeLabels.map((a) => settle(a))]);
    floating.forEach((p) => p.els.forEach((el) => {
      el.getAnimations().forEach((a) => a.cancel());
      el.style.opacity = '0';
    }));
    // La tasse se pose et glisse au centre
    const cup = b.parts.filter((p) => p.kind === 'saucer' || p.vessel || p.kind === 'handle');
    anim(cur.wrap, [{ transform: drinkTransform(cur, true) }, { transform: drinkTransform(cur, false) }], { duration: 820, easing: EASE.inOut });
    if (!(await dock(cup, alive))) return false;
    cur.wrap.style.transform = drinkTransform(cur, false);
    labels.querySelectorAll('.dk-label').forEach((L) => (L.style.opacity = '0'));
    // Glaçons d'abord pour les versions glacées
    const ice = b.parts.filter((p) => p.kind === 'ice');
    if (ice.length) {
      step('ice');
      if (!(await dock(ice, alive))) return false;
    }
    // Séances de versement : couches consécutives d'un même ustensile
    const layers = b.parts.filter((p) => p.kind === 'layer');
    const sessions = [];
    layers.forEach((p) => {
      const last = sessions[sessions.length - 1];
      if (last && POUR[last.layers[0].lk].tool === POUR[p.lk].tool) last.layers.push(p);
      else sessions.push({ layers: [p] });
    });
    sessions.forEach((sess) => (sess.tamp = cur.id === 'expresso'));
    for (const sess of sessions) {
      if (!(await pourSession(b, sess, alive))) return false;
    }
    // Paille des versions glacées
    const straw = b.parts.filter((p) => p.kind === 'straw');
    if (straw.length && !(await dock(straw, alive))) return false;
    return alive();
  }

  async function assemble(alive) {
    if (!cur) return false;
    exploded = false;
    const b = cur.build;
    if (!b.v60) return brewCup(alive);
    // V60 : les pièces se posent (rinçage du filtre, mouture), puis l'eau coule
    const order = b.parts
      .map((p, i) => ({ p, i }))
      .sort((a, z) => {
        const rank = (x) => (x.p.vessel ? 0 : x.p.kind === 'ice' ? 1 : x.p.kind === 'vessel2' ? 2 : 3);
        return rank(a) - rank(z) || z.p.off.y - a.p.off.y;
      })
      .map((x) => x.p);
    sfx.play('gather');
    anim(cur.wrap, [{ transform: drinkTransform(cur, true) }, { transform: drinkTransform(cur, false) }], { duration: 820, delay: 400, easing: EASE.inOut });
    if (!(await dock(order, alive))) return false;
    cur.wrap.style.transform = drinkTransform(cur, false);
    await brew(b, alive);
    return alive();
  }

  async function brew(b, alive) {
    if (isReduced()) {
      b.coffee.style.transform = '';
      return;
    }
    step('bloom');
    anim(b.water, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(14px)' }], { duration: 300, fill: 'forwards' });
    const pour = sfx.voice('pour');
    pour.level(0.55);
    await settle(anim(b.stream, [{ opacity: 0, strokeDasharray: '0 200' }, { opacity: 0.9, strokeDasharray: '200 0' }], { duration: 500, easing: EASE.out }));
    // Bloom : la mouture gonfle
    setOrigin(b.grounds, '50% 100%');
    await settle(anim(b.grounds, [{ transform: 'scale(1, 1)' }, { transform: 'scale(1.06, 1.7)' }, { transform: 'scale(1.03, 1.4)' }], { duration: 700, easing: EASE.out }));
    if (!alive()) {
      pour.stop();
      return;
    }
    step('pour');
    const fill = anim(b.coffee, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 2200, easing: EASE.inOut });
    [150, 480, 820, 1150, 1500, 1850].forEach((ms, i) => sfx.play('plop', { v: 0.05 - i * 0.004, delay: ms }));
    const drips = [...b.drops.children].map((d, i) => anim(d, [
      { opacity: 0, transform: 'translateY(0px)' },
      { opacity: 1, transform: 'translateY(4px)', offset: 0.2 },
      { opacity: 0, transform: 'translateY(40px)' },
    ], { duration: 600, delay: i * 200, iterations: 3, easing: EASE.in }));
    pour.level(0.3);
    await settle(fill);
    pour.stop();
    drips.forEach((d) => d && d.cancel());
    anim(b.stream, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 300 });
  }

  // ------------------------------------------------------------ latte art : bascule de caméra + versé
  function rimEllipse() {
    const v = cur.build.v;
    const wall = v.ceramic ? 4 : 2.5;
    const tt = hw(v, v.h) + wall;
    const sc = cur.scaleA;
    return { x: X_ASSEMBLED, y: BASE_Y - v.h * sc, rx: tt * sc, ry: tt * K * sc };
  }

  async function tilt(toOverhead) {
    const e = rimEllipse();
    const [Cx, Cy] = la.center;
    const R = la.radius;
    const sx = e.rx / R;
    const sy = e.ry / R;
    const flat = `translate(${f2(e.x - Cx * sx)}px, ${f2(e.y - Cy * sy)}px) scale(${f2(sx)}, ${f2(sy)})`;
    const full = 'translate(0px, 0px) scale(1, 1)';
    sfx.play('swoosh');
    la.g.setAttribute('opacity', 1);
    la.g.style.transformBox = 'view-box';
    la.g.style.transformOrigin = '0 0';
    const side = drinkTransform(cur, false);
    const a1 = anim(la.g, toOverhead
      ? [{ transform: flat, opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: full, opacity: 1 }]
      : [{ transform: full, opacity: 1 }, { opacity: 1, offset: 0.7 }, { transform: flat, opacity: 0 }], { duration: 820, easing: EASE.inOut });
    const a2 = anim(cur.wrap, toOverhead
      ? [{ transform: side, opacity: 1 }, { transform: `${side} translateY(-6px)`, opacity: 0, offset: 0.45 }, { transform: side, opacity: 0 }]
      : [{ transform: side, opacity: 0 }, { transform: side, opacity: 0, offset: 0.55 }, { transform: side, opacity: 1 }], { duration: 820, easing: EASE.inOut });
    labels.style.opacity = '0';
    await Promise.all([settle(a1), settle(a2)]);
    if (!toOverhead) {
      la.g.setAttribute('opacity', 0);
      la.g.style.opacity = '';
      la.g.style.transform = '';
    }
  }

  let avatar = null;
  function ensureAvatar() {
    if (avatar) return avatar;
    const Ax = 316;
    const Ay = 60;
    const R = 30;
    const ch = createCharacter({ seed: 4 });
    const clip = uid('av');
    const bubbleRect = s('rect', { rx: 12, fill: BRAND.cream, stroke: BRAND.forest, 'stroke-width': 1.5 });
    const bubbleTail = s('path', { fill: BRAND.cream, stroke: BRAND.forest, 'stroke-width': 1.5, 'stroke-linejoin': 'round' });
    const bubbleText = s('text', { 'text-anchor': 'end', 'font-family': FONT_CHALK, 'font-size': 17, fill: BRAND.forest });
    const face = g({ class: 'dk-avatar-face' }, [
      s('defs', {}, s('clipPath', { id: clip }, s('circle', { cx: Ax, cy: Ay, r: R }))),
      s('circle', { cx: Ax + 2, cy: Ay + 3, r: R + 3.5, fill: '#000', opacity: 0.15 }),
      s('circle', { cx: Ax, cy: Ay, r: R + 3.5, fill: BRAND.cream, stroke: BRAND.forest, 'stroke-width': 2 }),
      s('circle', { cx: Ax, cy: Ay, r: R, fill: '#5F6E45' }),
      g({ 'clip-path': `url(#${clip})` }, g({ transform: `translate(${f2(Ax - 130 * 0.74)} ${f2(Ay - 94 * 0.74)}) scale(.74)` }, ch.g)),
    ]);
    const bubble = g({ class: 'dk-avatar-bubble' }, [bubbleTail, bubbleRect, bubbleText]);
    avatarLayer.append(bubble, face);
    setOrigin(face, '50% 50%');
    setOrigin(bubble, '100% 50%');
    avatar = { ch, face, bubble, bubbleRect, bubbleTail, bubbleText, Ax, Ay, R };
    return avatar;
  }

  async function voila(style, alive) {
    const av = ensureAvatar();
    avatarLayer.setAttribute('opacity', 1);
    av.bubbleText.textContent = `Et voilà, ${ART_NAME[style] || 'un cœur'} !`;
    const tx = av.Ax - av.R - 16;
    av.bubbleText.setAttribute('x', tx);
    av.bubbleText.setAttribute('y', av.Ay + 6);
    const w = (av.bubbleText.getComputedTextLength?.() || 130) + 22;
    av.bubbleRect.setAttribute('x', f2(tx - w + 11));
    av.bubbleRect.setAttribute('y', av.Ay - 15);
    av.bubbleRect.setAttribute('width', f2(w));
    av.bubbleRect.setAttribute('height', 30);
    av.bubbleTail.setAttribute('d', `M${f2(tx + 8)} ${av.Ay - 6}L${f2(tx + 19)} ${av.Ay + 2}L${f2(tx + 8)} ${av.Ay + 8}Z`);
    const list = [
      anim(av.face, [{ transform: 'scale(0) rotate(-30deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1 }], { duration: 520, easing: EASE.back }),
      anim(av.bubble, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, delay: 260, easing: EASE.back }),
    ];
    sfx.play('ding', { delay: 280 });
    await Promise.all(list.map((a) => settle(a)));
    if (!alive()) return;
    av.ch.wink();
    av.ch.say(1500);
    await pause(2100);
    if (!alive()) return;
    await Promise.all([
      settle(anim(av.bubble, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.8)' }], { duration: 260 })),
      settle(anim(av.face, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }], { duration: 320, delay: 80 })),
    ]);
  }

  /** Motif tiré au hasard, jamais deux fois le même d'affilée. */
  const nextStyle = () => {
    const pool = ART_STYLES.filter((x) => x !== artStyle);
    return pool[Math.floor(Math.random() * pool.length)];
  };

  /** Pose la garniture (latte art) avec le motif donné, en fondu. */
  function showArt(b, style) {
    const gp = b.parts.find((p) => p.kind === 'garnish');
    if (!gp) return;
    b.art.setStyle(style);
    gp.els.forEach((el) => {
      el.getAnimations().forEach((a) => a.cancel());
      el.style.transform = '';
      el.style.opacity = '';
      anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'none' });
    });
  }

  async function latteSequence(alive) {
    const b = cur.build;
    if (!b.art || cur.iced) return true;
    artStyle = nextStyle();
    if (isReduced()) {
      showArt(b, artStyle);
      return true;
    }
    step('art');
    onChange({ phase: 'latte' });
    await tilt(true);
    if (!alive()) return false;
    const ok = await la.run({ style: artStyle, surface: b.surface || 'coffee', cinnamon: cur.def.garnish?.cinnamon, alive, sfx });
    if (!ok || !alive()) return false;
    await voila(artStyle, alive);
    if (!alive()) return false;
    showArt(b, artStyle);
    await tilt(false);
    return alive();
  }

  // ------------------------------------------------------------ ambiance
  function startIdle() {
    stopIdle();
    if (isReduced() || !cur) return;
    const b = cur.build;
    if (b.steam) {
      b.steam.setAttribute('opacity', 1);
      b.steam.querySelectorAll('path').forEach((p, i) => {
        setOrigin(p, '50% 100%');
        idleAnims.push(anim(p, [
          { transform: 'translate(0px, 8px) scale(.8, .7)', opacity: 0 },
          { transform: 'translate(-2px, 0px) scale(1.1, 1)', opacity: 0.7, offset: 0.4 },
          { transform: 'translate(3px, -16px) scale(.9, 1.15)', opacity: 0 },
        ], { duration: 2600, delay: i * 720, iterations: Infinity, easing: 'ease-in-out', fill: 'none' }));
      });
    }
    const ice = b.root.querySelector('.dk-ice');
    if (ice && !exploded) {
      ice.querySelectorAll('rect').forEach((rc, i) => idleAnims.push(anim(rc, [{ transform: 'translateY(0)' }, { transform: 'translateY(-2.5px)' }], {
        duration: 1400 + i * 150, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none',
      })));
    }
  }

  // ------------------------------------------------------------ affichage d'une boisson
  function mount(build, def, id, iced) {
    if (cur) {
      const old = cur.wrap;
      const out = anim(old, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
      (out ? out.finished : Promise.resolve()).then(() => old.remove()).catch(() => old.remove());
    }
    const sc = computeScales(build);
    const wrap = g({ class: 'dk-wrap' }, build.root);
    stage.append(wrap);
    cur = { id, def, build, wrap, scaleE: sc.e, scaleA: sc.a, iced: !!build.iced };
    return sc;
  }

  /** Tout est posé, sans animation (mouvement réduit ou bascule). */
  function settleAll(build) {
    setPartsExploded(build, false);
    cur.wrap.style.transform = drinkTransform(cur, false);
    labels.querySelectorAll('.dk-label').forEach((L) => (L.style.opacity = '0'));
    if (build.v60) build.coffee.style.transform = '';
    if (build.art) build.art.setStyle(artStyle);
  }

  async function show(id, { iced = false } = {}) {
    const alive = begin();
    hardStop();
    const def = DRINKS[id];
    if (!def) return;
    const build = def.special === 'v60' ? buildV60(iced) : buildCup(def, iced, artStyle);
    const sc = mount(build, def, id, iced);
    const icedOn = iced && (def.icedVersion || def.iced);
    title.textContent = def.name + (icedOn ? ' glacé' : '');
    price.textContent = def.price;
    buildLabels(build, sc.e);
    cur.wrap.style.transform = drinkTransform(cur, true);
    setPartsExploded(build, true);
    if (build.v60) build.coffee.style.transform = 'scaleY(0)';
    exploded = true;
    onChange({ phase: 'exploded' });
    if (isReduced()) {
      settleAll(build);
      exploded = false;
      onChange({ phase: 'done' });
      return;
    }
    await popIn(build);
    await pause(700);
    if (!alive()) return;
    const ok = await assemble(alive);
    if (!ok || !alive()) return;
    onChange({ phase: 'assembled' });
    if (build.art && !cur.iced) {
      startIdle();
      await pause(350);
      if (!alive()) return;
      stopIdle();
      await latteSequence(alive);
    }
    if (!alive()) return;
    onChange({ phase: 'done' });
    startIdle();
  }

  return {
    svg,
    show,
    get current() {
      return cur && cur.id;
    },
    get exploded() {
      return exploded;
    },
    get artStyle() {
      return artStyle;
    },
    onChange(fn) {
      onChange = fn;
    },
    /** Vue éclatée ↔ boisson préparée (le procédé se rejoue, sans le latte art). */
    async toggle() {
      if (!cur) return;
      const alive = begin();
      hardStop();
      if (exploded) {
        await assemble(alive);
        if (alive()) {
          if (cur.build.art) showArt(cur.build, artStyle);
          onChange({ phase: 'done' });
          startIdle();
        }
      } else {
        cur.wrap.style.opacity = '';
        await explode(alive);
        onChange({ phase: 'exploded' });
      }
    },
    pause() {
      idleAnims.forEach((a) => a && a.pause());
    },
    resume() {
      idleAnims.forEach((a) => a && a.play());
    },
  };
}
