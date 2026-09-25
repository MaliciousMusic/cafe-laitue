// Petits utilitaires SVG : création d'éléments, hasard déterministe, géométrie.

export const NS = 'http://www.w3.org/2000/svg';

/** Crée un élément SVG. `text` = textContent, `style` objet accepté. */
export function s(tag, attrs = {}, children = []) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return n;
}

export const g = (attrs = {}, children = []) => s('g', attrs, children);

/** Racine <svg> décorative (masquée aux lecteurs d'écran). */
export function svgRoot(viewBox, attrs = {}) {
  return s('svg', {
    viewBox,
    xmlns: NS,
    'aria-hidden': 'true',
    focusable: 'false',
    ...attrs,
  });
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function rng(seed = 1) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const f2 = (n) => Math.round(n * 100) / 100;

let _uid = 0;
export const uid = (p = 'cl') => `${p}-${++_uid}`;

/** Cercle légèrement irrégulier, comme tracé à la main. */
export function wobblyCircle(cx, cy, r, { amp = 1.2, seed = 3, steps = 120, start = -Math.PI / 2 } = {}) {
  const R = rng(seed);
  const p1 = R() * 6.28;
  const p2 = R() * 6.28;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const a = start + (i / steps) * Math.PI * 2;
    const rr = r + amp * Math.sin(3 * a + p1) + amp * 0.55 * Math.sin(7 * a + p2);
    d += `${i ? 'L' : 'M'}${f2(cx + rr * Math.cos(a))} ${f2(cy + rr * Math.sin(a))}`;
  }
  return d + 'Z';
}

/** Boucle « cursive » : suite de pétales tracés d'un seul trait. */
export function cursiveLoops(start, petals, end) {
  let d = `M${f2(start[0])} ${f2(start[1])}`;
  let cur = start;
  petals.forEach((p, i) => {
    const next = i < petals.length - 1 ? petals[i + 1].base : end;
    const [tx, ty] = p.tip;
    const bx = (cur[0] + next[0]) / 2;
    const by = (cur[1] + next[1]) / 2;
    let ux = tx - bx;
    let uy = ty - by;
    const L = Math.hypot(ux, uy) || 1;
    ux /= L;
    uy /= L;
    const nx = -uy;
    const ny = ux;
    const w = p.w ?? L * 0.32;
    const k = p.k ?? 1;
    const c1 = [cur[0] + ux * L * 0.3 - nx * w * 0.6, cur[1] + uy * L * 0.3 - ny * w * 0.6];
    const c2 = [tx - nx * w * 1.25 * k - ux * w * 0.55, ty - ny * w * 1.25 * k - uy * w * 0.55];
    const c3 = [tx + nx * w * 1.25 * k - ux * w * 0.55, ty + ny * w * 1.25 * k - uy * w * 0.55];
    const c4 = [next[0] + ux * L * 0.3 + nx * w * 0.6, next[1] + uy * L * 0.3 + ny * w * 0.6];
    d += `C${f2(c1[0])} ${f2(c1[1])} ${f2(c2[0])} ${f2(c2[1])} ${f2(tx)} ${f2(ty)}`;
    d += `C${f2(c3[0])} ${f2(c3[1])} ${f2(c4[0])} ${f2(c4[1])} ${f2(next[0])} ${f2(next[1])}`;
    cur = next;
  });
  return d;
}
