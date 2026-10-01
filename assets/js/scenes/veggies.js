// Grands légumes en vue de dessus (« flat lay ») pour l'écran d'ouverture : laitue, feuilles de
// chou, radis, poivrons, mini-poivrons, carottes, basilic, persil, roquette, courgette,
// betterave, chou pommé. Chaque fonction renvoie un <g> centré sur (0,0).
// `layVeggies()` remplit une zone 400 × 800 autour du logo, comme sur la photo de l'enseigne.

import { s, g, rng } from '../lib/svg.js';

const f = (n) => Math.round(n * 10) / 10;
const TAU = Math.PI * 2;

/** Chemin lisse (Catmull-Rom → Bézier) passant par les points. */
export function smooth(pts, closed = true) {
  const n = pts.length;
  const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

/** Contour ondulé autour de (cx, cy). */
function wavy(cx, cy, R, { n = 40, waves = [], squash = 1, rot = 0 } = {}) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    let k = 1;
    waves.forEach(([fq, amp, ph = 0]) => (k += amp * Math.sin(fq * a + ph)));
    const x = Math.cos(a) * R * k;
    const y = Math.sin(a) * R * k * squash;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return smooth(pts);
}

/**
 * Contour de feuille posée le long de +x (pétiole en 0, pointe en `len`).
 * `ruffle` : bord frisé ; `serr` : dents ; `lobes` : feuille découpée (roquette).
 */
function leafPts(len, wid, { ruffle = 0, rfq = 9, serr = 0, n = 26, base = 0.12, tipPow = 1, lobes = 0, ph = 0 } = {}) {
  const top = [];
  const bot = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let w = wid * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (t - base * 0.2) / (1 - base * 0.2)))), 0.75) * Math.pow(1 - t * 0.35, tipPow);
    if (ruffle) w *= 1 + ruffle * Math.sin(rfq * TAU * t + ph);
    if (lobes) w *= 0.45 + 0.55 * Math.abs(Math.sin(lobes * Math.PI * t + 0.3));
    const sw = serr ? (i % 2 ? serr : -serr) * wid : 0;
    top.push([t * len, -w - sw]);
    bot.push([t * len, w + sw]);
  }
  return [...top, ...bot.reverse()];
}

const leaf = (len, wid, opts) => smooth(leafPts(len, wid, opts));

/** Nervures : médiane + latérales. */
function veins(len, wid, { n = 5, curve = 0.3 } = {}) {
  let d = `M0 0Q${f(len * 0.5)} ${f(-wid * 0.05)} ${f(len * 0.96)} 0`;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const x = len * t;
    const w = wid * Math.sin(Math.PI * t) * 0.8;
    d += `M${f(x)} 0Q${f(x + len * 0.08)} ${f(-w * curve)} ${f(x + len * 0.16)} ${f(-w)}`;
    d += `M${f(x)} 0Q${f(x + len * 0.08)} ${f(w * curve)} ${f(x + len * 0.16)} ${f(w)}`;
  }
  return d;
}

// ---------------------------------------------------------------- les légumes
/** Laitue (sucrine / batavia) vue de dessus : rosette de feuilles frisées. */
export function lettuce(seed = 1, R = 60) {
  const r = rng(seed);
  const G = g({ class: 'vg vg-lettuce' });
  const layers = [
    { n: 8, rad: 1, tone: ['#3E7A2A', '#4F8E33'], light: '#6FAA48' },
    { n: 7, rad: 0.8, tone: ['#5E9E3B', '#6EAD45'], light: '#90C762' },
    { n: 6, rad: 0.6, tone: ['#88C255', '#97CC60'], light: '#B7DE84' },
    { n: 5, rad: 0.4, tone: ['#B6DA7C', '#C4E18D'], light: '#DDEFB3' },
  ];
  layers.forEach((L, li) => {
    for (let j = 0; j < L.n; j++) {
      const a = (j / L.n) * TAU + li * 0.45 + (r() - 0.5) * 0.3;
      const d0 = R * L.rad * 0.48;
      const cx = Math.cos(a) * d0;
      const cy = Math.sin(a) * d0;
      const rr = R * L.rad * (0.56 + r() * 0.08);
      G.append(s('path', { d: wavy(cx, cy, rr, { n: 44, waves: [[13, 0.06, r() * 6], [23, 0.03, r() * 6]], squash: 0.86, rot: a }), fill: L.tone[j % 2] }));
      G.append(s('path', { d: `M${f(cx * 0.2)} ${f(cy * 0.2)}Q${f(cx * 0.9 + Math.cos(a + 1.2) * rr * 0.2)} ${f(cy * 0.9 + Math.sin(a + 1.2) * rr * 0.2)} ${f(cx + Math.cos(a) * rr * 0.75)} ${f(cy + Math.sin(a) * rr * 0.75)}`, fill: 'none', stroke: L.light, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.85 }));
    }
  });
  G.append(s('path', { d: wavy(0, 0, R * 0.16, { n: 24, waves: [[7, 0.12]] }), fill: '#E2F1BA' }));
  return G;
}

/** Grande feuille de chou / laitue froissée (fond de la composition). */
export function bigLeaf(seed = 1, len = 120, wid = 46, tones = ['#7DB34B', '#9CCB62', '#C3E28E']) {
  const r = rng(seed);
  const G = g({ class: 'vg vg-leaf' });
  G.append(
    s('path', { d: leaf(len, wid, { ruffle: 0.09, rfq: 7 + Math.floor(r() * 4), ph: r() * 6, n: 34 }), fill: tones[0] }),
    s('path', { d: leaf(len * 0.92, wid * 0.8, { ruffle: 0.08, rfq: 8, ph: r() * 6, n: 30 }), fill: tones[1], transform: `translate(${f(len * 0.04)} 0)` }),
    s('path', { d: veins(len, wid, { n: 6 }), fill: 'none', stroke: tones[2], 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.9 }),
  );
  // froissures (chou de Milan)
  const cr = [];
  for (let i = 0; i < 26; i++) {
    const t = 0.15 + r() * 0.7;
    const x = len * t;
    const y = (r() - 0.5) * wid * Math.sin(Math.PI * t) * 1.4;
    cr.push(`M${f(x)} ${f(y)}q${f(3 + r() * 3)} ${f(-2 - r() * 2)} ${f(6 + r() * 4)} 0`);
  }
  G.append(s('path', { d: cr.join(''), fill: 'none', stroke: tones[0], 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: 0.55 }));
  return G;
}

/** Chou pommé, vu de dessus. */
export function cabbage(seed = 1, R = 64) {
  const r = rng(seed);
  const G = g({ class: 'vg vg-cabbage' });
  const tones = ['#9CC66B', '#B4D683', '#C8E39C', '#DCEDB9', '#EAF4D2'];
  tones.forEach((tone, i) => {
    const rr = R * (1 - i * 0.17);
    G.append(s('path', { d: wavy(i * 1.5, -i * 1.5, rr, { n: 40, waves: [[5, 0.05, r() * 6], [11, 0.025, r() * 6]] }), fill: tone }));
  });
  const v = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + r() * 0.3;
    v.push(`M${f(Math.cos(a) * R * 0.15)} ${f(Math.sin(a) * R * 0.15)}Q${f(Math.cos(a + 0.25) * R * 0.55)} ${f(Math.sin(a + 0.25) * R * 0.55)} ${f(Math.cos(a + 0.1) * R * 0.92)} ${f(Math.sin(a + 0.1) * R * 0.92)}`);
  }
  G.append(s('path', { d: v.join(''), fill: 'none', stroke: '#F2F8E2', 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.9 }));
  G.append(s('path', { d: wavy(-R * 0.25, -R * 0.3, R * 0.3, { n: 24, waves: [[4, 0.1]] }), fill: '#fff', opacity: 0.18 }));
  return G;
}

/** Radis avec ses fanes. */
export function radish(seed = 1, k = 1) {
  const r = rng(seed);
  const G = g({ class: 'vg vg-radish', transform: `scale(${k})` });
  // fanes
  [[-0.5, 46], [0.05, 54], [0.55, 44]].forEach(([da, len]) => {
    const a = -Math.PI / 2 + da + (r() - 0.5) * 0.2;
    const sx = Math.cos(a) * 9;
    const sy = Math.sin(a) * 9 - 6;
    const ex = sx + Math.cos(a) * len * 0.45;
    const ey = sy + Math.sin(a) * len * 0.45;
    G.append(s('path', { d: `M0 -8Q${f(sx)} ${f(sy)} ${f(ex)} ${f(ey)}`, fill: 'none', stroke: '#C0607A', 'stroke-width': 2, 'stroke-linecap': 'round' }));
    const lf = g({ transform: `translate(${f(ex)} ${f(ey)}) rotate(${f((a * 180) / Math.PI)})` }, [
      s('path', { d: leaf(len * 0.62, 11, { ruffle: 0.12, rfq: 5, ph: r() * 6, serr: 0.04 }), fill: r() > 0.5 ? '#4E8C35' : '#5C9A3E' }),
      s('path', { d: veins(len * 0.62, 11, { n: 4 }), fill: 'none', stroke: '#8BBF62', 'stroke-width': 1, opacity: 0.85 }),
    ]);
    G.append(lf);
  });
  // racine et corps
  G.append(
    s('path', { d: 'M0 14Q2 26 -2 36', fill: 'none', stroke: '#F3E2E4', 'stroke-width': 1.4, 'stroke-linecap': 'round' }),
    s('path', { d: 'M-12 0C-12 -9 -6 -12 0 -12C6 -12 12 -9 12 0C12 8 6 14 0 16C-6 14 -12 8 -12 0Z', fill: '#D3304B' }),
    s('path', { d: 'M4 -11C9 -8 12 -3 12 2C12 8 6 13.4 0 15.6C5 11 8 6 8 0C8 -5 6.4 -8.6 4 -11Z', fill: '#A82039', opacity: 0.8 }),
    s('path', { d: 'M-8 6C-6 11 -3 13.6 0 15.6C3 13.6 6 11 8 6C4 8 -4 8 -8 6Z', fill: '#F6E8EA' }),
    s('path', { d: 'M-7 -6C-6 -9 -3 -10.6 0 -10.6', fill: 'none', stroke: '#F58A9B', 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.9 }),
  );
  return G;
}

/** Poivron vu de dessus (4 lobes), rouge, jaune ou orange. */
export function pepper(seed = 1, color = 'red', R = 26) {
  const r = rng(seed);
  const C = {
    red: ['#D52D29', '#A81C1C', '#F26A5B'],
    yellow: ['#F3C232', '#D49A12', '#FCE58A'],
    orange: ['#F2801E', '#C95A10', '#FFB066'],
  }[color];
  const G = g({ class: 'vg vg-pepper' });
  const rot = r() * TAU;
  G.append(
    s('path', { d: wavy(0, 0, R, { n: 48, waves: [[4, 0.085, rot]], squash: 0.94 }), fill: C[0] }),
    s('path', { d: wavy(1.5, 2, R * 0.92, { n: 48, waves: [[4, 0.09, rot]], squash: 0.94 }), fill: C[1], opacity: 0.35 }),
  );
  // sillons entre les lobes
  const gr = [];
  for (let i = 0; i < 4; i++) {
    const a = rot / 4 + Math.PI / 4 + (i * Math.PI) / 2 - Math.PI / 8;
    gr.push(`M${f(Math.cos(a) * R * 0.25)} ${f(Math.sin(a) * R * 0.25)}Q${f(Math.cos(a + 0.12) * R * 0.6)} ${f(Math.sin(a + 0.12) * R * 0.6)} ${f(Math.cos(a) * R * 0.9)} ${f(Math.sin(a) * R * 0.9)}`);
  }
  G.append(
    s('path', { d: gr.join(''), fill: 'none', stroke: C[1], 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.7 }),
    // reflet brillant
    s('path', { d: `M${f(-R * 0.62)} ${f(-R * 0.1)}C${f(-R * 0.6)} ${f(-R * 0.5)} ${f(-R * 0.3)} ${f(-R * 0.72)} ${f(R * 0.05)} ${f(-R * 0.72)}`, fill: 'none', stroke: C[2], 'stroke-width': R * 0.12, 'stroke-linecap': 'round', opacity: 0.75 }),
    s('path', { d: `M${f(-R * 0.55)} ${f(R * 0.2)}q${f(R * 0.04)} ${f(R * 0.12)} ${f(R * 0.14)} ${f(R * 0.2)}`, fill: 'none', stroke: '#fff', 'stroke-width': R * 0.06, 'stroke-linecap': 'round', opacity: 0.5 }),
    // pédoncule et calice
    s('path', { d: wavy(0, 0, R * 0.3, { n: 20, waves: [[5, 0.25, r() * 6]] }), fill: '#4E7D2E' }),
    s('circle', { cx: 0, cy: 0, r: R * 0.13, fill: '#7FA650' }),
    s('circle', { cx: -R * 0.04, cy: -R * 0.04, r: R * 0.06, fill: '#A9C87A' }),
  );
  return G;
}

/** Mini-poivron allongé (vue de profil). */
export function miniPepper(seed = 1, color = 'orange', len = 46) {
  const C = { red: ['#D52D29', '#A81C1C', '#F7887A'], yellow: ['#F3C232', '#D49A12', '#FDEB9C'], orange: ['#F2801E', '#C95A10', '#FFBE7A'] }[color];
  const w = len * 0.3;
  const G = g({ class: 'vg vg-minipepper' });
  const body = `M0 ${-w * 0.6}C${len * 0.2} ${-w * 1.1} ${len * 0.7} ${-w * 0.9} ${len} ${-w * 0.1}C${len * 1.02} ${w * 0.25} ${len * 0.7} ${w * 0.95} ${len * 0.3} ${w * 0.85}C${len * 0.1} ${w * 0.8} 0 ${w * 0.4} 0 ${-w * 0.6}Z`;
  G.append(
    s('path', { d: body, fill: C[0] }),
    s('path', { d: `M${len * 0.1} ${w * 0.5}C${len * 0.4} ${w * 0.95} ${len * 0.8} ${w * 0.6} ${len * 0.98} ${w * 0.05}C${len * 0.7} ${w * 0.45} ${len * 0.4} ${w * 0.6} ${len * 0.1} ${w * 0.5}Z`, fill: C[1], opacity: 0.55 }),
    s('path', { d: `M${len * 0.18} ${-w * 0.55}C${len * 0.4} ${-w * 0.85} ${len * 0.65} ${-w * 0.7} ${len * 0.82} ${-w * 0.35}`, fill: 'none', stroke: C[2], 'stroke-width': w * 0.22, 'stroke-linecap': 'round', opacity: 0.8 }),
    s('path', { d: `M2 ${-w * 0.45}C-3 ${-w * 0.35} -4 ${w * 0.2} 2 ${w * 0.4}C-1 ${w * 0.1} -1 ${-w * 0.2} 2 ${-w * 0.45}Z`, fill: '#4E7D2E' }),
    s('path', { d: `M-1 0Q-8 -4 -12 -2`, fill: 'none', stroke: '#5E8C34', 'stroke-width': 3, 'stroke-linecap': 'round' }),
  );
  return G;
}

/** Carotte avec ses fanes. */
export function carrot(seed = 1, len = 84) {
  const r = rng(seed);
  const G = g({ class: 'vg vg-carrot' });
  const w = len * 0.11;
  // fanes plumeuses
  const tops = [];
  const leaflets = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI + (i - 1.5) * 0.28 + (r() - 0.5) * 0.15;
    const L = len * (0.5 + r() * 0.25);
    const ex = Math.cos(a) * L;
    const ey = Math.sin(a) * L;
    tops.push(`M0 0Q${f(ex * 0.5)} ${f(ey * 0.5 + (r() - 0.5) * 10)} ${f(ex)} ${f(ey)}`);
    for (let q = 0; q < 9; q++) {
      const t = 0.35 + q * 0.075;
      const px = ex * t;
      const py = ey * t;
      [-1, 1].forEach((sg) => {
        const la = a + sg * 1.1;
        leaflets.push(`M${f(px)} ${f(py)}l${f(Math.cos(la) * 7)} ${f(Math.sin(la) * 7)}`);
      });
    }
  }
  G.append(
    s('path', { d: tops.join(''), fill: 'none', stroke: '#5E9B3A', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    s('path', { d: leaflets.join(''), fill: 'none', stroke: '#6FAF45', 'stroke-width': 2.6, 'stroke-linecap': 'round' }),
  );
  // racine
  const body = `M0 ${-w}C${len * 0.3} ${-w * 1.05} ${len * 0.7} ${-w * 0.55} ${len} 0C${len * 0.7} ${w * 0.55} ${len * 0.3} ${w * 1.05} 0 ${w}C${-w * 0.5} ${w * 0.6} ${-w * 0.5} ${-w * 0.6} 0 ${-w}Z`;
  G.append(
    s('path', { d: body, fill: '#F07F22' }),
    s('path', { d: `M${len * 0.05} ${w * 0.55}C${len * 0.35} ${w * 0.7} ${len * 0.7} ${w * 0.35} ${len * 0.97} 0C${len * 0.7} ${w * 0.6} ${len * 0.3} ${w} ${len * 0.05} ${w * 0.95}Z`, fill: '#D3621A', opacity: 0.8 }),
    s('path', { d: `M${len * 0.06} ${-w * 0.55}C${len * 0.35} ${-w * 0.7} ${len * 0.65} ${-w * 0.42} ${len * 0.85} ${-w * 0.12}`, fill: 'none', stroke: '#FFB06A', 'stroke-width': w * 0.28, 'stroke-linecap': 'round', opacity: 0.85 }),
  );
  const rid = [];
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const x = len * t;
    const ww = w * (1 - t * 0.85);
    rid.push(`M${f(x)} ${f(-ww * (0.2 + r() * 0.5))}q1.6 ${f(ww * 0.3)} 0 ${f(ww * 0.6)}`);
  }
  G.append(s('path', { d: rid.join(''), fill: 'none', stroke: '#B95214', 'stroke-width': 1, 'stroke-linecap': 'round', opacity: 0.6 }));
  return G;
}

/** Brin de basilic (feuilles brillantes par paires). */
export function basil(seed = 1, len = 70) {
  const r = rng(seed);
  const G = g({ class: 'vg vg-basil' });
  G.append(s('path', { d: `M0 0Q${len * 0.5} ${(r() - 0.5) * 8} ${len} 0`, fill: 'none', stroke: '#4F8A35', 'stroke-width': 2.6, 'stroke-linecap': 'round' }));
  const pairs = [[0.3, 30, 16], [0.58, 26, 14], [0.82, 18, 10]];
  pairs.forEach(([t, L, W], i) => {
    [-1, 1].forEach((sg) => {
      const a = sg * (0.95 - i * 0.12) + (r() - 0.5) * 0.15;
      const lf = g({ transform: `translate(${f(len * t)} 0) rotate(${f((a * 180) / Math.PI)})` }, [
        s('path', { d: leaf(L, W, { n: 22, base: 0.05 }), fill: sg > 0 ? '#3E8B33' : '#47963A' }),
        s('path', { d: leaf(L * 0.8, W * 0.55, { n: 18 }), fill: '#6CB451', opacity: 0.55, transform: `translate(${f(L * 0.08)} ${f(-W * 0.18)})` }),
        s('path', { d: veins(L, W, { n: 3, curve: 0.4 }), fill: 'none', stroke: '#2F6E27', 'stroke-width': 0.9, opacity: 0.7 }),
      ]);
      G.append(lf);
    });
  });
  G.append(g({ transform: `translate(${len} 0)` }, [
    s('path', { d: leaf(16, 9, { n: 16 }), fill: '#5BA645' }),
    s('path', { d: leaf(13, 7, { n: 14 }), fill: '#3E8B33', transform: 'rotate(40)' }),
    s('path', { d: leaf(13, 7, { n: 14 }), fill: '#3E8B33', transform: 'rotate(-40)' }),
  ]));
  return G;
}

/** Persil plat : tiges et feuilles trilobées dentelées. */
export function parsley(seed = 1, len = 64) {
  const r = rng(seed);
  const G = g({ class: 'vg vg-parsley' });
  const stems = [];
  const heads = [];
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.32 + (r() - 0.5) * 0.15;
    const L = len * (0.7 + r() * 0.3);
    const ex = Math.cos(a) * L;
    const ey = Math.sin(a) * L;
    stems.push(`M0 0Q${f(ex * 0.5)} ${f(ey * 0.5 + (r() - 0.5) * 8)} ${f(ex)} ${f(ey)}`);
    heads.push([ex, ey, (a * 180) / Math.PI]);
  }
  G.append(s('path', { d: stems.join(''), fill: 'none', stroke: '#5C9A3A', 'stroke-width': 2, 'stroke-linecap': 'round' }));
  heads.forEach(([x, y, deg], i) => {
    const H = g({ transform: `translate(${f(x)} ${f(y)}) rotate(${f(deg)})` });
    [-48, 0, 48].forEach((da, j) => {
      H.append(g({ transform: `rotate(${da})` }, [
        s('path', { d: leaf(17, 8.5, { n: 18, serr: 0.16, ruffle: 0.1, rfq: 3 }), fill: (i + j) % 2 ? '#3B7D2C' : '#4C8F37' }),
        s('path', { d: 'M0 0L15 0', stroke: '#7BB55A', 'stroke-width': 0.8 }),
      ]));
    });
    G.append(H);
  });
  return G;
}

/** Feuille de roquette (lobes profonds). */
export function arugula(seed = 1, len = 70) {
  const r = rng(seed);
  const G = g({ class: 'vg vg-arugula' });
  const tone = r() > 0.5 ? '#4D8B34' : '#3F7C2C';
  G.append(
    s('path', { d: leaf(len, 13, { n: 40, lobes: 3.5, base: 0.25, ph: r() }), fill: tone }),
    s('path', { d: `M-8 0L${len * 0.95} 0`, fill: 'none', stroke: '#A6C77A', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
  );
  return G;
}

/** Courgette. */
export function zucchini(seed = 1, len = 110) {
  const r = rng(seed);
  const w = len * 0.13;
  const G = g({ class: 'vg vg-zucchini' });
  G.append(
    s('path', { d: `M0 ${-w}C${len * 0.4} ${-w * 1.1} ${len * 0.8} ${-w * 1.05} ${len} ${-w * 0.5}C${len * 1.04} 0 ${len * 1.04} 0 ${len} ${w * 0.5}C${len * 0.8} ${w * 1.05} ${len * 0.4} ${w * 1.1} 0 ${w}C${-w * 0.7} ${w * 0.6} ${-w * 0.7} ${-w * 0.6} 0 ${-w}Z`, fill: '#2F5E26' }),
    s('path', { d: `M${len * 0.04} ${-w * 0.45}C${len * 0.4} ${-w * 0.65} ${len * 0.75} ${-w * 0.6} ${len * 0.95} ${-w * 0.25}`, fill: 'none', stroke: '#5B8C3E', 'stroke-width': w * 0.35, 'stroke-linecap': 'round', opacity: 0.7 }),
  );
  const sp = [];
  for (let i = 0; i < 30; i++) {
    const x = len * (0.08 + r() * 0.86);
    const y = (r() - 0.5) * w * 1.4;
    sp.push(`M${f(x)} ${f(y)}h${f(2 + r() * 4)}`);
  }
  G.append(
    s('path', { d: sp.join(''), stroke: '#9DBF72', 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.75 }),
    s('path', { d: `M${-w * 0.45} ${-w * 0.35}Q${-w * 1.6} ${-w * 0.2} ${-w * 1.8} ${w * 0.3}`, fill: 'none', stroke: '#7E9A4C', 'stroke-width': w * 0.55, 'stroke-linecap': 'round' }),
    s('ellipse', { cx: len, cy: 0, rx: w * 0.18, ry: w * 0.34, fill: '#C9D98E' }),
  );
  return G;
}

/** Betterave avec ses tiges rouges. */
export function beet(seed = 1, R = 20) {
  const r = rng(seed);
  const G = g({ class: 'vg vg-beet' });
  [[-0.4, 50], [0.1, 58], [0.55, 46]].forEach(([da, len]) => {
    const a = -Math.PI / 2 + da + (r() - 0.5) * 0.2;
    const ex = Math.cos(a) * len * 0.5;
    const ey = Math.sin(a) * len * 0.5 - R * 0.7;
    G.append(s('path', { d: `M0 ${-R * 0.6}Q${f(ex * 0.4)} ${f(ey * 0.6)} ${f(ex)} ${f(ey)}`, fill: 'none', stroke: '#C2306A', 'stroke-width': 2.6, 'stroke-linecap': 'round' }));
    G.append(g({ transform: `translate(${f(ex)} ${f(ey)}) rotate(${f((a * 180) / Math.PI)})` }, [
      s('path', { d: leaf(len * 0.62, 13, { ruffle: 0.1, rfq: 4, ph: r() * 6 }), fill: '#3F6E31' }),
      s('path', { d: veins(len * 0.62, 13, { n: 4 }), fill: 'none', stroke: '#B2365F', 'stroke-width': 1.1, opacity: 0.85 }),
    ]));
  });
  G.append(
    s('path', { d: `M0 ${R * 0.9}Q3 ${R * 1.6} -1 ${R * 2.2}`, fill: 'none', stroke: '#6E1D3D', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
    s('path', { d: wavy(0, 0, R, { n: 30, waves: [[3, 0.05, r() * 6]] }), fill: '#741D41' }),
    s('path', { d: wavy(-R * 0.25, -R * 0.25, R * 0.62, { n: 24, waves: [[3, 0.08]] }), fill: '#9B2D58', opacity: 0.85 }),
    s('path', { d: `M${f(-R * 0.6)} ${f(-R * 0.2)}Q${f(-R * 0.5)} ${f(-R * 0.62)} ${f(-R * 0.1)} ${f(-R * 0.7)}`, fill: 'none', stroke: '#D5638C', 'stroke-width': R * 0.12, 'stroke-linecap': 'round', opacity: 0.8 }),
  );
  return G;
}

// ---------------------------------------------------------------- composition plein écran
/**
 * Remplit un plateau 400 × 800 de légumes, en laissant le logo au centre (200, 338).
 * Renvoie { under: [...], over: [...] } : des groupes positionnés, avec leur centre (x, y)
 * pour l'éclatement en bulles du haut vers le bas. `over` passe au-dessus du logo.
 */
export function layVeggies() {
  const r = rng(77);
  const items = [];
  const place = (el, x, y, rot = 0, sc = 1, layer = 'under') => {
    const outer = g({ transform: `translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${sc})` });
    const pop = g({ class: 'vg-pop' }, el);
    outer.append(pop);
    items.push({ el: outer, pop, x, y, layer });
  };
  // 0) le fond, vert profond : les ombres entre les légumes
  const ground = s('rect', { x: -400, y: -500, width: 1200, height: 1800, fill: '#2C5424', class: 'vg-ground' });
  items.push({ el: ground, pop: null, x: 200, y: 400, layer: 'under', ground: true });
  // 1) grandes feuilles qui couvrent tout
  const greens = [['#5E9A3A', '#78B24A', '#A9D27A'], ['#7DB34B', '#9CCB62', '#C3E28E'], ['#4C8732', '#64A040', '#93C468'], ['#8FC25A', '#AAD474', '#D2EAA6']];
  for (let row = 0; row < 11; row++) {
    for (let col = 0; col < 5; col++) {
      const x = -80 + col * 112 + (row % 2) * 56 + (r() - 0.5) * 30;
      const y = -110 + row * 98 + (r() - 0.5) * 30;
      place(bigLeaf(row * 7 + col, 160 + r() * 40, 62 + r() * 14, greens[(row + col) % 4]), x, y, r() * 360, 1, 'under');
    }
  }
  // 2) laitues et choux, gros volumes entre les feuilles
  const big = [
    [cabbage(1, 78), 40, 30, 10], [lettuce(2, 72), 340, 40, 30], [lettuce(3, 66), 20, 330, -20],
    [lettuce(4, 76), 384, 330, 50], [cabbage(5, 66), 200, 820, 0], [lettuce(6, 66), 40, 660, 20],
    [lettuce(7, 72), 372, 640, -30], [cabbage(8, 60), 200, -40, 0],
  ];
  big.forEach(([el, x, y, rot]) => place(el, x, y, rot));
  // 3) légumes colorés, serrés sur une grille irrégulière (le logo reste dégagé)
  const kinds = [
    (n) => pepper(n, 'red', 30 + r() * 8), (n) => pepper(n, 'yellow', 30 + r() * 8), (n) => pepper(n, 'orange', 28 + r() * 8),
    (n) => radish(n, 1.5 + r() * 0.3), (n) => radish(n, 1.5 + r() * 0.3), (n) => beet(n, 22 + r() * 6),
    (n) => miniPepper(n, ['red', 'yellow', 'orange'][n % 3], 62 + r() * 10), (n) => carrot(n, 112 + r() * 20),
    (n) => pepper(n, ['red', 'yellow', 'orange'][(n + 1) % 3], 32 + r() * 6),
  ];
  let n = 0;
  for (let y = -40; y < 880; y += 64) {
    for (let x = -20 + ((y / 64) % 2) * 32; x < 440; x += 66) {
      const px = x + (r() - 0.5) * 30;
      const py = y + (r() - 0.5) * 30;
      if (Math.hypot(px - 200, py - 338) < 128) continue;
      if (r() < 0.18) continue;
      const make = kinds[Math.floor(r() * kinds.length)];
      place(make(n++), px, py, (r() - 0.5) * 360);
    }
  }
  place(zucchini(60, 150), 340, 720, -70);
  place(zucchini(61, 140), 60, 120, 40);
  // 4) herbes par-dessus
  const herbs = [
    [basil(1, 84), 20, 520, -40], [basil(2, 80), 60, 720, -80], [parsley(3, 84), 330, 640, -100], [parsley(4, 76), 380, 780, -120],
    [arugula(5, 88), 110, 210, 40], [arugula(6, 84), 300, 210, 140], [basil(7, 74), 250, 30, 60], [parsley(8, 72), 140, 0, 80],
    [arugula(9, 80), 10, 240, 70], [arugula(10, 76), 160, 520, -30], [basil(11, 76), 400, 460, 200], [parsley(12, 74), 30, 860, -60],
    [arugula(13, 84), 260, 600, 110], [basil(14, 70), 120, 400, 160], [parsley(15, 70), 290, 120, 30],
  ];
  herbs.forEach(([el, x, y, rot]) => place(el, x, y, rot));
  // 5) quelques feuilles posées sur le bord du logo, comme sur l'enseigne
  [[arugula(31, 84), 306, 240, 140], [arugula(32, 80), 92, 452, -40], [arugula(33, 76), 330, 446, -150]].forEach(([el, x, y, rot]) => place(el, x, y, rot, 1, 'over'));
  return items;
}
