// La boutique vue de la rue, d'après la photo de la devanture (septembre 2026) : immeuble
// clermontois enduit crème, fenêtres encadrées de pierre de Volvic et persiennes fermées ;
// devanture vert amande sur deux niveaux (pilastres à chapiteaux, fenêtres à garde-corps en
// fonte, consoles) ; store banne beige à barre bordeaux ; vitrines sombres (ampoules, logo) ;
// deux grands bacs en bois à roulettes, ardoise, terrasse (tables, tabourets, parasol), arbres.
// viewBox 0 0 400 420, 1 unité ≈ 2,4 cm. Le décor déborde du cadre (écrans hauts ou larges).

import { s, g, svgRoot, rng, uid } from '../lib/svg.js';
import { anim, EASE, isReduced, settle, wait } from '../lib/motion.js';
import { createStamp, FONT_HAND, BRAND, brandFontsReady } from './stamp.js';
import { createRibbon } from './ribbon.js';
import { createCharacter } from './character.js';
import { crateHeap } from './produce.js';
import { smooth } from './veggies.js';
import { createStreet, seatedGuest } from './passersby.js';
import { anim as animate, ticker } from '../lib/motion.js';
import { play as sfx } from '../lib/sound.js';

// Couleurs relevées sur la photo (lumière dorée de fin d'après-midi)
const P = {
  plaster: '#EBDDCF', plasterSun: '#F4E9DE', plasterShade: '#DCC8B6',
  stone: '#7E7069', stoneLight: '#978981', stoneDark: '#60554F', stoneJoint: '#514641',
  shutter: '#EFE6DA', shutterShade: '#D3C6B6', shutterLine: '#BCAD9B',
  zinc: '#B5ADA5', zincLight: '#D2CBC4', zincDark: '#857D76',
  green: '#BCB487', greenSun: '#CAC297', greenLight: '#DAD3AA', greenShade: '#A29A6E', greenDeep: '#857F58', greenDark: '#6C6848',
  white: '#F2EEE5', whiteShade: '#D0C9BC',
  glass: '#2C2E2C', blind: '#9A9387', blindLine: '#79736A',
  iron: '#F0E9DA', ironShade: '#B8AC94',
  canvas: '#D6BA94', canvasLight: '#E4CDA8', canvasShade: '#B7976F', canvasSeam: '#C1A07A',
  bordeaux: '#5E2326', bordeauxLight: '#86383C', bordeauxDark: '#3E1518',
  panel: '#36211F', panelLine: '#5A3D37',
  shopFrame: '#2A211F', shopFrameLight: '#493832', plinth: '#4A2A27', plinthLight: '#6A413B',
  wood: '#D3914E', woodLight: '#E3A964', woodShade: '#A76C35', woodLine: '#87562A', woodDark: '#2B2724',
  slate: '#262725', chalk: '#F2EFE6',
  pave: '#C3A795', paveLight: '#D0B8A8', paveJoint: '#A98D7C', paveShadow: '#7A5F51',
  olive: '#4B4E3C', oliveLight: '#666A52', steel: '#C9C9C3', steelDark: '#8E8E87',
  rail: '#9C978F', railDark: '#6F6B65',
  leafSun: '#D6DC8E', leafLight: '#B3C26B', leaf: '#8FA14F', leafDark: '#66783A', leafDeep: '#4F5F2E', branch: '#6E5B45',
  parasol: '#F7F4ED', parasolShade: '#DDD6C9',
  pipe: '#A69E95', pipeDark: '#7E766E', pipeLight: '#C6BEB5',
  brass: '#C9A45C',
};
const FONT_CHALK = '"Caveat", "Segoe Print", cursive';
const FONT_UI = '"Bricolage Grotesque", system-ui, sans-serif';
const f = (n) => Math.round(n * 10) / 10;
const lerp = (a, b, t) => a + (b - a) * t;

// --- petites briques ---------------------------------------------------------------------
function lin(defs, stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1, user = false } = {}) {
  const id = uid('sfl');
  defs.append(s('linearGradient', { id, x1, y1, x2, y2, ...(user ? { gradientUnits: 'userSpaceOnUse' } : {}) },
    stops.map(([o, c, a = 1]) => s('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }))));
  return `url(#${id})`;
}
function rad(defs, stops, { cx = 0.5, cy = 0.5, r = 0.5 } = {}) {
  const id = uid('sfr');
  defs.append(s('radialGradient', { id, cx, cy, r }, stops.map(([o, c, a = 1]) => s('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }))));
  return `url(#${id})`;
}
const R = (x, y, w, h) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
const E = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
/** Fusionne beaucoup de petites formes d'une même couleur en un seul <path>. */
function bucket() {
  const m = new Map();
  return {
    add(fill, d) {
      if (!m.has(fill)) m.set(fill, []);
      m.get(fill).push(d);
    },
    flush(parent, extra = {}) {
      m.forEach((ds, fill) => parent.append(s('path', { d: ds.join(''), fill, ...extra })));
      m.clear();
    },
  };
}
const ctx2d = document.createElement('canvas').getContext('2d');
/** Lettres séparées (chacune dans un <g> : Safari n'anime pas la transformation d'un <text>). */
function spacedLetters(text, { x, y, size, font, weight = 400, spacing, fill, cls }) {
  ctx2d.font = `${weight} ${size}px ${font}`;
  const adv = [...text].map((c) => ctx2d.measureText(c).width + spacing);
  const total = adv.reduce((a, b) => a + b, 0) - spacing;
  let cx = x - total / 2;
  const out = [];
  [...text].forEach((ch, i) => {
    const w = adv[i] - spacing;
    if (ch !== ' ') {
      out.push(g({ class: cls }, s('text', { x: f(cx + w / 2), y, 'text-anchor': 'middle', 'font-family': font, 'font-weight': weight, 'font-size': size, fill, text: ch })));
    }
    cx += adv[i];
  });
  return out;
}

// --- l'immeuble : enduit, fenêtres en pierre de Volvic, persiennes -------------------------
function upperWindow(defs, cx, sillY, r) {
  const W = 66;
  const x0 = cx - W / 2;
  const x1 = cx + W / 2;
  const top = sillY - 101;
  const jamb = 9;
  const ix0 = x0 + jamb;
  const ix1 = x1 - jamb;
  const spring = top + 7;
  const ispring = spring + 5.5;
  const itop = top + 9;
  const radius = (w, sag) => (w * w / 4 + sag * sag) / (2 * sag);
  const Ro = radius(W, spring - top);
  const Ri = radius(ix1 - ix0, ispring - itop);
  const outer = `M${x0} ${sillY - 5}V${spring}A${f(Ro)} ${f(Ro)} 0 0 1 ${x1} ${spring}V${sillY - 5}Z`;
  const inner = `M${ix0} ${sillY - 5}V${ispring}A${f(Ri)} ${f(Ri)} 0 0 1 ${ix1} ${ispring}V${sillY - 5}Z`;
  const G = g({ class: 'sf-upwin' });
  const clip = uid('upw');
  defs.append(s('clipPath', { id: clip }, s('path', { d: inner })));
  // ombre portée de l'encadrement sur l'enduit (soleil en haut à gauche)
  G.append(s('path', { d: `M${x1} ${spring + 3}L${x1 + 3.5} ${spring + 6}V${sillY + 1}L${x1} ${sillY - 2}Z`, fill: '#9C8774', opacity: 0.25 }));
  // pierre : blocs aux tons légèrement différents
  G.append(s('path', { d: outer, fill: P.stone }));
  const blocks = bucket();
  const tones = [P.stoneLight, P.stoneDark, '#8A7D75', '#73675F'];
  for (let y = sillY - 5, i = 0; y > spring; i++) {
    const h = 11 + r() * 4;
    const y0 = Math.max(spring, y - h);
    const long = i % 2 === 0;
    blocks.add(tones[Math.floor(r() * tones.length)], R(x0, y0, long ? jamb + 3 : jamb, y - y0));
    blocks.add(tones[Math.floor(r() * tones.length)], R(x1 - (long ? jamb : jamb + 3), y0, long ? jamb : jamb + 3, y - y0));
    y = y0;
  }
  G.append(g({ opacity: 0.55 }, (() => {
    const tmp = g();
    blocks.flush(tmp);
    return [...tmp.childNodes];
  })()));
  // joints des blocs et claveaux de l'arc
  const joints = [];
  for (let y = sillY - 17; y > spring + 4; y -= 12.5) joints.push(`M${x0} ${f(y)}h${jamb}M${x1 - jamb} ${f(y)}h${jamb}`);
  for (let k = -2; k <= 2; k++) {
    const a = (k / 2) * 0.62;
    const px = cx + Math.sin(a) * 24;
    joints.push(`M${f(px)} ${f(top + 1 + Math.abs(k) * 2.4)}L${f(cx + Math.sin(a) * 18)} ${f(itop + 1.5 + Math.abs(k) * 1.8)}`);
  }
  G.append(s('path', { d: joints.join(''), stroke: P.stoneJoint, 'stroke-width': 0.7, opacity: 0.7 }));
  G.append(s('path', { d: `M${x0 + 0.6} ${sillY - 5}V${spring}A${f(Ro)} ${f(Ro)} 0 0 1 ${x1 - 0.6} ${spring}`, fill: 'none', stroke: '#A89C93', 'stroke-width': 1, opacity: 0.55 }));
  // persiennes (deux vantaux, panneaux haut et bas, lames horizontales)
  const pat = uid('lame');
  defs.append(s('pattern', { id: pat, width: 8, height: 3.1, patternUnits: 'userSpaceOnUse', y: sillY }, [
    s('rect', { width: 8, height: 3.1, fill: P.shutter }),
    s('rect', { y: 1.9, width: 8, height: 0.75, fill: P.shutterLine }),
    s('rect', { y: 2.65, width: 8, height: 0.45, fill: '#fff', opacity: 0.6 }),
  ]));
  const sh = g({ 'clip-path': `url(#${clip})` });
  const midX = cx;
  const railY = sillY - 5 - (sillY - 5 - itop) * 0.47;
  sh.append(s('rect', { x: ix0, y: itop - 2, width: ix1 - ix0, height: sillY - itop, fill: P.shutter }));
  [[ix0 + 2.6, midX - 1.6], [midX + 1.6, ix1 - 2.6]].forEach(([a, b]) => {
    sh.append(
      s('rect', { x: a, y: itop - 2, width: b - a, height: railY - itop + 0.5, fill: `url(#${pat})` }),
      s('rect', { x: a, y: railY + 3, width: b - a, height: sillY - 9 - railY - 3, fill: `url(#${pat})` }),
    );
  });
  sh.append(
    s('path', { d: `M${ix0} ${f(railY)}H${ix1}`, stroke: P.shutter, 'stroke-width': 3 }),
    s('path', { d: `M${ix0} ${f(railY + 1.6)}H${ix1}`, stroke: P.shutterShade, 'stroke-width': 0.6 }),
    s('path', { d: `M${midX} ${itop - 4}V${sillY - 5}`, stroke: P.shutterLine, 'stroke-width': 0.8 }),
    s('path', { d: `M${ix0 + 1.3} ${itop - 4}V${sillY - 5}M${ix1 - 1.3} ${itop - 4}V${sillY - 5}`, stroke: P.shutterShade, 'stroke-width': 0.7 }),
    // ombre de l'embrasure : à gauche et sous l'arc
    s('path', { d: `M${ix0} ${sillY - 5}V${ispring}A${f(Ri)} ${f(Ri)} 0 0 1 ${ix1} ${ispring}V${ispring + 4}A${f(Ri)} ${f(Ri)} 0 0 0 ${ix0 + 4} ${ispring + 4}V${sillY - 5}Z`, fill: '#5E4F45', opacity: 0.32 }),
  );
  G.append(sh);
  // pentures et arrêts de volets
  G.append(s('path', {
    d: `${R(ix0 - 2.2, spring + 14, 3.5, 1.4)}${R(ix0 - 2.2, sillY - 26, 3.5, 1.4)}${R(ix1 - 1.3, spring + 14, 3.5, 1.4)}${R(ix1 - 1.3, sillY - 26, 3.5, 1.4)}`,
    fill: '#3F3632',
  }));
  // appui saillant
  G.append(
    s('path', { d: R(x0 - 4, sillY - 6, W + 8, 6), fill: P.stoneLight }),
    s('path', { d: R(x0 - 4, sillY - 6, W + 8, 1.4), fill: '#B3A69C' }),
    s('path', { d: R(x0 - 4, sillY - 1.6, W + 8, 1.6), fill: P.stoneDark }),
    s('path', { d: `M${x0 - 4} ${sillY}h${W + 8}l2.5 4H${x0 - 1.5}Z`, fill: '#8F7A68', opacity: 0.3 }),
  );
  return G;
}

function building(defs, r) {
  const G = g({ class: 'sf-building' });
  const wall = lin(defs, [[0, P.plasterSun], [0.5, P.plaster], [1, P.plasterShade]], { x1: 0, y1: -120, x2: 400, y2: 80, user: true });
  G.append(s('rect', { x: -500, y: -520, width: 1400, height: 906, fill: wall }));
  // enduit ancien : taches et coulures très douces
  const stain = rad(defs, [[0, '#C9B39A', 0.35], [1, '#C9B39A', 0]]);
  const light = rad(defs, [[0, '#FFF6EA', 0.45], [1, '#FFF6EA', 0]]);
  [[60, 10, 70, 30, stain], [300, -10, 90, 26, stain], [190, 30, 60, 18, light], [20, -60, 80, 40, light], [380, 30, 60, 30, stain]].forEach(([cx, cy, rx, ry, fill]) => {
    G.append(s('ellipse', { cx, cy, rx, ry, fill }));
  });
  const streaks = [];
  for (let i = 0; i < 9; i++) {
    const x = -40 + r() * 470;
    streaks.push(`M${f(x)} ${f(-30 + r() * 40)}v${f(16 + r() * 26)}`);
  }
  G.append(s('path', { d: streaks.join(''), stroke: '#CDB8A1', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.35 }));
  // deux étages de fenêtres (le second ne se voit que sur les grands écrans)
  [47, -103].forEach((sill) => [137, 235, 371].forEach((cx) => G.append(upperWindow(defs, cx, sill, r))));
  [-40, -78].forEach((cx) => G.append(upperWindow(defs, cx, 47, r)));
  [470, 568].forEach((cx) => G.append(upperWindow(defs, cx, 47, r)));
  return G;
}

/** Descente d'eau pluviale (zinc), avec ses colliers. */
function downpipe(x, y0, y1) {
  const G = g({ class: 'sf-pipe' });
  G.append(
    s('path', { d: R(x, y0, 4, y1 - y0), fill: P.pipe }),
    s('path', { d: R(x + 0.6, y0, 1, y1 - y0), fill: P.pipeLight }),
    s('path', { d: R(x + 3, y0, 1, y1 - y0), fill: P.pipeDark }),
    s('path', { d: R(x + 4, y0, 1.6, y1 - y0), fill: '#000', opacity: 0.12 }),
  );
  const collars = [];
  for (let y = y0 + 30; y < y1 - 10; y += 58) collars.push(R(x - 0.8, y, 5.6, 2.2));
  G.append(s('path', { d: collars.join(''), fill: P.pipeDark }));
  // dauphin en fonte au pied
  G.append(s('path', { d: `M${x - 0.4} ${y1 - 12}h4.8v9q0 3 -2.4 3h-2q-2.4 0 -2.4 -3Z`, fill: '#5A5651' }));
  return G;
}

// --- la devanture : premier niveau ----------------------------------------------------------
/** Volute : spirale de demi-cercles qui s'enroule vers le centre. */
function spiral(vx, vy, r, sgn) {
  const xs = [1, -1, 0.5, -0.25, 0.12].map((k) => vx + sgn * k * r);
  let d = `M${f(xs[0])} ${f(vy)}`;
  for (let i = 1; i < xs.length; i++) {
    const rr = Math.abs(xs[i] - xs[i - 1]) / 2;
    d += `A${f(rr)} ${f(rr)} 0 0 ${sgn > 0 ? 1 : 0} ${f(xs[i])} ${f(vy)}`;
  }
  return d;
}

/** Chapiteau de pilastre : abaque, feuille d'acanthe, oves, volutes, astragale. */
function ionicCapital(x0, x1, y0, y1) {
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const h = y1 - y0;
  const ab = Math.max(1.8, h * 0.22);
  const by = y0 + ab;
  const G = g({ class: 'sf-cap' });
  G.append(
    s('path', { d: R(x0, by, w, y1 - by), fill: P.greenSun }),
    s('path', { d: R(x1 - 1.6, by, 1.6, y1 - by), fill: P.greenShade }),
    // oves sous l'abaque
    s('path', { d: Array.from({ length: 3 }, (_, i) => E(cx + (i - 1) * w * 0.2, by + h * 0.2, w * 0.075, h * 0.12)).join(''), fill: P.greenLight }),
    s('path', { d: `M${f(x0 + w * 0.18)} ${f(by + h * 0.36)}H${f(x1 - w * 0.18)}`, stroke: P.greenShade, 'stroke-width': 0.5 }),
    // feuille d'acanthe
    s('path', { d: `M${cx} ${f(y1 - 1.5)}C${f(cx - w * 0.3)} ${f(y1 - h * 0.2)} ${f(cx - w * 0.16)} ${f(by + h * 0.34)} ${cx} ${f(by + h * 0.3)}C${f(cx + w * 0.16)} ${f(by + h * 0.34)} ${f(cx + w * 0.3)} ${f(y1 - h * 0.2)} ${cx} ${f(y1 - 1.5)}Z`, fill: P.greenLight }),
    s('path', { d: `M${cx} ${f(y1 - 1.8)}V${f(by + h * 0.36)}M${f(cx - w * 0.12)} ${f(y1 - h * 0.25)}l${f(w * 0.12)} -1M${f(cx + w * 0.12)} ${f(y1 - h * 0.25)}l${f(-w * 0.12)} -1`, stroke: P.greenShade, 'stroke-width': 0.45, fill: 'none' }),
    // abaque débordant
    s('path', { d: R(x0 - 1.8, y0, w + 3.6, ab), fill: P.greenSun }),
    s('path', { d: R(x0 - 1.8, y0, w + 3.6, ab * 0.38), fill: P.greenLight }),
    s('path', { d: R(x0 - 1.8, by - 0.6, w + 3.6, 0.6), fill: P.greenShade }),
  );
  // volutes qui pendent aux coins
  const vr = Math.min(h * 0.27, w * 0.19);
  [[x0 + vr * 0.55, 1], [x1 - vr * 0.55, -1]].forEach(([vx, sgn]) => {
    const vy = by + vr * 1.02;
    G.append(
      s('circle', { cx: f(vx), cy: f(vy), r: f(vr), fill: sgn > 0 ? P.greenLight : P.greenSun }),
      s('path', { d: spiral(vx, vy, vr * 0.92, sgn), fill: 'none', stroke: P.greenDeep, 'stroke-width': 0.55 }),
    );
  });
  // astragale
  G.append(
    s('path', { d: R(x0 - 0.5, y1 - 1.6, w + 1, 1.6), fill: P.greenLight }),
    s('path', { d: R(x0 - 0.5, y1 - 0.5, w + 1, 0.5), fill: P.greenShade }),
  );
  return G;
}

/** Pilastre : fût éclairé à gauche, ombré à droite. */
function pilaster(x0, x1, y0, y1, { panel = false } = {}) {
  const G = g({ class: 'sf-pil' });
  G.append(
    s('path', { d: R(x0, y0, x1 - x0, y1 - y0), fill: P.greenSun }),
    s('path', { d: R(x0, y0, 1.4, y1 - y0), fill: P.greenLight }),
    s('path', { d: R(x1 - 2, y0, 2, y1 - y0), fill: P.greenShade }),
    s('path', { d: R(x1, y0, 1.6, y1 - y0), fill: '#000', opacity: 0.1 }),
  );
  if (panel) {
    const px0 = x0 + 5;
    const px1 = x1 - 5;
    G.append(
      s('path', { d: R(px0, y0 + 8, px1 - px0, y1 - y0 - 16), fill: P.green }),
      s('path', { d: `M${px0} ${y1 - 8}V${y0 + 8}H${px1}`, fill: 'none', stroke: P.greenShade, 'stroke-width': 1 }),
      s('path', { d: `M${px1} ${y0 + 8}V${y1 - 8}H${px0}`, fill: 'none', stroke: P.greenLight, 'stroke-width': 1 }),
    );
  }
  return G;
}

/** Corniche saillante : dessus éclairé, larmier, ombre portée. */
function cornice(defs, x0, x1, y, h, { shadow = 5 } = {}) {
  const G = g({ class: 'sf-cornice' });
  const sh = lin(defs, [[0, '#2E2E1C', 0.32], [1, '#2E2E1C', 0]]);
  G.append(
    s('path', { d: R(x0, y + h, x1 - x0, shadow), fill: sh }),
    s('path', { d: R(x0, y, x1 - x0, h), fill: P.greenSun }),
    s('path', { d: R(x0, y, x1 - x0, h * 0.28), fill: P.greenLight }),
    s('path', { d: R(x0, y + h * 0.55, x1 - x0, 0.7), fill: P.greenShade }),
    s('path', { d: R(x0, y + h - h * 0.24, x1 - x0, h * 0.24), fill: P.greenDeep }),
  );
  return G;
}

/** Garde-corps en fonte devant une fenêtre : lisses, rinceaux, consoles aux extrémités. */
function railing(x0, x1, y0, y1) {
  const G = g({ class: 'sf-rail' });
  const ix0 = x0 + 4.5;
  const ix1 = x1 - 4.5;
  const n = Math.max(4, Math.round((ix1 - ix0) / 6.2));
  const cw = (ix1 - ix0) / n;
  const band = y0 + 4.2;
  const mid = (band + y1) / 2;
  const d = [];
  // guirlande de petites boucles sous la main courante, puis une lisse fine
  for (let i = 0; i < n * 2; i++) {
    const a = ix0 + (i * cw) / 2;
    d.push(`M${f(a)} ${f(y0 + 1.6)}q${f(cw / 4)} 2.4 ${f(cw / 2)} 0`);
  }
  d.push(`M${f(ix0)} ${f(band)}H${f(ix1)}`);
  // lyres (deux C adossés) qui alternent avec des barreaux à rosette
  const rings = [];
  for (let i = 0; i < n; i++) {
    const a = ix0 + i * cw;
    const c = a + cw / 2;
    if (i % 2 === 0) {
      const sp = (sgn) => `M${f(c)} ${f(y1)}C${f(c + sgn * cw * 0.08)} ${f(y1 - 3)} ${f(c + sgn * cw * 0.5)} ${f(mid + 1.4)} ${f(c + sgn * cw * 0.4)} ${f(band + 2.2)}c${f(-sgn * cw * 0.03)} -1.2 ${f(sgn * cw * 0.15)} -1.7 ${f(sgn * cw * 0.2)} -0.5c${f(sgn * cw * 0.02)} 0.8 ${f(-sgn * cw * 0.08)} 1.2 ${f(-sgn * cw * 0.12)} 0.5`;
      d.push(sp(-1), sp(1), `M${f(c)} ${f(band)}V${f(mid + 1)}`);
    } else {
      d.push(`M${f(c)} ${f(band)}V${f(y1)}`);
      rings.push(`M${f(c - 1.3)} ${f(mid)}a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0Z`);
    }
  }
  // consoles en S aux deux bouts, qui descendent sous la lisse basse
  const end = (x, sgn) => `M${f(x)} ${f(y0)}C${f(x - sgn * 4.2)} ${f(y0 + 2.4)} ${f(x - sgn * 4.6)} ${f(y1 - 1)} ${f(x - sgn * 1.4)} ${f(y1 + 3)}c${f(sgn * 1.6)} 2 ${f(sgn * 3.6)} 0.4 ${f(sgn * 2.4)} -1.4`
    + `M${f(x - sgn * 1)} ${f(y0 + 3)}c${f(-sgn * 2.4)} 1.6 ${f(-sgn * 2.4)} 4.4 ${f(-sgn * 0.4)} 5.6c${f(sgn * 1)} 0.4 ${f(sgn * 1.6)} -0.6 ${f(sgn * 0.8)} -1.4`
    + `M${f(x)} ${f(y0)}V${f(y1)}`;
  const ends = end(x0 + 1.2, 1) + end(x1 - 1.2, -1);
  const all = d.join('');
  // ombre portée (soleil à gauche), puis la fonte
  G.append(
    g({ transform: 'translate(1 1.3)', opacity: 0.2 }, [
      s('path', { d: all + ends + rings.join(''), fill: 'none', stroke: '#1E1E12', 'stroke-width': 0.9 }),
      s('path', { d: R(x0, y0, x1 - x0, 1.8) + R(x0, y1, x1 - x0, 1.4), fill: '#1E1E12' }),
    ]),
    s('path', { d: all, fill: 'none', stroke: P.iron, 'stroke-width': 0.7, 'stroke-linecap': 'round' }),
    s('path', { d: rings.join(''), fill: 'none', stroke: P.iron, 'stroke-width': 0.7 }),
    s('path', { d: ends, fill: 'none', stroke: P.iron, 'stroke-width': 1.3, 'stroke-linecap': 'round' }),
    s('path', { d: R(x0 - 0.4, y0 - 0.4, x1 - x0 + 0.8, 2), fill: P.iron }),
    s('path', { d: R(x0 - 0.4, y0 + 1.1, x1 - x0 + 0.8, 0.5), fill: P.ironShade }),
    s('path', { d: R(x0, y1, x1 - x0, 1.4), fill: P.iron }),
  );
  return G;
}

/** Fenêtre de l'étage : dormant blanc, imposte, deux battants, stores derrière les vitres. */
function firstWindow(defs, x0, x1, y0, y1, blinds, r) {
  const G = g({ class: 'sf-fwin' });
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const glassFill = lin(defs, [[0, '#3A3D3A'], [1, '#232523']]);
  const blindFill = lin(defs, [[0, '#A7A094'], [1, '#8C857A']]);
  // embrasure (fond sombre) + dormant
  G.append(s('path', { d: R(x0 - 2, y0 - 1.5, w + 4, y1 - y0 + 1.5), fill: P.greenDeep }));
  G.append(s('path', { d: R(x0, y0, w, y1 - y0), fill: P.white }));
  // imposte pleine (panneau blanc) au-dessus des battants
  const tY = y0 + 12.5;
  G.append(
    s('path', { d: R(x0 + 3, y0 + 3, w - 6, tY - y0 - 4.2), fill: 'none', stroke: P.whiteShade, 'stroke-width': 0.8 }),
    s('path', { d: R(x0 + 3, tY - 1.6, w - 6, 0.8), fill: '#fff', opacity: 0.7 }),
  );
  const panes = [
    { x: x0 + 4.2, y: tY + 3.2, w: w / 2 - 5.8, h: y1 - tY - 7.2, kind: blinds[0] },
    { x: cx + 1.6, y: tY + 3.2, w: w / 2 - 5.8, h: y1 - tY - 7.2, kind: blinds[1] },
  ];
  panes.forEach((p) => {
    G.append(s('path', { d: R(p.x, p.y, p.w, p.h), fill: glassFill }));
    if (p.kind === 'blind' || p.kind === 'half') {
      const h = p.kind === 'half' ? p.h * (0.45 + r() * 0.2) : p.h;
      G.append(s('path', { d: R(p.x, p.y, p.w, h), fill: blindFill }));
      const lines = [];
      for (let x = p.x + 1.6; x < p.x + p.w - 0.5; x += 1.9) lines.push(`M${f(x)} ${f(p.y)}v${f(h)}`);
      G.append(s('path', { d: lines.join(''), stroke: P.blindLine, 'stroke-width': 0.5, opacity: 0.8 }));
      G.append(s('path', { d: R(p.x, p.y + h - 1, p.w, 1), fill: '#6F685D' }));
    }
    // reflet du ciel
    G.append(s('path', { d: `M${f(p.x + p.w * 0.15)} ${f(p.y + p.h)}L${f(p.x + p.w * 0.62)} ${f(p.y)}H${f(p.x + p.w * 0.82)}L${f(p.x + p.w * 0.35)} ${f(p.y + p.h)}Z`, fill: '#fff', opacity: 0.08 }));
  });
  // traverses, battants et ombres de l'embrasure
  G.append(
    s('path', { d: R(x0 + 1.5, tY, w - 3, 2.6), fill: P.white }),
    s('path', { d: R(cx - 1.4, tY + 2.6, 2.8, y1 - tY - 4), fill: P.white }),
    s('path', { d: `M${x0 + 3.6} ${tY + 2.6}V${y1 - 3.4}H${cx - 1.4}M${cx + 1.4} ${y1 - 3.4}H${x1 - 3.6}V${tY + 2.6}`, fill: 'none', stroke: P.whiteShade, 'stroke-width': 0.8 }),
    s('path', { d: R(x0, y1 - 1.6, w, 1.6), fill: P.whiteShade }),
    s('path', { d: `M${x0} ${y0}H${x1}V${y0 + 3}H${x0 + 3}V${y1}H${x0}Z`, fill: '#4D4C35', opacity: 0.38 }),
  );
  // appui (pierre peinte) sous la fenêtre
  G.append(
    s('path', { d: R(x0 - 3, y1, w + 6, 3.6), fill: P.greenSun }),
    s('path', { d: R(x0 - 3, y1, w + 6, 1), fill: P.greenLight }),
    s('path', { d: R(x0 - 3, y1 + 3.6, w + 6, 2.4), fill: P.greenDeep, opacity: 0.6 }),
  );
  return G;
}

function firstFloor(defs, r) {
  const G = g({ class: 'sf-first' });
  const body = lin(defs, [[0, P.greenSun], [0.6, P.green], [1, P.greenShade]], { x1: 51, y1: 0, x2: 349, y2: 0, user: true });
  G.append(s('path', { d: R(51, 58, 298, 146), fill: body }));
  // frise et corniche haute, sous la bavette de zinc
  G.append(cornice(defs, 49, 351, 60, 7, { shadow: 4 }));
  G.append(
    s('path', { d: R(47, 53, 306, 2.4), fill: P.zincLight }),
    s('path', { d: R(47, 55.4, 306, 3.2), fill: P.zinc }),
    s('path', { d: R(47, 58.6, 306, 1.2), fill: P.zincDark }),
  );
  G.append(cornice(defs, 48, 352, 79, 7, { shadow: 5 }));
  // pilastres extérieurs (doublés) et leurs chapiteaux
  [[54, 72], [75, 93], [304, 322], [325, 343]].forEach(([a, b]) => {
    G.append(pilaster(a, b, 95, 197));
    G.append(ionicCapital(a, b, 86, 95.5));
  });
  // filet entre les pilastres doublés, au-dessus des baies
  G.append(
    s('path', { d: R(93, 95, 211, 1.2), fill: P.greenLight }),
    s('path', { d: R(93, 96.2, 211, 1.4), fill: P.greenShade }),
  );
  // trois baies
  const bays = [[95, 152, ['blind', 'blind']], [170, 227, ['blind', 'half']], [245, 302, ['dark', 'blind']]];
  bays.forEach(([a, b, bl]) => {
    G.append(firstWindow(defs, a, b, 112, 183, bl, r));
    G.append(railing(a + 1, b - 1, 165, 179.5));
  });
  // pilastres entre les baies
  [[154, 168], [229, 243]].forEach(([a, b]) => {
    G.append(pilaster(a, b, 110, 197));
    G.append(ionicCapital(a, b, 97.6, 111));
  });
  return G;
}

// --- la devanture : rez-de-chaussée ----------------------------------------------------------
/** Console de devanture (sous le bandeau) : volute en haut, gaine cannelée. */
function console_(x0, x1, y0, y1) {
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const h = y1 - y0;
  const rh = Math.min(6.2, h * 0.28);
  const G = g({ class: 'sf-console' });
  // gaine qui s'effile vers le bas, terminée par une goutte
  const body = `M${f(x0 + w * 0.1)} ${f(y0 + rh)}H${f(x1 - w * 0.1)}L${f(x1 - w * 0.26)} ${f(y1 - 3)}Q${cx} ${f(y1 + 0.5)} ${f(x0 + w * 0.26)} ${f(y1 - 3)}Z`;
  G.append(
    s('path', { d: body, fill: P.greenSun }),
    s('path', { d: `M${f(x1 - w * 0.1)} ${f(y0 + rh)}L${f(x1 - w * 0.26)} ${f(y1 - 3)}Q${f(cx + w * 0.1)} ${f(y1 - 0.4)} ${cx} ${f(y1 - 0.2)}L${f(x1 - w * 0.3)} ${f(y0 + rh)}Z`, fill: P.greenShade }),
  );
  // cannelures et petits rangs
  const grid = [];
  for (let k = -1; k <= 1; k++) grid.push(`M${f(cx + k * w * 0.16)} ${f(y0 + rh + 2)}L${f(cx + k * w * 0.1)} ${f(y1 - 4)}`);
  for (let y = y0 + rh + 4.5; y < y1 - 5; y += 3.6) grid.push(`M${f(cx - w * 0.24)} ${f(y)}H${f(cx + w * 0.24)}`);
  G.append(
    s('path', { d: grid.join(''), stroke: P.greenDeep, 'stroke-width': 0.5, opacity: 0.7 }),
    s('path', { d: `M${cx} ${f(y1 - 3.2)}l-1.4 2.2l1.4 1.4l1.4 -1.4Z`, fill: P.greenLight }),
  );
  // coussinet roulé, vu de face : deux volutes reliées par une ceinture
  G.append(
    s('path', { d: R(x0 + rh * 0.5, y0, w - rh, rh), fill: P.greenLight }),
    s('path', { d: R(x0 + rh * 0.5, y0 + rh - 0.8, w - rh, 0.8), fill: P.greenShade }),
    s('path', { d: R(cx - 1.2, y0, 2.4, rh), fill: P.greenSun }),
    s('path', { d: `M${f(cx - 1.2)} ${y0}v${f(rh)}M${f(cx + 1.2)} ${y0}v${f(rh)}`, stroke: P.greenShade, 'stroke-width': 0.45 }),
  );
  [[x0 + rh * 0.5, 1], [x1 - rh * 0.5, -1]].forEach(([vx, sgn]) => {
    const vy = y0 + rh / 2;
    G.append(
      s('circle', { cx: f(vx), cy: f(vy), r: f(rh / 2), fill: sgn > 0 ? P.greenLight : P.greenSun }),
      s('path', { d: spiral(vx, vy, rh * 0.44, sgn), fill: 'none', stroke: P.greenDeep, 'stroke-width': 0.5 }),
    );
  });
  return G;
}

/** Panneau de frise à angles rentrants (bois peint lie-de-vin). */
function fasciaPanel(x0, x1, y0, y1) {
  const q = 5.5;
  const d = `M${x0 + q} ${y0}H${x1 - q}A${q} ${q} 0 0 0 ${x1} ${y0 + q}V${y1 - q}A${q} ${q} 0 0 0 ${x1 - q} ${y1}H${x0 + q}A${q} ${q} 0 0 0 ${x0} ${y1 - q}V${y0 + q}A${q} ${q} 0 0 0 ${x0 + q} ${y0}Z`;
  const G = g({ class: 'sf-fpanel' });
  G.append(
    s('path', { d, fill: P.greenLight, transform: 'translate(0.8 0.9)', opacity: 0.6 }),
    s('path', { d, fill: P.panel }),
    s('path', { d, fill: 'none', stroke: P.panelLine, 'stroke-width': 1, transform: `translate(${f((x0 + x1) / 2 * 0.05)} ${f((y0 + y1) / 2 * 0.07)}) scale(.95 .93)` }),
  );
  return G;
}

function groundFloor(defs, picks) {
  const G = g({ class: 'sf-ground' });
  // bandeau entre les niveaux
  G.append(s('path', { d: R(51, 197, 298, 187), fill: P.green }));
  G.append(cornice(defs, 48, 352, 190, 10, { shadow: 6 }));
  // pilastres d'angle et consoles
  G.append(pilaster(55, 95, 222, 374, { panel: true }));
  G.append(console_(56, 74, 201, 225), console_(76, 94, 201, 225));
  G.append(pilaster(318, 342, 222, 374, { panel: true }));
  G.append(console_(320, 340, 201, 225));
  G.append(
    s('path', { d: R(53, 372, 44, 12), fill: P.greenSun }),
    s('path', { d: R(53, 372, 44, 1.4), fill: P.greenLight }),
    s('path', { d: R(316, 372, 28, 12), fill: P.greenSun }),
    s('path', { d: R(316, 372, 28, 1.4), fill: P.greenLight }),
  );
  // frise (à l'ombre du store) et ses trois panneaux
  const fr = lin(defs, [[0, '#7D7E57'], [1, '#8F9066']]);
  G.append(s('path', { d: R(96, 200, 222, 72), fill: fr }));
  [[104, 170], [177, 241], [248, 311]].forEach(([a, b]) => G.append(fasciaPanel(a, b, 229, 265)));

  // vitrines et porte : vitrage très sombre, intérieur à peine visible
  const shop = g({ class: 'sf-shop' });
  const clip = uid('vit');
  const glassD = R(99, 276, 36, 87) + R(144, 280, 27, 70) + R(181, 276, 60, 87) + R(244, 276, 37, 87) + R(284, 276, 31, 87);
  defs.append(s('clipPath', { id: clip }, s('path', { d: glassD })));
  shop.append(s('path', { d: R(96, 268, 222, 116), fill: P.shopFrame }));
  const inside = g({ 'clip-path': `url(#${clip})`, class: 'sf-inside' });
  const deep = lin(defs, [[0, '#1B1614'], [0.55, '#241C17'], [1, '#2E2520']]);
  inside.append(s('path', { d: R(96, 270, 222, 100), fill: deep }));
  // silhouettes : étagères, cagettes, pilier de briques, bouteilles
  inside.append(
    s('path', { d: R(250, 270, 22, 100), fill: '#3A221B' }),
    s('path', { d: `${R(99, 312, 36, 1.4)}${R(99, 336, 36, 1.4)}${R(272, 318, 46, 1.4)}${R(272, 340, 46, 1.4)}${R(181, 334, 60, 1.4)}`, fill: '#0F0C0B' }),
    s('path', { d: `${R(103, 326, 12, 9)}${R(118, 327, 14, 8)}${R(276, 331, 16, 8)}${R(295, 330, 15, 9)}${R(186, 346, 16, 8)}${R(206, 347, 18, 7)}`, fill: '#3B2A1F', opacity: 0.85 }),
  );
  const bottles = [];
  for (let i = 0; i < 6; i++) bottles.push(R(276 + i * 6.6, 305, 3.2, 12.6) + R(277 + i * 6.6, 301, 1.2, 4.4));
  inside.append(s('path', { d: bottles.join(''), fill: '#151918', opacity: 0.9 }));
  // lueur chaude des ampoules
  const glow = rad(defs, [[0, '#FFB85C', 0.55], [0.45, '#E58A3A', 0.18], [1, '#E58A3A', 0]]);
  const glowG = g({ class: 'sf-glow' });
  [[189, 291], [205, 289], [228, 290]].forEach(([x, y]) => glowG.append(s('ellipse', { cx: x, cy: y + 4, rx: 22, ry: 18, fill: glow })));
  inside.append(glowG);
  // reflets de la rue dans les vitres
  inside.append(
    s('path', { d: 'M99 350L130 276H142L111 363H99Z M181 360L216 276H226L191 363Z M246 363L280 276H286L252 363Z', fill: '#FFF1DE', opacity: 0.06 }),
    s('path', { d: R(96, 352, 222, 12), fill: '#C9B6A6', opacity: 0.08 }),
  );
  shop.append(inside);
  // menuiseries
  shop.append(
    s('path', { d: R(135, 270, 9, 114), fill: P.shopFrame }),
    s('path', { d: R(171, 270, 10, 114), fill: P.shopFrame }),
    s('path', { d: R(241, 272, 3, 92), fill: P.shopFrame }),
    s('path', { d: R(281, 272, 3, 92), fill: P.shopFrame }),
    s('path', { d: `M96 268H318V272H96Z`, fill: P.shopFrameLight }),
    s('path', { d: `M99 363H135M181 363H315`, stroke: P.shopFrameLight, 'stroke-width': 1 }),
  );
  // porte : vitrée en haut, panneau en bas, barre de tirage laiton
  shop.append(
    s('path', { d: `M143 279H172V351H143Z`, fill: 'none', stroke: P.shopFrameLight, 'stroke-width': 1.2 }),
    s('path', { d: R(146, 355, 23, 22), fill: '#33271F' }),
    s('path', { d: R(146, 355, 23, 22), fill: 'none', stroke: P.shopFrameLight, 'stroke-width': 0.9 }),
    s('path', { d: R(167.4, 318, 1.6, 20), fill: P.brass }),
  );
  // soubassements lie-de-vin
  [[96, 135], [181, 318]].forEach(([a, b]) => {
    shop.append(
      s('path', { d: R(a, 364, b - a, 20), fill: P.plinth }),
      s('path', { d: R(a + 3, 367, b - a - 6, 14), fill: 'none', stroke: P.plinthLight, 'stroke-width': 1 }),
      s('path', { d: R(a, 364, b - a, 1.2), fill: P.plinthLight }),
    );
  });
  // marche de la porte
  shop.append(
    s('path', { d: R(140, 379, 36, 5.5), fill: '#B9AB9D' }),
    s('path', { d: R(140, 379, 36, 1.2), fill: '#D4C8BC' }),
  );
  G.append(shop);

  // ampoules suspendues (derrière la vitre)
  const bulbs = g({ class: 'sf-bulbs' });
  [[189, 291, 273], [205, 289, 273], [228, 290, 273]].forEach(([x, y, top]) => {
    bulbs.append(
      s('path', { d: `M${x} ${top}V${y - 2.6}`, stroke: '#0B0909', 'stroke-width': 0.6 }),
      s('circle', { cx: x, cy: y, r: 2.3, fill: '#FFD07A', class: 'sf-bulb' }),
      s('circle', { cx: x - 0.6, cy: y - 0.7, r: 0.8, fill: '#FFF5DA' }),
    );
  });
  G.append(bulbs);
  return { g: G, inside, glowG, bulbs };
}

/** Store banne : toile beige vue du dessous, barre de charge bordeaux, lambrequin. */
function awning(defs) {
  const G = g({ class: 'sf-awning' });
  const cassette = g({ class: 'sf-cassette' }, [
    s('path', { d: R(92, 211, 260, 6), rx: 2, fill: '#CABDA3' }),
    s('path', { d: R(92, 211, 260, 1.6), fill: '#DED3BD' }),
    s('path', { d: R(92, 215.4, 260, 1.6), fill: '#A89A7F' }),
  ]);
  const canvas = g({ class: 'sf-canvas' });
  const toile = lin(defs, [[0, P.canvasLight], [1, P.canvas]]);
  const top = [94, 350];
  const bot = [152, 356];
  canvas.append(s('path', { d: `M${top[0]} 217H${top[1]}L${bot[1]} 236H${bot[0]}Z`, fill: toile }));
  const seams = [];
  for (let t = 1 / 9; t < 0.99; t += 1 / 9) seams.push(`M${f(lerp(top[0], top[1], t))} 217L${f(lerp(bot[0], bot[1], t))} 236`);
  canvas.append(
    s('path', { d: seams.join(''), stroke: P.canvasSeam, 'stroke-width': 0.8, opacity: 0.8 }),
    s('path', { d: `M${top[0]} 217H${top[1]}L${top[1] + 0.6} 220H${top[0] + 9}Z`, fill: '#A08C6C', opacity: 0.35 }),
    s('path', { d: `M${top[0]} 217L${bot[0]} 236`, stroke: '#B8A27E', 'stroke-width': 1 }),
  );
  const front = g({ class: 'sf-valance' });
  const lamb = lin(defs, [[0, '#E6D7B8'], [1, '#CDB892']]);
  front.append(
    s('path', { d: `M${bot[0]} 240.5H${bot[1]}V255.5H${bot[0]}Z`, fill: lamb }),
  );
  const folds = [];
  for (let x = bot[0] + 8; x < bot[1] - 2; x += 9.5) folds.push(`M${f(x)} 241V255.5`);
  front.append(
    s('path', { d: folds.join(''), stroke: '#BBA57F', 'stroke-width': 0.8, opacity: 0.45 }),
    s('path', { d: R(bot[0], 254.3, bot[1] - bot[0], 1.2), fill: '#B9A37C' }),
    // barre de charge
    s('path', { d: `M${bot[0] - 1} 235.4H${bot[1] + 0.6}a2.6 2.6 0 0 1 0 5.2H${bot[0] - 1}a2.6 2.6 0 0 1 0 -5.2Z`, fill: P.bordeaux }),
    s('path', { d: `M${bot[0]} 236.3H${bot[1]}`, stroke: P.bordeauxLight, 'stroke-width': 0.9, 'stroke-linecap': 'round' }),
    s('path', { d: `M${bot[0]} 240.2H${bot[1]}`, stroke: P.bordeauxDark, 'stroke-width': 0.8 }),
  );
  G.append(cassette, canvas, front);
  return { g: G, canvas, front };
}

// --- la rue ----------------------------------------------------------------------------------
function street(defs, r) {
  const G = g({ class: 'sf-street' });
  const pave = lin(defs, [[0, '#BCA79A'], [0.3, P.pave], [1, P.paveLight]], { x1: 0, y1: 384, x2: 0, y2: 470, user: true });
  G.append(s('path', { d: R(-500, 384, 1400, 160), fill: pave }));
  // dalles : rangs de plus en plus hauts vers nous, joints qui fuient vers le centre
  const rows = [384, 392, 401.5, 412.5, 425.5, 441, 459, 480];
  const joints = [];
  rows.slice(1).forEach((y) => joints.push(`M-500 ${y}H900`));
  for (let i = 0; i < rows.length - 1; i++) {
    const y0 = rows[i];
    const y1 = rows[i + 1];
    const k0 = (y0 - 330) / 54;
    const k1 = (y1 - 330) / 54;
    for (let x = -480 + (i % 2) * 19; x < 900; x += 38) {
      const xa = 200 + (x - 200) * k0;
      const xb = 200 + (x - 200) * k1;
      joints.push(`M${f(xa)} ${y0}L${f(xb)} ${y1}`);
    }
  }
  G.append(s('path', { d: joints.join(''), stroke: P.paveJoint, 'stroke-width': 0.8, opacity: 0.85 }));
  // quelques dalles plus claires ou plus foncées
  const tint = bucket();
  for (let i = 0; i < 26; i++) {
    const ri = 1 + Math.floor(r() * 5);
    const y0 = rows[ri];
    const y1 = rows[ri + 1];
    const x = -200 + Math.floor(r() * 22) * 38 + (ri % 2) * 19;
    const k0 = (y0 - 330) / 54;
    const k1 = (y1 - 330) / 54;
    const pts = [[200 + (x - 200) * k0, y0], [200 + (x + 38 - 200) * k0, y0], [200 + (x + 38 - 200) * k1, y1], [200 + (x - 200) * k1, y1]];
    tint.add(r() > 0.5 ? '#D6C7BC' : '#B29E90', `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z`);
  }
  tint.flush(G, { opacity: 0.45 });
  G.append(s('path', { d: R(-500, 384, 1400, 3), fill: '#5D4B42', opacity: 0.22 }));
  return G;
}

/** Ombres au sol : arbres (taches mouvantes), mobilier, bacs. */
function groundShadows(r) {
  const G = g({ class: 'sf-shadows' });
  const dapple = g({ class: 'sf-dapple' });
  const d = [];
  const blob = (cx, cy, s0) => {
    for (let i = 0; i < 7; i++) d.push(E(cx + (r() - 0.5) * s0 * 2.2, cy + (r() - 0.5) * s0 * 0.5, s0 * (0.35 + r() * 0.5), s0 * (0.12 + r() * 0.14)));
  };
  [[-10, 400, 30], [40, 415, 26], [110, 430, 22], [-60, 440, 40], [330, 396, 26], [380, 412, 34], [440, 400, 30], [270, 436, 18]].forEach(([x, y, k]) => blob(x, y, k));
  dapple.append(s('path', { d: d.join(''), fill: P.paveShadow, opacity: 0.42 }));
  G.append(dapple);
  return { g: G, dapple };
}

function bistroTable(x, topY, footY, w, { high = false } = {}) {
  const G = g({ class: 'sf-table' });
  G.append(
    s('path', { d: `M${f(x + 2)} ${footY}l${high ? 22 : 18} 6`, stroke: '#5F4D43', 'stroke-width': 2.4, opacity: 0.22 }),
    s('path', { d: R(x - 1, topY + 1.8, 2, footY - topY - 2), fill: P.olive }),
    s('path', { d: `M${f(x - w * 0.32)} ${footY}Q${x} ${footY - 3.4} ${f(x + w * 0.32)} ${footY}Z`, fill: P.olive }),
    s('path', { d: R(x - w / 2, topY, w, 2.2), rx: 1, fill: P.oliveLight }),
    s('path', { d: R(x - w / 2, topY + 1.6, w, 0.8), fill: '#2F3126' }),
  );
  return G;
}

function stool(x, seatY, footY, { w = 10 } = {}) {
  const G = g({ class: 'sf-stool' });
  const legs = `M${f(x - w * 0.36)} ${seatY + 1.6}L${f(x - w * 0.5)} ${footY}M${f(x + w * 0.36)} ${seatY + 1.6}L${f(x + w * 0.5)} ${footY}M${f(x - w * 0.12)} ${seatY + 1.6}L${f(x - w * 0.18)} ${footY - 1}M${f(x + w * 0.12)} ${seatY + 1.6}L${f(x + w * 0.18)} ${footY - 1}`;
  const ring = (footY + seatY) / 2 + 3;
  G.append(
    s('path', { d: `M${f(x - w * 0.4)} ${footY}l${f(w + 6)} 4`, stroke: '#5F4D43', 'stroke-width': 1.6, opacity: 0.18 }),
    s('path', { d: legs, stroke: P.steelDark, 'stroke-width': 1.1, 'stroke-linecap': 'round' }),
    s('path', { d: `M${f(x - w * 0.45)} ${f(ring)}H${f(x + w * 0.45)}`, stroke: P.steel, 'stroke-width': 0.9 }),
    s('path', { d: R(x - w / 2, seatY, w, 1.9), fill: P.steel }),
    s('path', { d: R(x - w / 2, seatY, w * 0.45, 0.9), fill: '#EDEDE8' }),
  );
  return G;
}

/** Parasol blanc déporté (à gauche) : mât sur trépied, toile bombée, lambrequin festonné. */
function parasol() {
  const G = g({ class: 'sf-parasol' });
  const canopy = g({ class: 'sf-parasol-canopy' });
  G.append(
    s('path', { d: 'M44 286V398M44 398L34 410M44 398L54 410M44 398V410', stroke: '#9A978F', 'stroke-width': 1.6, 'stroke-linecap': 'round', fill: 'none' }),
    s('path', { d: 'M44.6 286V398', stroke: '#D9D6CE', 'stroke-width': 0.5 }),
    s('path', { d: 'M44 289L88 281', stroke: '#8C8981', 'stroke-width': 1 }),
  );
  let scallops = 'M160 293';
  for (let x = 160; x > 52; x -= 7.2) scallops += `q-3.6 4.4 -7.2 0`;
  canopy.append(
    s('path', { d: 'M52 293C64 284 86 278.5 106 278.5C128 278.5 148 284 160 293Z', fill: P.parasol }),
    s('path', { d: 'M106 278.5C128 278.5 148 284 160 293H118C116 287 112 281 106 278.5Z', fill: P.parasolShade, opacity: 0.6 }),
    s('path', { d: `${scallops}L52 293Z`, fill: '#ECE6DA' }),
    s('path', { d: 'M52 293H160', stroke: '#CFC7B8', 'stroke-width': 0.7 }),
  );
  G.append(canopy);
  return { g: G, canopy };
}

/** Parasol replié debout devant la porte. */
function furledParasol() {
  return g({ class: 'sf-furled' }, [
    s('path', { d: 'M201 283V384', stroke: '#3E3A35', 'stroke-width': 1 }),
    s('path', { d: 'M201 287C198.6 302 198.2 324 199.2 350L202.8 350C203.8 324 203.4 302 201 287Z', fill: '#BDAE92' }),
    s('path', { d: 'M201 287C202.6 302 203.4 324 202.8 350L201.3 350C201.9 324 201.8 302 201 287Z', fill: '#9C8D72' }),
    s('path', { d: 'M199.3 304l3.2 2.6M199 318l3.8 2.6M199 333l3.8 2.4', stroke: '#8E8068', 'stroke-width': 0.5 }),
    s('path', { d: R(198.9, 326, 4.2, 1.6), fill: '#6F6352' }),
    s('circle', { cx: 201, cy: 283, r: 1.1, fill: '#3E3A35' }),
  ]);
}

/** Grand bac en bois sur roulettes (planches, cornières noires), garni de produits. */
function bin(x0, x1, top, bottom, heaps, tags, seed) {
  const G = g({ class: 'sf-bin' });
  const w = x1 - x0;
  const r = rng(seed);
  // ombre portée vers la droite
  G.append(s('path', { d: `M${x0 + 3} ${bottom + 6}L${x1 + 2} ${bottom + 6}L${x1 + 22} ${bottom + 14}L${x0 + 18} ${bottom + 14}Z`, fill: '#5D4A3F', opacity: 0.28 }));
  const produce = g({ class: 'sf-bin-produce' });
  heaps.forEach(({ id, x, w: hw, h, k }, i) => {
    produce.append(g({ transform: `translate(${f(x0 + x)} ${top + 2})` }, crateHeap(id, { w: hw, h, scale: k, seed: seed * 7 + i })));
  });
  // ardoises de prix piquées dans les produits
  const tagG = g({ class: 'sf-tags' });
  tags.forEach(({ x, label }, i) => {
    const y = top - 27 - (i % 2) * 2.5;
    tagG.append(g({ class: 'sf-tag fx-bottom' }, [
      s('path', { d: `M${x} ${y + 9}V${top - 2}`, stroke: '#8A6A44', 'stroke-width': 0.8 }),
      s('path', { d: R(x - 7, y, 14, 10), fill: '#1E1F1D' }),
      s('path', { d: R(x - 7, y, 14, 10), fill: 'none', stroke: '#6B5136', 'stroke-width': 0.7 }),
      s('text', { x, y: y + 4.6, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 3.6, fill: P.chalk, text: label }),
      s('path', { d: `M${x - 3.6} ${y + 7.4}q1.6 -1.2 3 0t3.6 -0.2`, stroke: P.chalk, 'stroke-width': 0.5, fill: 'none', opacity: 0.8 }),
    ]));
  });
  const box = g({ class: 'sf-bin-box' });
  const planks = 4;
  const ph = (bottom - top) / planks;
  for (let i = 0; i < planks; i++) {
    const y = top + i * ph;
    const tone = [P.wood, P.woodLight, '#D9A462', '#CF9550'][Math.floor(r() * 4)];
    box.append(s('path', { d: R(x0, y, w, ph - 0.6), fill: tone }));
  }
  const grain = [];
  for (let i = 0; i < 12; i++) {
    const y = top + 2 + r() * (bottom - top - 4);
    const xa = x0 + 4 + r() * (w - 20);
    grain.push(`M${f(xa)} ${f(y)}q${f(6 + r() * 6)} ${f((r() - 0.5) * 1.6)} ${f(12 + r() * 10)} 0`);
  }
  box.append(
    s('path', { d: grain.join(''), stroke: P.woodLine, 'stroke-width': 0.5, fill: 'none', opacity: 0.5 }),
    s('path', { d: Array.from({ length: planks - 1 }, (_, i) => `M${x0} ${f(top + (i + 1) * ph - 0.3)}H${x1}`).join(''), stroke: P.woodLine, 'stroke-width': 0.9, opacity: 0.7 }),
    s('path', { d: R(x0, top, 2.6, bottom - top), fill: P.woodShade, opacity: 0.6 }),
    s('path', { d: R(x0, top, w, bottom - top), fill: 'none' }),
    // cornières et rebord noirs
    s('path', { d: `${R(x0 - 0.8, top - 2.6, w + 1.6, 2.8)}${R(x0 - 0.8, top, 2.4, bottom - top)}${R(x1 - 1.6, top, 2.4, bottom - top)}${R(x0 - 0.8, bottom - 1.6, w + 1.6, 2.2)}`, fill: P.woodDark }),
    s('path', { d: R(x0 - 0.8, top - 2.6, w + 1.6, 0.8), fill: '#5A544E' }),
    // ombre du soleil sur la face (feuillage)
    s('path', { d: `M${x0 + w * 0.55} ${top}C${x0 + w * 0.7} ${top + 8} ${x0 + w * 0.6} ${top + 18} ${x0 + w * 0.8} ${bottom}H${x1}V${top}Z`, fill: '#6B4420', opacity: 0.16 }),
  );
  // roulettes
  [x0 + 4, x1 - 4].forEach((wx) => box.append(
    s('path', { d: R(wx - 1.6, bottom + 0.6, 3.2, 2.4), fill: '#3C3B39' }),
    s('circle', { cx: wx, cy: bottom + 5, r: 2.6, fill: '#262523' }),
    s('circle', { cx: wx, cy: bottom + 5, r: 0.9, fill: '#77746F' }),
  ));
  G.append(tagG, produce, box);
  return { g: G, produce, tags: tagG, box };
}

/** Ardoise chevalet (vue un peu de biais) : craie blanche et pastel. */
function aFrame() {
  const G = g({ class: 'sf-aframe' });
  G.append(
    s('path', { d: 'M241 404L268 412L262 414L236 405Z', fill: '#4D3D34', opacity: 0.3 }),
    s('path', { d: 'M238 354L247 357L252 405L249 405L243 360Z', fill: '#121211' }),
  );
  const board = g({ class: 'sf-aframe-board' }, [
    s('path', { d: 'M215 352L240 352L247 405L208 405Z', fill: '#1A1A18' }),
    s('path', { d: 'M217.6 355L237.6 355L243.4 401.6L211.6 401.6Z', fill: P.slate }),
    s('text', { x: 227.4, y: 363.6, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 8.4, 'font-weight': 600, fill: P.chalk, text: 'Jus' }),
    s('text', { x: 228, y: 370.4, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 5.2, fill: '#F6B7C3', text: 'pressés minute' }),
    s('text', { x: 228.4, y: 376.6, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 4.4, fill: '#BFE3B6', text: '3 · 5 · 7 fruits' }),
    s('path', { d: 'M219 380.4H238', stroke: P.chalk, 'stroke-width': 0.5, 'stroke-dasharray': '1.4 1.4', opacity: 0.7 }),
    s('text', { x: 229, y: 389, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 7.8, 'font-weight': 600, fill: P.chalk, text: 'Café' }),
    s('text', { x: 229.4, y: 395.4, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 4.4, fill: '#F7DE8E', text: 'de spécialité' }),
  ]);
  G.append(board);
  return G;
}

/** Grille à barreaux (côté droit, devant le passage voisin). */
function sideGate() {
  const G = g({ class: 'sf-gate' });
  G.append(s('path', { d: R(350, 258, 120, 126), fill: '#6E665D' }));
  G.append(s('path', { d: R(350, 258, 120, 126), fill: '#000', opacity: 0.18 }));
  const bars = [];
  for (let x = 352; x < 470; x += 5) bars.push(R(x, 262, 1.8, 112));
  G.append(
    s('path', { d: bars.join(''), fill: P.rail }),
    s('path', { d: bars.map((b, i) => R(352 + i * 5, 262, 0.6, 112)).join(''), fill: '#C8C3BB' }),
    s('path', { d: `${R(350, 260, 120, 2.4)}${R(350, 372, 120, 2.4)}`, fill: P.railDark }),
  );
  return G;
}

/** Foliole orientée (ellipse en deux arcs). */
function leaflet(x, y, rx, ry, a) {
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const deg = f((a * 180) / Math.PI);
  return `M${f(x - c * rx)} ${f(y - sn * rx)}A${f(rx)} ${f(ry)} ${deg} 0 1 ${f(x + c * rx)} ${f(y + sn * rx)}A${f(rx)} ${f(ry)} ${deg} 0 1 ${f(x - c * rx)} ${f(y - sn * rx)}Z`;
}

/** Contour d'une forme effilée (tronc, branche) le long d'une ligne médiane. */
function taperPts(pts, w0, w1) {
  const n = pts.length;
  const L = [];
  const Rr = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const w = lerp(w0, w1, t) / 2;
    const [x, y] = pts[i];
    const [px, py] = pts[Math.max(0, i - 1)];
    const [nx, ny] = pts[Math.min(n - 1, i + 1)];
    let dx = nx - px;
    let dy = ny - py;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    L.push([x - dy * w, y + dx * w]);
    Rr.push([x + dy * w, y - dx * w]);
  }
  return [...L, ...Rr.reverse()];
}

/** Touffe de feuillage : contour festonné (bosses arrondies). */
function cloud(cx, cy, rx, ry, r) {
  const pts = [];
  const N = 34;
  const ph = r() * 6;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = 1 + 0.1 * Math.abs(Math.sin(a * 5 + ph)) + 0.05 * Math.sin(a * 11 + ph * 2);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smooth(pts);
}

/**
 * Arbre de rue (feuillage léger façon févier) : tronc effilé éclairé à gauche, branches, houppier
 * en touffes superposées (ombre, mi-teinte, lumière) et folioles qui retombent sur les bords.
 * Chaque branche se balance (calque intérieur) et prend les rafales (calque extérieur).
 */
function tree(defs, { side, seed, trunk, limbs }) {
  const r = rng(seed);
  const G = g({ class: `sf-tree sf-tree-${side}` });
  G.append(
    s('path', { d: smooth(taperPts(trunk.pts, trunk.w0, trunk.w1)), fill: P.branch }),
    s('path', { d: smooth(taperPts(trunk.pts.map(([x, y]) => [x - trunk.w0 * 0.2, y]), trunk.w0 * 0.32, trunk.w1 * 0.3)), fill: '#97806A', opacity: 0.75 }),
  );
  const branches = [];
  limbs.forEach(({ from, to, w = 3.4, masses }) => {
    const B = g({ class: 'sf-branch' });
    const Bi = g({ class: 'sf-branch-in' });
    [B, Bi].forEach((el) => {
      el.style.transformBox = 'view-box';
      el.style.transformOrigin = `${from[0]}px ${from[1]}px`;
    });
    const mid = [lerp(from[0], to[0], 0.5) + (to[1] - from[1]) * 0.12, lerp(from[1], to[1], 0.5) - Math.abs(to[0] - from[0]) * 0.12];
    Bi.append(s('path', { d: smooth(taperPts([from, mid, to], w, w * 0.35)), fill: P.branch }));
    const leaves = bucket();
    const stems = [];
    masses.forEach(([cx, cy, rx, ry]) => {
      Bi.append(
        s('path', { d: cloud(cx + rx * 0.1, cy + ry * 0.12, rx, ry, r), fill: P.leafDeep }),
        s('path', { d: cloud(cx, cy, rx * 0.9, ry * 0.86, r), fill: P.leafDark }),
        s('path', { d: cloud(cx - rx * 0.12, cy - ry * 0.15, rx * 0.7, ry * 0.64, r), fill: P.leaf }),
        s('path', { d: cloud(cx - rx * 0.3, cy - ry * 0.32, rx * 0.4, ry * 0.34, r), fill: P.leafLight }),
      );
      // feuilles pennées sur le pourtour, qui retombent ; plus claires en haut à gauche
      const m = Math.round((rx + ry) * 0.32);
      for (let j = 0; j < m; j++) {
        const a0 = r() * Math.PI * 2;
        const sx = cx + Math.cos(a0) * rx * 0.86;
        const sy = cy + Math.sin(a0) * ry * 0.86;
        const ang = Math.atan2(Math.sin(a0) + 0.9, Math.cos(a0));
        const Lg = 9 + r() * 7;
        const ex = sx + Math.cos(ang) * Lg;
        const ey = sy + Math.sin(ang) * Lg;
        stems.push(`M${f(sx)} ${f(sy)}L${f(ex)} ${f(ey)}`);
        const lit = -Math.cos(a0) * 0.7 - Math.sin(a0) * 0.9 + (r() - 0.5) * 0.6;
        const tone = lit > 0.7 ? P.leafSun : lit > 0.15 ? P.leafLight : lit > -0.5 ? P.leaf : P.leafDark;
        for (let q = 0; q < 4; q++) {
          const t = (q + 0.8) / 4.4;
          const px = lerp(sx, ex, t);
          const py = lerp(sy, ey, t);
          [-1, 1].forEach((sg) => {
            const la = ang + sg * 1.1;
            leaves.add(tone, leaflet(px + Math.cos(la) * 1.9, py + Math.sin(la) * 1.9, 2.2 - t * 0.5, 0.95, la));
          });
        }
      }
    });
    Bi.append(s('path', { d: stems.join(''), fill: 'none', stroke: '#5E6E33', 'stroke-width': 0.4, opacity: 0.8 }));
    leaves.flush(Bi);
    B.append(Bi);
    G.append(B);
    branches.push({ outer: B, inner: Bi, x: from[0], masses });
  });
  return { g: G, branches };
}

// --- la scène --------------------------------------------------------------------------------
/**
 * @param {{ picks: Array<{id:string,name:string}> }} o produits du mois (bacs et ardoises)
 */
export async function createStorefront({ picks = [] } = {}) {
  await brandFontsReady();
  const r = rng(21);
  const svg = svgRoot('0 0 400 420', { preserveAspectRatio: 'xMidYMax meet', class: 'storefront' });
  svg.style.overflow = 'visible';
  const defs = s('defs');
  svg.append(defs);

  // L'immeuble et la descente d'eau
  const wall = g({ class: 'sf-wall' }, [building(defs, r), downpipe(344, -520, 384)]);
  svg.append(wall);

  // Ruban vert à lettres blanches (derrière le tampon, sur l'étage crème)
  const ribbon = createRibbon({
    d: 'M-300 76 C-140 100 -40 2 90 17 C200 30 250 50 360 36 C470 22 560 -4 700 18',
    width: 36,
    color: BRAND.forest,
    textColor: '#FFFDF5',
    trim: BRAND.cream,
    text: 'CAFÉ LAITUE ✦ PRIMEUR GOURMET ✦ FRUITS & LÉGUMES ✦ BAR À JUS ✦ CAFÉ DE SPÉCIALITÉ ✦ ÉPICERIE FINE ✦ PAIN VIVANT ✦ ',
    fontSize: 14.5,
    letterSpacing: 1.6,
    speed: 22,
  });

  // La devanture
  const first = firstFloor(defs, r);
  const ground = groundFloor(defs, picks);
  const front = g({ class: 'sf-front' }, [ground.g, first]);
  svg.append(front);
  // la descente d'eau passe devant la devanture
  svg.append(downpipe(344, 53, 384));

  // Logo adhésif sur la vitrine + lettrage « Café de spécialité »
  const decal = await createStamp({ disc: false, colors: { forest: '#EFE5CC', sage: '#D9CDB1', cream: '#221B17' } });
  const decalSvg = decal.svg;
  decalSvg.setAttribute('width', 400);
  decalSvg.setAttribute('height', 400);
  const decalG = g({ class: 'sf-decal', transform: 'translate(200.5 291.5) scale(.07)', opacity: 0.9 }, decalSvg);
  svg.append(decalG);
  const letters = [
    ...spacedLetters('CAFÉ DE', { x: 117, y: 349.6, size: 3.9, font: FONT_UI, weight: 700, spacing: 0.6, fill: '#F1E9D6', cls: 'sf-letter fx-box' }),
    ...spacedLetters('SPÉCIALITÉ', { x: 117, y: 355.2, size: 3.9, font: FONT_UI, weight: 700, spacing: 0.45, fill: '#F1E9D6', cls: 'sf-letter fx-box' }),
  ];
  const lettering = g({ class: 'sf-lettering', opacity: 0.9 }, letters);
  svg.append(lettering);
  svg.append(furledParasol());

  // Store banne, et son ombre sur la frise et le haut des vitrines
  const awShadow = s('path', { d: 'M96 236H318V262L96 278Z', fill: lin(defs, [[0, '#1E140F', 0.35], [1, '#1E140F', 0]]), class: 'sf-awshadow' });
  svg.append(awShadow);
  const aw = awning(defs);
  svg.append(aw.g);

  // Côté droit : grille du passage voisin
  svg.append(sideGate());

  // Trottoir, ombres
  svg.append(street(defs, r));
  const shadows = groundShadows(r);
  svg.append(shadows.g);

  // Terrasse de gauche : parasol, tables basses, tabourets
  const pa = parasol();
  // Une cliente boit son latte (terrasse de gauche), un client son jus (mange-debout de droite)
  const guestL = seatedGuest({ skin: '#EDC1A2', hair: 'bun', hairC: '#4A3226', top: '#C8643E', pants: '#2F3E5C', shoes: '#F2EEE6', drink: 'latte', shin: 28 });
  const guestR = seatedGuest({ skin: '#D9A27E', hair: 'short', hairC: '#C99B55', top: '#7FA6C9', pants: '#C9B48C', shoes: '#5A3B2B', drink: 'juice', glasses: true, beard: true, shin: 30 });
  const terraceL = g({ class: 'sf-terrace-l' }, [
    bistroTable(84, 370, 404, 24),
    stool(64, 382, 407),
    stool(100, 385, 409),
    stool(134, 386, 410),
    g({ transform: 'translate(100 384) scale(.86)' }, guestL.g),
    bistroTable(118, 368, 403, 28),
  ]);
  // Terrasse de droite : mange-debout et tabourets hauts
  const terraceR = g({ class: 'sf-terrace-r' }, [
    bistroTable(356, 346, 393, 26, { high: true }),
    bistroTable(396, 348, 395, 26, { high: true }),
    stool(336, 368, 397, { w: 9 }),
    stool(374, 369, 398, { w: 9 }),
    stool(412, 368, 397, { w: 9 }),
    g({ transform: 'translate(374 368) scale(-.86 .86)' }, guestR.g),
  ]);
  svg.append(terraceR, pa.g, terraceL);

  // Les deux bacs de l'étal (produits du mois) + ardoises de prix
  const name = (p) => (p ? p.name.split(' ')[0] : '');
  const pk = (i) => picks[i % Math.max(1, picks.length)] || { id: 'pomme', name: 'Pomme' };
  const binL = bin(198, 258, 346, 384, [
    { id: pk(0).id, x: 0, w: 31, h: 17, k: 0.56 },
    { id: pk(1).id, x: 29, w: 31, h: 17, k: 0.56 },
  ], [{ x: 210, label: name(pk(0)) }, { x: 243, label: name(pk(1)) }], 3);
  const binR = bin(262, 322, 346, 384, [
    { id: pk(2).id, x: 0, w: 31, h: 17, k: 0.56 },
    { id: pk(3).id, x: 29, w: 31, h: 17, k: 0.56 },
  ], [{ x: 276, label: name(pk(2)) }, { x: 309, label: name(pk(3)) }], 8);
  // sac à sachets accroché au bac de droite
  binR.box.append(s('path', { d: R(303, 352, 11, 13), rx: 1.6, fill: '#1D1C1A' }), s('path', { d: R(303, 352, 11, 1.4), fill: '#4A4744' }));
  const bins = g({ class: 'sf-bins' }, [binL.g, binR.g]);
  svg.append(bins);

  // Ardoise sur le trottoir
  const af = aFrame();
  svg.append(af);

  // Le primeur, devant la porte
  const ch = createCharacter({ seed: 9 });
  const chWrap = g({ transform: 'translate(135.3 295.5) scale(.19)', class: 'sf-char' });
  const chInner = g({ class: 'sf-char-inner' });
  chInner.append(
    s('path', { d: 'M70 566C70 556 196 556 206 566C206 572 120 584 70 566Z', fill: '#4D3B32', opacity: 0.3 }),
    s('path', { d: 'M150 566L330 600L300 604L120 572Z', fill: '#4D3B32', opacity: 0.16 }),
    ch.g,
  );
  chWrap.append(chInner);
  svg.append(chWrap);

  // Arbres (devant la façade) : feuillage léger qui encadre la boutique comme sur la photo
  const treeL = tree(defs, {
    side: 'l',
    seed: 31,
    trunk: { pts: [[-8, 424], [-4, 360], [0, 300], [6, 250], [14, 206]], w0: 9, w1: 4.2 },
    limbs: [
      { from: [14, 208], to: [38, 172], masses: [[30, 140, 26, 20], [46, 166, 32, 24], [14, 176, 30, 22]] },
      { from: [4, 256], to: [-18, 232], masses: [[-10, 196, 26, 20], [-20, 228, 32, 26], [6, 214, 24, 20]] },
      { from: [8, 262], to: [34, 254], masses: [[44, 216, 22, 18], [38, 252, 24, 18], [18, 288, 22, 17]] },
    ],
  });
  const treeR = tree(defs, {
    side: 'r',
    seed: 47,
    trunk: { pts: [[452, 424], [448, 350], [440, 290], [428, 240], [414, 200]], w0: 10, w1: 4.6 },
    limbs: [
      { from: [414, 202], to: [384, 140], masses: [[406, 92, 34, 27], [374, 120, 40, 31], [392, 152, 30, 24]] },
      { from: [422, 228], to: [444, 184], masses: [[452, 132, 28, 24], [442, 174, 32, 27], [430, 214, 24, 19]] },
      { from: [404, 176], to: [350, 152], masses: [[354, 86, 28, 23], [328, 114, 24, 20], [342, 150, 27, 22]] },
    ],
  });
  const fallen = g({ class: 'sf-fallen' });
  // La rue : passants, vélo, poussette (devant tout le monde)
  const life = createStreet({ y0: 418 });
  svg.append(life.g, treeR.g, treeL.g, fallen);

  // Lumière : chaleur du soleil couchant sur toute la scène
  svg.append(s('path', { d: R(-500, -520, 1400, 1100), fill: lin(defs, [[0, '#FFE2B0', 0.18], [0.6, '#FFE2B0', 0.05], [1, '#FFE2B0', 0]], { x1: 0, y1: 0, x2: 1, y2: 0.6 }), 'pointer-events': 'none', class: 'sf-sun' }));

  svg.append(ribbon.g);

  // Bulle
  const bubble = g({ class: 'sf-bubble fx-bottom', opacity: 0 });
  const bubbleText = s('text', { x: 160, y: 297, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 11, fill: BRAND.forest, text: 'Bonjour !' });
  const bubblePath = s('path', { fill: BRAND.cream, stroke: BRAND.forest, 'stroke-width': 1.1 });
  bubble.append(bubblePath, bubbleText);
  svg.append(bubble);

  // Tampon (en haut à gauche, sur le ruban)
  const stamp = await createStamp();
  const stampWrap = g({ transform: 'translate(8 6) scale(.345)', class: 'sf-stamp' });
  stampWrap.append(s('circle', { cx: 200, cy: 206, r: 198, fill: '#12432B', opacity: 0.12 }));
  const inner = stamp.svg;
  inner.setAttribute('width', 400);
  inner.setAttribute('height', 400);
  inner.removeAttribute('aria-hidden');
  stampWrap.append(inner);
  svg.append(stampWrap);

  const bulbs = [...ground.bulbs.querySelectorAll('.sf-bulb')];
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
      const at = (n, ms, o = {}) => sfx(n, { ...o, delay: ms });
      at('thunk', 380);
      at('unroll', 760);
      at('clack', 1180);
      bulbs.forEach((b, i) => at('lamp', 1250 + i * 150));
      letters.forEach((L, i) => at('letter', 1500 + i * 45, { i }));
      at('roll', 900, { dur: 0.5 });
      at('tumble', 1560, { n: 8, span: 0.55 });
      at('hop', 1900);
      at('clack', 2050, { v: 0.09 });
      T.push(anim(wall, [{ opacity: 0 }, { opacity: 1 }], { duration: 500 }));
      T.push(anim(first, [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, delay: 150, easing: EASE.snap }));
      T.push(anim(ground.g, [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, delay: 250, easing: EASE.snap }));
      // le store se déroule depuis sa cassette
      aw.canvas.style.transformBox = 'view-box';
      aw.canvas.style.transformOrigin = '200px 217px';
      aw.front.style.transformBox = 'view-box';
      aw.front.style.transformOrigin = '200px 217px';
      T.push(anim(aw.canvas, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1.06)', offset: 0.8 }, { transform: 'scaleY(1)' }], { duration: 650, delay: 780, easing: EASE.out }));
      T.push(anim(aw.front, [{ transform: 'translateY(-22px) scaleY(.3)', opacity: 0 }, { transform: 'translateY(1.5px) scaleY(1)', opacity: 1, offset: 0.8 }, { transform: 'translateY(0) scaleY(1)', opacity: 1 }], { duration: 650, delay: 780, easing: EASE.out }));
      T.push(anim(awShadow, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 1100 }));
      // l'intérieur s'allume
      T.push(anim(ground.glowG, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 700, delay: 1250 }));
      bulbs.forEach((b, i) => T.push(anim(b, [{ fill: '#5A4630' }, { fill: '#FFD07A' }, { fill: '#8A6A40' }, { fill: '#FFD07A' }], { duration: 500, delay: 1250 + i * 150 })));
      T.push(anim(decalG, [{ opacity: 0 }, { opacity: 0.9 }], { duration: 600, delay: 1300 }));
      letters.forEach((L, i) => T.push(anim(L, [
        { opacity: 0, transform: 'translateY(-4px) scale(.4)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ], { duration: 380, delay: 1500 + i * 45, easing: EASE.back })));
      // terrasse, bacs qui arrivent en roulant, produits, ardoises
      T.push(anim(terraceL, [{ opacity: 0, transform: 'translateY(-16px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 500, delay: 500, easing: EASE.back }));
      T.push(anim(terraceR, [{ opacity: 0, transform: 'translateY(-16px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 500, delay: 620, easing: EASE.back }));
      pa.canopy.style.transformBox = 'view-box';
      pa.canopy.style.transformOrigin = '44px 290px';
      T.push(anim(pa.canopy, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { duration: 600, delay: 700, easing: EASE.back }));
      T.push(anim(bins, [{ transform: 'translateX(240px)' }, { transform: 'translateX(-4px)', offset: 0.85 }, { transform: 'translateX(0)' }], { duration: 900, delay: 850, easing: EASE.out }));
      [binL, binR].forEach((b, bi) => {
        b.produce.querySelectorAll('.pz').forEach((p, j) => T.push(anim(p, [
          { transform: 'translateY(-34px) scale(.3)', opacity: 0 },
          { transform: 'translateY(0) scale(1)', opacity: 1 },
        ], { duration: 480, delay: 1550 + bi * 140 + j * 22, easing: EASE.back })));
        b.tags.querySelectorAll('.sf-tag').forEach((t, j) => T.push(anim(t, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 380, delay: 1900 + bi * 120 + j * 80, easing: EASE.back })));
      });
      af.style.transformBox = 'fill-box';
      af.style.transformOrigin = '50% 100%';
      T.push(anim(af, [{ transform: 'scaleY(0) skewX(-20deg)', opacity: 0 }, { transform: 'scaleY(1) skewX(0)', opacity: 1 }], { duration: 650, delay: 1950, easing: EASE.back }));
      T.push(anim(chInner, [{ transform: 'translateY(160px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 800, delay: 1700, easing: EASE.snap }));
      [treeL, treeR].forEach((t, ti) => T.push(anim(t.g, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, delay: 250 + ti * 100 })));
      [treeL, treeR].forEach((t, ti) => t.branches.forEach((b, i) => T.push(anim(b.inner, [
        { transform: 'scale(.2)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ], { duration: 700, delay: 300 + ti * 100 + i * 40, easing: EASE.back }))));
      T.push(ribbon.drawIn({ delay: 300 }));
      await Promise.all(T.map((a) => settle(a)));
      playing = false;
      await wait(150);
      api.greet('Bonjour !');
    },
    async greet(text) {
      bubbleText.textContent = text;
      const len = Math.max(54, Math.min(140, text.length * 5.4 + 16));
      const cx = 160;
      const y = 272;
      bubblePath.setAttribute('d', `M${cx - len / 2} ${y} h${len} a7 7 0 0 1 7 7 v9 a7 7 0 0 1 -7 7 h-${len / 2 - 5} l-6 7 l-1 -7 h-${len / 2 - 6} a7 7 0 0 1 -7 -7 v-9 a7 7 0 0 1 7 -7 Z`);
      bubbleText.setAttribute('y', y + 12);
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
      // le feuillage se balance, les ombres au sol bougent avec lui
      const allBranches = [...treeL.branches, ...treeR.branches];
      allBranches.forEach((b, i) => ambient.add(anim(b.inner, [{ transform: 'rotate(-1.2deg)' }, { transform: 'rotate(1.4deg)' }], {
        duration: 2600 + (i % 5) * 380, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none', delay: -i * 230,
      })));
      // Petit cycle de vent : une rafale traverse la rue de gauche à droite, les arbres plient,
      // le lambrequin et le parasol frémissent, quelques folioles se détachent et tombent
      const leafTones = [P.leafSun, P.leafLight, P.leaf, '#C9B55A'];
      const dropLeaf = (x, y, delay) => {
        const L = s('path', { d: leaflet(0, 0, 2.6, 1.15, 0), fill: leafTones[Math.floor(Math.random() * leafTones.length)] });
        const W = g({}, L);
        fallen.append(W);
        const dx = 40 + Math.random() * 70;
        const fall = 418 - y - Math.random() * 10;
        const kf = [];
        for (let k = 0; k <= 6; k++) {
          const t = k / 6;
          kf.push({ transform: `translate(${f(x + dx * t + Math.sin(t * 9) * 8)}px, ${f(y + fall * t)}px) rotate(${f(t * 540 * (Math.random() > 0.5 ? 1 : -1))}deg)`, opacity: k === 6 ? 0 : 1, offset: t });
        }
        const A = animate(W, kf, { duration: 3200 + Math.random() * 1200, delay, easing: 'linear', fill: 'both' });
        A?.finished.then(() => W.remove()).catch(() => W.remove());
        if (!A) W.remove();
      };
      const gust = () => {
        if (isReduced()) return;
        allBranches.forEach((b) => {
          const d = Math.max(0, (b.x + 40) * 1.4);
          animate(b.outer, [
            { transform: 'rotate(0deg)' },
            { transform: `rotate(${b.x < 200 ? 3.4 : 2.6}deg)`, offset: 0.3 },
            { transform: 'rotate(-1.4deg)', offset: 0.62 },
            { transform: 'rotate(0.6deg)', offset: 0.82 },
            { transform: 'rotate(0deg)' },
          ], { duration: 2200, delay: d, easing: 'ease-in-out', fill: 'none' });
        });
        animate(aw.front, [{ transform: 'skewX(0deg)' }, { transform: 'skewX(2.4deg)', offset: 0.3 }, { transform: 'skewX(-1.2deg)', offset: 0.6 }, { transform: 'skewX(0deg)' }], { duration: 1500, delay: 260, easing: 'ease-in-out', fill: 'none' });
        animate(pa.canopy, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-2.2deg)', offset: 0.3 }, { transform: 'rotate(1deg)', offset: 0.65 }, { transform: 'rotate(0deg)' }], { duration: 1700, delay: 120, easing: 'ease-in-out', fill: 'none' });
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const t = [treeL, treeR][Math.random() < 0.5 ? 0 : 1];
          const b = t.branches[Math.floor(Math.random() * t.branches.length)];
          const [cx, cy, rx, ry] = b.masses[Math.floor(Math.random() * b.masses.length)];
          dropLeaf(cx + (Math.random() - 0.5) * rx, cy + ry * 0.6, i * 260 + Math.random() * 200);
        }
      };
      ambient.every(7600, gust, 3400);
      // gorgées en terrasse
      ambient.every(5200, () => !isReduced() && (Math.random() < 0.5 ? guestL : guestR).sip(animate), 2600);
      // passants, vélo, poussette
      ambient.addTicker(ticker((dt) => life.tick(Math.min(dt, 0.1))));
      ambient.add(anim(shadows.dapple, [{ transform: 'translateX(-1.5px)' }, { transform: 'translateX(2px)' }], {
        duration: 3100, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none',
      }));
      aw.front.style.transformBox = 'view-box';
      aw.front.style.transformOrigin = '254px 238px';
      ambient.add(anim(aw.front.querySelector('path'), [{ transform: 'skewX(0deg)' }, { transform: 'skewX(1.2deg)' }], {
        duration: 2400, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none',
      }));
      ambient.add(anim(ground.glowG, [{ opacity: 0.85 }, { opacity: 1 }], {
        duration: 1900, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none',
      }));
    },
  };
  return api;
}
