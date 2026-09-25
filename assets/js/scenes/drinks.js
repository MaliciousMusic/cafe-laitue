// Le comptoir en motion design : chaque boisson apparaît en vue éclatée, s'assemble
// (rebonds, écrasements, clapotis), puis — pour les cafés au lait — la caméra bascule
// au-dessus de la tasse et le primeur verse son latte art (cœur ou cygne).
// Les jus : les fruits plongent et éclatent dans le verre ; « sur demande » se compose.
// viewBox de la scène : 0 0 360 300.

import { s, g, svgRoot, uid, rng, f2 } from '../lib/svg.js';
import { anim, EASE, isReduced, settle } from '../lib/motion.js';
import { drawProduce } from './produce.js';
import { FONT_DISPLAY, FONT_HAND, BRAND, brandFontsReady } from './stamp.js';
import { DRINKS, JUICE_COLOR, JUICE_LABEL } from '../data/drinks.js';
import { createLatteArt, buildArt } from './latteart.js';
import { createCharacter } from './character.js';
import { channel } from '../lib/sound.js';

const FONT_UI = '"Bricolage Grotesque", system-ui, sans-serif';
const FONT_CHALK = '"Caveat", "Segoe Print", cursive';
const K = 0.2; // aplatissement des ellipses (légère vue plongeante)
const GAP = 24;
const BASE_Y = 246;
const TOP_LIMIT = 58;
const X_EXPLODED = 112;
const X_ASSEMBLED = 180;
const LABEL_X = 206;
const INK = '#365846';
const COMPOSER_MAX = 4;

const LAYER = {
  espresso: ['#4A2616', '#B97842'],
  ristretto: ['#3E1F12', '#A86A38'],
  crema: ['#B97842', '#D5A066'],
  milk: ['#EADAC1', '#F4EADA'],
  milkCold: ['#F1EBE0', '#FAF6EF'],
  foam: ['#FAF5EB', '#FFFDF7'],
  matcha: ['#7EA64E', '#99C166'],
  chai: ['#B7793F', '#CD9459'],
};
const SURFACE = { coffee: ['#DBA66B', '#A5672F'], matcha: ['#A2C563', '#6F9A40'], chai: ['#D8A96F', '#A06A36'] };

const VESSELS = {
  demitasse: { h: 50, b: 24, t: 37, bowl: 0.6, handle: true, saucer: 62, ceramic: true },
  cup: { h: 66, b: 32, t: 57, bowl: 0.8, handle: true, saucer: 84, ceramic: true },
  tulip: { h: 58, b: 27, t: 47, bowl: 0.7, handle: true, saucer: 72, ceramic: true },
  glass: { h: 118, b: 33, t: 40, bowl: 0, base: 7 },
  tall: { h: 150, b: 33, t: 43, bowl: 0, base: 8 },
  juice: { h: 128, b: 31, t: 41, bowl: 0, base: 8 },
  shot: { h: 58, b: 18, t: 23, bowl: 0, base: 9 },
};

const P = (x, y) => `${f2(x)} ${f2(y)}`;
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const pause = (ms) => new Promise((r) => setTimeout(r, isReduced() ? 0 : ms));

// ---------------------------------------------------------------- géométrie
function hw(v, y) {
  const tn = Math.max(0, Math.min(1, y / v.h));
  const e = v.bowl ? 1 - Math.pow(1 - tn, 1 + v.bowl * 1.6) : tn;
  return v.b + (v.t - v.b) * e;
}

function sliceD(v, y0, y1) {
  const steps = v.bowl ? 6 : 1;
  const L = [];
  const R = [];
  for (let i = 0; i <= steps; i++) {
    const y = y0 + ((y1 - y0) * i) / steps;
    const w = hw(v, y);
    L.push([-w, -y]);
    R.push([w, -y]);
  }
  const w0 = hw(v, y0);
  let d = `M${P(...L[steps])}`;
  for (let i = steps - 1; i >= 0; i--) d += `L${P(...L[i])}`;
  d += `A${f2(w0)} ${f2(w0 * K)} 0 0 0 ${P(w0, -y0)}`;
  for (let i = 1; i <= steps; i++) d += `L${P(...R[i])}`;
  return `${d}Z`;
}

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

function vesselBack(v) {
  const wall = v.ceramic ? 4 : 2.5;
  const t = hw(v, v.h);
  return g({ class: 'dk-vback' }, [
    s('ellipse', { cx: 0, cy: -v.h, rx: t + wall, ry: (t + wall) * K, fill: v.ceramic ? '#F4EEE0' : 'rgba(255,255,255,.4)', stroke: BRAND.forest, 'stroke-width': 2 }),
    s('ellipse', { cx: 0, cy: -v.h, rx: t, ry: t * K, fill: v.ceramic ? '#E6DCC6' : 'rgba(18,67,43,.05)' }),
  ]);
}

function vesselFront(v) {
  const wall = v.ceramic ? 4 : 2.5;
  const steps = v.bowl ? 10 : 1;
  const base = v.base || 0;
  const L = [];
  const R = [];
  for (let i = 0; i <= steps; i++) {
    const y = v.h - (v.h * i) / steps;
    const w = hw(v, y) + wall;
    L.push([-w, -y]);
    R.push([w, -y]);
  }
  const wb = hw(v, 0) + wall;
  const tt = hw(v, v.h) + wall;
  let d = `M${P(...L[0])}`;
  for (let i = 1; i <= steps; i++) d += `L${P(...L[i])}`;
  d += `L${P(-wb, base)}A${f2(wb)} ${f2(wb * K)} 0 0 0 ${P(wb, base)}L${P(wb, 0)}`;
  for (let i = steps - 1; i >= 0; i--) d += `L${P(...R[i])}`;
  d += `A${f2(tt)} ${f2(tt * K)} 0 0 1 ${P(-tt, -v.h)}Z`;
  const G = g({ class: 'dk-vfront' }, [
    s('path', { d, fill: v.ceramic ? 'rgba(253,251,235,.32)' : 'rgba(255,255,255,.16)', stroke: BRAND.forest, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }),
    s('path', { d: `M${P(-tt, -v.h)}A${f2(tt)} ${f2(tt * K)} 0 0 0 ${P(tt, -v.h)}`, fill: 'none', stroke: BRAND.forest, 'stroke-width': 2.6 }),
  ]);
  if (base) {
    G.append(s('path', { d: `M${P(-wb + 2, 0)}A${f2(wb - 2)} ${f2((wb - 2) * K)} 0 0 0 ${P(wb - 2, 0)}L${P(wb - 2, base - 1)}A${f2(wb - 2)} ${f2((wb - 2) * K)} 0 0 1 ${P(-wb + 2, base - 1)}Z`, fill: 'rgba(255,255,255,.45)' }));
  }
  const hx = -hw(v, v.h * 0.5) * 0.72;
  G.append(s('path', { d: `M${P(hx, -v.h * 0.88)}L${P(hx - 1.5, -v.h * 0.14)}`, stroke: '#fff', 'stroke-width': v.ceramic ? 2.5 : 3.4, 'stroke-linecap': 'round', opacity: 0.55 }));
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

function strawEl(v, extra = 34) {
  const len = v.h + extra;
  const id = uid('straw');
  return g({ class: 'dk-straw' }, g({ transform: `translate(${f2(hw(v, v.h) * 0.35)} 0) rotate(9)` }, [
    s('defs', {}, s('pattern', { id, width: 7, height: 10, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' }, [
      s('rect', { width: 7, height: 10, fill: '#849E83' }),
      s('rect', { width: 7, height: 4, fill: '#FDFBEB' }),
    ])),
    s('rect', { x: -3.5, y: -len, width: 7, height: len - 6, rx: 2, fill: `url(#${id})`, stroke: BRAND.forest, 'stroke-width': 1 }),
  ]));
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
  return `#${((1 << 24) + (f(n >> 16) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1)}`;
}

function mixColors(list) {
  if (!list.length) return '#F2A64A';
  let r = 0;
  let gg = 0;
  let b = 0;
  list.forEach((hex) => {
    const n = parseInt(hex.slice(1), 16);
    r += n >> 16;
    gg += (n >> 8) & 255;
    b += n & 255;
  });
  const k = list.length;
  return `#${((1 << 24) + (Math.round(r / k) << 16) + (Math.round(gg / k) << 8) + Math.round(b / k)).toString(16).slice(1)}`;
}

function mixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16);
  const B = parseInt(b.slice(1), 16);
  const c = (sh) => Math.round(lerp((A >> sh) & 255, (B >> sh) & 255, t));
  return `#${((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1)}`;
}

function wheel(color, r = 13) {
  const G = g({ class: 'dk-wheel' });
  G.append(s('circle', { r, fill: color, stroke: shade(color, -0.25), 'stroke-width': 2.4 }));
  G.append(s('circle', { r: r - 3.2, fill: shade(color, 0.25) }));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    G.append(s('path', { d: `M0 0L${f2(Math.cos(a) * (r - 3.4))} ${f2(Math.sin(a) * (r - 3.4))}`, stroke: color, 'stroke-width': 1.2 }));
  }
  G.append(s('circle', { r: 1.6, fill: shade(color, -0.1) }));
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
    add(el, { x: 0, y: -(v.h + (i + 1) * GAP) }, { name: L.label, sub: L.sub }, { x: hw(v, mid) + 2, y: -mid }, 'layer', { top: y + L.h + hw(v, y + L.h) * K });
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
  const steam = def.hot && !(iced && def.icedVersion) ? steamEl(v) : null;
  if (steam) root.append(steam);
  const height = Math.max(v.h, topY) + extraTop + 10;
  return { root, parts, steam, height, v, topY, art, surface: def.surface, iced: !!(iced && def.icedVersion) };
}

function liquidEls(v) {
  const body = s('path', { class: 'dk-liq-body' });
  const top = s('ellipse', { class: 'dk-liq-top' });
  top.style.transformBox = 'fill-box';
  top.style.transformOrigin = '50% 50%';
  const G = g({ class: 'dk-liquid' }, [body, top]);
  const state = { level: 0, color: '#F2A64A', wob: 0, t: 0 };
  const draw = () => {
    const L = state.level;
    if (L < 0.6) {
      body.setAttribute('d', '');
      top.setAttribute('rx', 0);
      return;
    }
    const w = hw(v, L);
    body.setAttribute('d', sliceD(v, 0, L));
    body.setAttribute('fill', shade(state.color, -0.07));
    top.setAttribute('cx', 0);
    top.setAttribute('cy', f2(-L));
    top.setAttribute('rx', f2(w));
    top.setAttribute('ry', f2(w * K * (1 + state.wob * 0.9 * Math.sin(state.t / 55))));
    top.setAttribute('fill', shade(state.color, 0.2));
    top.setAttribute('transform', `rotate(${f2(state.wob * 7 * Math.sin(state.t / 90))} 0 ${f2(-L)})`);
  };
  /** Remplit / vide jusqu'à `level` en changeant de couleur, avec clapotis. */
  const tween = (level, color, dur = 650) => new Promise((resolve) => {
    const l0 = state.level;
    const c0 = state.color;
    const t0 = performance.now();
    if (isReduced()) {
      Object.assign(state, { level, color, wob: 0 });
      draw();
      return resolve();
    }
    const frame = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      state.level = lerp(l0, level, easeInOut(k));
      state.color = mixHex(c0, color, k);
      state.t = now;
      state.wob = Math.max(0, 1 - k) * 0.9 + 0.08 * (1 - k);
      draw();
      if (k < 1) requestAnimationFrame(frame);
      else {
        // le liquide se calme
        const t1 = performance.now();
        const calm = (n2) => {
          const q = Math.min(1, (n2 - t1) / 700);
          state.wob = 0.35 * (1 - q);
          state.t = n2;
          draw();
          if (q < 1) requestAnimationFrame(calm);
        };
        requestAnimationFrame(calm);
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
  const set = (level, color) => {
    Object.assign(state, { level, color, wob: 0 });
    draw();
  };
  return { g: G, tween, set, state };
}

function buildJuice(def, fruits, { composer = false } = {}) {
  const v = VESSELS[def.vessel];
  const root = g({ class: 'dk-drink dk-juice' });
  const parts = [];
  const back = vesselBack(v);
  root.append(back);
  const liquid = liquidEls(v);
  root.append(liquid.g);
  const bubbles = g({ class: 'dk-bubbles', opacity: 0 });
  const r = rng(4);
  for (let i = 0; i < 7; i++) {
    bubbles.append(s('circle', { cx: f2((r() - 0.5) * hw(v, 20) * 1.3), cy: f2(-8 - r() * v.h * 0.6), r: f2(1 + r() * 1.6), fill: '#fff', opacity: 0.55 }));
  }
  root.append(bubbles);
  const splashG = g({ class: 'dk-splash' });
  const front = vesselFront(v);
  root.append(front, splashG);
  parts.push({ els: [back, front], off: { x: 0, y: 10 }, label: { name: def.vessel === 'shot' ? 'Verre à shot' : 'Verre', sub: 'bien frais' }, anchor: { x: hw(v, v.h * 0.3) + 4, y: -v.h * 0.3 }, kind: 'vessel', vessel: true });
  const fruitEls = fruits.map((f, i) => {
    const el = g({ class: 'dk-fruit' });
    const pop = g({ class: 'dk-pop' });
    pop.append(g({ transform: `translate(0 ${f2(-v.h - 8)}) scale(${def.vessel === 'shot' ? 1.5 : 1.75})` }, drawProduce(f.id, 3 + i)));
    el.append(pop);
    root.append(el);
    const zig = fruits.length > 1 ? (i % 2 ? 16 : -16) : 0;
    parts.push({ els: [el], off: { x: zig, y: -(i + 1) * 38 - 8 }, label: { name: f.label, sub: f.sub }, anchor: { x: 20, y: -v.h - 8 }, top: v.h + 26, kind: 'fruit', fruit: true, fid: f.id, pop });
    return el;
  });
  let garnish = null;
  if (def.garnish && !composer) {
    const wheelG = g({ class: 'dk-garnish' }, g({ transform: `translate(${f2(hw(v, v.h) - 2)} ${f2(-v.h + 2)})` }, wheel(def.garnish.color, 13)));
    const straw = strawEl(v, 30);
    root.insertBefore(straw, front);
    root.append(wheelG);
    garnish = { wheelG, straw };
    parts.push({ els: [wheelG, straw], off: { x: 40, y: -30 }, label: { name: def.garnish.label, sub: def.garnish.sub }, anchor: { x: hw(v, v.h) + 12, y: -v.h }, kind: 'garnish', garnish: true });
  }
  const max = v.h * (def.vessel === 'shot' ? 0.8 : 0.84);
  return { root, parts, liquid, bubbles, fruitEls, splashG, garnish, height: v.h + 40, v, juice: true, max, composer, fruitsList: fruits };
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
    parts.push({ els: [ice], off: { x: 0, y: -26 }, label: { name: 'Glaçons', sub: 'le café coule dessus' }, anchor: { x: 26, y: -24 }, kind: 'ice' });
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
  parts.push({ els: [filter], off: { x: 0, y: -48 }, label: { name: 'Filtre papier', sub: 'rincé à l’eau chaude' }, anchor: { x: 30, y: -128 }, kind: 'layer' });
  parts.push({ els: [grounds], off: { x: 0, y: -72 }, label: { name: 'Mouture', sub: 'grains Kaduck, moulus minute' }, anchor: { x: 26, y: -118 }, kind: 'layer' });
  const water = g({ class: 'dk-water' }, [
    s('path', { d: 'M0-150C-7-139-8-133-8-130A8 8 0 0 0 8-130C8-133 7-139 0-150Z', fill: '#9CC6D8', stroke: '#5E93AA', 'stroke-width': 1.2 }),
  ]);
  root.append(water);
  parts.push({ els: [water], off: { x: 0, y: -80 }, label: { name: 'Eau à 93 °C', sub: 'versée lentement, en spirale' }, anchor: { x: 10, y: -134 }, kind: 'layer' });
  const stream = s('path', { d: 'M0-200V-122', stroke: '#9CC6D8', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0, class: 'dk-stream' });
  const drops = g({ class: 'dk-drops' }, [0, 1, 2].map((i) => s('ellipse', { cx: 0, cy: -82, rx: 1.8, ry: 2.6, fill: '#5C3019', opacity: 0, class: `dk-drop-${i}` })));
  root.append(stream, drops);
  return { root, parts, height: 136, coffee, stream, drops, water, v60: true, iced };
}

// ---------------------------------------------------------------- nom du jus composé
function hue(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255;
  const gg = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const mx = Math.max(r, gg, b);
  const mn = Math.min(r, gg, b);
  if (mx === mn) return 0;
  const d = mx - mn;
  let h = mx === r ? (gg - b) / d + (gg < b ? 6 : 0) : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4;
  return h * 60;
}

export function juiceName(ids, color) {
  if (!ids.length) return 'Composez votre jus';
  if (ids.length === 1) return `100 % ${JUICE_LABEL[ids[0]].toLowerCase()}`;
  const h = hue(color);
  let base;
  if (ids.includes('betterave')) base = 'Rouge de terre';
  else if (ids.includes('raisin') || ids.includes('myrtille')) base = 'Vendanges';
  else if (h < 12 || h >= 330) base = 'Rouge passion';
  else if (h < 36) base = 'Soleil d’Auvergne';
  else if (h < 58) base = 'Rayon doux';
  else if (h < 160) base = 'Vert tonique';
  else base = 'Petit grain de folie';
  if (ids.includes('gingembre')) base += ' qui pique';
  return base;
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
  const idleAnims = [];
  const stopIdle = () => idleAnims.splice(0).forEach((a) => a && a.cancel());
  const begin = () => {
    const my = ++run;
    return () => my === run;
  };

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
      el.style.opacity = on && p.fruit ? '1' : '';
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
    if (b.juice) {
      b.liquid.tween(0, b.liquid.state.color, 420);
      b.bubbles.setAttribute('opacity', 0);
    }
    if (b.v60) {
      b.coffee.style.transform = 'scaleY(0)';
      b.stream.setAttribute('opacity', 0);
      b.water.getAnimations().forEach((a) => a.cancel());
    }
    const list = [anim(cur.wrap, [{ transform: drinkTransform(cur, false) }, { transform: drinkTransform(cur, true) }], { duration: 640, easing: EASE.inOut })];
    b.parts.forEach((p, i) => {
      const from = p.fruit ? { transform: 'translate(0px, 26px) scale(.25)', opacity: 0 } : { transform: 'translate(0px, 0px)' };
      const to = p.fruit ? { transform: `translate(${p.off.x}px, ${p.off.y}px) scale(1)`, opacity: 1 } : { transform: `translate(${p.off.x}px, ${p.off.y}px)` };
      p.els.forEach((el) => {
        setOrigin(el, '50% 50%');
        list.push(anim(el, [from, to], { duration: 640, delay: i * 40, easing: EASE.out }));
      });
      if (p.pop) p.pop.getAnimations().forEach((a) => a.cancel());
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

  async function assemble(alive) {
    if (!cur) return false;
    exploded = false;
    const b = cur.build;
    if (b.juice) return assembleJuice(alive);
    const order = b.parts
      .map((p, i) => ({ p, i }))
      .sort((a, z) => {
        const rank = (x) => (x.p.kind === 'saucer' ? 0 : x.p.vessel ? 1 : x.p.kind === 'handle' ? 2 : x.p.kind === 'garnish' || x.p.kind === 'straw' ? 9 : 3);
        return rank(a) - rank(z) || z.p.off.y - a.p.off.y;
      });
    const list = [];
    let t = 0;
    sfx.play('gather');
    const mat = b.v60 || !b.v?.ceramic ? 'glass' : 'ceramic';
    let nLayer = 0;
    const landing = (p) => {
      if (p.kind === 'saucer') return ['clink', { mat: 'ceramic', i: -3, v: 0.07 }];
      if (p.kind === 'vessel') return ['clink', { mat, i: 0, v: 0.07 }];
      if (p.kind === 'vessel2') return ['clink', { mat: 'ceramic', i: 2, v: 0.05 }];
      if (p.kind === 'handle') return ['clink', { mat: 'ceramic', i: 4, v: 0.035 }];
      if (p.kind === 'layer') return b.v60 ? ['paper', {}] : ['liquid', { i: nLayer++ }];
      if (p.kind === 'ice') return ['ice', { n: 2 }];
      if (p.kind === 'straw') return ['paper', {}];
      return ['liquid', { i: 4, v: 0.05 }];
    };
    order.forEach(({ p }) => {
      const delay = t;
      t += p.kind === 'ice' ? 110 : 190;
      const [snd, o] = landing(p);
      const dur = p.kind === 'handle' ? 560 : 620;
      sfx.play(snd, { ...o, delay: delay + dur * (p.kind === 'handle' ? 0.62 : p.off.y > 0 ? 0.7 : 0.55) });
      p.els.forEach((el) => {
        setOrigin(el, p.kind === 'handle' ? '0% 50%' : '50% 100%');
        const a = anim(el, dockFrames(p), { duration: p.kind === 'handle' ? 560 : 620, delay, easing: 'cubic-bezier(.5,0,.3,1)' });
        list.push(a);
        if (p.kind === 'layer' && a) a.finished.then(() => alive() && slosh(el)).catch(() => {});
      });
      if (p.labelEl) list.push(anim(p.labelEl, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-8px)' }], { duration: 260, delay }));
    });
    list.push(anim(cur.wrap, [{ transform: drinkTransform(cur, true) }, { transform: drinkTransform(cur, false) }], {
      duration: 820, delay: Math.max(0, t - 420), easing: EASE.inOut,
    }));
    await Promise.all(list.map((a) => settle(a)));
    if (!alive()) return false;
    if (b.v60) await brew(b, alive);
    return alive();
  }

  async function brew(b, alive) {
    if (isReduced()) {
      b.coffee.style.transform = '';
      return;
    }
    anim(b.water, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(14px)' }], { duration: 300, fill: 'forwards' });
    const pour = sfx.voice('pour');
    pour.level(0.55);
    await settle(anim(b.stream, [{ opacity: 0, strokeDasharray: '0 200' }, { opacity: 0.9, strokeDasharray: '200 0' }], { duration: 500, easing: EASE.out }));
    if (!alive()) return;
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

  // ------------------------------------------------------------ jus : les fruits plongent et éclatent
  function burst(b, color) {
    const r = rng(Math.floor(Math.random() * 1e6));
    const y0 = -b.v.h - 8;
    for (let i = 0; i < 11; i++) {
      const d = s('circle', { cx: 0, cy: f2(y0), r: f2(1.6 + r() * 2.4), fill: i % 3 ? color : shade(color, 0.3) });
      b.splashG.append(d);
      const ang = -Math.PI / 2 + (r() - 0.5) * 2.4;
      const dist = 18 + r() * 24;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      const a = anim(d, [
        { transform: 'translate(0px, 0px)', opacity: 1 },
        { transform: `translate(${f2(dx)}px, ${f2(dy)}px)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${f2(dx * 0.4)}px, ${f2(30 + r() * 20)}px)`, opacity: 0 },
      ], { duration: 620 + r() * 200, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
      (a ? a.finished : Promise.resolve()).then(() => d.remove()).catch(() => d.remove());
    }
  }

  async function dropFruit(b, el, pop, fid, from, alive) {
    // Arc jusqu'au bord du verre, écrasement, éclatement
    const color = JUICE_COLOR[fid] || '#F2A64A';
    setOrigin(el, '50% 50%');
    const mid = { x: from.x * 0.45, y: Math.min(from.y, -20) - 34 };
    await settle(anim(el, [
      { transform: `translate(${f2(from.x)}px, ${f2(from.y)}px) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${f2(mid.x)}px, ${f2(mid.y)}px) rotate(160deg)`, offset: 0.5 },
      { transform: 'translate(0px, 0px) rotate(340deg)', opacity: 1 },
    ], { duration: 560, easing: 'cubic-bezier(.45,0,.4,1)' }));
    if (!alive()) return false;
    sfx.play('plop', { v: 0.12 });
    setOrigin(pop, '50% 50%');
    await settle(anim(pop, [
      { transform: 'scale(1, 1)', opacity: 1 },
      { transform: 'scale(1.4, .55)', opacity: 1, offset: 0.55 },
      { transform: 'scale(.15, .15)', opacity: 0 },
    ], { duration: 300, easing: 'ease-in' }));
    burst(b, color);
    sfx.play('splash');
    return alive();
  }

  async function assembleJuice(alive) {
    const b = cur.build;
    const list = [];
    const vessel = b.parts.find((p) => p.vessel);
    sfx.play('clink', { mat: 'glass', i: 0, v: 0.06, delay: 390 });
    vessel.els.forEach((el) => {
      setOrigin(el, '50% 100%');
      list.push(anim(el, dockFrames(vessel), { duration: 560, easing: 'cubic-bezier(.5,0,.3,1)' }));
    });
    labels.querySelectorAll('.dk-label').forEach((L) => list.push(anim(L, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })));
    list.push(anim(cur.wrap, [{ transform: drinkTransform(cur, true) }, { transform: drinkTransform(cur, false) }], { duration: 760, easing: EASE.inOut }));
    await Promise.all(list.map((a) => settle(a)));
    if (!alive()) return false;
    const fruits = b.parts.filter((p) => p.fruit);
    const colors = [];
    for (let i = 0; i < fruits.length; i++) {
      const p = fruits[i];
      const ok = await dropFruit(b, p.els[0], p.pop, p.fid, p.off, alive);
      if (!ok) return false;
      colors.push(JUICE_COLOR[p.fid] || '#F2A64A');
      b.liquid.tween(b.max * ((i + 1) / fruits.length), mixColors(colors), 520);
      await pause(160);
    }
    if (b.garnish) {
      const gp = b.parts.find((p) => p.garnish);
      sfx.play('paper', { delay: 380 });
      sfx.play('clink', { mat: 'glass', i: 3, v: 0.03, delay: 430 });
      gp.els.forEach((el) => {
        setOrigin(el, '50% 100%');
        anim(el, [
          { transform: `translate(${gp.off.x}px, ${gp.off.y}px) rotate(20deg)` },
          { transform: 'translate(0px, 3px) rotate(-4deg)', offset: 0.7 },
          { transform: 'translate(0px, 0px) rotate(0deg)' },
        ], { duration: 620, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'backwards' });
      });
      gp.els.forEach((el) => (el.style.transform = ''));
      await pause(620);
    }
    return alive();
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
    av.bubbleText.textContent = style === 'swan' ? 'Et voilà, un cygne !' : 'Et voilà, un cœur !';
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

  let artStyle = 'heart';
  async function latteSequence(alive) {
    const b = cur.build;
    if (!b.art || cur.iced || isReduced()) {
      b.art?.setStyle(artStyle);
      return true;
    }
    onChange({ phase: 'latte' });
    await tilt(true);
    if (!alive()) return false;
    const ok = await la.run({ style: artStyle, surface: b.surface || 'coffee', cinnamon: cur.def.garnish?.cinnamon, alive, sfx });
    if (!ok || !alive()) return false;
    await voila(artStyle, alive);
    if (!alive()) return false;
    b.art.setStyle(artStyle);
    await tilt(false);
    onChange({ phase: 'done' });
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
    if (b.juice && b.liquid.state.level > 2) {
      b.bubbles.setAttribute('opacity', 1);
      [...b.bubbles.children].forEach((c, i) => idleAnims.push(anim(c, [
        { transform: 'translateY(0)', opacity: 0 },
        { transform: 'translateY(-10px)', opacity: 0.8, offset: 0.3 },
        { transform: 'translateY(-34px)', opacity: 0 },
      ], { duration: 2200 + i * 180, delay: i * 260, iterations: Infinity, easing: 'ease-out', fill: 'none' })));
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

  async function show(id, { iced = false, style } = {}) {
    const alive = begin();
    if (style) artStyle = style;
    hardStop();
    const def = DRINKS[id];
    if (!def) return;
    let build;
    if (def.special === 'v60') build = buildV60(iced);
    else if (def.juice && def.seasonal) build = buildJuice(def, [], { composer: true });
    else if (def.juice) build = buildJuice(def, def.fruits);
    else build = buildCup(def, iced, artStyle);
    const sc = mount(build, def, id, iced);
    const icedOn = iced && (def.icedVersion || def.iced);
    if (build.composer) {
      composer.list = [];
      cur.wrap.style.transform = drinkTransform(cur, false);
      labels.replaceChildren();
      composer.refresh();
      anim(cur.wrap, [{ opacity: 0, transform: `${drinkTransform(cur, false)} translateY(20px)` }, { opacity: 1, transform: drinkTransform(cur, false) }], { duration: 420, easing: EASE.back, fill: 'none' });
      exploded = false;
      onChange({ phase: 'composer' });
      return;
    }
    title.textContent = def.name + (icedOn ? ' glacé' : '');
    price.textContent = def.price;
    buildLabels(build, sc.e);
    cur.wrap.style.transform = drinkTransform(cur, true);
    setPartsExploded(build, true);
    if (build.v60) build.coffee.style.transform = 'scaleY(0)';
    exploded = true;
    onChange({ phase: 'exploded' });
    if (isReduced()) {
      setPartsExploded(build, false);
      cur.wrap.style.transform = drinkTransform(cur, false);
      labels.querySelectorAll('.dk-label').forEach((L) => (L.style.opacity = '0'));
      if (build.juice) build.liquid.set(build.max, mixColors(build.fruitsList.map((f) => JUICE_COLOR[f.id] || '#F2A64A')));
      if (build.v60) build.coffee.style.transform = '';
      build.fruitEls?.forEach((el) => (el.style.opacity = '0'));
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
    if (alive()) startIdle();
  }

  // ------------------------------------------------------------ composeur de jus
  const composer = {
    list: [],
    color() {
      return mixColors(this.list.map((f) => JUICE_COLOR[f] || '#F2A64A'));
    },
    refresh() {
      const name = juiceName(this.list, this.color());
      title.textContent = name;
      price.textContent = this.list.length ? `${this.list.map((f) => JUICE_LABEL[f]).join(' · ')} — 4 €` : `2 à ${COMPOSER_MAX} ingrédients · 4 €`;
      onChange({ phase: 'composer', list: [...this.list], name });
    },
    /** Ajoute un fruit qui arrive depuis le bouton touché (coordonnées écran). */
    async add(fid, fromRect) {
      if (!cur?.build.composer || this.list.includes(fid) || this.list.length >= COMPOSER_MAX) return;
      const b = cur.build;
      this.list.push(fid);
      this.refresh();
      // Point de départ : le bouton, converti dans le repère du verre
      let from = { x: 120, y: 60 };
      const ctm = svg.getScreenCTM();
      if (fromRect && ctm) {
        const pt = new DOMPoint(fromRect.left + fromRect.width / 2, fromRect.top + fromRect.height / 2).matrixTransform(ctm.inverse());
        from = { x: (pt.x - X_ASSEMBLED) / cur.scaleA, y: (pt.y - BASE_Y) / cur.scaleA + b.v.h + 8 };
      }
      const el = g({ class: 'dk-fruit' });
      const pop = g({ class: 'dk-pop' });
      pop.append(g({ transform: `translate(0 ${f2(-b.v.h - 8)}) scale(1.75)` }, drawProduce(fid, 7 + this.list.length)));
      el.append(pop);
      b.root.append(el);
      const alive = () => cur?.build === b;
      await dropFruit(b, el, pop, fid, from, alive);
      el.remove();
      if (!alive()) return;
      await b.liquid.tween(b.max * Math.min(1, this.list.length / COMPOSER_MAX), this.color(), 560);
      startIdle();
    },
    async remove(fid) {
      if (!cur?.build.composer) return;
      this.list = this.list.filter((f) => f !== fid);
      this.refresh();
      await cur.build.liquid.tween(cur.build.max * Math.min(1, this.list.length / COMPOSER_MAX), this.list.length ? this.color() : cur.build.liquid.state.color, 520);
      startIdle();
    },
    async reset() {
      if (!cur?.build.composer) return;
      this.list = [];
      this.refresh();
      stopIdle();
      await cur.build.liquid.tween(0, cur.build.liquid.state.color, 700);
    },
  };

  return {
    svg,
    show,
    composer,
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
    /** Vue éclatée ↔ assemblée (sans relancer le latte art). */
    async toggle() {
      if (!cur || cur.build.composer) return;
      const alive = begin();
      hardStop();
      if (exploded) {
        await assemble(alive);
        if (alive()) {
          cur.build.art?.setStyle(artStyle);
          startIdle();
        }
      } else {
        cur.wrap.style.opacity = '';
        await explode(alive);
      }
      onChange({ phase: exploded ? 'exploded' : 'done' });
    },
    /** Change le motif et rejoue le versé. */
    async setArt(style) {
      artStyle = style;
      if (!cur?.build.art || cur.iced) return;
      const alive = begin();
      hardStop();
      if (exploded) {
        await assemble(alive);
        if (!alive()) return;
      }
      cur.wrap.style.opacity = '';
      await latteSequence(alive);
      if (alive()) startIdle();
    },
    pause() {
      idleAnims.forEach((a) => a && a.pause());
    },
    resume() {
      idleAnims.forEach((a) => a && a.play());
    },
  };
}
