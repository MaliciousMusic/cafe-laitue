// Bibliothèque de fruits & légumes dessinés en SVG + mise en cagette.
// Chaque dessin est centré sur (0,0), environ 20 unités de large.

import { s, g, rng } from '../lib/svg.js';

const C = {
  leaf: '#4E8A3B',
  leafLight: '#7DB356',
  leafDark: '#2F6B35',
  stem: '#6B4A2E',
};

const circle = (r, fill, extra = {}) => s('circle', { cx: 0, cy: 0, r, fill, ...extra });
const ell = (cx, cy, rx, ry, fill, extra = {}) => s('ellipse', { cx, cy, rx, ry, fill, ...extra });
const path = (d, fill, extra = {}) => s('path', { d, fill, ...extra });
const line = (d, stroke, w = 1.2, extra = {}) => s('path', { d, fill: 'none', stroke, 'stroke-width': w, 'stroke-linecap': 'round', ...extra });
const shine = (x = -3, y = -3.5, rx = 3, ry = 2) => ell(x, y, rx, ry, '#fff', { opacity: 0.35 });
const leafShape = (x, y, a, L = 8, fill = C.leaf) =>
  path(`M0 0 C${L * 0.35} ${-L * 0.35} ${L * 0.7} ${-L * 0.25} ${L} 0 C${L * 0.7} ${L * 0.25} ${L * 0.35} ${L * 0.35} 0 0 Z`, fill, {
    transform: `translate(${x} ${y}) rotate(${a})`,
  });

// --- Dessins ---
const ART = {
  tomate: () => g({}, [
    circle(10, '#DD3B2C'),
    ell(3, 2, 6, 5, '#B92B22', { opacity: 0.35 }),
    shine(-4, -3, 3.2, 2.2),
    path('M0 -9 l2.2 -2.6 l.6 3 l3.2 -.6 l-2 2.4 l1.4 2.6 l-3 -1 l-2.4 2 l-.3 -3 l-3 -.8 l2.6 -1.6z', '#3E7C33'),
  ]),
  pomme: (r) => {
    const red = r() > 0.4;
    return g({}, [
      path('M0 -7 C6 -11 12 -6 11 1 C10 8 5 11 0 10 C-5 11 -10 8 -11 1 C-12 -6 -6 -11 0 -7 Z', red ? '#C7302F' : '#9BBF3A'),
      path('M0 -7 C6 -11 12 -6 11 1 C9 -3 5 -5 0 -4 Z', red ? '#E3A23A' : '#D8D55A', { opacity: 0.55 }),
      shine(-5, -3, 2.6, 2),
      line('M0 -7 Q1 -11 2.5 -13', C.stem, 1.4),
      leafShape(2, -11, -30, 7),
    ]);
  },
  poire: (r) => g({}, [
    path('M0 -12 C3 -12 4 -8 4.5 -4 C9 -1 10 6 7 10 C4 13 -4 13 -7 10 C-10 6 -9 -1 -4.5 -4 C-4 -8 -3 -12 0 -12 Z', r() > 0.5 ? '#C9C24A' : '#B7B94A'),
    path('M4.5 -4 C9 -1 10 6 7 10 C8 4 6 0 3 -2 Z', '#D98B3A', { opacity: 0.45 }),
    shine(-3, 1, 2.2, 3),
    line('M0 -12 Q1 -15 3 -16', C.stem, 1.4),
  ]),
  raisin: (r) => {
    const black = r() > 0.45;
    const col = black ? '#5E3163' : '#B8C45A';
    const hi = black ? '#8A5A8E' : '#DCE38D';
    const G = g({});
    const pts = [[0, -8], [-4, -5], [4, -5], [-6, -1], [0, -1.5], [6, -1], [-3, 3], [3, 3], [0, 7], [-5, 6.5], [5, 6.5], [0, 11]];
    pts.forEach(([x, y]) => G.append(circle(3.5, col, { transform: `translate(${x} ${y})` }), ell(x - 1, y - 1.2, 1.1, 0.8, hi)));
    G.append(line('M0 -11 Q0 -14 2 -16', C.stem, 1.3), leafShape(1, -13, -40, 7, C.leafLight));
    return G;
  },
  melon: (r) => {
    if (r() > 0.55) {
      return g({}, [
        path('M-12 0 A12 12 0 0 0 12 0 Z', '#E9E4B8'),
        path('M-10.6 0 A10.6 10.6 0 0 0 10.6 0 Z', '#F29545'),
        path('M-5 0 A5 4 0 0 0 5 0 Z', '#E4B25B'),
        line('M-3 1.5 l.5 .5 M0 2.5 l.4 .6 M3 1.5 l-.5 .5', '#8A6A3A', 1),
      ]);
    }
    return g({}, [
      circle(12, '#D6D19B'),
      line('M0 -12 C-7 -6 -7 6 0 12 M0 -12 C7 -6 7 6 0 12 M0 -12 C-13 -6 -13 6 0 12 M0 -12 C13 -6 13 6 0 12', '#98A56A', 1.3),
      shine(-4, -5, 3.4, 2.2),
    ]);
  },
  pasteque: (r) => {
    if (r() > 0.5) {
      return g({}, [
        path('M-13 -2 A13 13 0 0 0 13 -2 Z', '#2F6B35'),
        path('M-11.5 -2 A11.5 11.5 0 0 0 11.5 -2 Z', '#F4EFD2'),
        path('M-10.4 -2 A10.4 10.4 0 0 0 10.4 -2 Z', '#E5485C'),
        ...[[-5, 2], [0, 4], [5, 2], [-2.5, 6], [2.5, 6]].map(([x, y]) => ell(x, y, 0.8, 1.3, '#2A1A16')),
      ]);
    }
    return g({}, [
      ell(0, 0, 14, 11, '#3E7C38'),
      line('M-12 -5 Q0 -9 12 -5 M-14 0 Q0 -4 14 0 M-12 5 Q0 1 12 5', '#27552A', 2.2),
      shine(-5, -5, 4, 2),
    ]);
  },
  peche: (r) => g({}, [
    circle(9.5, r() > 0.5 ? '#F2A649' : '#F0B25A'),
    path('M-9.5 0 A9.5 9.5 0 0 1 4 -8.6 C1 -2 5 5 9 3 A9.5 9.5 0 0 1 -9.5 0 Z', '#E0584A', { opacity: 0.55, transform: 'rotate(160)' }),
    line('M0 -9 Q-2.5 0 0 9', '#D05A3A', 1, { opacity: 0.45 }),
    shine(-3.5, -3.5, 2.6, 1.8),
  ]),
  abricot: () => g({}, [
    circle(8, '#F2A13B'),
    ell(3, 2, 4.5, 4, '#E3662F', { opacity: 0.45 }),
    line('M0 -7.6 Q-2 0 0 7.6', '#D0782F', 1, { opacity: 0.5 }),
    shine(-3, -3, 2.2, 1.6),
  ]),
  cerise: () => g({}, [
    line('M-4 0 Q-2 -9 2 -13 M4 1 Q4 -7 2 -13', '#5E7A33', 1.1),
    circle(4.6, '#A9142C', { transform: 'translate(-4 2)' }),
    circle(4.6, '#B8182F', { transform: 'translate(4.2 3)' }),
    ell(-5.2, 0.6, 1.2, 0.9, '#fff', { opacity: 0.5 }),
    ell(3, 1.6, 1.2, 0.9, '#fff', { opacity: 0.5 }),
  ]),
  fraise: () => {
    const G = g({}, [path('M0 11 C-7 7 -10 -1 -8 -5 C-6 -8 -2 -7 0 -6 C2 -7 6 -8 8 -5 C10 -1 7 7 0 11 Z', '#DE2A3E')]);
    [[-4, -2], [0, -1], [4, -2], [-5, 2], [-1.5, 3], [2.5, 3], [5, 1.5], [-2, 7], [2, 7], [0, 5.5]].forEach(([x, y]) =>
      G.append(ell(x, y, 0.5, 0.8, '#F6D55C')),
    );
    G.append(path('M0 -6 l-5 -3 l4 .2 l-1 -3.6 l2 2.6 l2 -2.6 l-1 3.6 l4 -.2 z', '#3E8A36'));
    return G;
  },
  framboise: () => {
    const G = g({});
    [[0, -4], [-3.2, -1], [3.2, -1], [0, 1.5], [-2.5, 4], [2.5, 4], [0, 6.2]].forEach(([x, y]) =>
      G.append(circle(2.6, '#D23A5C', { transform: `translate(${x} ${y})` }), ell(x - 0.7, y - 0.8, 0.8, 0.6, '#F27C98')),
    );
    return G;
  },
  myrtille: () => {
    const G = g({});
    [[-4, 0], [3, -2], [0, 4], [5, 4], [-5, 5]].forEach(([x, y]) =>
      G.append(circle(3.2, '#3F4F8E', { transform: `translate(${x} ${y})` }), circle(0.9, '#23305E', { transform: `translate(${x} ${y - 2})` })),
    );
    return G;
  },
  prune: (r) => {
    const mira = r() > 0.55;
    return g({}, [
      ell(0, 0, mira ? 6.5 : 7.5, mira ? 6.5 : 9, mira ? '#E8C23B' : '#6E3A7A'),
      line('M0 -8 Q-2 0 0 8', mira ? '#C9A02A' : '#4E2658', 1, { opacity: 0.6 }),
      ell(-2.5, -3, 2, 1.5, '#fff', { opacity: mira ? 0.35 : 0.22 }),
    ]);
  },
  figue: () => g({}, [
    path('M0 -11 C3 -10 3 -6 5 -3 C9 1 8 9 0 10 C-8 9 -9 1 -5 -3 C-3 -6 -3 -10 0 -11 Z', '#6E3B5B'),
    path('M-6 3 C-5 8 5 8 6 3 C4 6 -4 6 -6 3 Z', '#9E5C7A', { opacity: 0.8 }),
    line('M0 -11 Q1 -13 2 -14', '#5E7A33', 1.3),
    shine(-2.5, -2, 1.6, 2.4),
  ]),
  kiwi: (r) => {
    if (r() > 0.5) {
      return g({}, [
        ell(0, 0, 9, 8, '#7A5A36'),
        ell(0, 0, 7.6, 6.6, '#8DBA3A'),
        ell(0, 0, 2.6, 2.2, '#EEF0C8'),
        ...Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return ell(Math.cos(a) * 4, Math.sin(a) * 3.5, 0.6, 0.9, '#1E1E14', { transform: `rotate(${(a * 180) / Math.PI} ${Math.cos(a) * 4} ${Math.sin(a) * 3.5})` });
        }),
      ]);
    }
    return g({}, [ell(0, 0, 9.5, 7.5, '#8B6B43'), ell(-3, -2.5, 3, 1.6, '#A98A5E', { opacity: 0.7 })]);
  },
  clementine: () => g({}, [
    circle(8.5, '#F28C28'),
    shine(-3, -3, 2.4, 1.6),
    circle(0.9, '#B85E1A', { transform: 'translate(0 -7.5)' }),
    leafShape(0, -8, -20, 9, C.leafDark),
  ]),
  orange: () => g({}, [
    circle(10, '#F39A2D'),
    ...[[-4, -2], [3, -4], [5, 2], [-2, 4], [1, 0], [-5, 3]].map(([x, y]) => circle(0.5, '#D9791C', { transform: `translate(${x} ${y})` })),
    shine(-4, -4, 2.8, 1.8),
    circle(1, '#8A6A2A', { transform: 'translate(0 -9.3)' }),
  ]),
  coing: () => g({}, [
    path('M0 -10 C5 -10 6 -5 8 -2 C11 3 8 10 0 10 C-8 10 -11 3 -8 -2 C-6 -5 -5 -10 0 -10 Z', '#E3CB4A'),
    ell(-3, -3, 2.4, 3, '#F4E48A', { opacity: 0.7 }),
    line('M0 -10 Q0 -12 1.5 -13', C.stem, 1.3),
  ]),
  chataigne: () => g({}, [
    path('M0 -9 C6 -6 9 0 8 5 L-8 5 C-9 0 -6 -6 0 -9 Z', '#7A4527'),
    path('M-8 5 L8 5 C8 8 5 9 0 9 C-5 9 -8 8 -8 5 Z', '#C9A06A'),
    ell(-2.5, -3, 2, 1.4, '#fff', { opacity: 0.25 }),
  ]),
  rhubarbe: () => g({}, [
    path('M-2 12 L-1 -8 L2 -8 L3 12 Z', '#C8385A'),
    path('M-1 -8 C-10 -12 -8 -20 0 -18 C8 -20 10 -12 2 -8 Z', C.leaf),
    line('M-.5 10 L0 -6', '#E88A9E', 0.8),
  ]),
  // --- Légumes ---
  asperge: () => g({}, [
    path('M-1.8 14 L-1.4 -10 C-1.4 -13 1.4 -13 1.4 -10 L1.8 14 Z', '#86AE4E'),
    path('M-1.4 -10 C-1.4 -13 1.4 -13 1.4 -10 L0 -8.5 Z', '#6E7F3A'),
    line('M-1.4 -4 l1.4 1.4 l1.4 -1.4 M-1.5 2 l1.5 1.4 l1.5 -1.4', '#5E7F33', 0.8),
  ]),
  petitspois: () => g({}, [
    path('M-11 2 C-6 -6 6 -6 11 2 C6 -1 -6 -1 -11 2 Z', '#5E9A3A'),
    ...[-6, -2, 2, 6].map((x) => circle(2.3, '#8CC152', { transform: `translate(${x} -1.8)` })),
    line('M11 2 Q13 0 13 -3', '#4E7F2E', 1),
  ]),
  radis: () => g({}, [
    line('M-8 3 Q-13 5 -16 9', '#EAD9DC', 0.9),
    ell(0, 0, 8, 6, '#D8345A'),
    path('M-8 0 A8 6 0 0 0 -2 5.7 C-4 3 -5 0 -4.2 -4.8 A8 6 0 0 0 -8 0 Z', '#F6EEF0'),
    ell(2.5, -2, 2.2, 1.2, '#fff', { opacity: 0.35 }),
    leafShape(6, -3, -40, 11, C.leaf),
    leafShape(7, -2, -10, 10, C.leafLight),
  ]),
  artichaut: () => g({}, [
    path('M0 11 C-9 8 -10 -2 -6 -8 C-3 -12 3 -12 6 -8 C10 -2 9 8 0 11 Z', '#5E7F3E'),
    path('M-6 -2 C-3 3 3 3 6 -2 M-7 4 C-3 9 3 9 7 4 M-4 -7 C-2 -3 2 -3 4 -7', 'none', { stroke: '#8E6A8E', 'stroke-width': 1.6 }),
    line('M0 11 v4', '#6F8F4A', 2.2),
  ]),
  laitue: () => g({}, [
    circle(12, '#6FA64A'),
    path('M-12 2 C-10 -8 -4 -12 0 -9 C4 -12 10 -8 12 2 C8 -3 4 -4 0 -1 C-4 -4 -8 -3 -12 2 Z', '#9CCB62'),
    path('M-8 5 C-6 -2 -2 -4 0 -2 C2 -4 6 -2 8 5 C4 2 -4 2 -8 5 Z', '#B9DC7E'),
    line('M0 -1 V10 M0 3 L-5 8 M0 3 L5 8', '#E4F0C6', 1, { opacity: 0.9 }),
  ]),
  concombre: () => g({}, [
    path('M-15 2 C-15 -3 15 -4 15 1 C15 5 -15 6 -15 2 Z', '#3D7A3A'),
    line('M-11 -1 H9', '#5E9A4E', 1.2, { opacity: 0.8 }),
    ...[-9, -4, 1, 6, 11].map((x) => circle(0.6, '#2A5A28', { transform: `translate(${x} 2.5)` })),
  ]),
  courgette: () => g({}, [
    path('M-15 1 C-15 -3 13 -3.5 14 0 C15 3.5 -15 5 -15 1 Z', '#2F6B35'),
    line('M-12 -.5 H10 M-12 2 H10', '#6E9E4A', 0.9, { opacity: 0.8 }),
    path('M14 0 L18 -1.5 L18 1.5 Z', '#7A8F4A'),
  ]),
  aubergine: () => g({}, [
    path('M-12 2 C-14 -6 -2 -8 6 -4 C11 -2 13 4 8 7 C0 11 -10 9 -12 2 Z', '#5B2A5E'),
    path('M6 -4 C8 -7 12 -7 14 -5 C12 -3 10 -1 8 0 Z', '#4E7F3A'),
    ell(-4, -2, 4, 1.6, '#fff', { opacity: 0.22 }),
  ]),
  poivron: (r) => {
    const col = ['#D63A2F', '#F2C230', '#4E9A3A'][Math.floor(r() * 3)];
    return g({}, [
      path('M-9 -5 C-10 4 -7 10 -3 10 C-1 10 0 8 0 8 C0 8 1 10 3 10 C7 10 10 4 9 -5 C7 -9 -7 -9 -9 -5 Z', col),
      line('M-3 -6 C-4 0 -3 6 -3 9 M3 -6 C4 0 3 6 3 9', '#000', 1, { opacity: 0.15 }),
      path('M-1.5 -8 L-1 -12 L1.5 -12 L1.5 -8 Z', '#3E7C33'),
      shine(-5, -2, 1.6, 3),
    ]);
  },
  haricot: () => g({}, [
    line('M-12 -3 Q0 -6 12 -2', '#5E9A3A', 2.4),
    line('M-12 1 Q0 -2 12 2', '#6FAA42', 2.4),
    line('M-12 5 Q0 2 12 6', '#5E9A3A', 2.4),
  ]),
  brocoli: () => g({}, [
    path('M-2 4 L-3 12 L3 12 L2 4 Z', '#8DB45A'),
    ...[[-6, -2, 5], [0, -6, 5.5], [6, -2, 5], [-3, 2, 4.5], [3, 2, 4.5]].map(([x, y, r]) => circle(r, '#3F7F34', { transform: `translate(${x} ${y})` })),
    ...[[-6, -3], [0, -7], [6, -3]].map(([x, y]) => circle(1.6, '#5E9E47', { transform: `translate(${x} ${y})` })),
  ]),
  fenouil: () => g({}, [
    path('M0 10 C-9 9 -10 0 -5 -3 L-2 -9 L2 -9 L5 -3 C10 0 9 9 0 10 Z', '#DCE8B8'),
    line('M-2 -9 L-4 -15 M0 -9 L0 -16 M2 -9 L4 -15', '#7DB356', 1.4),
    line('M-3 -1 C-3 5 -2 8 0 9 M3 -1 C3 5 2 8 0 9', '#B7CC8A', 1, { opacity: 0.8 }),
  ]),
  carotte: () => g({}, [
    path('M-3.5 -10 C-3.5 -12 3.5 -12 3.5 -10 L0.8 13 C0.5 14.5 -0.5 14.5 -0.8 13 Z', '#E97A2C'),
    line('M-2.8 -4 h2.5 M1 0 h2 M-2 5 h2', '#C45E1C', 0.9, { opacity: 0.8 }),
    line('M0 -11 L-3 -18 M0 -11 L0 -19 M0 -11 L3 -17', '#4E8A3B', 1.6),
  ]),
  betterave: () => g({}, [
    line('M-1 -7 L-4 -15 M1 -7 L4 -14', '#B03A5A', 1.4),
    leafShape(-4, -14, -110, 8, C.leafDark),
    leafShape(4, -13, -60, 8, C.leaf),
    circle(8, '#7A1F3D'),
    line('M0 8 Q1 11 0 14', '#7A1F3D', 1),
    shine(-3, -3, 2.2, 1.5),
  ]),
  patate: () => g({}, [
    path('M-13 1 C-12 -5 -2 -7 6 -5 C12 -3 14 2 11 5 C5 9 -10 7 -13 1 Z', '#B3654A'),
    ell(-3, -2.5, 4, 1.4, '#D08A6A', { opacity: 0.6 }),
  ]),
  courge: (r) => {
    if (r() > 0.5) {
      return g({}, [
        path('M-3 -12 C1 -12 3 -9 3 -5 C9 -2 10 7 5 10 C1 12 -5 12 -8 9 C-11 5 -9 -2 -4 -5 C-4 -9 -5 -12 -3 -12 Z', '#E6C288'),
        path('M-4 -12 L-3 -15 L-1 -15 L-1 -12 Z', '#7A6A3A'),
        shine(-4, 2, 2, 3),
      ]);
    }
    return g({}, [
      path('M0 -9 C8 -10 12 -4 12 1 C12 8 6 11 0 10 C-6 11 -12 8 -12 1 C-12 -4 -8 -10 0 -9 Z', '#E3752B'),
      line('M0 -9 C-3 -2 -3 5 0 10 M0 -9 C3 -2 3 5 0 10 M-7 -6 C-9 0 -8 6 -5 9 M7 -6 C9 0 8 6 5 9', '#C45E1C', 1, { opacity: 0.7 }),
      path('M-1 -9 L0 -13 L2 -12.5 L1 -9 Z', '#5E6A3A'),
    ]);
  },
  poireau: () => g({}, [
    path('M-2.2 14 L-2.2 -2 L2.2 -2 L2.2 14 Z', '#F2F0DC'),
    path('M-2.2 -2 L2.2 -2 L2.4 -6 L-2.4 -6 Z', '#C9D9A0'),
    path('M-2.4 -6 L-6 -20 L-1 -8 L0 -22 L1 -8 L6 -19 L2.4 -6 Z', '#3F7A3A'),
    line('M0 14 v2 M-1.5 14 l-1 2 M1.5 14 l1 2', '#D6CFB8', 0.7),
  ]),
  celeri: () => g({}, [
    path('M0 -8 C8 -9 11 -2 10 3 C9 9 4 10 0 9 C-4 10 -9 9 -10 3 C-11 -2 -8 -9 0 -8 Z', '#D9CBA4'),
    ...[[-4, -2], [3, -3], [5, 3], [-5, 4], [0, 2]].map(([x, y]) => circle(1.1, '#B8A77A', { transform: `translate(${x} ${y})` })),
    line('M-4 9 l-2 3 M0 9.5 v3 M4 9 l2 3', '#A8976A', 0.8),
    line('M-1 -8 L-3 -13 M1 -8 L3 -12', '#6F9F4A', 1.5),
  ]),
  choufleur: () => g({}, [
    leafShape(-2, 6, 160, 12, C.leaf),
    leafShape(2, 6, 20, 12, C.leafDark),
    ...[[-5, -1, 5], [0, -4, 5.5], [5, -1, 5], [-2, 3, 4.5], [3, 3, 4.5]].map(([x, y, r]) => circle(r, '#F4EFDC', { transform: `translate(${x} ${y})` })),
    ...[[-5, -2], [0, -5], [5, -2]].map(([x, y]) => circle(1.6, '#E4DCC4', { transform: `translate(${x} ${y})` })),
  ]),
  chou: (r) => {
    const red = r() > 0.5;
    return g({}, [
      circle(11, red ? '#7A3A6E' : '#7FB04E'),
      path('M-11 1 C-8 -8 8 -8 11 1 C6 -4 -6 -4 -11 1 Z', red ? '#9A5A8E' : '#A4CF72'),
      line('M0 -9 C-3 -2 -3 5 0 10 M0 -2 C-4 0 -7 3 -8 6 M0 -2 C4 0 7 3 8 6', red ? '#C9A8D0' : '#DDEDB8', 1, { opacity: 0.8 }),
    ]);
  },
  endive: () => g({}, [
    path('M0 -12 C5 -10 6 0 4 10 C3 13 -3 13 -4 10 C-6 0 -5 -10 0 -12 Z', '#F3EFC8'),
    path('M0 -12 C3 -11 4 -7 4 -4 C2 -6 -2 -6 -4 -4 C-4 -7 -3 -11 0 -12 Z', '#E4DA6A'),
    line('M0 -4 V11', '#E0DAB0', 1),
  ]),
  mache: () => g({}, [
    ...[0, 72, 144, 216, 288].map((a) => leafShape(0, 0, a, 9, a % 144 ? C.leaf : C.leafLight)),
    circle(1.6, '#3E6A2E'),
  ]),
  panais: () => g({}, [
    path('M-4 -9 C-4 -11 4 -11 4 -9 L0.8 13 C0.5 14 -0.5 14 -0.8 13 Z', '#EDE0B8'),
    line('M-3 -3 h2.5 M1 2 h2 M-2 6 h1.8', '#C9B98A', 0.9),
    line('M0 -10 L-2 -15 M0 -10 L2 -15', '#6F9F4A', 1.4),
  ]),
  navet: () => g({}, [
    line('M-1 -7 L-3 -14 M1 -7 L3 -14', C.leaf, 1.4),
    path('M0 -8 C7 -8 9 -2 8 3 C7 8 3 10 0 12 C-3 10 -7 8 -8 3 C-9 -2 -7 -8 0 -8 Z', '#F4EEF2'),
    path('M0 -8 C7 -8 9 -2 8 -1 C4 -3 -4 -3 -8 -1 C-9 -2 -7 -8 0 -8 Z', '#9B4C8C'),
  ]),
  epinard: () => g({}, [
    leafShape(0, 4, -130, 13, C.leafDark),
    leafShape(0, 4, -50, 13, C.leaf),
    leafShape(0, 4, -90, 14, '#3A7A36'),
  ]),
  citron: () => g({}, [
    path('M-11 0 C-11 -6 -5 -8 0 -8 C5 -8 11 -6 11 0 C11 6 5 8 0 8 C-5 8 -11 6 -11 0 Z', '#F4D23C'),
    path('M-11 0 L-13.5 -.6 L-13.5 .6 Z M11 0 L13.5 -.6 L13.5 .6 Z', '#E2BC2A'),
    shine(-4, -3.5, 3, 1.6),
    leafShape(3, -7, -30, 8, C.leafDark),
  ]),
  gingembre: () => g({}, [
    path('M-12 2 C-13 -3 -8 -5 -5 -3 C-4 -8 1 -9 3 -5 C6 -7 11 -5 11 -1 C14 1 13 6 9 6 C6 9 1 7 -1 6 C-5 8 -11 7 -12 2 Z', '#D9B27A'),
    line('M-8 0 h3 M1 -2 h3 M5 3 h3', '#B38B52', 1),
    ell(-5, -3, 2.2, 1.2, '#E8CFA0', { opacity: 0.9 }),
  ]),
  pdt: () => g({}, [
    ell(0, 0, 9, 7, '#D9B97A'),
    ...[[-3, -2], [3, 1], [-1, 3]].map(([x, y]) => circle(0.7, '#A8874A', { transform: `translate(${x} ${y})` })),
  ]),
};

// Disposition par produit : 'round' (tas), 'long' (botte couchée), 'big' (gros), 'leafy' (têtes), 'bunch'.
const LAYOUT = {
  tomate: ['round', 1], pomme: ['round', 1], poire: ['round', 1], raisin: ['round', 1.05], melon: ['big', 1],
  pasteque: ['big', 1.05], peche: ['round', 1], abricot: ['round', 0.9], cerise: ['round', 0.9], fraise: ['round', 0.85],
  framboise: ['round', 0.8], myrtille: ['round', 0.8], prune: ['round', 0.9], figue: ['round', 0.95], kiwi: ['round', 0.95],
  clementine: ['round', 0.95], orange: ['round', 1], coing: ['round', 1], chataigne: ['round', 0.8], rhubarbe: ['long', 1],
  asperge: ['long', 1], petitspois: ['round', 0.9], radis: ['round', 0.95], artichaut: ['round', 1.05], laitue: ['leafy', 1],
  concombre: ['long', 1], courgette: ['long', 1], aubergine: ['round', 1], poivron: ['round', 1], haricot: ['round', 0.9],
  brocoli: ['round', 1.05], fenouil: ['round', 1], carotte: ['long', 1], betterave: ['round', 0.95], patate: ['round', 1],
  courge: ['big', 1], poireau: ['long', 1.1], celeri: ['round', 1.05], choufleur: ['leafy', 1], chou: ['leafy', 1],
  endive: ['long', 0.95], mache: ['round', 0.9], panais: ['long', 1], navet: ['round', 0.95], epinard: ['round', 1],
  pdt: ['round', 0.9],
};

/** Un seul produit (pour une icône ou une animation). */
export function drawProduce(id, seed = 1) {
  const fn = ART[id] || ART.pomme;
  return fn(rng(seed));
}

/**
 * Remplit l'ouverture d'une cagette : zone de largeur `w`, hauteur de tas `h`,
 * origine (0,0) = bord avant gauche de la cagette. Renvoie un <g> dont chaque
 * enfant `.pz` est un produit animable.
 */
export function crateHeap(id, { w = 90, h = 26, scale = 1, seed = 7 } = {}) {
  const r = rng(seed);
  const [kind, k0] = LAYOUT[id] || ['round', 1];
  const k = k0 * scale;
  const G = g({ class: 'heap' });
  const add = (x, y, rot, sc) => {
    const wrap = g({ transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
    const inner = g({ class: 'pz' });
    inner.append(g({ transform: `rotate(${rot.toFixed(0)}) scale(${sc.toFixed(2)})` }, ART[id] ? ART[id](r) : ART.pomme(r)));
    wrap.append(inner);
    G.append(wrap);
  };
  if (kind === 'long') {
    const vertical = ['poireau', 'asperge', 'rhubarbe', 'carotte', 'panais', 'endive'].includes(id);
    if (vertical) {
      [{ y: -h * 0.62, sc: 0.86 }, { y: -h * 0.3, sc: 0.95 }].forEach((layer, li) => {
        const n = Math.max(5, Math.round(w / (6.5 * k)));
        for (let i = 0; i < n; i++) {
          const x = 5 + ((i + 0.5 + li * 0.5) / n) * (w - 10) + (r() - 0.5) * 2.5;
          if (x > w - 3) continue;
          add(x, layer.y + (r() - 0.5) * 3, -24 + (r() - 0.5) * 18, layer.sc * k);
        }
      });
    } else {
      [-h * 0.72, -h * 0.45, -h * 0.18].forEach((y, li) => {
        const n = Math.max(2, Math.round(w / (32 * k)));
        for (let i = 0; i < n; i++) {
          const x = 16 * k + ((i + (li % 2) * 0.5) / n) * (w - 24) + (r() - 0.5) * 4;
          if (x > w - 10) continue;
          add(x, y + (r() - 0.5) * 2, -8 + (r() - 0.5) * 12, (0.82 + li * 0.07) * k);
        }
      });
    }
  } else if (kind === 'big') {
    const n = Math.max(2, Math.round(w / (26 * k)));
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < n; i++) {
        const x = 12 + ((i + 0.5) / n) * (w - 24) + (row ? 10 : 0) + (r() - 0.5) * 4;
        if (x > w - 8) continue;
        add(x, -h * (row ? 0.25 : 0.65) + (r() - 0.5) * 3, (r() - 0.5) * 30, (row ? 1.02 : 0.9) * k);
      }
    }
  } else if (kind === 'leafy') {
    const n = Math.max(2, Math.round(w / (24 * k)));
    for (let i = 0; i < n; i++) add(12 + ((i + 0.5) / n) * (w - 24), -h * 0.45 + (r() - 0.5) * 4, (r() - 0.5) * 20, 1.1 * k);
  } else {
    // Tas : trois rangs, du fond vers l'avant
    const step = 15 * k;
    const rows = [
      { y: -h * 0.82, sc: 0.84, off: 0.5 },
      { y: -h * 0.5, sc: 0.93, off: 0 },
      { y: -h * 0.16, sc: 1, off: 0.5 },
    ];
    rows.forEach((row) => {
      const n = Math.max(2, Math.floor((w - 8) / step));
      for (let i = 0; i < n; i++) {
        const x = 6 + (i + row.off) * ((w - 12) / n) + (r() - 0.5) * 3;
        if (x < 4 || x > w - 4) continue;
        add(x, row.y + (r() - 0.5) * 3, (r() - 0.5) * 50, row.sc * k * 0.78);
      }
    });
  }
  return G;
}

/** Cagette en bois vue de face (avant). Origine : coin haut-gauche du bord avant. */
export function crateFront(w = 90, hgt = 26, { tone = 0 } = {}) {
  const wood = ['#EBD3A4', '#E4C893', '#EFDDB6'][tone % 3];
  const shade = '#C9A874';
  return g({ class: 'crate-front' }, [
    s('rect', { x: 0, y: 0, width: w, height: hgt, rx: 1.5, fill: wood }),
    s('rect', { x: 0, y: 0, width: 5, height: hgt, fill: shade, opacity: 0.8 }),
    s('rect', { x: w - 5, y: 0, width: 5, height: hgt, fill: shade, opacity: 0.8 }),
    s('path', { d: `M5 ${hgt * 0.5} H${w - 5}`, stroke: shade, 'stroke-width': 1.2 }),
    s('rect', { x: 0, y: 0, width: w, height: 2.6, fill: '#fff', opacity: 0.35 }),
    s('circle', { cx: 2.5, cy: 4, r: 0.8, fill: '#8A7250' }),
    s('circle', { cx: w - 2.5, cy: 4, r: 0.8, fill: '#8A7250' }),
    s('circle', { cx: 2.5, cy: hgt - 4, r: 0.8, fill: '#8A7250' }),
    s('circle', { cx: w - 2.5, cy: hgt - 4, r: 0.8, fill: '#8A7250' }),
  ]);
}

export const PRODUCE_IDS = Object.keys(ART);
