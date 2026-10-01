// Carte fidélité imprimée : une carte en papier crème, imprimée à l'encre verte, façon fiche
// (« Nom », « Tél. ») avec un panier en osier au centre. Le client écrit son nom et son numéro
// au stylo bille ; chaque passage = un coup de tampon encreur : un légume, chacun de sa couleur
// d'encre (bords irréguliers, manques d'encre), qui chevauche un peu les autres dans le panier.
// Le 10e tampon est le logo Café Laitue : boisson offerte. Compteur dans le coin bas droit.
// viewBox 0 0 380 330.

import { s, g, svgRoot, uid, rng } from '../lib/svg.js';
import { createStamp, FONT_DISPLAY, FONT_HAND, brandFontsReady } from './stamp.js';

const INK = '#1C4A33'; // encre d'impression (vert forêt)
const PAPER = '#F7F0DF';
const PEN = '#27387A'; // stylo bille bleu
export const GIFT_INK = '#12432B'; // le logo, au 10e tampon
const FONT_PEN = '"Caveat", "Segoe Print", cursive';
const f = (n) => Math.round(n * 10) / 10;

/** Le panier imprimé est dessiné dans son propre repère, puis réduit et posé sur la carte. */
const BK = { k: 0.82, x: 186 - 180 * 0.82, y: 296 - 279 * 0.82 };

/** Les dix coups de tampon : un tas de légumes qui dépassent du panier et se chevauchent. */
export const SLOTS = [
  { x: 112, y: 148, rot: -14 },
  { x: 148, y: 144, rot: 4, flip: true },
  { x: 222, y: 142, rot: -8 },
  { x: 260, y: 148, rot: 14 },
  { x: 104, y: 194, rot: 6 },
  { x: 145, y: 197, rot: -10 },
  { x: 186, y: 192, rot: 8 },
  { x: 227, y: 197, rot: -12 },
  { x: 268, y: 194, rot: 10 },
  { x: 186, y: 126, rot: -10, gift: true },
];

// ---------------------------------------------------------------- les tampons
// Chaque légume : sa gomme (`ink`), ses entailles gravées qui ne prennent pas l'encre (`cut`),
// et sa couleur d'encre (un tampon = une couleur).
const GLYPHS = [
  { // poireau
    color: '#3B8C3F',
    ink: 'M-6 -6H6V24Q0 30 -6 24Z M-6 -6C-11 -16 -16 -24 -22 -31C-12 -26 -6 -18 -2 -8Z M-2 -7C-3 -18 -1 -27 2 -34C5 -25 5 -16 3 -7Z M3 -7C8 -16 14 -24 21 -30C17 -20 11 -12 6 -5Z',
    stroke: 'M-4 27l-3 6M0 28v7M4 27l3 6',
    cut: 'M-2.4 0V21M2.4 0V21M-6 -4H6',
  },
  { // carotte
    color: '#E86F1E',
    ink: 'M14 -14C20 -8 18 0 12 6L-20 30C-24 32 -26 30 -23 26L2 -6C6 -12 10 -16 14 -14Z M14 -14C14 -22 10 -30 4 -33C9 -27 11 -20 11 -14Z M15 -13C20 -20 27 -24 33 -24C27 -20 22 -15 17 -10Z M16 -12C24 -14 30 -12 33 -6C27 -9 21 -10 16 -9Z',
    cut: 'M8 -6l5 5M2 1l5 4M-4 8l4 4M-10 15l4 3M-15 21l3 2',
  },
  { // brocoli
    color: '#1C6B4F',
    ink: 'M-4 6L-7 28H7L4 6Z M0 -24a9 9 0 1 1 0 0.1Z M-13 -14a9 9 0 1 1 0 0.1Z M13 -14a9 9 0 1 1 0 0.1Z M-17 -1a8 8 0 1 1 0 0.1Z M17 -1a8 8 0 1 1 0 0.1Z M-6 0a10 9 0 1 1 0 0.1Z M6 0a10 9 0 1 1 0 0.1Z',
    cut: 'M-3 -24a1.6 1.6 0 1 0 0.1 0M4 -20a1.6 1.6 0 1 0 0.1 0M-14 -12a1.6 1.6 0 1 0 0.1 0M12 -12a1.6 1.6 0 1 0 0.1 0M-6 -6a1.6 1.6 0 1 0 0.1 0M7 -4a1.6 1.6 0 1 0 0.1 0M-18 1a1.4 1.4 0 1 0 0.1 0M17 1a1.4 1.4 0 1 0 0.1 0M0 10V24M0 13l-4 -4M0 13l4 -4',
  },
  { // aubergine
    color: '#6B3A8F',
    ink: 'M-4 -14C-18 -6 -24 12 -16 24C-8 34 10 30 16 16C22 2 16 -14 4 -16Z M-6 -14C-8 -22 -2 -24 2 -20C6 -26 12 -22 8 -16C4 -12 -2 -10 -6 -14Z M2 -20L6 -32',
    stroke: 'M2 -20L6 -32',
    cut: 'M-12 4C-14 12 -10 20 -4 22M-4 -12C0 -10 4 -10 6 -13',
  },
  { // courgette
    color: '#79A02B',
    ink: 'M-26 20C-30 16 -28 10 -22 6L14 -20C20 -24 26 -22 28 -17C30 -12 26 -8 22 -5L-14 22C-18 25 -23 24 -26 20Z M24 -19L32 -27',
    stroke: 'M24 -19L32 -27',
    cut: 'M-20 14L18 -14M-14 18L20 -8M-22 8L12 -17',
  },
  { // tomate
    color: '#D7302A',
    ink: 'M0 -16C14 -16 22 -6 22 6C22 19 12 26 0 26C-12 26 -22 19 -22 6C-22 -6 -14 -16 0 -16Z M0 -14L-4 -22L-1 -17L0 -26L2 -17L6 -22L4 -14L11 -15L5 -11L-5 -11L-11 -15Z',
    cut: 'M-14 0C-14 -6 -10 -10 -5 -11M-11 -13H11',
  },
  { // radis
    color: '#D1367A',
    ink: 'M0 -6C10 -6 16 2 15 10C14 18 6 24 0 28C-6 24 -14 18 -15 10C-16 2 -10 -6 0 -6Z M-2 -6C-8 -14 -16 -20 -22 -30C-12 -28 -6 -20 -1 -8Z M2 -6C6 -16 12 -24 20 -30C18 -20 12 -12 4 -5Z',
    stroke: 'M0 28V36',
    cut: 'M-9 4C-9 0 -6 -3 -2 -3M-14 -22L-4 -10M14 -22L5 -9',
  },
  { // poivron
    color: '#E3A117',
    ink: 'M-2 -12C-12 -16 -22 -10 -22 2C-22 14 -16 24 -8 26C-4 27 -1 25 0 24C1 25 4 27 8 26C16 24 22 14 22 2C22 -10 12 -16 2 -12C1 -14 -1 -14 -2 -12Z M-1 -12C-2 -18 0 -24 5 -28L7 -26C3 -22 2 -17 2 -12Z',
    cut: 'M-6 -8C-10 2 -10 14 -6 24M6 -8C10 2 10 14 6 24M-16 -2C-16 -6 -13 -9 -10 -10',
  },
  { // betterave
    color: '#8A1C47',
    ink: 'M0 -4C12 -4 18 4 18 12C18 22 10 28 0 28C-10 28 -18 22 -18 12C-18 4 -12 -4 0 -4Z M-3 -4C-8 -14 -14 -22 -22 -28C-14 -26 -7 -18 -1 -6Z M3 -4C6 -14 12 -24 20 -30C18 -20 12 -12 5 -4Z',
    stroke: 'M0 28Q2 34 0 38',
    cut: 'M-10 10C-10 4 -6 1 -1 1M-8 18C-4 22 4 22 9 17M-14 -19L-4 -8M14 -22L5 -8',
  },
];

/** Couleur d'encre du tampon `i` (le 10e : le vert du logo). */
export const stampColor = (i) => (SLOTS[i]?.gift ? GIFT_INK : GLYPHS[i % GLYPHS.length].color);

/** Bords irréguliers + manques d'encre : le vrai rendu d'un tampon encreur. */
function inkFilter(id, seed, { rough = 1.6, holes = 1.2, bias = 1.72, freq = 0.95 } = {}) {
  return s('filter', { id, x: '-10%', y: '-10%', width: '120%', height: '120%' }, [
    s('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.55, numOctaves: 2, seed, result: 'n' }),
    s('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: rough, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }),
    s('feTurbulence', { type: 'fractalNoise', baseFrequency: freq, numOctaves: 2, seed: seed + 5, result: 'sp' }),
    s('feColorMatrix', { in: 'sp', type: 'matrix', values: `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${-holes * 2} ${bias + 0.4}`, result: 'mask' }),
    s('feComposite', { in: 'd', in2: 'mask', operator: 'in' }),
  ]);
}

/** Le panier en osier, en traits et hachures (repère d'origine : ouverture centrée en 180,134). */
function printedBasket(hatchId) {
  const B = g({ transform: `translate(${f(BK.x)} ${f(BK.y)}) scale(${BK.k})` });
  const w = (n) => n / BK.k ** 0.5; // les traits gardent du corps une fois réduits
  // anse torsadée
  const twist = [];
  for (let t = 0.04; t < 0.97; t += 0.045) {
    const a = Math.PI * (1 - t);
    twist.push(`M${f(180 + Math.cos(a) * 126)} ${f(134 - Math.sin(a) * 101)}L${f(180 + Math.cos(a - 0.05) * 114)} ${f(134 - Math.sin(a - 0.05) * 90)}`);
  }
  B.append(
    s('path', { d: 'M54 134C54 52 112 26 180 26C248 26 306 52 306 134', fill: 'none', stroke: INK, 'stroke-width': w(1.8) }),
    s('path', { d: 'M66 134C66 62 118 38 180 38C242 38 294 62 294 134', fill: 'none', stroke: INK, 'stroke-width': w(1.6) }),
    s('path', { d: twist.join(''), stroke: INK, 'stroke-width': w(1.3) }),
  );
  // ouverture : bord arrière, bord avant tressé
  const braid = [];
  for (let i = 0; i <= 36; i++) {
    const t = i / 36;
    braid.push(`M${f(44 + t * 272)} ${f(134 + Math.sin(Math.PI * t) * 23.5 - 0.5)}l5 7`);
  }
  B.append(
    s('path', { d: 'M44 134C44 120 108 110 180 110C252 110 316 120 316 134', fill: 'none', stroke: INK, 'stroke-width': w(1.6) }),
    s('path', { d: 'M44 134C44 148 108 158 180 158C252 158 316 148 316 134', fill: 'none', stroke: INK, 'stroke-width': w(2) }),
    s('path', { d: 'M48 142C60 154 116 166 180 166C244 166 300 154 312 142', fill: 'none', stroke: INK, 'stroke-width': w(1.4) }),
    s('path', { d: braid.join(''), stroke: INK, 'stroke-width': w(1.2) }),
  );
  // corps : contour, montants, rangs de vannerie (dessus/dessous), hachures d'ombre
  const stakes = [];
  for (let i = 1; i < 22; i++) {
    const t = i / 22;
    stakes.push(`M${f(48 + t * 264)} ${f(146 + Math.sin(Math.PI * t) * 20)}L${f(72 + t * 216)} 278`);
  }
  const rows = [];
  for (let y = 172, k = 0; y < 276; y += 11, k++) {
    const kk = (y - 142) / 137;
    const x0 = 48 + kk * 22;
    const x1 = 312 - kk * 22;
    const n = 22;
    const step = (x1 - x0) / n;
    for (let c = k % 2; c < n; c += 2) {
      const cx = x0 + (c + 0.5) * step;
      const bow = 18 * (1 - Math.pow((cx - 180) / 140, 2)) * (1 - kk * 0.7);
      rows.push(`M${f(cx - step * 0.6)} ${f(y + bow)}q${f(step * 0.6)} -5 ${f(step * 1.2)} 0`);
    }
  }
  B.append(
    s('path', { d: 'M48 142C50 180 56 222 66 258C70 272 80 278 96 279L264 279C280 278 290 272 294 258C304 222 310 180 312 142', fill: 'none', stroke: INK, 'stroke-width': w(2) }),
    s('path', { d: stakes.join(''), stroke: INK, 'stroke-width': w(0.8), opacity: 0.75 }),
    s('path', { d: rows.join(''), fill: 'none', stroke: INK, 'stroke-width': w(1.3), 'stroke-linecap': 'round' }),
    s('path', { d: 'M262 150C286 146 304 142 312 142C310 180 304 222 294 258C290 272 280 278 264 279C272 240 274 196 262 150Z', fill: `url(#${hatchId})`, opacity: 0.5 }),
    s('path', { d: 'M70 266C90 274 270 274 290 266L290 270C270 280 90 280 70 270Z', fill: INK, opacity: 0.7 }),
  );
  return B;
}

/**
 * Construit la carte. Renvoie le SVG et de quoi poser / retirer / animer les tampons, écrire le
 * nom et le numéro, afficher le compteur.
 */
export function createBasket() {
  const svg = svgRoot('0 0 380 330', { class: 'lbasket-svg' });
  svg.style.overflow = 'visible';
  const r = rng(5);
  const ids = { grain: uid('grain'), print: uid('print'), hatch: uid('hatch'), pen: uid('pen'), clipName: uid('clipn'), clipTel: uid('clipt') };
  const nameClip = s('rect', { x: 58, y: 34, width: 0, height: 39 });
  const telClip = s('rect', { x: 58, y: 73, width: 0, height: 23 });
  const defs = s('defs', {}, [
    s('pattern', { id: ids.grain, width: 7, height: 7, patternUnits: 'userSpaceOnUse' }, [
      s('rect', { width: 7, height: 7, fill: PAPER }),
      s('circle', { cx: 1.2, cy: 1.6, r: 0.45, fill: '#D9CBA9', opacity: 0.55 }),
      s('circle', { cx: 4.6, cy: 3.2, r: 0.35, fill: '#CDBD98', opacity: 0.45 }),
      s('circle', { cx: 2.8, cy: 5.6, r: 0.4, fill: '#E3D8BD', opacity: 0.7 }),
      s('path', { d: 'M5 6.2l1.4 -0.6', stroke: '#D6C7A4', 'stroke-width': 0.3, opacity: 0.6 }),
    ]),
    s('pattern', { id: ids.hatch, width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(40)' }, [
      s('rect', { width: 1.1, height: 4, fill: INK }),
    ]),
    inkFilter(ids.print, 3, { rough: 1.1, holes: 0.9, bias: 1.6, freq: 1.3 }),
    // stylo bille : trait légèrement tremblé, encre un peu inégale
    s('filter', { id: ids.pen, x: '-5%', y: '-20%', width: '110%', height: '140%' }, [
      s('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 1, seed: 8, result: 'n' }),
      s('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 0.9, xChannelSelector: 'R', yChannelSelector: 'G' }),
    ]),
    s('clipPath', { id: ids.clipName }, nameClip),
    s('clipPath', { id: ids.clipTel }, telClip),
  ]);
  svg.append(defs);

  // Le papier : ombre posée, carte, grain, reflet
  svg.append(
    s('rect', { x: 6, y: 9, width: 368, height: 318, rx: 16, fill: '#3E3420', opacity: 0.1 }),
    s('rect', { x: 4, y: 5, width: 372, height: 318, rx: 16, fill: '#3E3420', opacity: 0.08 }),
    s('rect', { x: 4, y: 3, width: 372, height: 318, rx: 16, fill: `url(#${ids.grain})` }),
    s('path', { d: 'M20 3H360Q376 3 376 19V40Q316 20 232 18Q126 16 4 46V19Q4 3 20 3Z', fill: '#fff', opacity: 0.25 }),
  );

  // L'impression (encre verte) : double filet, en-tête, champs, panier, mentions
  const print = g({ class: 'lb-print', filter: `url(#${ids.print})`, opacity: 0.9 });
  print.append(
    s('rect', { x: 14, y: 13, width: 352, height: 298, rx: 10, fill: 'none', stroke: INK, 'stroke-width': 1.6 }),
    s('rect', { x: 19, y: 18, width: 342, height: 288, rx: 7, fill: 'none', stroke: INK, 'stroke-width': 0.7 }),
    // en-tête et champs à remplir
    s('text', { x: 32, y: 40, 'font-family': FONT_DISPLAY, 'font-size': 15, 'letter-spacing': 1.3, fill: INK, text: 'CARTE FIDÉLITÉ' }),
    s('path', { d: 'M32 47H150', stroke: INK, 'stroke-width': 1.1 }),
    s('text', { x: 32, y: 68, 'font-family': FONT_HAND, 'font-size': 12, 'letter-spacing': 0.6, fill: INK, text: 'Nom' }),
    s('path', { d: 'M58 69.5H170', stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '1.4 2.2', 'stroke-linecap': 'round' }),
    s('text', { x: 32, y: 90, 'font-family': FONT_HAND, 'font-size': 12, 'letter-spacing': 0.6, fill: INK, text: 'Tél.' }),
    s('path', { d: 'M58 91.5H140', stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '1.4 2.2', 'stroke-linecap': 'round' }),
    printedBasket(ids.hatch),
    // mention en bas à gauche, compteur en bas à droite
    s('text', { x: 32, y: 270, 'font-family': FONT_HAND, 'font-size': 11.5, 'letter-spacing': 0.4, fill: INK }, [
      s('tspan', { x: 32, dy: 0, text: '10 légumes,' }),
      s('tspan', { x: 32, dy: 14, text: '1 boisson' }),
      s('tspan', { x: 32, dy: 14, text: 'offerte' }),
    ]),
    s('text', { x: 348, y: 262, 'text-anchor': 'end', 'font-family': FONT_HAND, 'font-size': 11, 'letter-spacing': 0.8, fill: INK, text: 'Tampons' }),
    s('path', { d: 'M296 268H348', stroke: INK, 'stroke-width': 0.8 }),
  );
  // emplacement des tampons : petits cercles pointillés numérotés
  const ghosts = g({ class: 'lb-ghosts' });
  SLOTS.forEach((sl, i) => {
    ghosts.append(g({ class: 'lb-ghost', transform: `translate(${sl.x} ${sl.y})` }, [
      s('circle', { r: sl.gift ? 24 : 18, fill: PAPER, 'fill-opacity': 0.85, stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '2.4 2.6', opacity: 0.55 }),
      s('text', { y: sl.gift ? 3 : 3.6, 'text-anchor': 'middle', 'font-family': '"Bricolage Grotesque", system-ui, sans-serif', 'font-weight': 700, 'font-size': sl.gift ? 8 : 10, fill: INK, opacity: 0.45, text: sl.gift ? 'OFFERT' : String(i + 1) }),
    ]));
  });
  print.append(ghosts);
  // le logo imprimé dans le coin haut droit
  const logoBox = g({ transform: 'translate(296 26) scale(.16)' });
  print.append(logoBox);
  svg.append(print);

  // Le compteur (chiffres imprimés dans le coin bas droit)
  const countNum = s('tspan', { text: '0' });
  const count = s('text', { x: 348, y: 300, 'text-anchor': 'end', 'font-family': FONT_DISPLAY, fill: INK, filter: `url(#${ids.print})`, class: 'lb-count' }, [
    s('tspan', { 'font-size': 34 }, countNum),
    s('tspan', { 'font-size': 17, dx: 1, 'fill-opacity': 0.7, text: '/10' }),
  ]);
  svg.append(count);

  // Le nom et le numéro, écrits au stylo bille sur les pointillés
  const nameText = s('text', { x: 61, y: 66.5, 'font-family': FONT_PEN, 'font-weight': 600, 'font-size': 23, fill: PEN, class: 'lb-name' });
  const telText = s('text', { x: 61, y: 88.5, 'font-family': FONT_PEN, 'font-weight': 600, 'font-size': 17, 'letter-spacing': 0.6, fill: PEN, class: 'lb-tel' });
  svg.append(
    g({ filter: `url(#${ids.pen})`, opacity: 0.92 }, [
      g({ 'clip-path': `url(#${ids.clipName})` }, nameText),
      g({ 'clip-path': `url(#${ids.clipTel})` }, telText),
    ]),
  );

  // Les tampons (chaque encre se mêle aux autres là où elles se chevauchent)
  const stampLayer = g({ class: 'lb-stamps' });
  svg.append(stampLayer);
  const tool = g({ class: 'lb-tool', opacity: 0 });
  svg.append(tool);

  const placed = new Map();
  let logoStamp = null;
  // 10e tampon : le logo en tampon plein (disque encré, dessin réservé dans le papier)
  const giftReady = createStamp({ disc: true, colors: { forest: PAPER, sage: PAPER, cream: GIFT_INK } }).then((st) => {
    logoStamp = st;
    // le 10e tampon déjà posé avec le dessin de secours : on le refait avec le logo
    if (placed.has(SLOTS.length - 1)) {
      remove(SLOTS.length - 1);
      put(SLOTS.length - 1);
    }
  });
  const logoReady = createStamp({ disc: false, colors: { forest: INK, sage: INK, cream: PAPER } }).then((st) => {
    st.svg.setAttribute('width', 400);
    st.svg.setAttribute('height', 400);
    logoBox.append(st.svg);
  });
  const ready = Promise.all([giftReady, logoReady]);

  /** Le tampon de la place `i` (dessin seul, sans animation). */
  function build(i) {
    const sl = SLOTS[i];
    const fid = uid('inkf');
    defs.append(inkFilter(fid, 11 + i * 7, sl.gift ? { rough: 1.8, holes: 0.7, bias: 1.85 } : { rough: 2.2, holes: 0.95 + r() * 0.25, bias: 1.5 + r() * 0.1 }));
    const outer = g({ class: 'lb-stamp', transform: `translate(${sl.x} ${sl.y}) rotate(${sl.rot})${sl.flip ? ' scale(-1 1)' : ''}` });
    outer.style.mixBlendMode = 'multiply';
    const inner = g({ class: 'lb-stamp-in', filter: `url(#${fid})`, opacity: sl.gift ? 0.95 : 0.86 + r() * 0.1 });
    if (sl.gift) {
      // 10e tampon : le logo Café Laitue
      const box = g({ transform: 'translate(-32 -32) scale(.16)' });
      const st = logoStamp?.svg.cloneNode(true);
      if (st) {
        st.setAttribute('width', 400);
        st.setAttribute('height', 400);
        box.append(st);
      } else {
        box.append(s('circle', { cx: 200, cy: 200, r: 190, fill: 'none', stroke: GIFT_INK, 'stroke-width': 16 }));
      }
      inner.append(box);
    } else {
      const G = GLYPHS[i % GLYPHS.length];
      const mid = uid('cutm');
      const k = 1.08;
      defs.append(s('mask', { id: mid, maskUnits: 'userSpaceOnUse', x: -60, y: -60, width: 120, height: 120 }, [
        s('rect', { x: -60, y: -60, width: 120, height: 120, fill: '#fff' }),
        s('path', { d: G.cut, fill: 'none', stroke: '#000', 'stroke-width': 2.4, 'stroke-linecap': 'round', transform: `scale(${k})` }),
      ]));
      inner.append(g({ mask: `url(#${mid})` }, [
        s('path', { d: G.ink, fill: G.color, transform: `scale(${k})` }),
        G.stroke ? s('path', { d: G.stroke, fill: 'none', stroke: G.color, 'stroke-width': 3, 'stroke-linecap': 'round', transform: `scale(${k})` }) : null,
      ].filter(Boolean)));
    }
    outer.append(inner);
    return { outer, inner };
  }

  function put(i) {
    if (placed.has(i)) return placed.get(i);
    const st = build(i);
    stampLayer.append(st.outer);
    ghosts.children[i].style.opacity = '0';
    placed.set(i, st);
    return st;
  }
  function remove(i) {
    const st = placed.get(i);
    if (!st) return;
    st.outer.remove();
    placed.delete(i);
    ghosts.children[i].style.opacity = '';
  }

  /** Le tampon en bois descend, presse, remonte : il reste l'encre sur le papier. */
  function toolAt(i) {
    const sl = SLOTS[i];
    const rubber = stampColor(i);
    tool.replaceChildren(
      g({ transform: `translate(${sl.x} ${sl.y}) rotate(${sl.rot})` }, [
        s('ellipse', { cx: 0, cy: 2, rx: 30, ry: 6, fill: '#3E3420', opacity: 0.18, class: 'lb-tool-shadow' }),
        g({ class: 'lb-tool-body' }, [
          s('rect', { x: -27, y: -12, width: 54, height: 12, rx: 2, fill: rubber }),
          s('rect', { x: -27, y: -12, width: 54, height: 4, rx: 1.5, fill: '#000', opacity: 0.18 }),
          s('rect', { x: -29, y: -30, width: 58, height: 19, rx: 3, fill: '#C9935A' }),
          s('rect', { x: -29, y: -30, width: 58, height: 5, rx: 2, fill: '#DDB07A' }),
          s('path', { d: 'M-8 -30C-8 -40 -6 -46 -10 -52C-6 -60 6 -60 10 -52C6 -46 8 -40 8 -30Z', fill: '#A8743F' }),
          s('ellipse', { cx: 0, cy: -60, rx: 13, ry: 11, fill: '#B9844C' }),
          s('ellipse', { cx: -4, cy: -64, rx: 4, ry: 3, fill: '#E2BE8A', opacity: 0.8 }),
        ]),
      ]),
    );
    return { body: tool.querySelector('.lb-tool-body'), shadow: tool.querySelector('.lb-tool-shadow') };
  }

  /** Ajuste la largeur d'un texte écrit à la main pour qu'il tienne sur sa ligne. */
  function fit(text, max) {
    text.removeAttribute('textLength');
    text.removeAttribute('lengthAdjust');
    try {
      const w = text.getComputedTextLength();
      if (w > max) {
        text.setAttribute('textLength', max);
        text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      }
      return Math.min(w, max);
    } catch (e) {
      return max;
    }
  }

  let writing = 0;
  /** Écrit le nom et le numéro (animate : le stylo avance de gauche à droite). */
  async function setOwner(name, tel, { animate = false } = {}) {
    const run = ++writing;
    nameText.textContent = name || '';
    telText.textContent = tel || '';
    await brandFontsReady();
    if (run !== writing) return;
    const wName = fit(nameText, 112) + 6;
    const wTel = fit(telText, 80) + 6;
    if (!animate) {
      nameClip.setAttribute('width', 140);
      telClip.setAttribute('width', 110);
      return;
    }
    nameClip.setAttribute('width', 0);
    telClip.setAttribute('width', 0);
    // vitesse d'écriture : ~ 160 unités / s, le numéro après le nom
    const t0 = performance.now();
    const dName = (wName / 160) * 1000;
    const dTel = (wTel / 190) * 1000;
    await new Promise((resolve) => {
      const step = (now) => {
        if (run !== writing) return resolve();
        const t = Math.max(0, now - t0);
        nameClip.setAttribute('width', f(Math.min(1, t / dName) * wName));
        telClip.setAttribute('width', f(Math.min(1, Math.max(0, (t - dName - 150) / dTel)) * wTel));
        if (t < dName + 150 + dTel) requestAnimationFrame(step);
        else {
          nameClip.setAttribute('width', 140);
          telClip.setAttribute('width', 110);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  return {
    svg,
    tool,
    toolAt,
    put,
    remove,
    ready,
    setOwner,
    setCount: (n) => (countNum.textContent = String(n)),
    has: (i) => placed.has(i),
    item: (i) => placed.get(i)?.inner,
  };
}
