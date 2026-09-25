// La boutique vue de la rue : façade, devanture vert forêt, vitrine, étal, ardoise,
// le primeur devant la porte, le ruban et le tampon. viewBox 0 0 400 420.

import { s, g, svgRoot, rng, uid } from '../lib/svg.js';
import { anim, EASE, isReduced, settle, wait } from '../lib/motion.js';
import { createStamp, FONT_DISPLAY, FONT_HAND, BRAND, brandFontsReady } from './stamp.js';
import { createRibbon } from './ribbon.js';
import { createCharacter } from './character.js';
import { crateHeap, crateFront } from './produce.js';
import { play as sfx } from '../lib/sound.js';

const P = {
  stone: '#F0E6CC',
  stone2: '#E6D9B9',
  joint: '#DDCCA8',
  front: '#1B4A33',
  frontDark: '#12432B',
  frontLight: '#2A5E43',
  glass: '#A9BFBA',
  olive: '#5B6A40',
  pave: '#D8D0BE',
  paveJoint: '#C7BDA7',
  brass: '#C9A45C',
  chalk: '#F4F1E6',
  slate: '#27302A',
};
const FONT_CHALK = '"Caveat", "Segoe Print", cursive';

const ctx2d = document.createElement('canvas').getContext('2d');

function spacedLetters(text, { x, y, size, font, spacing, fill, cls }) {
  ctx2d.font = `${size}px ${font}`;
  const adv = [...text].map((c) => ctx2d.measureText(c).width + spacing);
  const total = adv.reduce((a, b) => a + b, 0) - spacing;
  let cx = x - total / 2;
  const out = [];
  [...text].forEach((ch, i) => {
    const w = adv[i] - spacing;
    if (ch !== ' ') {
      out.push(s('text', { x: (cx + w / 2).toFixed(1), y, 'text-anchor': 'middle', 'font-family': font, 'font-size': size, fill, class: cls, text: ch }));
    }
    cx += adv[i];
  });
  return out;
}

function upperWindow(x, y, w, h, R) {
  const G = g({ class: 'sf-upwin' });
  const gl = uid('gl');
  G.append(
    s('defs', {}, s('linearGradient', { id: gl, x1: 0, y1: 0, x2: 0, y2: 1 }, [
      s('stop', { offset: 0, 'stop-color': '#C7D6D0' }),
      s('stop', { offset: 1, 'stop-color': '#8FA7A2' }),
    ])),
    s('rect', { x: x - 7, y: y - 7, width: w + 14, height: h + 10, fill: P.stone2 }),
    s('rect', { x, y, width: w, height: h, fill: `url(#${gl})` }),
    s('path', { d: `M${x + w / 2} ${y} V${y + h} M${x} ${y + h * 0.36} H${x + w}`, stroke: '#F6F1E4', 'stroke-width': 3 }),
    s('path', { d: `M${x + 6} ${y + h * 0.36 + 6} l12 -14 M${x + w / 2 + 8} ${y + 8} l14 -6`, stroke: '#fff', 'stroke-width': 2, opacity: 0.35 }),
  );
  // Volets
  [[x - 24, x - 6], [x + w + 6, x + w + 24]].forEach(([a, b]) => {
    G.append(s('rect', { x: a, y: y - 2, width: b - a, height: h + 4, fill: '#849E83' }));
    const louvers = [];
    for (let yy = y + 4; yy < y + h; yy += 6) louvers.push(`M${a + 2} ${yy} H${b - 2}`);
    G.append(s('path', { d: louvers.join(' '), stroke: '#6D896C', 'stroke-width': 1.4 }));
  });
  // Balcon en fer forgé + géraniums
  const by = y + h - 30;
  const bal = [`M${x - 10} ${by} H${x + w + 10}`, `M${x - 10} ${by + 28} H${x + w + 10}`];
  for (let xx = x - 6; xx <= x + w + 6; xx += 7) bal.push(`M${xx} ${by} V${by + 28}`);
  const flowers = g({ class: 'sf-geraniums fx-bottom' });
  for (let i = 0; i < 3; i++) {
    const fx = x + 12 + i * ((w - 24) / 2);
    flowers.append(
      s('rect', { x: fx - 7, y: by - 9, width: 14, height: 9, rx: 1.5, fill: '#B8643F' }),
      s('ellipse', { cx: fx, cy: by - 14, rx: 10, ry: 6, fill: '#4E8A3B' }),
      ...[[-5, -17], [1, -20], [6, -15], [-1, -14]].map(([dx, dy]) => s('circle', { cx: fx + dx, cy: by + dy, r: 2.6 + R() * 0.8, fill: R() > 0.5 ? '#D9453F' : '#E8615A' })),
    );
  }
  G.append(flowers, s('path', { d: bal.join(' '), stroke: BRAND.forest, 'stroke-width': 1.8, fill: 'none' }));
  return G;
}

function lamp(x) {
  const glowId = uid('lg');
  const G = g({ class: 'sf-lamp' }, [
    s('defs', {}, s('linearGradient', { id: glowId, x1: 0, y1: 0, x2: 0, y2: 1 }, [
      s('stop', { offset: 0, 'stop-color': '#FFE6A3', 'stop-opacity': 0.75 }),
      s('stop', { offset: 1, 'stop-color': '#FFE6A3', 'stop-opacity': 0 }),
    ])),
    s('path', { d: `M${x} 138 C${x} 120 ${x + 14} 116 ${x + 18} 123`, fill: 'none', stroke: P.frontDark, 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
  ]);
  const beam = s('path', { d: `M${x + 11} 129 L${x + 25} 129 L${x + 42} 150 L${x - 6} 150 Z`, fill: `url(#${glowId})`, class: 'sf-beam', opacity: 0 });
  const shade = s('path', { d: `M${x + 10} 129 L${x + 26} 129 L${x + 22} 122 L${x + 14} 122 Z`, fill: P.frontDark });
  const bulb = s('ellipse', { cx: x + 18, cy: 130, rx: 6, ry: 2.2, fill: '#FFE6A3', class: 'sf-bulb', opacity: 0.3 });
  G.append(beam, shade, bulb);
  return { g: G, beam, bulb };
}

function windowInterior(month, picks, clipId) {
  const G = g({ 'clip-path': `url(#${clipId})`, class: 'sf-interior' });
  const glow = uid('ig');
  G.append(
    s('defs', {}, s('radialGradient', { id: glow, cx: 0.5, cy: 0.5, r: 0.5 }, [
      s('stop', { offset: 0, 'stop-color': '#FFE3A0', 'stop-opacity': 0.9 }),
      s('stop', { offset: 1, 'stop-color': '#FFE3A0', 'stop-opacity': 0 }),
    ])),
    s('rect', { x: 30, y: 198, width: 216, height: 120, fill: P.olive }),
    // pilier de briques
    ...(() => {
      const out = [s('rect', { x: 150, y: 198, width: 34, height: 120, fill: '#E3C9A8' })];
      for (let yy = 198, row = 0; yy < 318; yy += 7, row++) {
        for (let xx = 150 - (row % 2 ? 6 : 0); xx < 184; xx += 12) {
          out.push(s('rect', { x: Math.max(150, xx + 0.8), y: yy + 0.8, width: Math.min(10.4, 184 - Math.max(150, xx + 0.8)), height: 5.4, fill: row % 3 ? '#C77A52' : '#B96D48' }));
        }
      }
      return out;
    })(),
    // étagères noires
    s('rect', { x: 30, y: 247, width: 120, height: 3, fill: '#1E1D1A' }),
    s('rect', { x: 184, y: 247, width: 62, height: 3, fill: '#1E1D1A' }),
    s('rect', { x: 30, y: 290, width: 120, height: 3, fill: '#1E1D1A' }),
    s('rect', { x: 184, y: 290, width: 62, height: 3, fill: '#1E1D1A' }),
  );
  // cagettes miniatures
  const spots = [[36, 236], [92, 236], [190, 236], [36, 279], [92, 279], [190, 279]];
  spots.forEach(([x, y], i) => {
    const id = picks[i % picks.length].id;
    const c = g({ transform: `translate(${x} ${y}) scale(.55)` }, [crateHeap(id, { w: 90, h: 24, seed: 40 + i }), crateFront(90, 20, { tone: i })]);
    G.append(c);
  });
  // bouteilles en haut
  for (let i = 0; i < 7; i++) {
    const bx = 38 + i * 15;
    G.append(
      s('rect', { x: bx, y: 214, width: 7, height: 20, rx: 2, fill: i % 2 ? '#2F3A26' : '#3B2A22' }),
      s('rect', { x: bx + 2, y: 208, width: 3, height: 7, fill: i % 2 ? '#2F3A26' : '#3B2A22' }),
      s('rect', { x: bx + 2, y: 207, width: 3, height: 3, fill: '#C23A3A' }),
      s('rect', { x: bx + 0.8, y: 222, width: 5.4, height: 6, fill: '#EDE3CF' }),
    );
    if (i < 6) G.append(s('rect', { x: bx - 2, y: 234, width: 12, height: 3, fill: '#1E1D1A' }));
  }
  // suspension en rotin
  const lampG = g({ class: 'sf-rattan' }, [
    s('circle', { cx: 110, cy: 222, r: 46, fill: `url(#${glow})`, class: 'sf-rattan-glow', opacity: 0.55 }),
    s('path', { d: 'M110 198 V208', stroke: '#2B2B2B', 'stroke-width': 1 }),
    s('path', { d: 'M94 221 Q110 200 126 221 Z', fill: '#C98A4A' }),
    s('path', { d: 'M98 220 Q103 210 106 206 M104 221 Q108 210 110 205 M116 221 Q113 210 110 205 M122 220 Q117 210 114 206', stroke: '#9E6532', 'stroke-width': 0.8, fill: 'none' }),
  ]);
  G.append(lampG);
  // voile chaud + reflets
  G.append(
    s('rect', { x: 30, y: 198, width: 216, height: 120, fill: '#FFE9B8', opacity: 0.1 }),
    s('path', { d: 'M40 318 L110 198 L136 198 L66 318 Z', fill: '#fff', opacity: 0.13, class: 'sf-reflect' }),
    s('path', { d: 'M150 318 L214 198 L226 198 L162 318 Z', fill: '#fff', opacity: 0.09, class: 'sf-reflect' }),
  );
  return { g: G, lampG };
}

function aFrame() {
  const G = g({ class: 'sf-aframe' });
  const board = g({ class: 'sf-aframe-board' });
  G.append(s('path', { d: 'M252 324 L292 324 L298 396 L288 396 L283 332 L260 332 L256 396 L246 396 Z', fill: '#141412' }));
  board.append(
    s('path', { d: 'M244 320 L290 320 L296 398 L238 398 Z', fill: '#1C1C1A' }),
    s('path', { d: 'M248 325 L286 325 L291 393 L243 393 Z', fill: P.slate }),
    s('text', { x: 266, y: 341, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 15, fill: P.chalk, text: 'Jus' }),
    s('text', { x: 266, y: 350, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 8.5, fill: P.chalk, text: 'fruits frais' }),
    s('text', { x: 284, y: 338, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 9, fill: '#9FD0B4', text: '4€' }),
    s('text', { x: 266, y: 361, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 7, fill: '#9FD0B4', text: 'A.C.E · Détox · P²' }),
    s('path', { d: 'M252 366 H282', stroke: P.chalk, 'stroke-width': 0.6, opacity: 0.6, 'stroke-dasharray': '2 2' }),
    s('text', { x: 266, y: 380, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 14, fill: P.chalk, text: 'Cafés' }),
    s('text', { x: 266, y: 388.5, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 7, fill: '#9FD0B4', text: 'chauds ou froids' }),
  );
  G.append(board);
  return G;
}

function stand(picks) {
  const G = g({ class: 'sf-stand' });
  const body = g({ class: 'sf-stand-body' }, [
    s('ellipse', { cx: 136, cy: 386, rx: 108, ry: 6, fill: '#000', opacity: 0.12 }),
    s('rect', { x: 40, y: 330, width: 6, height: 54, fill: P.frontDark }),
    s('rect', { x: 226, y: 330, width: 6, height: 54, fill: P.frontDark }),
    s('rect', { x: 36, y: 316, width: 200, height: 50, fill: '#D9B27A' }),
    s('path', { d: 'M36 327 H236 M36 338 H236 M36 349 H236 M36 360 H236', stroke: '#BF9660', 'stroke-width': 1 }),
    s('rect', { x: 36, y: 311, width: 200, height: 6, fill: P.front }),
    s('rect', { x: 36, y: 364, width: 200, height: 4, fill: P.front }),
    s('rect', { x: 36, y: 311, width: 5, height: 57, fill: P.front }),
    s('rect', { x: 231, y: 311, width: 5, height: 57, fill: P.front }),
    s('rect', { x: 133, y: 311, width: 5, height: 57, fill: P.front }),
  ]);
  G.append(body);
  const crates = [];
  [[40, 0], [104, 1], [168, 2]].forEach(([x, i]) => {
    const item = picks[i % picks.length];
    const c = g({ transform: `translate(${x} 295)` });
    const inner = g({ class: 'sf-crate' });
    inner.append(crateHeap(item.id, { w: 64, h: 20, scale: 0.8, seed: 11 + i }), crateFront(64, 16, { tone: i }));
    // étiquette craie
    inner.append(
      s('rect', { x: 18, y: 4, width: 28, height: 9, rx: 1, fill: '#1E1E1C' }),
      s('text', { x: 32, y: 11, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 6.4, fill: P.chalk, text: item.name.split(' ')[0] }),
    );
    c.append(inner);
    G.append(c);
    crates.push(inner);
  });
  return { g: G, body, crates };
}

/**
 * @param {{ picks: Array<{id:string,name:string}>, open: boolean }} o
 */
export async function createStorefront({ picks } = {}) {
  await brandFontsReady();
  const R = rng(21);
  const svg = svgRoot('0 0 400 420', { preserveAspectRatio: 'xMidYMax meet', class: 'storefront' });
  svg.style.overflow = 'visible';

  // --- Façade (étendue hors cadre pour les écrans larges) ---
  const stoneId = uid('stone');
  const facade = g({ class: 'sf-facade' }, [
    s('defs', {}, [
      s('pattern', { id: stoneId, width: 80, height: 52, patternUnits: 'userSpaceOnUse' }, [
        s('rect', { width: 80, height: 52, fill: P.stone }),
        s('path', { d: 'M0 25.5 H80 M0 51.5 H80 M40 0 V26 M0 26 V52 M80 26 V52', stroke: P.joint, 'stroke-width': 1 }),
      ]),
    ]),
    s('rect', { x: -400, y: -300, width: 1200, height: 660, fill: `url(#${stoneId})` }),
    s('rect', { x: -400, y: -300, width: 1200, height: 660, fill: '#fff', opacity: 0.18 }),
  ]);
  svg.append(facade);

  // Étage : fenêtres
  const upper = g({ class: 'sf-upper' }, [upperWindow(56, 4, 78, 100, R), upperWindow(268, 4, 78, 100, R)]);
  svg.append(upper);

  // Ruban (derrière le tampon, devant la façade)
  const ribbon = createRibbon({
    d: 'M-300 118 C-120 150 -40 20 90 38 C210 55 250 128 360 104 C470 80 560 30 700 60',
    width: 27,
    text: 'CAFÉ LAITUE ✦ PRIMEUR GOURMET ✦ FRUITS & LÉGUMES ✦ JUS PRESSÉS MINUTE ✦ CAFÉ DE SPÉCIALITÉ ✦ ÉPICERIE FINE ✦ PAIN VIVANT ✦ ',
    fontSize: 12,
    speed: 20,
  });
  svg.append(ribbon.g);

  // Corniche
  svg.append(g({}, [
    s('rect', { x: -400, y: 118, width: 1200, height: 16, fill: '#E4D6B4' }),
    s('rect', { x: -400, y: 118, width: 1200, height: 2.5, fill: '#F7F0DD' }),
    s('rect', { x: -400, y: 132, width: 1200, height: 2.5, fill: '#CDBE98' }),
  ]));

  // --- Devanture ---
  const front = g({ class: 'sf-front' });
  const glassClip = uid('glass');
  front.append(
    s('defs', {}, s('clipPath', { id: glassClip }, s('rect', { x: 30, y: 198, width: 216, height: 120 }))),
    s('rect', { x: 12, y: 136, width: 376, height: 216, fill: P.front }),
    s('rect', { x: 22, y: 144, width: 356, height: 46, fill: P.frontDark }),
    s('rect', { x: 28, y: 150, width: 344, height: 34, rx: 3, fill: 'none', stroke: BRAND.cream, 'stroke-width': 1.1, opacity: 0.55 }),
  );
  const interior = windowInterior(new Date().getMonth() + 1, picks, glassClip);
  front.append(interior.g);
  front.append(
    // montants
    s('rect', { x: 12, y: 190, width: 18, height: 162, fill: P.frontLight }),
    s('rect', { x: 246, y: 190, width: 14, height: 162, fill: P.frontLight }),
    s('rect', { x: 370, y: 190, width: 18, height: 162, fill: P.frontLight }),
    s('rect', { x: 10, y: 190, width: 22, height: 7, fill: P.frontDark }),
    s('rect', { x: 244, y: 190, width: 18, height: 7, fill: P.frontDark }),
    s('rect', { x: 368, y: 190, width: 22, height: 7, fill: P.frontDark }),
    // soubassement de vitrine
    s('rect', { x: 30, y: 318, width: 216, height: 34, fill: P.frontDark }),
    s('rect', { x: 38, y: 324, width: 200, height: 22, rx: 2, fill: 'none', stroke: P.frontLight, 'stroke-width': 1.4 }),
    // plaque de numéro
    s('rect', { x: 14, y: 206, width: 14, height: 11, rx: 1.5, fill: '#2E4F8C', stroke: '#F4F1E6', 'stroke-width': 0.8 }),
    s('text', { x: 21, y: 214.6, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-weight': 700, 'font-size': 7, fill: '#F4F1E6', text: '20' }),
    // lettrage vitrine
    s('text', { x: 116, y: 313, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 11, fill: BRAND.cream, opacity: 0.92, text: 'Fruits & légumes · Jus pressés · Café' }),
  );

  // Porte
  const door = g({ class: 'sf-door' }, [
    s('rect', { x: 262, y: 198, width: 106, height: 154, fill: P.frontDark }),
    s('rect', { x: 268, y: 204, width: 94, height: 148, fill: P.front }),
    s('rect', { x: 276, y: 212, width: 78, height: 86, fill: '#3E4A2E' }),
    s('rect', { x: 276, y: 212, width: 78, height: 86, fill: '#FFE3A0', opacity: 0.12, class: 'sf-door-glow' }),
    s('path', { d: 'M282 298 L312 212 L322 212 L292 298 Z', fill: '#fff', opacity: 0.1 }),
    s('rect', { x: 280, y: 306, width: 70, height: 38, rx: 2, fill: 'none', stroke: P.frontLight, 'stroke-width': 1.4 }),
    s('rect', { x: 349, y: 262, width: 4, height: 22, rx: 2, fill: P.brass }),
    s('rect', { x: 258, y: 352, width: 114, height: 6, fill: '#CFC4A8' }),
  ]);
  front.append(door);

  // Enseigne
  const signLetters = spacedLetters('CAFÉ LAITUE', { x: 200, y: 177, size: 27, font: FONT_DISPLAY, spacing: 2.2, fill: BRAND.cream, cls: 'sf-letter fx-box' });
  const tag1 = s('text', { x: 66, y: 171.5, 'text-anchor': 'middle', 'font-family': FONT_HAND, 'font-size': 10.5, fill: '#A9C3A6', 'letter-spacing': 1.2, text: 'PRIMEUR', class: 'sf-tag' });
  const tag2 = s('text', { x: 334, y: 171.5, 'text-anchor': 'middle', 'font-family': FONT_HAND, 'font-size': 10.5, fill: '#A9C3A6', 'letter-spacing': 1.2, text: 'GOURMET', class: 'sf-tag' });
  front.append(...signLetters, tag1, tag2);
  svg.append(front);

  const lamps = [70, 182, 294].map((x) => lamp(x));
  lamps.forEach((l) => svg.append(l.g));

  // Trottoir (étendu)
  const joints = ['M-400 366 H800', 'M-400 384 H800', 'M-400 404 H800'];
  for (let x = -400, i = 0; x < 800; x += 36, i++) {
    joints.push(`M${x + (i % 2) * 18} 352 V366 M${x + 9} 366 V384 M${x + 27} 384 V404 M${x} 404 V420`);
  }
  svg.append(g({ class: 'sf-street' }, [
    s('rect', { x: -400, y: 352, width: 1200, height: 80, fill: P.pave }),
    s('path', { d: joints.join(' '), stroke: P.paveJoint, 'stroke-width': 1 }),
    s('rect', { x: -400, y: 414, width: 1200, height: 18, fill: '#BDB39B' }),
    s('rect', { x: 12, y: 352, width: 376, height: 5, fill: '#000', opacity: 0.06 }),
  ]));

  // Étal extérieur
  const st = stand(picks);
  svg.append(st.g);

  // Ardoise
  const af = aFrame();
  svg.append(af);

  // Le primeur
  const ch = createCharacter({ seed: 9 });
  const chWrap = g({ transform: 'translate(292 236) scale(.29)', class: 'sf-char' });
  const chInner = g({ class: 'sf-char-inner' });
  chInner.append(s('ellipse', { cx: 130, cy: 566, rx: 90, ry: 14, fill: '#000', opacity: 0.14 }), ch.g);
  chWrap.append(chInner);
  svg.append(chWrap);

  // Bulle
  const bubble = g({ class: 'sf-bubble fx-bottom', opacity: 0 });
  const bubbleText = s('text', { x: 318, y: 219, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 13, fill: BRAND.forest, text: 'Bonjour !' });
  bubble.append(
    s('path', { d: 'M282 204 h72 a8 8 0 0 1 8 8 v12 a8 8 0 0 1 -8 8 h-30 l-8 8 l-2 -8 h-32 a8 8 0 0 1 -8 -8 v-12 a8 8 0 0 1 8 -8 Z', fill: BRAND.cream, stroke: BRAND.forest, 'stroke-width': 1.2 }),
    bubbleText,
  );
  svg.append(bubble);

  // Tampon (en haut à gauche, sur le ruban)
  const stamp = await createStamp();
  const stampWrap = g({ transform: 'translate(8 6) scale(.345)', class: 'sf-stamp' });
  const stampShadow = s('circle', { cx: 200, cy: 206, r: 198, fill: '#12432B', opacity: 0.12 });
  stampWrap.append(stampShadow);
  const inner = stamp.svg;
  inner.setAttribute('width', 400);
  inner.setAttribute('height', 400);
  inner.removeAttribute('aria-hidden');
  stampWrap.append(inner);
  svg.append(stampWrap);

  let playing = false;
  const api = {
    svg,
    stamp,
    character: ch,
    stampEl: stampWrap,
    /** Le tampon lui-même (sans son ombre) : là où se pose le logo de l'écran d'ouverture. */
    stampTarget: inner,
    charEl: chInner,
    showStamp(on) {
      stampWrap.style.opacity = on ? '' : '0';
    },
    layout() {
      ribbon.layout();
    },
    /** La boutique se construit (withStamp: false quand le logo arrive de l'écran d'ouverture). */
    async play({ withStamp = true } = {}) {
      if (playing) return;
      playing = true;
      if (isReduced()) {
        playing = false;
        return;
      }
      const T = [];
      if (withStamp) stamp.play({ delay: 0, speed: 1.1 });
      // Petits bruits de chantier, calés sur les animations ci-dessous
      const at = (name, ms, o = {}) => sfx(name, { ...o, delay: ms });
      at('unroll', 320);
      at('clack', 380);
      at('thunk', 470);
      at('roll', 720, { dur: 0.3 });
      signLetters.forEach((L, i) => at('letter', 900 + i * 55, { i }));
      lamps.forEach((l, i) => at('lamp', 980 + i * 140));
      at('tumble', 1480, { n: 7, span: 0.5 });
      at('hop', 1520);
      at('clack', 1860, { v: 0.09 });
      T.push(anim(facade, [{ opacity: 0 }, { opacity: 1 }], { duration: 500 }));
      T.push(anim(upper, [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 700, delay: 100 }));
      T.push(anim(front, [{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, delay: 250, easing: EASE.snap }));
      signLetters.forEach((L, i) => T.push(anim(L, [
        { opacity: 0, transform: 'translateY(-26px) rotate(-18deg) scale(.4)' },
        { opacity: 1, transform: 'translateY(0) rotate(0) scale(1)' },
      ], { duration: 560, delay: 600 + i * 55, easing: EASE.back })));
      [tag1, tag2].forEach((t, i) => T.push(anim(t, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 1150 + i * 120 })));
      lamps.forEach((l, i) => {
        T.push(anim(l.bulb, [{ opacity: 0.3 }, { opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], { duration: 600, delay: 950 + i * 140 }));
        T.push(anim(l.beam, [{ opacity: 0 }, { opacity: 0.9 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 700, delay: 950 + i * 140 }));
      });
      T.push(anim(interior.g, [{ filter: 'brightness(.55)' }, { filter: 'brightness(1)' }], { duration: 800, delay: 1000 }));
      T.push(anim(st.g, [{ transform: 'translateX(-260px)' }, { transform: 'translateX(0)' }], { duration: 850, delay: 700, easing: EASE.snap }));
      st.crates.forEach((c, i) => {
        c.querySelectorAll('.pz').forEach((p, j) => T.push(anim(p, [
          { transform: 'translateY(-40px) scale(.3)', opacity: 0 },
          { transform: 'translateY(0) scale(1)', opacity: 1 },
        ], { duration: 520, delay: 1300 + i * 120 + j * 25, easing: EASE.back })));
      });
      af.style.transformBox = 'fill-box';
      af.style.transformOrigin = '50% 100%';
      T.push(anim(af, [{ transform: 'scaleY(0) skewX(-20deg)', opacity: 0 }, { transform: 'scaleY(1) skewX(0)', opacity: 1 }], { duration: 650, delay: 1500, easing: EASE.back }));
      T.push(anim(chInner, [{ transform: 'translateY(160px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 800, delay: 1450, easing: EASE.snap }));
      T.push(ribbon.drawIn({ delay: 300 }));
      await Promise.all(T.map((a) => settle(a)));
      playing = false;
      await wait(150);
      api.greet('Bonjour !');
    },
    async greet(text) {
      bubbleText.textContent = text;
      const len = Math.max(60, Math.min(150, text.length * 6.2 + 18));
      bubble.querySelector('path').setAttribute('d', `M${318 - len / 2} 204 h${len} a8 8 0 0 1 8 8 v12 a8 8 0 0 1 -8 8 h-${len / 2 - 6} l-8 8 l-2 -8 h-${len / 2 - 8} a8 8 0 0 1 -8 -8 v-12 a8 8 0 0 1 8 -8 Z`);
      ch.wave();
      ch.say(1200);
      const a = anim(bubble, [
        { opacity: 0, transform: 'translateY(6px) scale(.6)' },
        { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.12 },
        { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.85 },
        { opacity: 0, transform: 'translateY(-4px) scale(.95)' },
      ], { duration: 2800, easing: 'ease-out', fill: 'none' });
      return a?.finished.catch(() => {});
    },
    idle(ambient) {
      ch.idle(ambient);
      stamp.idle(ambient);
      ribbon.run(ambient);
      upper.querySelectorAll('.sf-geraniums').forEach((f, i) => ambient.add(anim(f, [{ transform: 'rotate(-1.5deg)' }, { transform: 'rotate(1.5deg)' }], {
        duration: 3000 + i * 500, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none',
      })));
      ambient.every(4200, () => {
        const l = lamps[Math.floor(Math.random() * lamps.length)];
        anim(l.beam, [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 260, fill: 'none' });
      }, 5000);
      ambient.add(anim(interior.lampG.querySelector('.sf-rattan-glow'), [{ opacity: 0.45 }, { opacity: 0.65 }], {
        duration: 2200, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none',
      }));
    },
  };
  return api;
}
