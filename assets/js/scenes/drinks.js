// Boissons en « vue éclatée » : chaque couche flotte, annotée, puis tout s'assemble
// dans la tasse (et inversement). viewBox de la scène : 0 0 360 300.

import { s, g, svgRoot, uid, rng, f2 } from '../lib/svg.js';
import { anim, EASE, isReduced, wait, settle } from '../lib/motion.js';
import { drawProduce } from './produce.js';
import { FONT_DISPLAY, FONT_HAND, BRAND, brandFontsReady } from './stamp.js';
import { DRINKS, JUICE_COLOR } from '../data/drinks.js';

const FONT_UI = '"Bricolage Grotesque", system-ui, sans-serif';
const K = 0.2; // aplatissement des ellipses (légère vue plongeante)
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
  milkCold: ['#F1EBE0', '#FAF6EF'],
  foam: ['#FAF5EB', '#FFFDF7'],
  matcha: ['#7EA64E', '#99C166'],
  chai: ['#B7793F', '#CD9459'],
};

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

function hw(v, y) {
  const tn = Math.max(0, Math.min(1, y / v.h));
  const e = v.bowl ? 1 - Math.pow(1 - tn, 1 + v.bowl * 1.6) : tn;
  return v.b + (v.t - v.b) * e;
}

function sliceD(v, y0, y1, inset = 0) {
  const steps = v.bowl ? 6 : 1;
  const L = [];
  const R = [];
  for (let i = 0; i <= steps; i++) {
    const y = y0 + ((y1 - y0) * i) / steps;
    const w = hw(v, y) - inset;
    L.push([-w, -y]);
    R.push([w, -y]);
  }
  const w0 = hw(v, y0) - inset;
  let d = `M${P(...L[steps])}`;
  for (let i = steps - 1; i >= 0; i--) d += `L${P(...L[i])}`;
  d += `A${f2(w0)} ${f2(w0 * K)} 0 0 0 ${P(w0, -y0)}`;
  for (let i = 1; i <= steps; i++) d += `L${P(...R[i])}`;
  return `${d}Z`;
}

function layerEl(v, y0, y1, k) {
  const [side, top] = LAYER[k];
  const w1 = hw(v, y1);
  const G = g({ class: 'dk-layer' }, [
    s('path', { d: sliceD(v, y0, y1), fill: side }),
    s('ellipse', { cx: 0, cy: -y1, rx: w1, ry: w1 * K, fill: top }),
  ]);
  if (k === 'foam') {
    const r = rng(y1);
    for (let i = 0; i < 7; i++) {
      G.append(s('circle', { cx: (r() - 0.5) * w1 * 1.4, cy: -y1 + (r() - 0.5) * w1 * K, r: 0.8 + r() * 1.2, fill: '#EDE3D2' }));
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
  // reflets
  const hx = -hw(v, v.h * 0.5) * 0.72;
  G.append(s('path', { d: `M${P(hx, -v.h * 0.88)}L${P(hx - 1.5, -v.h * 0.14)}`, stroke: '#fff', 'stroke-width': v.ceramic ? 2.5 : 3.4, 'stroke-linecap': 'round', opacity: 0.55 }));
  if (v.ceramic) {
    G.append(s('path', { d: `M${P(-tt + 3, -v.h + 7)}Q${P(-tt * 0.3, -v.h + 16)} ${P(-tt * 0.1, -v.h + 13)}`, fill: 'none', stroke: '#12432B', 'stroke-width': 0.8, opacity: 0.25, 'stroke-dasharray': '2 3' }));
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

function heart(cx, cy, rx, ry, color) {
  return s('path', {
    d: 'M0 .78C-.95.12-1-.55-.52-.74-.2-.84 0-.62 0-.4 0-.62.2-.84.52-.74 1-.55.95.12 0 .78Z',
    fill: color,
    transform: `translate(${f2(cx)} ${f2(cy)}) scale(${f2(rx * 0.52)} ${f2(ry * 0.95)})`,
  });
}

function rosetta(cx, cy, rx, ry, color) {
  const G = g({ transform: `translate(${f2(cx)} ${f2(cy)}) scale(${f2(rx * 0.6)} ${f2(ry * 1.05)})` });
  G.append(s('path', { d: 'M-.95 0C-.5-.55.5-.62.95 0 .5.62-.5.55-.95 0Z', fill: color }));
  G.append(s('path', { d: 'M-.8 0H.85M-.5-.3-.3 0-.5.3M-.1-.4.1 0-.1.4M.3-.4.5 0 .3.4', fill: 'none', stroke: '#FFFDF7', 'stroke-width': 0.09 }));
  return G;
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

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16;
  let gg = (n >> 8) & 255;
  let b = n & 255;
  const f = (c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
  r = f(r);
  gg = f(gg);
  b = f(b);
  return `#${((1 << 24) + (r << 16) + (gg << 8) + b).toString(16).slice(1)}`;
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

function steamEl(v) {
  const G = g({ class: 'dk-steam', opacity: 0 });
  [-10, 2, 13].forEach((x, i) => {
    const y0 = -v.h - 10 - hw(v, v.h) * K;
    G.append(s('path', {
      d: `M${x} ${y0}C${x - 7} ${y0 - 10} ${x + 7} ${y0 - 18} ${x} ${y0 - 28}C${x - 6} ${y0 - 36} ${x + 5} ${y0 - 42} ${x} ${y0 - 50}`,
      fill: 'none', stroke: '#A9A294', 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.65, class: `dk-steam-${i}`,
    }));
  });
  return G;
}

// ---------------------------------------------------------------------------
// Construction d'une boisson : renvoie les pièces (état assemblé = offsets 0).
// ---------------------------------------------------------------------------

function buildCup(def, iced) {
  const variant = iced && def.icedVersion ? { ...def, ...def.icedVersion } : def;
  const v = VESSELS[variant.vessel];
  const root = g({ class: 'dk-drink' });
  const parts = [];
  const add = (el, off, label, anchor) => {
    parts.push({ els: [].concat(el), off, label, anchor });
  };
  // saucière + tasse
  if (v.saucer) {
    const sc = saucerEl(v);
    root.append(sc);
    add(sc, { x: 0, y: 34 }, { name: 'Soucoupe', sub: 'porcelaine' }, { x: v.saucer * 0.7, y: 8 });
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
    add(el, { x: 0, y: -(v.h + (i + 1) * GAP) }, { name: L.label, sub: L.sub }, { x: hw(v, mid) + 2, y: -mid });
    parts[parts.length - 1].top = y + L.h + hw(v, y + L.h) * K;
    y += L.h;
  });
  let iceCount = 0;
  if (variant.ice) {
    const ice = iceCubes(v, 16, Math.min(y, v.h - 30), 5);
    layersG.append(ice);
    const cubes = [...ice.children];
    iceCount = cubes.length;
    const ye = -(v.h + (n + 1) * GAP + 8);
    cubes.forEach((c, i) => {
      const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(c.getAttribute('transform'));
      const xa = Number(m[1]);
      const ya = Number(m[2]);
      const xe = -46 + i * 18.5;
      const wrap = g({ class: 'dk-cube' });
      ice.replaceChild(wrap, c);
      wrap.append(c);
      add(wrap, { x: xe - xa, y: ye - ya }, i === cubes.length - 1 ? { name: variant.ice.label, sub: variant.ice.sub } : null, i === cubes.length - 1 ? { x: xa + 10, y: ya } : null);
      parts[parts.length - 1].top = -ya + 12;
    });
  }
  const topY = y;
  const front = vesselFront(v);
  root.append(front);
  const vesselLabel = v.ceramic
    ? { name: variant.vessel === 'demitasse' ? 'Tasse à expresso' : 'Tasse', sub: 'vue en coupe' }
    : { name: 'Verre', sub: variant.vessel === 'tall' ? 'grand format' : 'vue en coupe' };
  parts.push({ els: [back, front], off: { x: 0, y: 12 }, label: vesselLabel, anchor: { x: hw(v, v.h * 0.35) + 4, y: -v.h * 0.35 }, vessel: true });
  if (v.handle) {
    const h = handleEl(v);
    root.insertBefore(h, front.nextSibling);
    add(h, { x: 34, y: 6 }, null, null);
  }
  let extraTop = 0;
  const gdef = variant.garnish;
  if (gdef) {
    const w = hw(v, topY);
    let el;
    if (gdef.k === 'art') el = g({ class: 'dk-garnish' }, heart(0, -topY, w, w * K, gdef.color || '#C08A57'));
    else if (gdef.k === 'rosetta') el = g({ class: 'dk-garnish' }, rosetta(0, -topY, w, w * K, '#C08A57'));
    else if (gdef.k === 'cinnamon') {
      const r = rng(9);
      el = g({ class: 'dk-garnish' });
      for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2;
        const rr = Math.sqrt(r()) * 0.8;
        el.append(s('circle', { cx: f2(Math.cos(a) * w * rr), cy: f2(-topY + Math.sin(a) * w * K * rr), r: 0.9, fill: '#8A4B22', opacity: 0.75 }));
      }
      el.append(g({ transform: `translate(${f2(w * 0.35)} ${f2(-topY - 2)}) rotate(-24)` }, [
        s('rect', { x: -3.5, y: -40, width: 7, height: 42, rx: 3, fill: '#9C5A2C' }),
        s('path', { d: 'M-1 -38v38', stroke: '#6E3C1C', 'stroke-width': 1.2 }),
      ]));
      extraTop = 38;
    } else if (gdef.k === 'straw') {
      el = strawEl(v, 36);
      extraTop = 36;
    }
    if (el) {
      if (gdef.k === 'straw') root.insertBefore(el, front);
      else root.append(el);
      const ay = gdef.k === 'straw' ? -v.h - 22 : -topY;
      const off = gdef.k === 'straw' ? { x: 50, y: -28 } : { x: 0, y: -(v.h + (n + 1) * GAP) };
      add(el, off, { name: gdef.label, sub: gdef.sub }, { x: gdef.k === 'straw' ? hw(v, v.h) * 0.35 + 12 : w * 0.6, y: ay });
    }
  }
  const steam = def.hot && !iced ? steamEl(v) : null;
  if (steam) root.append(steam);
  const height = Math.max(v.h, topY) + extraTop + 10;
  return { root, parts, steam, height, v, iced: !!(iced && def.icedVersion) };
}

function buildJuice(def, month) {
  let fruits = def.fruits;
  if (def.seasonal) fruits = seasonalFruits(month);
  const v = VESSELS[def.vessel];
  const root = g({ class: 'dk-drink dk-juice' });
  const parts = [];
  const color = mixColors(fruits.map((f) => JUICE_COLOR[f.id] || '#F2A64A'));
  const back = vesselBack(v);
  root.append(back);
  const level = v.h * (def.vessel === 'shot' ? 0.8 : 0.84);
  const liquid = g({ class: 'dk-liquid fx-bottom' }, [
    s('path', { d: sliceD(v, 0, level), fill: shade(color, -0.08) }),
    s('ellipse', { cx: 0, cy: -level, rx: hw(v, level), ry: hw(v, level) * K, fill: shade(color, 0.18) }),
  ]);
  root.append(liquid);
  const bubbles = g({ class: 'dk-bubbles', opacity: 0 });
  const r = rng(4);
  for (let i = 0; i < 7; i++) {
    bubbles.append(s('circle', { cx: f2((r() - 0.5) * hw(v, 20) * 1.3), cy: f2(-8 - r() * level * 0.8), r: 1 + r() * 1.6, fill: '#fff', opacity: 0.55 }));
  }
  root.append(bubbles);
  const front = vesselFront(v);
  root.append(front);
  parts.push({ els: [back, front], off: { x: 0, y: 10 }, label: { name: def.vessel === 'shot' ? 'Verre à shot' : 'Verre', sub: 'bien frais' }, anchor: { x: hw(v, v.h * 0.3) + 4, y: -v.h * 0.3 }, vessel: true });
  const fruitEls = fruits.map((f, i) => {
    const el = g({ class: 'dk-fruit' });
    const art = g({ class: 'fx-box', transform: `translate(0 ${f2(-v.h - 8)}) scale(${def.vessel === 'shot' ? 1.5 : 1.75})` }, drawProduce(f.id, 3 + i));
    el.append(art);
    root.append(el);
    const zig = fruits.length > 1 ? (i % 2 ? 16 : -16) : 0;
    parts.push({ els: [el], off: { x: zig, y: -(i + 1) * 38 - 8 }, label: { name: f.label, sub: f.sub }, anchor: { x: 20, y: -v.h - 8 }, top: v.h + 26, fruit: true });
    return el;
  });
  let garnish = null;
  if (def.garnish) {
    garnish = g({ class: 'dk-garnish' }, g({ transform: `translate(${f2(hw(v, v.h) - 2)} ${f2(-v.h + 2)})` }, wheel(def.seasonal ? color : def.garnish.color, 13)));
    root.append(garnish);
    const straw = strawEl(v, 30);
    root.insertBefore(straw, front);
    parts.push({ els: [garnish, straw], off: { x: 40, y: -30 }, label: { name: def.garnish.label, sub: def.garnish.sub }, anchor: { x: hw(v, v.h) + 12, y: -v.h }, garnish: true });
  }
  return { root, parts, liquid, bubbles, fruitEls, height: v.h + 40, v, juice: true };
}

function seasonalFruits(month) {
  const pool = ['peche', 'abricot', 'raisin', 'fraise', 'melon', 'pomme', 'poire', 'orange', 'clementine', 'kiwi', 'framboise', 'prune', 'figue', 'pasteque'];
  // Imports dynamiques évités : la liste des saisons arrive via setSeason().
  const ids = (buildJuice.season || []).filter((p) => pool.includes(p.id)).slice(0, 3);
  const list = ids.length ? ids : [{ id: 'pomme', name: 'Pomme' }, { id: 'poire', name: 'Poire' }];
  return list.map((p) => ({ id: p.id, label: p.name.split(' ')[0], sub: 'de l’étal, en ce moment' }));
}

function buildV60(iced) {
  const root = g({ class: 'dk-drink dk-v60' });
  const parts = [];
  // Carafe
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
  parts.push({ els: [carafe], off: { x: 0, y: 10 }, label: { name: 'Carafe', sub: 'pour une à deux tasses' }, anchor: { x: 40, y: -30 }, vessel: true });
  let ice = null;
  if (iced) {
    ice = g({ class: 'dk-ice' });
    [[-12, -14], [10, -12], [-2, -28], [14, -30], [-16, -34]].forEach(([x, y], i) => ice.append(g({ transform: `translate(${x} ${y}) rotate(${i * 17})` }, [
      s('rect', { x: -7, y: -7, width: 14, height: 14, rx: 3, fill: 'rgba(226,241,247,.8)', stroke: 'rgba(110,150,170,.55)', 'stroke-width': 1 }),
    ])));
    root.insertBefore(ice, carafe.nextSibling);
    parts.push({ els: [ice], off: { x: 0, y: -26 }, label: { name: 'Glaçons', sub: 'le café coule dessus' }, anchor: { x: 26, y: -24 } });
  }
  // Dripper : arrière (ouverture), filtre, mouture, avant
  const dBack = g({ class: 'dk-dripper-back' }, [
    s('ellipse', { cx: 0, cy: -126, rx: 37, ry: 7.4, fill: '#E7DFCB', stroke: BRAND.forest, 'stroke-width': 2 }),
  ]);
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
  parts.push({ els: [dBack, dFront], off: { x: 0, y: -22 }, label: { name: 'Dripper V60', sub: 'extraction douce' }, anchor: { x: 30, y: -104 } });
  parts.push({ els: [filter], off: { x: 0, y: -48 }, label: { name: 'Filtre papier', sub: 'rincé à l’eau chaude' }, anchor: { x: 30, y: -128 } });
  parts.push({ els: [grounds], off: { x: 0, y: -72 }, label: { name: 'Mouture', sub: 'grains Kaduck, moulus minute' }, anchor: { x: 26, y: -118 } });
  // Eau
  const water = g({ class: 'dk-water' }, [
    s('path', { d: 'M0-150C-7-139-8-133-8-130A8 8 0 0 0 8-130C8-133 7-139 0-150Z', fill: '#9CC6D8', stroke: '#5E93AA', 'stroke-width': 1.2 }),
  ]);
  root.append(water);
  parts.push({ els: [water], off: { x: 0, y: -80 }, label: { name: 'Eau à 93 °C', sub: 'versée lentement, en spirale' }, anchor: { x: 10, y: -134 } });
  const stream = s('path', { d: 'M0-200V-122', stroke: '#9CC6D8', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0, class: 'dk-stream' });
  const drops = g({ class: 'dk-drops' }, [0, 1, 2].map((i) => s('ellipse', { cx: 0, cy: -82, rx: 1.8, ry: 2.6, fill: '#5C3019', opacity: 0, class: `dk-drop-${i}` })));
  root.append(stream, drops);
  return { root, parts, height: 136, coffee, stream, drops, water, v60: true, iced };
}

// ---------------------------------------------------------------------------
// Scène
// ---------------------------------------------------------------------------

export async function createDrinkScene() {
  await brandFontsReady();
  const svg = svgRoot('0 0 360 300', { preserveAspectRatio: 'xMidYMid meet', class: 'drinks' });
  svg.style.overflow = 'visible';
  const title = s('text', { x: 18, y: 32, 'font-family': FONT_DISPLAY, 'font-size': 22, fill: BRAND.forest, class: 'dk-title' });
  const price = s('text', { x: 18, y: 50, 'font-family': FONT_HAND, 'font-size': 14.5, fill: '#4E6E50', 'letter-spacing': 0.6, class: 'dk-price' });
  const mode = s('text', { x: 342, y: 28, 'text-anchor': 'end', 'font-family': FONT_HAND, 'font-size': 12, fill: '#4E6E50', 'letter-spacing': 0.8, class: 'dk-mode' });
  const stage = g({ class: 'dk-stage' });
  const labels = g({ class: 'dk-labels' });
  svg.append(title, price, mode, stage, labels);

  let cur = null;
  let exploded = false;
  let busy = Promise.resolve();
  let month = new Date().getMonth() + 1;
  const idleAnims = [];

  const stopIdle = () => {
    idleAnims.splice(0).forEach((a) => a && a.cancel());
  };

  function setMode(txt) {
    mode.textContent = txt;
  }

  function drinkTransform(st, isExploded) {
    return `translate(${isExploded ? X_EXPLODED : X_ASSEMBLED}px, ${BASE_Y}px) scale(${isExploded ? st.scaleE : st.scaleA})`;
  }

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
    // Espacement minimal entre étiquettes
    for (let i = 1; i < items.length; i++) {
      if (items[i].ly - items[i - 1].ly < 27) items[i].ly = items[i - 1].ly + 27;
    }
    const overflow = items.length ? items[items.length - 1].ly - 286 : 0;
    if (overflow > 0) items.forEach((it) => (it.ly -= overflow));
    items.forEach((it) => {
      const G = g({ class: 'dk-label', opacity: 0 });
      const midX = LABEL_X - 16;
      G.append(
        s('path', { d: `M${f2(it.ax + 3)} ${f2(it.ay)}H${f2(Math.max(it.ax + 8, midX - 8))}L${f2(midX)} ${f2(it.ly)}H${LABEL_X - 5}`, fill: 'none', stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '3 3', class: 'dk-leader' }),
        s('circle', { cx: f2(it.ax + 3), cy: f2(it.ay), r: 2.4, fill: '#E97A2C' }),
        s('text', { x: LABEL_X, y: f2(it.ly + 1), 'font-family': FONT_HAND, 'font-size': 14.5, fill: BRAND.forest, text: it.p.label.name }),
        s('text', { x: LABEL_X, y: f2(it.ly + 13), 'font-family': FONT_UI, 'font-size': 9.6, fill: INK, text: it.p.label.sub || '' }),
      );
      labels.append(G);
      it.p.labelEl = G;
    });
  }

  function setPartsExploded(build, on) {
    build.parts.forEach((p) => {
      p.els.forEach((el) => {
        el.style.transform = on ? `translate(${p.off.x}px, ${p.off.y}px)` : '';
      });
    });
  }

  async function explode({ fast = false } = {}) {
    if (!cur) return;
    stopIdle();
    exploded = true;
    setMode('vue éclatée');
    const b = cur.build;
    if (b.steam) b.steam.setAttribute('opacity', 0);
    if (b.juice) {
      settle(anim(b.liquid, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: fast ? 1 : 420, easing: EASE.inOut }));
      b.bubbles.setAttribute('opacity', 0);
    }
    if (b.v60) {
      b.coffee.style.transform = 'scaleY(0)';
      b.stream.setAttribute('opacity', 0);
      b.water.getAnimations().forEach((a) => a.cancel());
    }
    const dur = fast ? 1 : 620;
    const list = [];
    list.push(anim(cur.wrap, [{ transform: drinkTransform(cur, false) }, { transform: drinkTransform(cur, true) }], { duration: dur, easing: EASE.inOut }));
    b.parts.forEach((p, i) => {
      const from = p.fruit ? { transform: 'translate(0px, 26px) scale(.25)', opacity: 0 } : { transform: 'translate(0px, 0px)' };
      const to = p.fruit ? { transform: `translate(${p.off.x}px, ${p.off.y}px) scale(1)`, opacity: 1 } : { transform: `translate(${p.off.x}px, ${p.off.y}px)` };
      p.els.forEach((el) => list.push(anim(el, [from, to], { duration: dur, delay: fast ? 0 : i * 40, easing: EASE.out })));
    });
    labels.querySelectorAll('.dk-label').forEach((L, i) => list.push(anim(L, [{ opacity: 0 }, { opacity: 1 }], { duration: fast ? 1 : 360, delay: fast ? 0 : 320 + i * 60 })));
    await Promise.all(list.map((a) => settle(a)));
  }

  async function assemble() {
    if (!cur) return;
    exploded = false;
    setMode('assemblé');
    const b = cur.build;
    const order = b.parts
      .map((p, i) => ({ p, i }))
      .sort((a, z) => {
        const rank = (x) => (x.p.vessel ? 0 : x.p.off.y > 0 ? 0 : x.p.garnish ? 99 : 1);
        return rank(a) - rank(z) || z.p.off.y - a.p.off.y;
      });
    const list = [];
    let t = 0;
    order.forEach(({ p }) => {
      const delay = t;
      t += b.juice && p.fruit ? 340 : 170;
      if (p.fruit) {
        p.els.forEach((el) => list.push(anim(el, [
          { transform: `translate(${p.off.x}px, ${p.off.y}px) scale(1)`, opacity: 1 },
          { transform: 'translate(0px, 0px) scale(1)', opacity: 1, offset: 0.55 },
          { transform: 'translate(0px, 26px) scale(.25)', opacity: 0 },
        ], { duration: 640, delay, easing: EASE.inOut })));
      } else {
        p.els.forEach((el) => list.push(anim(el, [
          { transform: `translate(${p.off.x}px, ${p.off.y}px)` },
          { transform: 'translate(0px, 0px)' },
        ], { duration: 560, delay, easing: EASE.back })));
      }
      if (p.labelEl) list.push(anim(p.labelEl, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay }));
    });
    if (b.juice) {
      const n = b.fruitEls.length;
      const firstFruitDelay = order.findIndex((o) => o.p.fruit) * 170;
      b.liquid.style.transform = 'scaleY(0)';
      list.push(anim(b.liquid, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
        duration: 340 * n + 400, delay: firstFruitDelay + 300, easing: EASE.inOut,
      }));
    }
    list.push(anim(cur.wrap, [{ transform: drinkTransform(cur, true) }, { transform: drinkTransform(cur, false) }], {
      duration: 700, delay: Math.max(0, t - 350), easing: EASE.inOut,
    }));
    await Promise.all(list.map((a) => settle(a)));
    if (b.juice) b.liquid.style.transform = '';
    if (b.v60) await brew(b);
    startIdle();
  }

  async function brew(b) {
    if (isReduced()) {
      b.coffee.style.transform = '';
      return;
    }
    anim(b.water, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(14px)' }], { duration: 300, fill: 'forwards' });
    const pour = anim(b.stream, [{ opacity: 0, strokeDasharray: '0 200' }, { opacity: 0.9, strokeDasharray: '200 0' }], { duration: 500, easing: EASE.out });
    await settle(pour);
    const fill = anim(b.coffee, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 2200, easing: EASE.inOut });
    const drips = [...b.drops.children].map((d, i) => anim(d, [
      { opacity: 0, transform: 'translateY(0px)' },
      { opacity: 1, transform: 'translateY(4px)', offset: 0.2 },
      { opacity: 0, transform: 'translateY(40px)' },
    ], { duration: 600, delay: i * 200, iterations: 3, easing: EASE.in }));
    await settle(fill);
    drips.forEach((d) => d && d.cancel());
    anim(b.stream, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 300 });
  }

  function startIdle() {
    stopIdle();
    if (isReduced() || !cur) return;
    const b = cur.build;
    if (b.steam) {
      b.steam.setAttribute('opacity', 1);
      b.steam.querySelectorAll('path').forEach((p, i) => {
        p.style.transformBox = 'fill-box';
        idleAnims.push(anim(p, [
          { transform: 'translateY(6px) scaleX(1)', opacity: 0 },
          { transform: 'translateY(-2px) scaleX(1.15)', opacity: 0.7, offset: 0.4 },
          { transform: 'translateY(-14px) scaleX(.9)', opacity: 0 },
        ], { duration: 2400, delay: i * 700, iterations: Infinity, easing: 'ease-in-out', fill: 'none' }));
      });
    }
    if (b.juice) {
      b.bubbles.setAttribute('opacity', 1);
      [...b.bubbles.children].forEach((c, i) => idleAnims.push(anim(c, [
        { transform: 'translateY(0)', opacity: 0 },
        { transform: 'translateY(-10px)', opacity: 0.8, offset: 0.3 },
        { transform: 'translateY(-34px)', opacity: 0 },
      ], { duration: 2200 + i * 180, delay: i * 260, iterations: Infinity, easing: 'ease-out', fill: 'none' })));
    }
    const ice = cur.build.root.querySelector('.dk-ice');
    if (ice && !exploded) {
      [...ice.children].forEach((c, i) => {
        const inner = c.firstChild;
        idleAnims.push(anim(inner, [{ transform: 'translateY(0)' }, { transform: 'translateY(-2.5px)' }], {
          duration: 1400 + i * 150, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none',
        }));
      });
    }
  }

  /** Affiche une boisson : apparition éclatée, puis assemblage. */
  function show(id, { iced = false, instant = false } = {}) {
    busy = busy.then(async () => {
      const def = DRINKS[id];
      if (!def) return;
      stopIdle();
      // Sortie de la boisson précédente
      if (cur) {
        const old = cur.wrap;
        const out = anim(old, [{ opacity: 1 }, { opacity: 0, transform: `${old.style.transform || ''} translateY(-8px)` }], { duration: instant ? 1 : 220, fill: 'forwards' });
        anim(labels, [{ opacity: 1 }, { opacity: 0 }], { duration: instant ? 1 : 200, fill: 'none' });
        await settle(out);
        old.remove();
      }
      buildJuice.season = api.season || [];
      const build = def.special === 'v60' ? buildV60(iced) : def.juice ? buildJuice(def, month) : buildCup(def, iced);
      const sc = computeScales(build);
      const wrap = g({ class: 'dk-wrap' }, build.root);
      stage.append(wrap);
      cur = { id, def, build, wrap, scaleE: sc.e, scaleA: sc.a, iced };
      title.textContent = def.name + (iced && (def.icedVersion || def.iced) ? ' glacé' : '');
      price.textContent = def.price;
      buildLabels(build, sc.e);
      labels.style.opacity = '';
      // état éclaté immédiat
      wrap.style.transform = drinkTransform(cur, true);
      setPartsExploded(build, true);
      if (build.juice) build.liquid.style.transform = 'scaleY(0)';
      if (build.v60) build.coffee.style.transform = 'scaleY(0)';
      labels.querySelectorAll('.dk-label').forEach((L) => L.setAttribute('opacity', 1));
      if (isReduced()) {
        setPartsExploded(build, false);
        wrap.style.transform = drinkTransform(cur, false);
        labels.querySelectorAll('.dk-label').forEach((L) => L.setAttribute('opacity', 0));
        if (build.juice) build.liquid.style.transform = '';
        if (build.v60) build.coffee.style.transform = '';
        exploded = false;
        setMode('');
        return;
      }
      anim(wrap, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'none' });
      labels.querySelectorAll('.dk-label').forEach((L, i) => anim(L, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 80 + i * 50, fill: 'none' }));
      exploded = true;
      setMode('vue éclatée');
      await wait(instant ? 0 : 900);
      if (cur && cur.id === id) {
        labels.querySelectorAll('.dk-label').forEach((L) => L.setAttribute('opacity', 1));
        await assemble();
      }
    });
    return busy;
  }

  const api = {
    svg,
    season: [],
    show,
    get current() {
      return cur && cur.id;
    },
    get exploded() {
      return exploded;
    },
    toggle() {
      busy = busy.then(() => (exploded ? assemble() : explode()));
      return busy;
    },
    setMonth(m) {
      month = m;
    },
    pause() {
      idleAnims.forEach((a) => a && a.pause());
    },
    resume() {
      idleAnims.forEach((a) => a && a.play());
    },
  };
  return api;
}
