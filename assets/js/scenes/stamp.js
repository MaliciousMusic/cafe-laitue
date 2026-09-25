// Le tampon Café Laitue reproduit en SVG : anneau sauge, typo en arc,
// tasse-filet et laitue tracée d'un seul trait. Assemblage « éclaté à l'envers ».

import { s, g, svgRoot, wobblyCircle, cursiveLoops, rng, uid } from '../lib/svg.js';
import { anim, drawIn, EASE, isReduced, settle } from '../lib/motion.js';
import { play as sfx } from '../lib/sound.js';

export const BRAND = { forest: '#12432B', sage: '#849E83', cream: '#FDFBEB' };
export const FONT_DISPLAY = '"Lilita One", "Arial Black", system-ui, sans-serif';
export const FONT_HAND = '"Patrick Hand SC", "Comic Sans MS", system-ui, sans-serif';

let fontsPromise;
/** Attend les polices du logo (avec délai max, pour ne jamais bloquer). */
export function brandFontsReady() {
  if (!fontsPromise) {
    const f = document.fonts;
    const loads = f
      ? [f.load('64px "Lilita One"', 'CAFÉ LAITUE'), f.load('40px "Patrick Hand SC"', 'PRIMEUR GOURMET'), f.load('600 20px "Caveat"', 'Jus')]
      : [];
    fontsPromise = Promise.race([Promise.allSettled(loads), new Promise((r) => setTimeout(r, 2500))]);
  }
  return fontsPromise;
}

const ctx2d = document.createElement('canvas').getContext('2d');
function advances(text, font, spacing) {
  ctx2d.font = font;
  return [...text].map((ch) => ctx2d.measureText(ch).width + spacing);
}

/** Positionne chaque lettre sur un arc (dir 1 = sens horaire, -1 = anti-horaire). */
export function layoutArc(text, { cx, cy, r, mid, font, spacing = 0, dir = 1 }) {
  const adv = advances(text, font, spacing);
  const total = adv.reduce((a, b) => a + b, 0) - spacing;
  let acc = -total / 2;
  return [...text].map((ch, i) => {
    const w = adv[i] - spacing;
    const m = acc + w / 2;
    acc += adv[i];
    const a = mid + dir * (m / r);
    return {
      ch,
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
      rot: (a * 180) / Math.PI + (dir > 0 ? 90 : -90),
    };
  });
}

// Géométrie de la tasse (repère local : centre de l'ouverture en 0,0).
const CUP_BODY = 'M-64 0C-64 44-42 76 0 76C42 76 64 44 64 0A64 15 0 0 1-64 0Z';
const CUP_RIM = 'M-64 0A64 15 0 0 0 64 0';
const CUP_HANDLE = 'M55 7C108-18 122 56 44 55';
const CUP_TRANSFORM = 'translate(197 239) rotate(-19) scale(1.1)';

// Laitue : pétales en boucles (repère du tampon 400×400).
const LETTUCE = cursiveLoops(
  [150, 258],
  [
    { base: [158, 250], tip: [102, 210], w: 21, k: 1.15 },
    { base: [170, 246], tip: [130, 152], w: 27, k: 1.2 },
    { base: [186, 240], tip: [168, 114], w: 17, k: 1.1 },
    { base: [203, 234], tip: [216, 118], w: 18, k: 1.1 },
    { base: [222, 229], tip: [264, 172], w: 22, k: 1.15 },
  ],
  [244, 224],
);

// Filet : méridiens (de l'ouverture vers le fond) et parallèles (ellipses).
function netLines() {
  const lines = [];
  [-0.8, -0.44, -0.1, 0.24, 0.58, 0.9].forEach((u) => {
    const x0 = 64 * u;
    const y0 = 15 * Math.sqrt(Math.max(0, 1 - u * u));
    lines.push(`M${x0.toFixed(1)} ${(y0 - 6).toFixed(1)}Q${(x0 * 1.02).toFixed(1)} 52 ${(u * 30).toFixed(1)} 84`);
  });
  [[17, 64], [35, 60], [53, 49], [68, 32]].forEach(([y, rx]) => {
    const ry = (15 * rx) / 64;
    lines.push(`M${-rx - 4} ${y}A${rx + 4} ${ry.toFixed(1)} 0 0 0 ${rx + 4} ${y}`);
  });
  return lines;
}

/**
 * Crée le tampon.
 * @param {object} o
 * @param {boolean} [o.disc=true]  pastille crème derrière
 * @param {boolean} [o.ink=false]  version « encre » monochrome (carte fidélité)
 * @param {boolean} [o.text=true]  affiche les textes en arc
 * @returns {Promise<{svg:SVGSVGElement, play:Function, idle:Function, press:Function}>}
 */
export async function createStamp({ disc = true, ink = false, text = true, className = '' } = {}) {
  if (text) await brandFontsReady();
  const col = ink ? { forest: 'currentColor', sage: 'currentColor', cream: 'none' } : BRAND;
  const svg = svgRoot('0 0 400 400', { class: `stamp ${ink ? 'stamp--ink' : ''} ${className}`.trim() });
  const root = g({ class: 'st-root' });
  svg.append(root);

  const parts = { letters: [] };
  if (disc) {
    parts.disc = s('circle', { cx: 200, cy: 200, r: 198, fill: col.cream, class: 'st-disc' });
    root.append(parts.disc);
  }
  parts.ring = s('path', {
    d: wobblyCircle(200, 200, 180, { amp: 1.1, seed: 7 }),
    fill: 'none',
    stroke: col.sage,
    'stroke-width': ink ? 7 : 5,
    class: 'st-ring',
  });
  root.append(parts.ring);

  // --- Textes en arc ---
  if (text) {
    const top = layoutArc('CAFÉ LAITUE', {
      cx: 200, cy: 200, r: 113, mid: -Math.PI / 2, font: `64px ${FONT_DISPLAY}`, spacing: -0.5, dir: 1,
    });
    const bottom = layoutArc('PRIMEUR GOURMET', {
      cx: 200, cy: 200, r: 162, mid: Math.PI / 2, font: `40px ${FONT_HAND}`, spacing: 5, dir: -1,
    });
    const tg = g({ class: 'st-text-top', fill: col.forest, 'font-family': FONT_DISPLAY, 'font-size': 64 });
    const bg = g({ class: 'st-text-bottom', fill: col.forest, 'font-family': FONT_HAND, 'font-size': 40 });
    top.forEach((L) => {
      if (L.ch === ' ') return;
      const t = s('text', { x: 0, y: 0, 'text-anchor': 'middle', class: 'st-letter', text: L.ch });
      tg.append(g({ transform: `translate(${L.x.toFixed(2)} ${L.y.toFixed(2)}) rotate(${L.rot.toFixed(2)})` }, t));
      parts.letters.push({ el: t, side: -1 });
    });
    bottom.forEach((L) => {
      if (L.ch === ' ') return;
      const t = s('text', { x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'auto', class: 'st-letter', text: L.ch });
      // Pour l'arc du bas, la ligne de base est à l'extérieur : on remonte le glyphe vers le centre.
      t.setAttribute('y', 0);
      bg.append(g({ transform: `translate(${L.x.toFixed(2)} ${L.y.toFixed(2)}) rotate(${L.rot.toFixed(2)})` }, t));
      parts.letters.push({ el: t, side: 1 });
    });
    root.append(tg, bg);
  }

  // --- Laitue (derrière la tasse) ---
  parts.lettuce = s('path', {
    d: LETTUCE,
    fill: 'none',
    stroke: col.sage,
    'stroke-width': ink ? 6 : 4.6,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: 'st-lettuce',
  });
  root.append(parts.lettuce);

  // --- Tasse-filet ---
  const clipId = uid('cupclip');
  const cup = g({ transform: CUP_TRANSFORM, class: 'st-cup' });
  const cupInner = g({ class: 'st-cup-inner' });
  cup.append(cupInner);
  cupInner.append(s('clipPath', { id: clipId }, s('path', { d: CUP_BODY })));
  parts.body = s('path', { d: CUP_BODY, fill: ink ? 'none' : col.cream });
  const net = g({ 'clip-path': `url(#${clipId})`, class: 'st-net' });
  parts.net = netLines().map((d) =>
    s('path', { d, fill: 'none', stroke: col.forest, 'stroke-width': 7, 'stroke-linecap': 'round' }),
  );
  net.append(...parts.net);
  parts.outline = s('path', { d: CUP_BODY, fill: 'none', stroke: col.forest, 'stroke-width': 7.5, 'stroke-linejoin': 'round' });
  parts.rim = s('path', { d: CUP_RIM, fill: 'none', stroke: col.forest, 'stroke-width': 11, 'stroke-linecap': 'round' });
  parts.handle = s('path', {
    d: CUP_HANDLE, fill: 'none', stroke: col.forest, 'stroke-width': 11.5, 'stroke-linecap': 'round', class: 'st-handle',
  });
  cupInner.append(parts.body, net, parts.outline, parts.handle, parts.rim);
  root.append(cup);
  parts.cup = cupInner;
  parts.root = root;

  const api = {
    svg,
    parts,
    /** Assemblage : les pièces arrivent de l'extérieur et s'emboîtent. */
    async play({ delay = 0, speed = 1 } = {}) {
      if (isReduced()) return;
      const k = 1 / speed;
      const R = rng(11);
      const list = [];
      if (parts.disc) {
        list.push(anim(parts.disc, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
          duration: 520 * k, delay, easing: EASE.back,
        }));
      }
      list.push(drawIn(parts.ring, { duration: 1000 * k, delay: delay + 120 * k }));
      // Les lettres se posent en cascade (petits crans), puis « tchac »
      sfx('ratchet', { n: parts.letters.length, gap: 0.042 * k, delay: delay + 644 * k });
      parts.letters.forEach((L, i) => {
        const r = R();
        const d = 80 + r * 90;
        list.push(anim(L.el, [
          { transform: `translate(${((R() - 0.5) * 60).toFixed(1)}px, ${(L.side * -d).toFixed(1)}px) rotate(${((r - 0.5) * 200).toFixed(0)}deg) scale(.3)`, opacity: 0 },
          { transform: 'translate(0px, 0px) rotate(0deg) scale(1)', opacity: 1 },
        ], { duration: 640 * k, delay: delay + (260 + i * 42) * k, easing: EASE.back }));
      });
      // Tasse : le corps arrive d'en bas, l'anse de la droite, le filet se tisse.
      list.push(anim(parts.cup, [
        { transform: 'translate(0px, 70px) scale(.6)', opacity: 0 },
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
      ], { duration: 700 * k, delay: delay + 380 * k, easing: EASE.back }));
      parts.net.forEach((p, i) => list.push(drawIn(p, { duration: 520 * k, delay: delay + (560 + i * 22) * k, easing: EASE.out })));
      list.push(anim(parts.handle, [
        { transform: 'translate(46px, -30px) rotate(70deg)', opacity: 0 },
        { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1 },
      ], { duration: 620 * k, delay: delay + 900 * k, easing: EASE.back }));
      list.push(drawIn(parts.rim, { duration: 420 * k, delay: delay + 980 * k }));
      list.push(drawIn(parts.lettuce, { duration: 1300 * k, delay: delay + 1050 * k, easing: EASE.inOut }));
      await Promise.all(list.map((a) => settle(a)));
      await api.press();
    },
    /** Coup de tampon. */
    press() {
      sfx('stamp', { gain: 0.5 });
      const a = anim(parts.root, [
        { transform: 'scale(1) rotate(0deg)' },
        { transform: 'scale(1.06) rotate(-2deg)', offset: 0.35 },
        { transform: 'scale(.98) rotate(.5deg)', offset: 0.7 },
        { transform: 'scale(1) rotate(0deg)' },
      ], { duration: 520, easing: EASE.out, fill: 'none' });
      return a ? a.finished.catch(() => {}) : Promise.resolve();
    },
    /** Animations d'ambiance (à confier à un Ambient). */
    idle(ambient) {
      ambient.add(anim(parts.lettuce, [{ transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }], {
        duration: 2600, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none',
      }));
    },
  };
  return api;
}
