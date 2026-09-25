// Latte art en vue plongeante : ses mains, le pichet, le filet de lait et le motif
// (cœur ou cygne) qui se dessine à la surface. Tout est piloté par une timeline rAF.

import { s, g, uid, rng, f2 } from '../lib/svg.js';
import { isReduced } from '../lib/motion.js';
import { PAL } from './character.js';

export const MILK = '#FFF8EC';
const MILK_EDGE = '#EADBC4';
const FOREST = '#12432B';
const SURF_R = 62;

const SURFACES = {
  coffee: ['#DFAE74', '#C68842', '#94572A'],
  matcha: ['#AACB6C', '#87AE4E', '#5F8A36'],
  chai: ['#DDB07A', '#BE8745', '#8E5C2C'],
};
// Fines lignes de crème entre les couches de lait (cœur à couches)
const CREMA_LINE = { coffee: '#C8894A', matcha: '#7FA34A', chai: '#C08848' };
const HEART_S = 2.45;
const RINGS = 6;

// ---------------------------------------------------------------- géométrie
const TAU = Math.PI * 2;
const N = 72;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const ease = {
  inOut: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  out: (k) => 1 - Math.pow(1 - k, 3),
  in: (k) => k * k * k,
  back: (k) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  },
  linear: (k) => k,
};

/** Cœur paramétrique (lobes en haut, pointe en bas), centré sur (cx, cy). */
function heartPts(cx, cy, sc) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * TAU;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 2.5;
    pts.push([cx + x * sc, cy + y * sc]);
  }
  return pts;
}

function circlePts(cx, cy, r, wobble = 0, phase = 0) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * TAU;
    const rr = r * (1 + wobble * Math.sin(5 * t + phase) + wobble * 0.6 * Math.sin(3 * t - phase * 1.3));
    pts.push([cx + rr * Math.sin(t), cy - rr * Math.cos(t)]);
  }
  return pts;
}

const mixPts = (a, b, t) => a.map((p, i) => [lerp(p[0], b[i][0], t), lerp(p[1], b[i][1], t)]);

/** Tracé lisse fermé (Catmull-Rom → Bézier). */
function smooth(pts) {
  const n = pts.length;
  let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)} ${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)} ${f2(p2[0])} ${f2(p2[1])}`;
  }
  return `${d}Z`;
}

// ---------------------------------------------------------------- cygne (repère : surface centrée en 0,0, rayon 62)
// Cou épais en S : tête en haut à gauche (bec vers la gauche), arche, descente au centre,
// corps qui file vers la droite. Aile en plumes étagées à droite, pointes vers le haut.
const NECK = [
  [[-24, -30], [-19, -49], [12, -54], [13, -28]],
  [[13, -28], [14, -6], [-9, 6], [-8, 28]],
  [[-8, 28], [-7, 42], [16, 46], [35, 34]],
];
const HEAD = { x: -27, y: -24, rot: 200, sc: 0.5 };
const BEAK = 'M-32.5 -21.5L-42 -16.5L-31 -17.2Z';
const FEATHERS = Array.from({ length: 6 }, (_, i) => {
  const t = i / 5;
  return {
    x: lerp(7, 18, t), // racine (le long du cou)
    y: lerp(24, -20, t),
    L: lerp(52, 24, t), // longueur de la plume
    h: lerp(14.5, 8, t),
    rot: lerp(-12, -38, t),
  };
});

function bez(p, t) {
  const u = 1 - t;
  return [
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
  ];
}
function bezD(p, t) {
  const u = 1 - t;
  return [
    3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0]),
    3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1]),
  ];
}
/** Point + tangente du cou, u = 0 (tête) → 1 (corps). */
function neckAt(u) {
  const n = NECK.length;
  const x = Math.min(n - 1e-6, Math.max(0, u) * n);
  const i = Math.floor(x);
  return { p: bez(NECK[i], x - i), d: bezD(NECK[i], x - i) };
}
const neckW = (u) => lerp(4.2, 11.5, Math.pow(Math.max(0, u), 0.8));

/** Contour rempli du cou entre u0 et u1 (effilé vers la tête) + bouts arrondis. */
function neckShape(u0, u1, ox = 0, oy = 0) {
  const n = 56;
  const Lp = [];
  const Rp = [];
  for (let i = 0; i <= n; i++) {
    const u = lerp(u0, u1, i / n);
    const { p, d } = neckAt(u);
    const len = Math.hypot(d[0], d[1]) || 1;
    const nx = -d[1] / len;
    const ny = d[0] / len;
    const w = neckW(u) / 2;
    Lp.push([ox + p[0] + nx * w, oy + p[1] + ny * w]);
    Rp.push([ox + p[0] - nx * w, oy + p[1] - ny * w]);
  }
  let d = `M${f2(Lp[0][0])} ${f2(Lp[0][1])}`;
  for (let i = 1; i <= n; i++) d += `L${f2(Lp[i][0])} ${f2(Lp[i][1])}`;
  for (let i = n; i >= 0; i--) d += `L${f2(Rp[i][0])} ${f2(Rp[i][1])}`;
  d += 'Z';
  const a = neckAt(u0).p;
  const b = neckAt(u1).p;
  const r0 = neckW(u0) / 2;
  const r1 = neckW(u1) / 2;
  d += `M${f2(ox + a[0] - r0)} ${f2(oy + a[1])}a${f2(r0)} ${f2(r0)} 0 1 0 ${f2(r0 * 2)} 0a${f2(r0)} ${f2(r0)} 0 1 0 ${f2(-r0 * 2)} 0Z`;
  d += `M${f2(ox + b[0] - r1)} ${f2(oy + b[1])}a${f2(r1)} ${f2(r1)} 0 1 0 ${f2(r1 * 2)} 0a${f2(r1)} ${f2(r1)} 0 1 0 ${f2(-r1 * 2)} 0Z`;
  return d;
}

/** Plume : lame courbe de la racine (0,0) vers la pointe (L, 0). */
function featherPath(L, h) {
  return `M0 0C${f2(L * 0.28)} ${f2(-h * 1.05)} ${f2(L * 0.72)} ${f2(-h * 1.1)} ${f2(L)} ${f2(-h * 0.35)}C${f2(L * 0.7)} ${f2(h * 0.05)} ${f2(L * 0.32)} ${f2(h * 0.35)} 0 ${f2(h * 0.45)}Z`;
}
function feather(F, ox = 0, oy = 0, line = '#C8894A', k = 1) {
  return s('path', {
    d: featherPath(F.L * k, F.h * Math.min(1, 0.4 + k * 0.6)),
    fill: MILK,
    stroke: line,
    'stroke-width': 1.1,
    'stroke-linejoin': 'round',
    transform: `translate(${f2(ox + F.x)} ${f2(oy + F.y)}) rotate(${f2(F.rot)})`,
  });
}

function swanHead(ox, oy, k = 1) {
  return g({}, [
    s('path', { d: smooth(heartPts(0, 0, HEAD.sc * k)), fill: MILK, transform: `translate(${f2(ox + HEAD.x)} ${f2(oy + HEAD.y)}) rotate(${HEAD.rot})` }),
    s('path', { d: BEAK, fill: MILK, transform: `translate(${f2(ox)} ${f2(oy)})`, opacity: k >= 1 ? 1 : 0 }),
  ]);
}

// ---------------------------------------------------------------- cœur à couches (« wave heart »)
function heartRing(i, cx, cy, k = 1) {
  return heartPts(cx, cy - 3 + i * 2.5 * k, HEART_S * (1 - i * 0.125));
}

/** Motif final (statique), centré en 0,0 pour une surface de rayon 62. */
export function buildArt(style = 'heart', surface = 'coffee') {
  const line = CREMA_LINE[surface] || CREMA_LINE.coffee;
  const G = g({ class: 'art' });
  if (style === 'swan') {
    FEATHERS.forEach((F) => G.append(feather(F, 0, 0, line)));
    G.append(s('path', { d: neckShape(0, 1), fill: MILK }), swanHead(0, 0));
  } else {
    G.append(s('path', { d: smooth(heartPts(0, -3, HEART_S)), fill: MILK }));
    for (let i = 1; i <= RINGS; i++) {
      G.append(s('path', { d: smooth(heartRing(i, 0, 0)), fill: 'none', stroke: line, 'stroke-width': 1.9, opacity: 0.9 }));
    }
    G.append(s('path', { d: 'M0 -9L0 -1', stroke: line, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.8 }));
  }
  return G;
}

// ---------------------------------------------------------------- mains & pichet
function rightArm() {
  // Repère : bec du pichet en (0,0). Le pichet et le bras partent vers le haut à droite.
  const G = g({ class: 'la-right' });
  const steel = uid('steel');
  G.append(
    s('defs', {}, s('radialGradient', { id: steel, cx: 0.38, cy: 0.35, r: 0.75 }, [
      s('stop', { offset: 0, 'stop-color': '#FBFCFC' }),
      s('stop', { offset: 0.55, 'stop-color': '#D3DADE' }),
      s('stop', { offset: 1, 'stop-color': '#9AA6AD' }),
    ])),
    // Manche en jean + revers + bracelet
    s('path', { d: 'M92 -78L150 -150L204 -110L130 -40Z', fill: PAL.denim }),
    s('path', { d: 'M92 -78L114 -104L152 -66L130 -40Z', fill: PAL.denimLight }),
    s('path', { d: 'M103 -91L141 -53', stroke: PAL.denimDark, 'stroke-width': 1.2, opacity: 0.6 }),
    s('path', { d: 'M86 -68L96 -80L126 -50L116 -38Z', fill: '#1B1B1B' }),
  );
  const pitcher = g({ class: 'la-pitcher' }, [
    s('ellipse', { cx: 40, cy: -32, rx: 36, ry: 34, fill: '#000', opacity: 0.12, transform: 'translate(6 8)' }),
    s('path', { d: 'M8 -20Q-2 -3 -3 2Q4 -1 22 -8Z', fill: `url(#${steel})`, stroke: '#8E9AA2', 'stroke-width': 1.3, 'stroke-linejoin': 'round' }),
    s('circle', { cx: 40, cy: -32, r: 33, fill: `url(#${steel})`, stroke: '#8E9AA2', 'stroke-width': 1.6 }),
    s('circle', { cx: 40, cy: -32, r: 27.5, fill: '#E7ECEF', stroke: '#B7C1C7', 'stroke-width': 1.2 }),
    s('ellipse', { cx: 36, cy: -28, rx: 24, ry: 23, fill: MILK, class: 'la-milk' }),
    s('path', { d: 'M22 -50Q34 -60 50 -56', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none', opacity: 0.8 }),
    // Anse
    s('path', { d: 'M66 -52C86 -60 94 -36 74 -22', fill: 'none', stroke: '#A9B4BA', 'stroke-width': 8, 'stroke-linecap': 'round' }),
  ]);
  // Main droite qui serre l'anse
  const hand = g({ class: 'la-hand' }, [
    s('path', { d: 'M70 -66C82 -78 104 -74 110 -58C116 -42 104 -26 88 -22C80 -20 72 -26 70 -34Z', fill: PAL.skin }),
    s('path', { d: 'M74 -40C80 -36 88 -36 94 -40M76 -48C82 -44 90 -45 96 -49M80 -56C86 -53 93 -54 99 -58', fill: 'none', stroke: PAL.skinShade, 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
    s('path', { d: 'M72 -62C64 -64 58 -58 60 -52C62 -48 68 -48 72 -52Z', fill: PAL.skin, stroke: PAL.skinShade, 'stroke-width': 1 }),
  ]);
  G.append(pitcher, hand);
  return { g: G, pitcher, milk: pitcher.querySelector('.la-milk') };
}

function leftArm() {
  // Main gauche qui tient l'anse de la tasse (repère : anse en 0,0), bras vers le bas à gauche.
  const G = g({ class: 'la-left' });
  G.append(
    s('path', { d: 'M-40 40L-120 150L-60 190L6 64Z', fill: PAL.denim }),
    s('path', { d: 'M-40 40L-58 66L-8 98L6 64Z', fill: PAL.denimLight }),
    s('path', { d: 'M-50 52L-4 84', stroke: PAL.denimDark, 'stroke-width': 1.2, opacity: 0.6 }),
    // Montre argentée
    s('path', { d: 'M-34 30L-44 44L-6 70L4 56Z', fill: '#C9CED3', stroke: '#8E969C', 'stroke-width': 1 }),
    s('rect', { x: -26, y: 38, width: 18, height: 14, rx: 2.5, fill: '#2E3A33', transform: 'rotate(34 -17 45)', stroke: '#B8BEC3', 'stroke-width': 1.5 }),
    s('path', { d: 'M-22 44h8', stroke: '#9FD0B4', 'stroke-width': 1.2, transform: 'rotate(34 -17 45)' }),
    // Main
    s('path', { d: 'M-30 26C-40 10 -30 -8 -12 -10C4 -12 16 -2 16 12C16 26 6 36 -8 38C-18 40 -26 34 -30 26Z', fill: PAL.skin }),
    s('path', { d: 'M-4 -8C2 -16 12 -14 12 -6C12 0 6 2 2 -2', fill: PAL.skin, stroke: PAL.skinShade, 'stroke-width': 1 }),
    s('path', { d: 'M-14 20C-6 22 2 20 8 14M-18 10C-10 12 -2 10 4 4', fill: 'none', stroke: PAL.skinShade, 'stroke-width': 1.5, 'stroke-linecap': 'round' }),
  );
  return G;
}

// ---------------------------------------------------------------- timeline
function timeline(duration, tracks, alive) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const done = new Set();
    const frame = (now) => {
      if (!alive()) return resolve(false);
      const t = now - t0;
      for (const tr of tracks) {
        if (t < tr.from || done.has(tr)) continue;
        const p = clamp01((t - tr.from) / Math.max(1, tr.to - tr.from));
        tr.update((tr.ease || ease.inOut)(p), p, t);
        if (p >= 1 && !tr.loop) done.add(tr);
      }
      if (t >= duration) return resolve(true);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

/**
 * Scène plongeante. `C` = centre de la tasse dans le repère de la scène.
 * @returns {{ g: SVGGElement, run: Function, reset: Function }}
 */
export function createLatteArt({ C = [180, 150] } = {}) {
  const [cx, cy] = C;
  const root = g({ class: 'la', opacity: 0 });
  const surfId = uid('surf');
  const clipId = uid('surfclip');
  const defs = s('defs', {}, [s('clipPath', { id: clipId }, s('circle', { cx, cy, r: SURF_R }))]);
  const grad = s('radialGradient', { id: surfId, cx: 0.5, cy: 0.45, r: 0.55 });
  defs.append(grad);

  // Soucoupe + tasse vues de dessus
  const saucer = g({ class: 'la-saucer' }, [
    s('circle', { cx: cx + 4, cy: cy + 6, r: 106, fill: '#000', opacity: 0.08 }),
    s('circle', { cx, cy, r: 104, fill: '#F3ECDB', stroke: FOREST, 'stroke-width': 2 }),
    s('circle', { cx, cy, r: 84, fill: 'none', stroke: '#849E83', 'stroke-width': 1.3 }),
  ]);
  const handleD = `M${cx - 72} ${cy + 14}C${cx - 106} ${cy + 20} ${cx - 106} ${cy - 22} ${cx - 72} ${cy - 16}`;
  const cup = g({ class: 'la-cup' }, [
    s('path', { d: handleD, fill: 'none', stroke: FOREST, 'stroke-width': 11, 'stroke-linecap': 'round' }),
    s('path', { d: handleD, fill: 'none', stroke: '#F6F0E0', 'stroke-width': 6, 'stroke-linecap': 'round' }),
    s('circle', { cx: cx + 3, cy: cy + 5, r: 76, fill: '#000', opacity: 0.1 }),
    s('circle', { cx, cy, r: 75, fill: '#FBF7EE', stroke: FOREST, 'stroke-width': 2.4 }),
    s('circle', { cx, cy, r: 68, fill: '#EADFCB' }),
    s('path', { d: `M${cx - 60} ${cy - 38}A71 71 0 0 1 ${cx + 20} ${cy - 69}`, fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.8 }),
  ]);
  const surface = s('circle', { cx, cy, r: SURF_R, fill: `url(#${surfId})` });
  const specks = g({ class: 'la-specks' });
  const R = rng(17);
  for (let i = 0; i < 38; i++) {
    const a = R() * TAU;
    const rr = Math.sqrt(R()) * (SURF_R - 4);
    specks.append(s('circle', { cx: f2(cx + Math.cos(a) * rr), cy: f2(cy + Math.sin(a) * rr), r: f2(0.5 + R() * 1.1), fill: '#5E3218', opacity: f2(0.15 + R() * 0.3) }));
  }
  specks.style.transformBox = 'view-box';
  specks.style.transformOrigin = `${cx}px ${cy}px`;

  const art = g({ 'clip-path': `url(#${clipId})`, class: 'la-art' });
  const blob = s('path', { fill: MILK });
  const rings = Array.from({ length: RINGS }, () => s('path', { fill: 'none', 'stroke-width': 1.9, opacity: 0.9 }));
  const pull = s('path', { fill: 'none', stroke: MILK, 'stroke-width': 1.8, 'stroke-linecap': 'round' });
  const leaves = g({ class: 'la-leaves' });
  const neck = s('path', { fill: MILK });
  const headG = g({ class: 'la-head' });
  const dust = g({ class: 'la-dust' });
  art.append(leaves, blob, ...rings, neck, headG, pull, dust);
  let line = CREMA_LINE.coffee;
  let pourVoice = null;

  const splash = s('circle', { cx, cy, r: 3, fill: 'none', stroke: MILK, 'stroke-width': 1.5, opacity: 0 });
  const stream = s('path', { stroke: MILK, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0 });

  const left = leftArm();
  const leftWrap = g({ class: 'la-left-wrap' }, left);
  const right = rightArm();
  const rightWrap = g({ class: 'la-right-wrap' }, right.g);

  root.append(defs, saucer, cup, surface, specks, art, splash, leftWrap, stream, rightWrap);

  function setSurface(kind) {
    const c = SURFACES[kind] || SURFACES.coffee;
    line = CREMA_LINE[kind] || CREMA_LINE.coffee;
    rings.forEach((r) => r.setAttribute('stroke', line));
    grad.replaceChildren(
      s('stop', { offset: 0, 'stop-color': c[0] }),
      s('stop', { offset: 0.62, 'stop-color': c[1] }),
      s('stop', { offset: 1, 'stop-color': c[2] }),
    );
    specks.setAttribute('opacity', kind === 'coffee' ? 1 : 0.35);
  }

  function reset() {
    pourVoice?.stop();
    pourVoice = null;
    [blob, ...rings, pull, neck].forEach((p) => p.setAttribute('d', ''));
    pull.setAttribute('opacity', 1);
    leaves.replaceChildren();
    headG.replaceChildren();
    dust.replaceChildren();
    stream.setAttribute('opacity', 0);
    splash.setAttribute('opacity', 0);
    placeRight(cx + 260, cy - 210, 0);
    placeLeft(-160, 140);
  }

  // Positionne le bec du pichet (sx, sy) avec une inclinaison (°).
  function placeRight(sx, sy, tilt, scale = 1) {
    rightWrap.setAttribute('transform', `translate(${f2(sx)} ${f2(sy)}) rotate(${f2(tilt)}) scale(${f2(scale)})`);
    right.milk.setAttribute('transform', `translate(${f2(-tilt * 0.18)} ${f2(tilt * 0.12)})`);
  }
  // Main gauche : l'anse est en (cx-92, cy+2)
  function placeLeft(dx, dy) {
    leftWrap.setAttribute('transform', `translate(${f2(cx - 92 + dx)} ${f2(cy + 2 + dy)})`);
  }
  function setStream(x, y, w) {
    stream.setAttribute('d', `M${f2(x)} ${f2(y - 8)}L${f2(x)} ${f2(y + 1)}`);
    stream.setAttribute('stroke-width', f2(w));
    stream.setAttribute('opacity', w > 0.3 ? 1 : 0);
    pourVoice?.level(w > 0.3 ? w / 6.5 : 0);
    splash.setAttribute('cx', f2(x));
    splash.setAttribute('cy', f2(y + 1));
    if (w <= 0.3) splash.setAttribute('opacity', 0);
  }
  function splashPulse(t) {
    const k = (t % 420) / 420;
    splash.setAttribute('r', f2(3 + k * 9));
    splash.setAttribute('opacity', f2((1 - k) * 0.7));
  }

  // ------------------------------------------------------------ cœur
  function heartTracks() {
    const X = cx;
    const Y = cy - 2;
    const T = [];
    let pour = { x: X, y: Y - 12 };
    T.push({ from: 0, to: 650, ease: ease.out, update: (k) => { placeLeft(lerp(-160, 0, k), lerp(140, 0, k)); placeRight(lerp(X + 240, pour.x, k), lerp(Y - 220, pour.y, k), lerp(20, 0, k)); } });
    T.push({ from: 650, to: 900, update: (k) => { placeRight(pour.x, pour.y, lerp(0, -16, k)); setStream(pour.x, pour.y, lerp(0, 5, k)); } });
    // Le lait s'étale en cercles : le pichet ondule, chaque vague ajoute une couche
    T.push({ from: 900, to: 2700, ease: ease.inOut, update: (k, p, t) => {
      const R = 40 * ease.out(k);
      const ph = t / 130;
      const wob = 0.045 * (1 - k) + 0.01;
      blob.setAttribute('d', smooth(circlePts(X, Y - 2 + 8 * (1 - k), R, wob, ph)));
      rings.forEach((rg, i) => {
        const ri = R * (1 - (i + 1) * 0.125);
        const shown = k * (RINGS + 1) > i + 1;
        rg.setAttribute('d', shown && ri > 3 ? smooth(circlePts(X, Y - 1 + (i + 1) * 2.4 * k + 6 * (1 - k), ri, wob * 0.8, ph + i)) : '');
      });
      const wig = Math.sin(t / 68) * 3 * (1 - k * 0.4);
      pour = { x: X + wig, y: Y - 12 + 8 * k };
      placeRight(pour.x, pour.y, -16 - 4 * k + wig * 0.8, 1 - 0.03 * k);
      setStream(pour.x, pour.y, 5 + 1.5 * k);
      splashPulse(t);
    } });
    // Passage final : le filet traverse le rond, qui devient un cœur à couches
    T.push({ from: 2700, to: 3250, ease: ease.inOut, update: (k, p, t) => {
      const ph = t / 130;
      blob.setAttribute('d', smooth(mixPts(circlePts(X, Y - 2, 40, 0.01, ph), heartPts(X, Y - 3, HEART_S), k)));
      rings.forEach((rg, i) => {
        const circ = circlePts(X, Y - 1 + (i + 1) * 2.4, 40 * (1 - (i + 1) * 0.125), 0.008, ph + i);
        rg.setAttribute('d', smooth(mixPts(circ, heartRing(i + 1, X, Y), k)));
      });
      const py = lerp(Y - 44, Y + 44, k);
      pull.setAttribute('stroke', MILK);
      pull.setAttribute('d', `M${X} ${f2(Y - 44)}L${X} ${f2(py)}`);
      pour = { x: X, y: py };
      placeRight(X, py, -20 + 10 * k, 0.97 + 0.03 * k);
      setStream(X, py, lerp(6.5, 1.5, k));
    } });
    T.push({ from: 3250, to: 3500, update: (k) => {
      setStream(pour.x, pour.y, lerp(1.5, 0, k));
      pull.setAttribute('opacity', f2(1 - k));
      placeRight(pour.x, pour.y - 10 * k, lerp(-10, 8, k), 1 + 0.04 * k);
    } });
    T.push({ from: 3500, to: 4100, ease: ease.in, update: (k) => { placeRight(lerp(pour.x, X + 250, k), lerp(pour.y - 10, Y - 230, k), lerp(8, 24, k), 1.04 + 0.1 * k); } });
    T.push({ from: 3900, to: 4500, ease: ease.inOut, update: (k) => placeLeft(lerp(0, -170, k), lerp(0, 150, k)) });
    // La petite ligne de crème au creux du cœur
    T.push({ from: 3500, to: 3800, update: (k) => {
      pull.setAttribute('stroke', line);
      pull.setAttribute('opacity', f2(0.8 * k));
      pull.setAttribute('d', `M${X} ${f2(Y - 9)}L${X} ${f2(Y - 9 + 8 * k)}`);
    } });
    return { tracks: T, duration: 4500 };
  }

  // ------------------------------------------------------------ cygne
  function swanTracks() {
    const X = cx;
    const Y = cy;
    const T = [];
    const n = FEATHERS.length;
    let pour = { x: X + FEATHERS[0].x + 12, y: Y + FEATHERS[0].y };
    T.push({ from: 0, to: 650, ease: ease.out, update: (k) => { placeLeft(lerp(-160, 0, k), lerp(140, 0, k)); placeRight(lerp(X + 240, pour.x, k), lerp(Y - 220, pour.y, k), lerp(20, 0, k)); } });
    T.push({ from: 650, to: 850, update: (k) => { placeRight(pour.x, pour.y, lerp(0, -16, k)); setStream(pour.x, pour.y, lerp(0, 5, k)); } });
    // L'aile : le pichet ondule en remontant, les plumes se posent une à une
    T.push({ from: 850, to: 2800, ease: ease.linear, update: (k, p, t) => {
      const q = k * n;
      const F = FEATHERS[Math.min(n - 1, Math.floor(q))];
      const wig = Math.sin(t / 60) * 6;
      pour = { x: X + F.x + F.L * 0.35 + wig, y: Y + F.y - 4 };
      placeRight(pour.x, pour.y, -16 + Math.sin(t / 60) * 5, 0.98);
      setStream(pour.x, pour.y, 5);
      splashPulse(t);
      leaves.replaceChildren(...FEATHERS.map((Fi, i) => {
        const appear = Math.max(0, Math.min(1, (q - i) * 1.3));
        return appear > 0 ? feather(Fi, X, Y, line, 0.35 + 0.65 * ease.back(appear)) : null;
      }).filter(Boolean));
    } });
    // Le cou : tracé épais depuis le corps jusqu'à la tête
    T.push({ from: 2800, to: 4000, ease: ease.inOut, update: (k) => {
      const u0 = 1 - k;
      neck.setAttribute('d', k > 0.01 ? neckShape(u0, 1, X, Y) : '');
      const tip = neckAt(u0).p;
      pour = { x: X + tip[0], y: Y + tip[1] };
      placeRight(pour.x, pour.y, -14, 1);
      setStream(pour.x, pour.y, lerp(5.5, 3.2, k));
    } });
    // La tête puis le bec (petit coup de pichet vers la gauche)
    T.push({ from: 4000, to: 4400, ease: ease.back, update: (k) => {
      headG.replaceChildren(swanHead(X, Y, Math.max(0.05, k * 0.999)));
      setStream(pour.x, pour.y, 4);
    } });
    T.push({ from: 4400, to: 4650, ease: ease.inOut, update: (k) => {
      headG.replaceChildren(swanHead(X, Y, 1));
      const bx = lerp(X - 30, X - 41, k);
      pour = { x: bx, y: Y - 18 + 2 * k };
      placeRight(pour.x, pour.y, -8, 1.01);
      setStream(pour.x, pour.y, lerp(3, 0, k));
    } });
    T.push({ from: 4650, to: 5250, ease: ease.in, update: (k) => { placeRight(lerp(pour.x, X + 250, k), lerp(pour.y, Y - 230, k), lerp(-8, 24, k), 1 + 0.12 * k); } });
    T.push({ from: 5050, to: 5650, ease: ease.inOut, update: (k) => placeLeft(lerp(0, -170, k), lerp(0, 150, k)) });
    return { tracks: T, duration: 5650 };
  }

  function sprinkleCinnamon() {
    const r = rng(9);
    for (let i = 0; i < 70; i++) {
      const a = r() * TAU;
      const rr = Math.sqrt(r()) * 48;
      dust.append(s('circle', { cx: f2(cx + Math.cos(a) * rr), cy: f2(cy + Math.sin(a) * rr), r: f2(0.5 + r() * 0.9), fill: '#8A4B22', opacity: f2(0.35 + r() * 0.5) }));
    }
  }

  reset();

  return {
    g: root,
    center: C,
    radius: 75,
    setSurface,
    reset,
    /** Joue le versé. `alive()` renvoie false pour interrompre. */
    async run({ style = 'heart', surface = 'coffee', cinnamon = false, alive = () => true, sfx = null } = {}) {
      setSurface(surface);
      reset();
      if (isReduced()) {
        headG.replaceChildren(g({ transform: `translate(${cx} ${cy})` }, buildArt(style, surface)));
        return true;
      }
      // Petit tourbillon de la crème avant le versé
      specks.animate?.([{ transform: 'rotate(0deg)' }, { transform: 'rotate(40deg)' }], { duration: 2400, easing: 'ease-out', fill: 'forwards' });
      const { tracks, duration } = style === 'swan' ? swanTracks() : heartTracks();
      // Le bruit du filet de lait suit sa largeur
      pourVoice = sfx?.voice('pour') || null;
      const ok = await timeline(duration, tracks, alive);
      pourVoice?.stop();
      pourVoice = null;
      if (ok && cinnamon) {
        sfx?.play('sprinkle');
        sprinkleCinnamon();
      }
      return ok;
    },
  };
}
