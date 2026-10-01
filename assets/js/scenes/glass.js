// Verrerie et liquides partagés (café et bar à jus) : contenants vus en coupe avec une
// légère plongée, liquide qui monte et clapote, paille, rondelle de fruit, mélange de couleurs.
// Repère d'un contenant : fond au centre en (0,0), le haut vers les y négatifs.

import { s, g, uid, f2 } from '../lib/svg.js';
import { isReduced } from '../lib/motion.js';
import { BRAND } from './stamp.js';

export const K = 0.2; // aplatissement des ellipses (légère vue plongeante)

export const VESSELS = {
  demitasse: { h: 50, b: 24, t: 37, bowl: 0.6, handle: true, saucer: 62, ceramic: true },
  cup: { h: 66, b: 32, t: 57, bowl: 0.8, handle: true, saucer: 84, ceramic: true },
  tulip: { h: 58, b: 27, t: 47, bowl: 0.7, handle: true, saucer: 72, ceramic: true },
  glass: { h: 118, b: 33, t: 40, bowl: 0, base: 7 },
  tall: { h: 150, b: 33, t: 43, bowl: 0, base: 8 },
  juice: { h: 128, b: 31, t: 41, bowl: 0, base: 8 },
  shot: { h: 58, b: 18, t: 23, bowl: 0, base: 9 },
};

export const P = (x, y) => `${f2(x)} ${f2(y)}`;
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/** Demi-largeur intérieure du contenant à la hauteur y. */
export function hw(v, y) {
  const tn = Math.max(0, Math.min(1, y / v.h));
  const e = v.bowl ? 1 - Math.pow(1 - tn, 1 + v.bowl * 1.6) : tn;
  return v.b + (v.t - v.b) * e;
}

/** Tranche de liquide entre les hauteurs y0 et y1 (fond arrondi). */
export function sliceD(v, y0, y1) {
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

export function vesselBack(v) {
  const wall = v.ceramic ? 4 : 2.5;
  const t = hw(v, v.h);
  return g({ class: 'dk-vback' }, [
    s('ellipse', { cx: 0, cy: -v.h, rx: t + wall, ry: (t + wall) * K, fill: v.ceramic ? '#F4EEE0' : 'rgba(255,255,255,.4)', stroke: BRAND.forest, 'stroke-width': 2 }),
    s('ellipse', { cx: 0, cy: -v.h, rx: t, ry: t * K, fill: v.ceramic ? '#E6DCC6' : 'rgba(18,67,43,.05)' }),
  ]);
}

export function vesselFront(v) {
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

export function strawEl(v, extra = 34) {
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

/** Éclaircit (k > 0) ou assombrit (k < 0) une couleur hexadécimale. */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
  return `#${((1 << 24) + (f(n >> 16) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1)}`;
}

/** Moyenne de couleurs, pondérée si `weights` est fourni (une herbe teinte moins qu'un fruit). */
export function mixColors(list, weights = null) {
  if (!list.length) return '#F2A64A';
  let r = 0;
  let gg = 0;
  let b = 0;
  let total = 0;
  list.forEach((hex, i) => {
    const w = weights ? weights[i] : 1;
    const n = parseInt(hex.slice(1), 16);
    r += (n >> 16) * w;
    gg += ((n >> 8) & 255) * w;
    b += (n & 255) * w;
    total += w;
  });
  const c = (x) => Math.round(x / (total || 1));
  return `#${((1 << 24) + (c(r) << 16) + (c(gg) << 8) + c(b)).toString(16).slice(1)}`;
}

export function mixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16);
  const B = parseInt(b.slice(1), 16);
  const c = (sh) => Math.round(lerp((A >> sh) & 255, (B >> sh) & 255, t));
  return `#${((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1)}`;
}

/** Rondelle d'agrume (garniture). */
export function wheel(color, r = 13) {
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

/** Liquide dans un contenant : niveau et couleur animables, avec clapotis. */
export function liquidEls(v) {
  const body = s('path', { class: 'dk-liq-body' });
  const top = s('ellipse', { class: 'dk-liq-top' });
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
