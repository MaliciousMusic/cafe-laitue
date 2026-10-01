// La vie de la rue devant la boutique, dessinée avec le même soin que Vincent : des passants de
// profil, articulés (hanche, genou, cheville, épaule, coude) ; la marche est calculée pied par
// pied (le pied posé reste collé au trottoir, l'autre passe devant), le corps monte et descend
// au rythme des pas, les bras balancent, la queue-de-cheval et la jupe suivent. Une cycliste
// pédale (panier de légumes), une maman pousse sa poussette ; en terrasse, deux clients boivent
// un latte et un jus pressé.
// Repère : tout est dessiné de profil, tourné vers la droite (+x), pieds en y = 0, une silhouette
// fait ~390 de haut ; la rue l'affiche au quart (UNIT). Un passant qui va vers la gauche est
// retourné en miroir.

import { s, g, uid } from '../lib/svg.js';

const f = (n) => Math.round(n * 10) / 10;
const deg = (r) => (r * 180) / Math.PI;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

/** Les passants sont dessinés quatre fois plus grands que la scène. */
export const UNIT = 0.25;

// ---------------------------------------------------------------- couleurs
const rgb = (c) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
function mixHex(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
const DARK = '#1B1611';
/** Une couleur et ses nuances : lumière, ombre, ombre profonde. */
function tone(c) {
  return { base: c, light: mixHex(c, '#FFFFFF', 0.22), shade: mixHex(c, DARK, 0.2), deep: mixHex(c, DARK, 0.4) };
}
/** Le côté éloigné (jambe et bras de derrière) est un peu dans l'ombre. */
const far = (T) => ({ ...T, base: T.shade, light: T.base, shade: T.deep, deep: mixHex(T.deep, DARK, 0.3) });

const SKINS = {
  fair: { base: '#F3D5C0', light: '#FAE6D8', shade: '#E1B79E', deep: '#C49479', blush: '#EE9A88', lip: '#CD776D' },
  peach: { base: '#ECC3A5', light: '#F7D9C3', shade: '#D8A686', deep: '#B9846A', blush: '#E68C78', lip: '#BF655A' },
  tan: { base: '#D9A47F', light: '#E9BE9E', shade: '#C38966', deep: '#A06A4C', blush: '#D57E6A', lip: '#A2594B' },
  brown: { base: '#A9704C', light: '#BF8963', shade: '#915B3B', deep: '#72442A', blush: '#B4644D', lip: '#7E4135' },
  deep: { base: '#7C4C33', light: '#946243', shade: '#673D28', deep: '#4D2B1B', blush: '#8F4A38', lip: '#5A2C23' },
};

function grad(defs, stops, { x1 = 0, y1 = 0, x2 = 1, y2 = 0, user = false } = {}) {
  const id = uid('pbg');
  defs.append(s('linearGradient', { id, x1, y1, x2, y2, gradientUnits: user ? 'userSpaceOnUse' : null }, stops.map(([o, c, op = 1]) => s('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }))));
  return `url(#${id})`;
}
const P = (d, fill, more = {}) => s('path', { d, fill, ...more });
const L = (d, stroke, w = 1, more = {}) => s('path', { d, fill: 'none', stroke, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...more });

// ---------------------------------------------------------------- squelette
function place(G, x, y, a) {
  G.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(a)})`);
}
/** Angle (pour rotate) qui fait pointer vers (dx, dy) un segment dessiné vers le bas. */
const aim = (dx, dy) => deg(Math.atan2(-dx, dy));
/** Deux segments : position de l'articulation du milieu (bend +1 : pliée vers l'avant). */
function ik(ax, ay, tx, ty, l1, l2, bend = 1) {
  let dx = tx - ax;
  let dy = ty - ay;
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.05;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  }
  d = Math.max(d, Math.abs(l1 - l2) + 0.05);
  const base = Math.atan2(dy, dx);
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ang = base - bend * a;
  return { kx: ax + Math.cos(ang) * l1, ky: ay + Math.sin(ang) * l1, ex: ax + dx, ey: ay + dy };
}

/** Membre vers le bas depuis son attache : largeurs w0 → w1, renflements avant (fb) / arrière (bb). */
function tube(len, w0, w1, { fb = 0, bb = 0, top = 0.75, bottom = 1 } = {}) {
  const a = w0 / 2;
  const b = w1 / 2;
  return `M${f(-a)} 0C${f(-a - bb)} ${f(len * 0.33)} ${f(-b - bb * 0.7)} ${f(len * 0.72)} ${f(-b)} ${f(len)}`
    + `A${f(b)} ${f(b * bottom)} 0 0 0 ${f(b)} ${f(len)}`
    + `C${f(b + fb * 0.7)} ${f(len * 0.72)} ${f(a + fb)} ${f(len * 0.33)} ${f(a)} 0`
    + `A${f(a)} ${f(a * top)} 0 0 0 ${f(-a)} 0Z`;
}

// Proportions communes (adulte)
const BODY = { ankle: 14, shin: 92, thigh: 94, upper: 64, fore: 58, shoulder: [5, -100], neck: [9, -117], head: 1.16 };

// ---------------------------------------------------------------- jambes et chaussures
/**
 * Une jambe : cuisse, tibia, pied (groupes placés à chaque image).
 * `legs` : { kind: 'jeans' | 'chino' | 'slim' | 'bare' | 'cord', color, cuff, sock, skin }
 */
function leg(defs, cfg, isFar) {
  const { legs, shoes, skin } = cfg;
  const T = isFar ? far(tone(legs.color || skin.base)) : tone(legs.color || skin.base);
  const S = isFar ? far(skin) : skin;
  const thigh = g({ class: 'pb-thigh' });
  const shin = g({ class: 'pb-shin' });
  const foot = g({ class: 'pb-foot' });
  const bare = legs.kind === 'bare';
  const C = bare ? S : T;
  const fill = grad(defs, [[0, C.shade], [0.45, C.base], [1, C.light]]);
  // cuisse
  thigh.append(P(tube(BODY.thigh + 2, bare ? 34 : 41, bare ? 21 : 25, { fb: 3, bb: 3, bottom: 0.62 }), fill));
  if (!bare) {
    thigh.append(
      P(`M-20 0C-22 30 -18 66 -13.5 ${BODY.thigh + 4}L-9 ${BODY.thigh + 4}C-12 64 -15 30 -13 0Z`, C.shade, { opacity: 0.55 }),
      L(`M2 4C2.6 36 1.6 70 0.6 ${BODY.thigh}`, C.deep, 1, { opacity: 0.45 }),
    );
    if (legs.kind === 'jeans') {
      thigh.append(L(`M3.4 6C4 38 3 70 2 ${BODY.thigh - 2}`, legs.stitch || '#D1A35C', 0.7, { 'stroke-dasharray': '2 1.6', opacity: 0.85 }));
      if (!isFar) thigh.append(L('M20 3C13 6 8.6 12 7.6 21', C.deep, 1.1, { opacity: 0.6 }), L('M20 6.4C14.6 8.6 11.2 13 10.4 20', legs.stitch || '#D1A35C', 0.6, { 'stroke-dasharray': '1.8 1.4' }));
    }
    if (legs.kind === 'chino' || legs.kind === 'slim') thigh.append(L(`M12 10C11.6 40 9.6 70 8 ${BODY.thigh}`, C.light, 1.2, { opacity: 0.5 }));
    if (legs.kind === 'cord') {
      for (let x = -14; x <= 16; x += 3.4) thigh.append(L(`M${f(x)} 4C${f(x * 0.98)} 40 ${f(x * 0.82)} 70 ${f(x * 0.68)} ${BODY.thigh}`, C.shade, 0.7, { opacity: 0.35 }));
    }
  } else {
    // genou et rotule (jambes nues)
    thigh.append(P(`M-17 4C-19 34 -15 64 -11 ${BODY.thigh}L-7 ${BODY.thigh}C-10 64 -13 34 -12 4Z`, S.shade, { opacity: 0.5 }));
  }
  // tibia
  const shinW0 = bare ? 22 : 27;
  const shinW1 = bare ? 14 : legs.kind === 'slim' ? 17 : 22;
  shin.append(P(tube(BODY.shin + 2, shinW0, shinW1, { fb: bare ? 0.6 : 0.4, bb: bare ? 5 : 1.5 }), fill));
  if (bare) {
    shin.append(P(`M-11 6C-17 26 -13 52 -8 ${BODY.shin}L-4 ${BODY.shin}C-9 52 -11 26 -6 6Z`, S.shade, { opacity: 0.5 }), L('M7 8C8 34 6 64 5 88', S.light, 1.6, { opacity: 0.55 }));
  } else {
    shin.append(
      P(`M-13.5 0C-14 30 -12 66 -11 ${BODY.shin}L-7 ${BODY.shin}C-8.4 66 -9.6 30 -9 0Z`, C.shade, { opacity: 0.5 }),
      L(`M1 0C1.4 30 1 64 0.4 ${BODY.shin}`, C.deep, 1, { opacity: 0.4 }),
    );
    if (legs.kind === 'jeans') shin.append(L(`M2.6 0C3 30 2.6 64 2 ${BODY.shin - 10}`, legs.stitch || '#D1A35C', 0.7, { 'stroke-dasharray': '2 1.6', opacity: 0.85 }));
    if (legs.kind === 'chino' || legs.kind === 'slim') shin.append(L(`M8 0C8.4 30 7.6 64 6.6 ${BODY.shin - 4}`, C.light, 1.2, { opacity: 0.45 }));
    if (legs.kind === 'cord') for (let x = -10; x <= 10; x += 3.4) shin.append(L(`M${f(x)} 2V${BODY.shin - 2}`, C.shade, 0.7, { opacity: 0.35 }));
    if (legs.cuff) {
      // revers retroussé (envers plus clair), cheville nue ou chaussette au-dessus de la chaussure
      const y0 = BODY.shin - 13;
      shin.append(
        P(`M${f(-shinW1 / 2 - 1.6)} ${y0}H${f(shinW1 / 2 + 1.6)}L${f(shinW1 / 2 + 1.2)} ${y0 + 11}H${f(-shinW1 / 2 - 1.2)}Z`, mixHex(C.light, '#FFFFFF', 0.15)),
        L(`M${f(-shinW1 / 2 - 1.6)} ${y0 + 0.6}H${f(shinW1 / 2 + 1.6)}`, C.deep, 0.9, { opacity: 0.6 }),
        L(`M${f(-shinW1 / 2)} ${y0 + 5.6}H${f(shinW1 / 2)}`, legs.stitch || C.shade, 0.6, { 'stroke-dasharray': '1.8 1.4', opacity: 0.8 }),
      );
    }
  }
  if (legs.sock || (legs.cuff && legs.ankle !== false)) {
    const c = legs.sock || S.base;
    shin.append(P(`M-7.6 ${BODY.shin - 2}H7.6V${BODY.shin + 7}H-7.6Z`, isFar ? mixHex(c, DARK, 0.2) : c));
  }
  // plis derrière le genou (visibles quand la jambe plie)
  const folds = L('M-11 -3C-6 -1 -3 2 -2 6M-12 6C-8 7 -6 9 -5 12', C.deep, 1.1, { opacity: 0 });
  if (!bare) shin.append(folds);
  // chaussure
  foot.append(shoe(defs, shoes, isFar));
  return { thigh, shin, foot, folds: bare ? null : folds };
}

/** Chaussure dans le repère de la cheville (semelle en y = 14, pointe vers +x). */
function shoe(defs, sh, isFar) {
  const G = g({ class: 'pb-shoe' });
  const T = isFar ? far(tone(sh.color)) : tone(sh.color);
  const sole = isFar ? mixHex(sh.sole || '#EDE8DE', DARK, 0.18) : sh.sole || '#EDE8DE';
  const accent = isFar ? mixHex(sh.accent || T.shade, DARK, 0.2) : sh.accent || T.shade;
  if (sh.kind === 'sneaker') {
    G.append(
      P('M-10 -4C-12 2 -12 7 -10.5 9.5L31 9.5C35.6 9.5 36.2 5 32.6 2.6C27 -1 19 -3.2 12.4 -5.4C8.4 -7.8 4 -10.6 -1 -10.6C-5.2 -10.6 -8.6 -8.4 -10 -4Z', grad(defs, [[0, T.base], [1, T.shade]], { x2: 0, y2: 1 })),
      P('M-11 -5C-12.4 -1 -12.2 3 -11 6.4L-7 6.4C-7.6 2.4 -7.6 -1.6 -6.6 -5.6Z', accent),
      L('M1 5C9 3 17 0.4 24 -2.6', accent, 2.2, { opacity: 0.9 }),
      L('M-8.6 -6.4C-5 -9.2 0 -10 4.4 -8.2', T.deep, 1.1),
      L('M5 -7.4l2.6 3.4M8.4 -6.4l2.4 3.2M11.8 -5.2l2.2 3M15.2 -4l2 2.8', T.deep, 0.9, { opacity: 0.7 }),
      L('M23 9C24.4 4.6 28 2.4 33 3.2', T.shade, 0.9, { opacity: 0.8 }),
      P('M-11.6 9L33 9C36.6 9 37.6 12 35.6 14.4C34.6 15.4 33 15.6 32 15.6L-9.6 15.6C-12.2 15.6 -12.6 11 -11.6 9Z', sole),
      L('M-11.4 12.2H35.6', mixHex(sole, DARK, 0.25), 0.8, { opacity: 0.6 }),
    );
  } else if (sh.kind === 'boot') {
    G.append(
      P('M-11 -27H8C9 -16 10.4 -9.4 13.4 -6.6C21 -3.4 29 -0.4 33 3.4C35 6.4 34 10 31 10L-10.6 10C-12.4 3 -12.2 -12 -11 -27Z', grad(defs, [[0, T.light], [0.5, T.base], [1, T.shade]], { x2: 1, y2: 0.4 })),
      P('M-4 -27H3.4C3.8 -18 3.6 -11 2.4 -6.4H-5.2C-4.2 -12 -4 -19 -4 -27Z', T.deep, { opacity: 0.55 }),
      P('M-11 -30.6H-6.4V-26H-11Z', T.deep),
      L('M14 -4C20 -1.6 26 0.6 30 3', T.light, 1.4, { opacity: 0.55 }),
      P('M-11 9.4H33C34.6 9.4 35 12 33.4 13.6L-9 14C-11 14 -11.8 11 -11 9.4Z', isFar ? '#1E1712' : '#2A2019'),
      P('M-11 9.4H-1V15.6H-10Z', isFar ? '#17110D' : '#1F1812'),
    );
  } else {
    // chaussure de ville en cuir (ou ballerine si `flat`)
    const flat = sh.kind === 'flat';
    G.append(
      P(flat
        ? 'M-10 2C-11.4 6 -11 8.4 -10 10L31 10C35 10 35.4 7 32.4 5C27 2.6 20 1.6 13 1.2C6 0.8 -2 1 -10 2Z'
        : 'M-10 -3C-12 3 -11.6 8 -10.6 10L32 10C36 10 36.6 6 33 3.2C27 -0.8 19.4 -2.6 13.4 -4.4C9.4 -5.8 5 -7.8 0 -7.8C-5 -7.8 -8.6 -6.4 -10 -3Z',
      grad(defs, [[0, T.light], [0.55, T.base], [1, T.shade]], { x2: 0.3, y2: 1 })),
      L(flat ? 'M2 2C10 1.6 18 2.2 24 3.6' : 'M14 -2.4C20 -0.8 26 1.4 30 4', T.light, 1.3, { opacity: 0.6 }),
      flat ? L('M8 2.2C10 0 13 0 14 2', T.deep, 0.9) : L('M-6 -6.6C-1 -7.6 4 -6.8 7.6 -4.4', T.deep, 0.9, { opacity: 0.7 }),
      sh.brogue ? L('M18 1C20 -0.6 23 -0.4 25 1.6M19 3.4l.1 0M21.4 3.6l.1 0M23.8 4.2l.1 0', T.deep, 0.9, { opacity: 0.6 }) : null,
      P('M-10.8 9.4H33.4C35 9.4 35.2 11.6 33.8 12.6L-9.4 12.8C-11 12.8 -11.6 10.6 -10.8 9.4Z', isFar ? '#1C1510' : '#2B211A'),
      flat ? null : P('M-10.8 9.6H-1.6V14.6H-9.8Z', isFar ? '#17110D' : '#211913'),
    );
  }
  return G;
}

// ---------------------------------------------------------------- bras et mains
/** Main de profil, détendue, doigts un peu repliés (repère du poignet, vers le bas). */
function hand(S, { grip = false } = {}) {
  return g({ class: 'pb-hand' }, [
    P(grip
      ? 'M-6.4 -1C-8 6 -7.6 12 -5.6 16.4C-3.2 20.6 2.6 21.6 6.4 19.4C8.8 18 9.4 14.6 8.6 11.6C9.4 7.4 8.8 2.6 7 -1.6Z'
      : 'M-6.2 -1.4C-7.6 6 -7.4 13 -5.4 18C-3.6 22.6 1.4 25.6 5.4 24.2C8 23.2 8.8 20.2 7.8 17.4C9 12.4 8.8 5.4 6.8 -1.6Z', S.base),
    P(grip ? 'M-6.4 -1C-8 6 -7.6 12 -5.6 16.4C-4.2 18.8 -2 20.2 0.4 20.6C-2.6 15 -3 7 -2.6 -1.4Z' : 'M-6.2 -1.4C-7.6 6 -7.4 13 -5.4 18C-4.4 20.6 -2.4 22.6 -0.2 23.6C-3 17 -3.2 8 -2.6 -1.6Z', S.shade, { opacity: 0.7 }),
    P(grip ? 'M6 2.4C10.6 4.4 12.4 8.6 11 12.6C10.2 14.4 8.2 14.4 7.6 12.6C7.6 9.4 6.8 6.4 5.4 4.4Z' : 'M6.2 2.6C10.4 5.4 12.2 10.6 10.4 14.6C9.4 16.4 7.4 16 7.2 14.2C7.4 10.6 6.6 7.4 5.2 5Z', S.light),
    L(grip ? 'M-3.4 13.6C-1 16 2.4 16.6 5 15.4M-4 9C-1.6 11.4 1.8 12 4.4 11' : 'M-3.4 17.6C-1.2 20.6 2 21.6 4.6 20.6M-4.2 12.6C-2 15.4 1.4 16.4 4 15.6', S.deep, 0.8, { opacity: 0.55 }),
  ]);
}

/**
 * Un bras : haut (manche), avant-bras, main. `sleeve` : 'long' | 'short' | 'rolled' ;
 * `cuff` : couleur du poignet tricoté ; renvoie les groupes à placer.
 */
function arm(defs, cfg, isFar) {
  const { top, skin } = cfg;
  const T = isFar ? far(tone(top.color)) : tone(top.color);
  const S = isFar ? far(skin) : skin;
  const upper = g({ class: 'pb-upper' });
  const fore = g({ class: 'pb-fore' });
  const sleeveFill = grad(defs, [[0, T.shade], [0.5, T.base], [1, T.light]]);
  const skinFill = grad(defs, [[0, S.shade], [0.55, S.base], [1, S.light]]);
  const sleeve = top.sleeve || 'long';
  if (sleeve === 'short') {
    upper.append(P(tube(BODY.upper, 18, 14, { fb: 1, bb: 1.4 }), skinFill));
    upper.append(P('M-12.4 -4C-14.6 8 -14 20 -12 30C-4 33.4 6 33 12.6 29.4C13.6 18 13.6 8 12 -4C4 -9 -4 -9 -12.4 -4Z', sleeveFill));
    upper.append(L('M-12 29C-4 32.6 6 32.2 12.4 28.8', T.deep, 1, { opacity: 0.5 }), L('M-6 6C-4 14 -4 22 -5 28', T.shade, 1, { opacity: 0.5 }));
    fore.append(P(tube(BODY.fore + 2, 15, 11.4, { fb: 1.4, bb: 1.4 }), skinFill), L('M4.6 6C5.4 24 4.6 40 3.4 52', S.light, 1.6, { opacity: 0.5 }));
  } else {
    upper.append(P(tube(BODY.upper + 4, 23, 18.6, { fb: 1.2, bb: 2 }), sleeveFill));
    upper.append(
      P(`M-11.6 6C-13.6 26 -12.4 48 -9.6 ${BODY.upper}L-5.4 ${BODY.upper}C-8 48 -8.6 26 -7 6Z`, T.shade, { opacity: 0.6 }),
      L('M-9 -2C-2 2 4 2 10 -2', T.deep, 1, { opacity: 0.4 }),
    );
    if (top.knit) upper.append(L(`M2 6C2.4 26 2 46 1 ${BODY.upper - 4}M-4 8C-3.6 28 -4 46 -4.6 ${BODY.upper - 4}`, T.shade, 1, { opacity: 0.4, 'stroke-dasharray': '3 2' }));
    if (top.stripe) {
      const st = (len, w0, w1) => {
        let d = '';
        for (let y = 6; y < len - 4; y += 7.4) {
          const hw = (w0 + (w1 - w0) * (y / len)) / 2 + 0.6;
          d += `M${f(-hw)} ${f(y)}Q0 ${f(y + 1.6)} ${f(hw)} ${f(y)}`;
        }
        return d;
      };
      const SC = isFar ? mixHex(top.stripe, DARK, 0.2) : top.stripe;
      upper.append(L(st(BODY.upper + 4, 23, 18.6), SC, 3.2, { opacity: 0.9, 'stroke-linecap': 'butt' }));
      upper.stripes = L(st(BODY.fore - 10, 19, 15.4), SC, 3, { opacity: 0.9, 'stroke-linecap': 'butt' });
    }
    if (sleeve === 'rolled') {
      fore.append(P(tube(BODY.fore + 2, 15.4, 11.6, { fb: 1.4, bb: 1.4 }), skinFill), L('M4.6 22C5.2 34 4.6 44 3.6 52', S.light, 1.6, { opacity: 0.5 }));
      fore.append(P('M-10.4 -4C-11 4 -10.6 10 -9.6 15H9.8C10.6 9 10.8 3 10.4 -4Z', mixHex(T.light, '#FFFFFF', 0.1)), L('M-9.8 9.6H10.2', T.shade, 0.9, { opacity: 0.7 }));
    } else {
      fore.append(P(tube(BODY.fore - 2, 19, 15.4, { fb: 1, bb: 1.4 }), sleeveFill));
      if (upper.stripes) fore.append(upper.stripes);
      fore.append(P(`M-9.4 2C-10.4 22 -9.6 40 -7.6 ${BODY.fore - 6}L-4 ${BODY.fore - 6}C-6 40 -6.4 22 -5.4 2Z`, T.shade, { opacity: 0.55 }));
      fore.append(L('M-8 6C-3 9 3 9 8 6', T.deep, 1, { opacity: 0.35 }));
      // poignet (bord-côte du pull, ou revers de la manche)
      const cuff = top.cuff || T.shade;
      fore.append(P(`M-8.4 ${BODY.fore - 10}H8.4L8 ${BODY.fore}H-8Z`, isFar ? mixHex(cuff, DARK, 0.2) : cuff));
      if (top.knit) fore.append(L(`M-5.6 ${BODY.fore - 9}V${BODY.fore - 1}M-2.8 ${BODY.fore - 9}V${BODY.fore - 1}M0 ${BODY.fore - 9}V${BODY.fore - 1}M2.8 ${BODY.fore - 9}V${BODY.fore - 1}M5.6 ${BODY.fore - 9}V${BODY.fore - 1}`, T.deep, 0.7, { opacity: 0.35 }));
    }
  }
  const handG = g({ transform: `translate(0 ${BODY.fore - 1})` }, hand(S, { grip: cfg.grip && !isFar }));
  fore.append(handG);
  return { upper, fore, hand: handG };
}

// ---------------------------------------------------------------- têtes (profil)
// Repère de la tête : origine au sommet du cou, visage vers +x, sommet du crâne vers y = -61.
const FACE = {
  // visage féminin, nez fin
  soft: 'M6 -62C17 -62 26 -55 28.4 -45C29.2 -41.6 29.8 -39 30 -37.4C29.2 -36 28.8 -34.8 29 -33.4C30.4 -29.6 33.6 -25.2 36 -22.4C37.2 -21 37.4 -19.4 36.2 -18.8C35 -18.2 33.6 -18.4 32.2 -18.2C31.4 -17.2 31.6 -16 32.4 -15C33 -14.2 32.8 -13.4 31.8 -13C32.8 -12.4 33 -11.2 32.4 -10.2C31.8 -9.4 30.6 -8.8 29.8 -8.4C30.8 -6.8 31 -4.2 29.8 -2C28.4 0.4 25 1.6 21 1.4C14.6 1 8.4 -2 3 -6.4C-2 -9.4 -8 -12.4 -13 -16.4C-22 -23.4 -27 -34.4 -25 -45.4C-23 -56.4 -12 -62 6 -62Z',
  // visage masculin : arcade, nez et menton plus marqués
  strong: 'M6 -62C18 -62 27 -55 29 -45C29.8 -41.4 30.8 -39.2 31.6 -37.8C30.4 -36.2 29.8 -34.8 30 -33.2C31.6 -29.2 35.2 -24.6 37.8 -21.4C38.8 -20 38.6 -18.2 37 -17.8C35.6 -17.4 34.2 -17.6 32.8 -17.2C32 -16.2 32.2 -15 33 -14C33.4 -13.2 33.2 -12.6 32.2 -12.2C33 -11.6 33 -10.6 32.4 -9.8C31.8 -9.2 30.8 -8.8 30.2 -8.4C31.6 -6.6 32 -3.2 31 -0.4C30 2.4 26 3.6 20.6 3.2C14 2.6 8 -1 3 -6C-2 -9.4 -8 -12.4 -13 -16.4C-22 -23.4 -27 -34.4 -25 -45.4C-23 -56.4 -12 -62 6 -62Z',
};

/**
 * Tête de profil. `hair` : { style: 'pony' | 'bun' | 'bob' | 'afro' | 'short' | 'crop', color }.
 * Accessoires : glasses, beard, cap, helmet, earring, band (bandeau).
 */
function head(defs, cfg) {
  const H = g({ class: 'pb-head' });
  const S = cfg.skin;
  const hair = cfg.hair || { style: 'short', color: '#2A1E17' };
  const HT = tone(hair.color);
  const faceD = FACE[cfg.face || 'soft'];
  const back = g({ class: 'pb-hair-back' });
  const front = g({ class: 'pb-hair-front' });
  const swing = g({ class: 'pb-hair-swing' });
  // cheveux derrière la tête (queue-de-cheval, chignon, volume)
  if (hair.style === 'pony') {
    swing.append(
      P('M-20 -46C-31 -44 -38 -34 -38 -18C-38 -4 -33 10 -27 18C-30 6 -30 -6 -27 -16C-24 -26 -20 -34 -14 -40Z', HT.base),
      P('M-24 -38C-32 -30 -33 -14 -29 4', 'none', { stroke: HT.light, 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.7 }),
      L('M-20 -36C-27 -26 -28 -12 -26 0', HT.deep, 1, { opacity: 0.5 }),
    );
    [...swing.children].forEach((c) => c.setAttribute('transform', 'translate(17 46)'));
    swing.setAttribute('transform', 'translate(-17 -46)');
    back.append(swing);
  }
  if (hair.style === 'bun') {
    back.append(
      P('M-26 -52a11 10 0 1 1 0.1 0Z', HT.base),
      L('M-35 -55C-31 -60 -24 -61 -19 -57M-35 -50C-30 -54 -23 -54 -18 -51', HT.light, 1.2, { opacity: 0.7 }),
    );
  }
  if (hair.style === 'afro') {
    // une masse de boucles autour du crâne, des petites boucles plus claires dedans
    const cx = -6;
    const cy = -38;
    const blobs = [];
    for (let i = 0; i <= 16; i++) {
      const a = ((22 + (i / 16) * 228) * Math.PI) / 180;
      const r = 10.5 + (i % 3) * 1.4;
      blobs.push(s('circle', { cx: f(cx + Math.cos(a) * 33), cy: f(cy - Math.sin(a) * 30), r: f(r), fill: HT.base }));
    }
    back.append(s('ellipse', { cx, cy, rx: 34, ry: 31, fill: HT.base }), ...blobs);
    const curls = [];
    for (let i = 0; i < 26; i++) {
      const a = ((30 + ((i * 47) % 220)) * Math.PI) / 180;
      const rr = 14 + ((i * 13) % 22);
      const x = cx + Math.cos(a) * rr;
      const y = cy - Math.sin(a) * rr * 0.92;
      curls.push(`M${f(x - 2.6)} ${f(y)}a2.6 2.6 0 0 1 5 -0.6`);
    }
    back.append(L(curls.join(''), HT.light, 1.1, { opacity: 0.55 }));
  }
  H.append(back);
  // visage
  H.append(P(faceD, grad(defs, [[0, S.shade], [0.55, S.base], [1, S.light]])));
  // modelé : joue, ombre sous la mâchoire, tempe
  H.append(
    P('M3 -6C8 -2 14 0.6 20 1.2C17 -2 14 -4 10 -5Z', S.deep, { opacity: 0.35 }),
    s('ellipse', { cx: 19, cy: -19.4, rx: 5.6, ry: 3.6, fill: S.blush, opacity: 0.35 }),
    s('ellipse', { cx: 19, cy: -46, rx: 7, ry: 4, fill: S.light, opacity: 0.45 }),
  );
  // oreille
  H.append(
    P('M4 -36C0 -38.4 -4.4 -34.6 -4.4 -28.4C-4.4 -22.6 -1.2 -19.6 2 -20.6C3.4 -24 3.6 -30.4 4 -36Z', S.shade),
    L('M1.8 -32.4C-0.8 -32.4 -2.2 -29.2 -1.8 -26.2C-1.4 -24.2 -0.2 -23.2 1 -23.6', S.deep, 0.9),
  );
  if (cfg.earring) H.append(s('circle', { cx: 0.8, cy: -18, r: cfg.earring === 'hoop' ? 3.4 : 1.4, fill: cfg.earring === 'hoop' ? 'none' : '#E3B94E', stroke: cfg.earring === 'hoop' ? '#E3B94E' : 'none', 'stroke-width': 1.2 }));
  // œil (en amande, iris tourné vers l'avant), sourcil, narine, bouche
  const strong = cfg.face === 'strong';
  H.append(
    P('M18.4 -33.2C20.4 -34.8 22.8 -34.8 24.6 -33.2C23.2 -31.8 20.8 -31.6 18.4 -33.2Z', '#FBF6EF'),
    s('ellipse', { cx: 22.4, cy: -33.1, rx: 1.35, ry: 1.5, fill: cfg.iris || '#3A2618' }),
    s('circle', { cx: 22.9, cy: -33.6, r: 0.45, fill: '#fff' }),
    L('M18 -33.2C20.2 -35.2 23.2 -35.2 25 -33', '#2A1A12', strong ? 1.1 : 1.3),
    L('M19 -31.9C20.8 -31.2 22.8 -31.3 24.2 -32.2', S.deep, 0.6, { opacity: 0.6 }),
    cfg.lashes ? L('M24 -34.2l1.8 -1M24.8 -33.4l1.9 -0.5', '#2A1A12', 0.7) : null,
    L(strong ? 'M16.4 -38.8C19.8 -41 24.4 -41.2 28 -39.4' : 'M17 -38.6C20 -40.4 24 -40.6 27 -39.2', hair.brow || HT.deep, strong ? 2 : 1.4),
    L(strong ? 'M33.4 -19.8C34.6 -20.2 35.6 -19.6 36 -18.8' : 'M32.4 -20.2C33.4 -20.6 34.2 -20 34.6 -19.2', S.deep, 0.9),
    P(strong
      ? 'M33 -14C33.4 -13.2 33.2 -12.6 32.2 -12.2C33 -11.6 33 -10.6 32.4 -9.8C31.8 -9.4 31 -9.4 30.4 -9.8L30.6 -13.6Z'
      : 'M31.4 -15C32.6 -15 33 -14.2 32.4 -13.4L31.8 -13C32.8 -12.4 33 -11.2 32.4 -10.2C31.6 -9.6 30.4 -9.8 29.8 -10.6L30 -14Z', S.lip, { opacity: strong ? 0.6 : 0.95 }),
    L(strong ? 'M32.2 -12.2L29 -12' : 'M31.8 -13L28.6 -12.8', S.deep, 0.8),
  );
  // barbe courte
  if (cfg.beard) {
    const BT = tone(cfg.beard);
    H.append(
      P('M4 -18C6 -10 10 -4 16 -1C21 1.8 26 2.6 30.4 0C31.4 -2.6 31 -5.6 29.8 -7.2C30.2 -8.2 31.4 -8.8 31.8 -9.8C30.6 -9.2 29 -9.6 28.6 -10.6C26 -9.6 22 -10 18 -12C13 -14.6 8 -16.6 4 -18Z', BT.base, { opacity: 0.92 }),
      P('M27.2 -13.8C29.4 -15.4 31.4 -15.6 33 -14.2C31.6 -13.2 29.6 -12.8 27.2 -13.8Z', BT.base),
      L('M8 -12C12 -8 18 -5 24 -4', BT.light, 0.9, { opacity: 0.6 }),
    );
  }
  // cheveux devant (frange, tempes, mèches)
  const HF = grad(defs, [[0, HT.light], [1, HT.base]], { x2: 0.4, y2: 1 });
  const caps = {
    pony: 'M27 -45C26 -54 18 -62 6 -63C-6 -64 -17 -60 -23 -52C-27 -46 -28 -38 -26 -30C-24 -26 -21 -24 -18 -24C-19 -30 -19 -38 -15 -44C-10 -50 -2 -52 6 -51C14 -50 21 -48 27 -45Z',
    bun: 'M27 -45C26 -54 18 -62 6 -63C-6 -64 -17 -60 -23 -52C-27 -46 -28 -38 -26 -30C-24 -26 -21 -24 -18 -24C-19 -30 -19 -38 -15 -44C-10 -50 -2 -52 6 -51C14 -50 21 -48 27 -45Z',
    bob: 'M29 -43C29 -56 20 -64 6 -65C-8 -66 -21 -60 -26 -48C-30 -38 -29 -24 -24 -12C-20 -6 -14 -4 -9 -6C-12 -14 -13 -24 -10 -34C-6 -42 4 -44 14 -41C20 -39 25 -38 29 -36Z',
    afro: 'M28 -47C26 -55 18 -61 6 -62C-4 -62 -12 -59 -16 -55C-10 -53 -2 -52 8 -52C16 -51 23 -49 28 -47Z',
    short: 'M27.6 -44C27 -55 18 -63 5 -63C-8 -63 -18 -57 -22 -49C-25 -42 -25 -34 -23 -27C-21 -24 -18 -23 -15 -24C-16 -31 -15 -38 -10 -43C-4 -48 4 -49 12 -48C18 -47.4 23 -46 27.6 -44Z',
    crop: 'M27.6 -46C26 -55 18 -61 6 -61.4C-6 -61.6 -16 -57 -20 -50C-23 -44 -24 -37 -22 -30C-20 -27 -17 -26 -15 -27C-15 -33 -13 -39 -8 -43C-2 -47 6 -48 13 -47.4C19 -47 24 -46.6 27.6 -46Z',
  };
  front.append(P(caps[hair.style] || caps.short, hair.style === 'afro' ? HT.base : HF));
  // patte devant l'oreille, mèches et reflets
  if (hair.style === 'short' || hair.style === 'crop') front.append(P('M7 -45C5.4 -41 5 -37 5.6 -33L3.8 -33.6C3.2 -37.6 3.6 -42 5 -46Z', HT.base, { opacity: 0.8 }));
  if (hair.style === 'bob') {
    front.append(
      P('M29 -43C30 -38 29.6 -34 28 -31C24 -33 22 -37 21 -40C24 -40 27 -41 29 -43Z', HT.base),
      L('M20 -58C12 -54 4 -50 -6 -48M14 -62C4 -58 -6 -54 -14 -46M-18 -40C-20 -30 -18 -18 -12 -10', HT.light, 1.2, { opacity: 0.7 }),
    );
  } else if (hair.style === 'afro') {
    // lisière de boucles sur le front et la tempe
    [[25, -50, 4.4], [19, -54, 5], [12, -57, 5.4], [5, -59, 5.4]].forEach(([x, y, r]) => front.append(s('circle', { cx: x, cy: y, r, fill: HT.base })));
    front.append(L('M14 -56a3 3 0 0 1 5 -2M4 -58a3 3 0 0 1 5 -1', HT.light, 1, { opacity: 0.5 }));
  } else {
    front.append(L('M24 -49C16 -54 6 -56 -6 -55M18 -58C8 -60 -4 -59 -14 -54M-18 -46C-21 -40 -21 -33 -19 -27', HT.light, 1.2, { opacity: 0.75 }));
  }
  if (hair.grey) front.append(L('M-20 -42C-22 -36 -21 -30 -18 -26M10 -50C4 -52 -4 -52 -10 -48', '#E9E6DF', 1, { opacity: 0.7 }));
  if (hair.band) {
    front.append(P('M27 -47C18 -52 6 -54 -6 -54C-12 -54 -18 -53 -22 -51L-23 -45C-15 -48 -4 -49 6 -48.4C15 -48 22 -46 27.6 -42Z', hair.band));
    front.append(L('M-21 -49C-12 -51 0 -51.6 10 -51', '#fff', 0.9, { opacity: 0.35 }));
  }
  H.append(front);
  // lunettes, casquette, casque
  if (cfg.glasses) {
    H.append(
      P('M20.8 -36H29.4C30 -36 30.2 -35.4 30 -34.8L29 -30.6C28.8 -30 28.2 -29.6 27.6 -29.6H22.4C21.8 -29.6 21.2 -30 21 -30.6L20.2 -34.8C20 -35.4 20.2 -36 20.8 -36Z', '#DCEAF0', { opacity: 0.35, stroke: cfg.glasses, 'stroke-width': 1.3 }),
      L('M20.4 -34.6L4.6 -33', cfg.glasses, 1.3),
    );
  }
  if (cfg.cap) {
    const CT = tone(cfg.cap);
    H.append(
      P('M-26 -44C-26 -56 -14 -66 4 -66C20 -66 30 -58 31 -48C26 -46 16 -46 6 -46.4C-6 -46.8 -18 -46 -26 -44Z', grad(defs, [[0, CT.light], [1, CT.shade]], { x2: 0, y2: 1 })),
      P('M23 -48.6C30 -49.4 37 -48.6 41.4 -46.4C42 -45.4 41.4 -44.4 40.2 -44.2C34 -44 27 -44.6 21 -45.4Z', CT.deep),
      L('M-20 -54C-10 -60 4 -62 18 -58M-24 -48C-12 -52 4 -53 20 -51', CT.deep, 0.8, { opacity: 0.45, 'stroke-dasharray': '1.6 1.4' }),
      P('M2.4 -66.4a2.6 1.6 0 1 1 0.1 0Z', CT.deep),
    );
  }
  if (cfg.helmet) {
    const HT2 = tone(cfg.helmet);
    H.append(
      P('M-28 -40C-30 -58 -14 -72 6 -72C24 -72 34 -60 34 -46C30 -42 24 -41 18 -42C4 -43 -14 -42 -28 -40Z', grad(defs, [[0, HT2.light], [0.6, HT2.base], [1, HT2.shade]], { x2: 0.3, y2: 1 })),
      L('M-20 -58C-10 -66 6 -68 20 -62M-25 -48C-12 -55 6 -57 26 -52', HT2.shade, 1.4, { opacity: 0.55 }),
      P('M-28 -40C-14 -42 4 -43 18 -42C24 -41 30 -42 34 -46L34 -43C30 -39 24 -38 18 -39C4 -40 -14 -39 -28 -37Z', HT2.deep),
      L('M2 -40L6 -14M2 -40L-6 -16', '#3A3A3A', 0.9),
      P('M-8 -66C-2 -68 6 -68 12 -66L10 -62C4 -64 -2 -64 -6 -62Z', '#fff', { opacity: 0.35 }),
    );
  }
  return { g: H, swing: hair.style === 'pony' ? swing : null };
}

// ---------------------------------------------------------------- bustes (repère : hanche en 0,0)
/** Buste de profil selon le vêtement ; renvoie le groupe, plus la jupe / le pan de manteau à animer. */
function torso(defs, cfg) {
  const G = g({ class: 'pb-torso' });
  const T = tone(cfg.top.color);
  const fill = grad(defs, [[0, T.shade], [0.4, T.base], [1, T.light]], { x1: -26, y1: -20, x2: 30, y2: -6, user: true });
  const woman = cfg.build !== 'man';
  const body = woman
    ? 'M-21 8C-25 -18 -23 -44 -19 -62C-17 -76 -20 -94 -17 -106C-14 -113 -6 -117 2 -117L13 -117C18 -112 22 -101 24 -89C28 -79 30 -67 24 -59C20 -51 20 -38 22 -24C24 -10 24 2 21 10Z'
    : 'M-22 8C-25 -20 -24 -46 -22 -66C-21 -84 -22 -98 -19 -108C-15 -115 -6 -118 2 -118L14 -118C21 -112 26 -100 27 -86C28 -70 26 -54 24 -38C23 -22 23 -6 21 10Z';
  let skirt = null;
  let flap = null;
  const kind = cfg.top.kind;
  const S = cfg.skin;
  // cou (le col passe devant)
  G.append(
    P('M0 -138C1 -128 1 -118 0 -108H22C21 -118 21 -128 23 -136C16 -136 8 -137 0 -138Z', grad(defs, [[0, S.deep], [0.6, S.shade], [1, S.base]])),
    P('M4 -126C10 -124 16 -125 22 -128L22 -122C16 -120 10 -120 4 -122Z', S.deep, { opacity: 0.35 }),
  );
  // bassin (pantalon) sous le haut (sauf sous un manteau)
  if (cfg.legs.kind !== 'bare' && kind !== 'coat') {
    const LT = tone(cfg.legs.color);
    G.append(
      P('M-22 -8C-26 4 -25 18 -19 26C-8 31 8 31 20 25C24 14 24 2 21 -8Z', grad(defs, [[0, LT.shade], [0.5, LT.base], [1, LT.light]])),
      L('M-19 -2C-20 8 -19 16 -16 22', LT.deep, 1, { opacity: 0.5 }),
    );
    if (cfg.legs.kind === 'jeans') G.append(P('M-21 2C-23 8 -22 14 -19 18L-12 17C-13 12 -13 7 -12 2Z', LT.shade, { stroke: cfg.legs.stitch || '#D1A35C', 'stroke-width': 0.6, 'stroke-dasharray': '1.6 1.2' }));
  }
  if (kind === 'dress') {
    // robe : corsage + jupe évasée (la jupe suit les jambes)
    G.append(P(body.replace(/C24 -10 24 2 21 10Z$/, 'C23 -14 23 -6 22 -2Z').replace('M-21 8C-25 -18', 'M-21 -2C-25 -18'), fill));
    skirt = P('', grad(defs, [[0, T.shade], [0.45, T.base], [1, T.light]]));
    G.append(skirt);
    skirt.folds = L('', T.shade, 1.4, { opacity: 0.55 });
    skirt.hem = L('', T.deep, 1.2, { opacity: 0.45 });
    G.append(skirt.folds, skirt.hem);
    G.append(P('M-21 -6C-8 -3 8 -3 22 -6L22 -1C8 2 -8 2 -21 -1Z', T.deep, { opacity: 0.55 }));
    if (cfg.top.dots) {
      const dots = g({ class: 'pb-dots', opacity: 0.8 });
      for (let y = -108; y < -4; y += 9) for (let x = -18 + ((y / 9) % 2 ? 4.5 : 0); x < 22; x += 9) dots.append(s('circle', { cx: f(x), cy: f(y), r: 1.1, fill: cfg.top.dots }));
      G.append(dots);
    }
  } else {
    if (kind === 'coat' || kind === 'peacoat') {
      flap = P('', fill);
      G.append(flap);
    }
    G.append(P(body, fill));
  }
  // ombre sous le bras, côté dos
  G.append(P('M-19 -62C-21 -44 -21 -20 -20 6L-13 6C-15 -20 -15 -44 -13 -64Z', T.shade, { opacity: 0.5 }));
  if (kind === 'knit') {
    // pull en grosse maille : torsades, côtes du col et du bas
    const knit = [];
    for (let x = -12; x <= 16; x += 7) for (let y = -98; y < -2; y += 6) knit.push(`M${f(x - 2)} ${y}l2 3l2 -3`);
    G.append(
      L(knit.join(''), T.shade, 0.8, { opacity: 0.45 }),
      P('M-22 -2C-8 1 8 1 22 -2L21.4 10C8 13 -8 13 -21 10Z', T.light, { opacity: 0.9 }),
      L('M-18 0V10M-13 0.6V11M-8 1V11.6M-3 1.2V12M2 1.2V12M7 1V11.6M12 0.6V11M17 0V10', T.shade, 0.8, { opacity: 0.6 }),
      P('M2 -117C6 -114 10 -114 13 -117L15 -112C10 -108 5 -109 0 -112Z', T.light),
    );
  }
  if (kind === 'jacket') {
    // veste de travail : fermeture, poche poitrine, col
    G.append(
      L('M17 -110C19 -80 20 -40 19 8', T.deep, 1.2, { opacity: 0.7 }),
      P('M4 -86H18L17.4 -70H4.6Z', T.shade, { opacity: 0.8 }),
      L('M4 -86H18', T.deep, 1.1),
      P('M0 -118C6 -122 14 -121 18 -114L20 -104C14 -106 6 -108 -2 -110Z', T.light),
      L('M-20 4C-6 8 8 8 20 4', T.deep, 1.4, { opacity: 0.55 }),
    );
  }
  if (kind === 'coat' || kind === 'peacoat') {
    // manteau : pan qui suit les jambes, revers, boutons, ceinture / poches
    G.append(
      P('M10 -116L19 -108L14 -86L24 -80L22 -74L6 -98Z', T.light, { opacity: 0.85 }),
      L('M10 -116L19 -108L14 -86L24 -80', T.deep, 0.9, { opacity: 0.55 }),
    );
    if (kind === 'coat') {
      G.append(
        P('M-21 -44C-6 -40 10 -40 23 -44L23 -36C10 -32 -6 -32 -21 -36Z', T.shade),
        P('M14 -42h7v7h-7z', T.deep, { opacity: 0.8 }),
        L('M17 -36C16 -30 18 -24 15 -18', T.deep, 1.4),
      );
    } else {
      [[-70, 20], [-52, 21], [-34, 21.6]].forEach(([y, x]) => G.append(s('circle', { cx: x - 4, cy: y, r: 2, fill: T.deep }), s('circle', { cx: x - 4.6, cy: y - 0.6, r: 0.7, fill: T.light, opacity: 0.6 })));
      G.append(P('M-12 -20H6L5.6 -12H-12Z', T.shade), L('M-12 -20H6', T.deep, 0.9));
    }
  }
  if (kind === 'stripes') {
    // marinière : rayures marine
    const st = [];
    for (let y = -104; y < 6; y += 7.4) st.push(`M-24 ${f(y)}C-8 ${f(y + 1.2)} 10 ${f(y + 1.2)} 28 ${f(y - 0.6)}V${f(y + 2.6)}C10 ${f(y + 4.2)} -8 ${f(y + 4.2)} -24 ${f(y + 3)}Z`);
    const clip = uid('pbc');
    defs.append(s('clipPath', { id: clip }, P(body, '#000')));
    G.append(g({ 'clip-path': `url(#${clip})` }, P(st.join(''), cfg.top.stripe || '#2B3A63', { opacity: 0.9 })));
    G.append(P('M2 -117C6 -114 10 -114 13 -117L14.6 -113C10 -110 5 -110 0.6 -113Z', T.light));
  }
  if (kind === 'shirt') {
    // chemise : patte de boutonnage, col, poche
    G.append(
      L('M15 -112C17 -84 18 -40 17 8', T.shade, 1.2),
      ...[-96, -76, -56, -36, -16].map((y) => s('circle', { cx: 15.6 - (y + 100) * 0.004, cy: y, r: 1.2, fill: T.deep })),
      P('M2 -118C8 -121 14 -120 17 -114L18.4 -106L10 -110L2 -112Z', T.light),
      L('M2 -118C8 -121 14 -120 17 -114L18.4 -106L10 -110', T.shade, 0.8),
      P('M2 -86H13L12.6 -74C10 -73 5 -73 2.4 -74Z', 'none', { stroke: T.shade, 'stroke-width': 0.9 }),
      L('M-18 -30C-10 -26 0 -26 8 -30', T.shade, 1, { opacity: 0.6 }),
    );
  }
  // sac en bandoulière (la sangle traverse le buste, le sac sur la hanche)
  if (cfg.bag) {
    const BT = tone(cfg.bag);
    G.append(
      L('M-2 -116C4 -86 12 -50 17 -14', BT.shade, 2.6),
      P('M6 -16C6 -20 9 -22 13 -22H28C31 -22 33 -20 33 -16L32 2C32 5 30 7 27 7H11C8 7 6 5 6 2Z', grad(defs, [[0, BT.light], [1, BT.shade]], { x2: 0.4, y2: 1 })),
      P('M6 -16C6 -20 9 -22 13 -22H28C31 -22 33 -20 33 -16L33 -8C24 -5 14 -5 6 -8Z', BT.deep, { opacity: 0.45 }),
      s('circle', { cx: 19.6, cy: -7, r: 1.6, fill: '#E3B94E' }),
    );
  }
  // écharpe
  if (cfg.scarf) {
    const ST = tone(cfg.scarf);
    G.append(
      P('M-6 -122C2 -116 12 -116 20 -121L22 -110C14 -104 2 -104 -6 -110Z', ST.base),
      P('M12 -110L18 -84L12 -82L8 -108Z', ST.shade),
      L('M14 -86l-1 5M16 -86l0 5M18 -86l1 5', ST.base, 1.2),
      L('M-4 -114C4 -110 12 -110 20 -114', ST.shade, 1, { opacity: 0.7 }),
    );
  }
  return { g: G, skirt, flap };
}

// ---------------------------------------------------------------- la personne complète
/**
 * Assemble un passant. `pose(st)` place tout : st = { hipX, hipY, lean, nod,
 *   legs: [{ ax, ay, pitch }] (pied proche puis lointain), arms: [{ hx, hy } | { a1, a2 }] }.
 */
function person(cfg) {
  const root = g({ class: 'pb-person' });
  const defs = s('defs');
  root.append(defs);
  const farArm = arm(defs, cfg, true);
  const nearArm = arm(defs, cfg, false);
  const farLeg = leg(defs, cfg, true);
  const nearLeg = leg(defs, cfg, false);
  const tor = torso(defs, cfg);
  const hd = head(defs, cfg);
  const headG = g({}, hd.g);
  const upperBody = g({ class: 'pb-upper-body' }, [tor.g, headG]);
  const behind = g({ class: 'pb-behind' });
  const mid = g({ class: 'pb-mid' });
  const front = g({ class: 'pb-front' });
  root.append(
    behind,
    farArm.upper, farArm.fore,
    farLeg.thigh, farLeg.shin, farLeg.foot,
    nearLeg.thigh, nearLeg.shin, nearLeg.foot,
    upperBody,
    mid,
    nearArm.upper, nearArm.fore,
    front,
  );
  const sh = BODY.shoulder;
  const nk = BODY.neck;
  const rot = (x, y, a) => {
    const c = Math.cos((a * Math.PI) / 180);
    const s2 = Math.sin((a * Math.PI) / 180);
    return [x * c - y * s2, x * s2 + y * c];
  };
  const out = { knee: [], shoulder: [0, 0], wrist: [], fore: [] };
  function pose(st) {
    const { hipX = 0, hipY, lean = 0, nod = 0 } = st;
    // jambes
    [nearLeg, farLeg].forEach((Lg, i) => {
      const t = st.legs[i];
      const k = ik(hipX, hipY, t.ax, t.ay, BODY.thigh, BODY.shin, 1);
      place(Lg.thigh, hipX, hipY, aim(k.kx - hipX, k.ky - hipY));
      place(Lg.shin, k.kx, k.ky, aim(k.ex - k.kx, k.ey - k.ky));
      place(Lg.foot, k.ex, k.ey, -(t.pitch || 0));
      out.knee[i] = [k.kx, k.ky];
      if (Lg.folds) {
        const bend = Math.abs(aim(k.ex - k.kx, k.ey - k.ky) - aim(k.kx - hipX, k.ky - hipY));
        Lg.folds.setAttribute('opacity', f(clamp((bend - 8) / 40, 0, 0.7)));
      }
    });
    // buste et tête
    upperBody.setAttribute('transform', `translate(${f(hipX)} ${f(hipY)}) rotate(${f(lean)})`);
    hd.g.setAttribute('transform', `translate(${nk[0]} ${nk[1]}) rotate(${f(nod)}) scale(${BODY.head})`);
    if (hd.swing) hd.swing.setAttribute('transform', `translate(-17 -46) rotate(${f(st.hair || 0)})`);
    // jupe / pan de manteau : l'ourlet suit les genoux
    const kn = out.knee.map(([x, y]) => rot(x - hipX, y - hipY, -lean));
    const front = Math.max(kn[0][0], kn[1][0]);
    const backK = Math.min(kn[0][0], kn[1][0]);
    if (tor.skirt) {
      const hem = 112;
      const fx = Math.max(front + 28, 36);
      const bx = Math.min(backK - 26, -34);
      tor.skirt.setAttribute('d', `M-21 -6C-25 22 ${f(bx + 6)} ${hem - 36} ${f(bx)} ${hem}C${f(bx * 0.4)} ${hem + 7} ${f(fx * 0.5)} ${hem + 7} ${f(fx)} ${hem - 2}C${f(fx + 2)} ${hem - 40} 26 16 22 -6Z`);
      const folds = [0.22, 0.45, 0.68].map((t) => {
        const x0 = lerp(-15, 16, t);
        const x1 = lerp(bx + 6, fx - 6, t);
        return `M${f(x0)} 4C${f(x0 + (x1 - x0) * 0.2)} 40 ${f(x1 - 2)} ${hem - 30} ${f(x1)} ${hem + 3}`;
      });
      tor.skirt.folds.setAttribute('d', folds.join(''));
      tor.skirt.hem.setAttribute('d', `M${f(bx + 2)} ${hem + 1}C${f(bx * 0.4)} ${hem + 6} ${f(fx * 0.5)} ${hem + 6} ${f(fx - 2)} ${hem - 1}`);
    }
    if (tor.flap) {
      const hem = cfg.top.kind === 'peacoat' ? 52 : 96;
      const fx = Math.max(front * (hem / 100) + 22, 24);
      const bx = Math.min(backK * (hem / 100) - 22, -25);
      tor.flap.setAttribute('d', `M-22 -40C-25 0 ${f(bx + 3)} ${hem - 26} ${f(bx)} ${hem}C${f(bx * 0.3)} ${hem + 5} ${f(fx * 0.5)} ${hem + 5} ${f(fx)} ${hem - 1}C${f(fx - 2)} ${hem - 30} 25 0 23 -40Z`);
    }
    // bras : angles (a1 épaule, a2 coude, depuis la verticale, + vers l'avant) ou main posée (IK)
    const [sx0, sy0] = rot(sh[0], sh[1], lean);
    const sx = hipX + sx0;
    const sy = hipY + sy0;
    out.shoulder = [sx, sy];
    [nearArm, farArm].forEach((A, i) => {
      const a = st.arms[i];
      const dx = i ? -2 : 0;
      let ex;
      let ey;
      let wx;
      let wy;
      if (a.hx != null) {
        const k = ik(sx + dx, sy, a.hx, a.hy, BODY.upper, BODY.fore, -1);
        ex = k.kx;
        ey = k.ky;
        wx = k.ex;
        wy = k.ey;
      } else {
        ex = sx + dx + Math.sin((a.a1 * Math.PI) / 180) * BODY.upper;
        ey = sy + Math.cos((a.a1 * Math.PI) / 180) * BODY.upper;
        wx = ex + Math.sin((a.a2 * Math.PI) / 180) * BODY.fore;
        wy = ey + Math.cos((a.a2 * Math.PI) / 180) * BODY.fore;
      }
      place(A.upper, sx + dx, sy, aim(ex - sx - dx, ey - sy));
      out.fore[i] = aim(wx - ex, wy - ey);
      place(A.fore, ex, ey, out.fore[i]);
      if (a.wrist != null) A.hand.setAttribute('transform', `translate(0 ${BODY.fore - 1}) rotate(${f(a.wrist)})`);
      out.wrist[i] = [wx, wy];
    });
    return out;
  }
  return { g: root, pose, behind, mid, front, near: nearArm, far: farArm, nearLeg, farLeg, defs };
}

// ---------------------------------------------------------------- la marche
/**
 * Pose de marche pour la phase `ph` (0..1) : pieds (appui collé au sol, pas qui passe devant),
 * hanche qui monte et descend, bras opposés aux jambes.
 */
function gait(ph, { stride = 200, lift = 22, swingArm = 17, lean = 3 } = {}) {
  const duty = 0.62;
  const half = (stride * duty) / 2;
  const footAt = (p) => {
    const u = ((p % 1) + 1) % 1;
    if (u < duty) {
      const k = u / duty;
      const x = half * (1 - 2 * k);
      // attaque talon (pointe levée), pied à plat, puis le talon décolle (déroulé)
      let pitch = 0;
      let raise = 0;
      if (k < 0.14) pitch = 13 * (1 - k / 0.14);
      if (k > 0.62) {
        const r = (k - 0.62) / 0.38;
        pitch = -34 * r * r;
        raise = Math.sin((-pitch * Math.PI) / 180) * 24;
      }
      return { x, y: -raise, pitch, stance: true };
    }
    const k = (u - duty) / (1 - duty);
    const x = -half + 2 * half * ease(k);
    const y = -lift * Math.pow(Math.sin(Math.PI * k), 1.3);
    const pitch = k < 0.5 ? lerp(-34, -6, k / 0.5) : lerp(-6, 13, (k - 0.5) / 0.5);
    return { x, y: y - Math.sin((Math.max(0, -pitch) * Math.PI) / 180) * 24, pitch, stance: false };
  };
  const a = footAt(ph);
  const b = footAt(ph + 0.5);
  const legLen = BODY.thigh + BODY.shin;
  const reach = (x) => Math.sqrt(Math.max(0, (legLen * 0.985) ** 2 - x * x));
  const st = [a, b].filter((q) => q.stance);
  const h = Math.min(...st.map((q) => lerp(legLen * 0.985, reach(q.x), 0.78) - q.y * 0.15));
  const hipY = -(BODY.ankle + h);
  const c = Math.cos(2 * Math.PI * (ph - 0.06));
  return {
    hipX: 0,
    hipY,
    lean: lean + Math.sin(4 * Math.PI * ph) * 0.6,
    nod: Math.sin(4 * Math.PI * ph + 0.8) * 1.2,
    hair: Math.sin(4 * Math.PI * ph - 1.2) * 7 + 3,
    legs: [
      { ax: a.x, ay: a.y - BODY.ankle, pitch: a.pitch },
      { ax: b.x, ay: b.y - BODY.ankle, pitch: b.pitch },
    ],
    arms: [
      { a1: -swingArm * c, a2: -swingArm * c + 10 + 16 * Math.max(0, -c) },
      { a1: swingArm * c, a2: swingArm * c + 10 + 16 * Math.max(0, c) },
    ],
    phase: ph,
  };
}

// ---------------------------------------------------------------- accessoires
/** Cabas en toile imprimé du logo : le sac (devant) et ce qui dépasse (derrière l'épaule). */
function tote(c) {
  const T = tone(c);
  const back = g({ class: 'pb-tote-back' }, [
    // baguette
    P('M-30 -44C-30 -54 -24 -86 -18 -100C-15 -105 -9 -104 -10 -98C-14 -84 -20 -56 -20 -42Z', '#D9A45A'),
    L('M-22 -90l5 2M-24 -80l5 2M-25 -70l5 2', '#B07A36', 1.1),
    P('M-18 -100C-15 -105 -9 -104 -10 -98C-11 -96 -14 -96 -16 -97Z', '#E8C07C'),
    // poireau
    P('M-8 -48L-24 -92L-19 -94L-3 -50Z', '#F3EFE2'),
    P('M-24 -92C-34 -104 -40 -114 -50 -120C-40 -118 -30 -110 -22 -100ZM-21 -94C-24 -110 -24 -122 -20 -132C-16 -122 -16 -108 -18 -94Z', '#5E9B3A'),
    L('M-22 -93L-20 -99', '#4B7F2E', 1.2),
  ]);
  const front = g({ class: 'pb-tote' }, [
    L('M-4 -96C-2 -62 -4 -32 -6 -14', mixHex(T.shade, DARK, 0.1), 2.6),
    P('M-34 -50C-30 -52 22 -52 26 -50L22 0C10 3 -18 3 -30 0Z', T.base),
    P('M-34 -50C-30 -52 22 -52 26 -50L25.4 -44C10 -46 -20 -46 -33.6 -44Z', T.shade, { opacity: 0.5 }),
    P('M22 -50L26 -50L22 0C20 1 18 1.6 16 2Z', T.shade, { opacity: 0.6 }),
    s('circle', { cx: -4, cy: -24, r: 10, fill: 'none', stroke: '#1C4A33', 'stroke-width': 1.6, opacity: 0.85 }),
    L('M-9 -22C-8 -28 -6 -30 -4 -31M-4 -22C-4 -28 -2 -30 1 -30M-10 -21H2', '#1C4A33', 1.2, { opacity: 0.85 }),
    L('M-30 -2C-18 0 10 0 22 -2', T.deep, 1, { opacity: 0.4 }),
  ]);
  return { back, front };
}

/** Gobelet à emporter Café Laitue (repère : dans la main). */
function cup() {
  return g({ class: 'pb-cup' }, [
    P('M-8 -26H10L7.6 2C6 4 -4 4 -5.6 2Z', '#F5F0E6'),
    P('M-7.4 -18H9.4L8.6 -6H-6.4Z', '#B98A55'),
    s('circle', { cx: 1.4, cy: -12, r: 3.4, fill: '#12432B' }),
    P('M-9.6 -26.4H11.6V-30.6C8 -33 -6 -33 -9.6 -30.6Z', '#5B3A26'),
    P('M8 -26L7.6 0', 'none', { stroke: '#DCD4C4', 'stroke-width': 1.6 }),
    L('M-3 -36C-5 -40 -1 -42 -3 -46', '#fff', 1.2, { opacity: 0.4, class: 'pb-steam' }),
  ]);
}

// ---------------------------------------------------------------- les passants
function walker(cfg) {
  const pz = person(cfg);
  let bag = null;
  if (cfg.tote) {
    bag = tote(cfg.tote);
    pz.behind.append(bag.back);
    pz.mid.append(bag.front);
  }
  let cupHolder = null;
  if (cfg.cup) {
    cupHolder = g({ class: 'pb-cup-holder' }, cup());
    pz.near.fore.append(cupHolder);
  }
  const opts = { stride: cfg.stride || 200, swingArm: cfg.swingArm ?? 17, lean: cfg.lean ?? 3 };
  return {
    g: pz.g,
    stride: opts.stride,
    update(phase) {
      const st = gait(phase / (Math.PI * 2), opts);
      // le gobelet se tient devant soi, bras plié
      if (cfg.cup) st.arms[0] = { a1: 12 + Math.sin(phase * 2) * 1.5, a2: 122, wrist: 0 };
      const o = pz.pose(st);
      if (cupHolder) cupHolder.setAttribute('transform', `translate(2 ${BODY.fore + 12}) rotate(${f(-o.fore[0])})`);
      if (bag) {
        // le cabas pend à l'épaule et balance un peu
        const [sx, sy] = o.shoulder;
        const t = `translate(${f(sx - 8)} ${f(sy + 100)}) rotate(${f(Math.sin(phase * 2 + 1) * 2.5)})`;
        bag.back.setAttribute('transform', t);
        bag.front.setAttribute('transform', t);
      }
    },
  };
}

/** Maman qui pousse une poussette (nacelle, capote plissée, roues qui tournent, bébé au bonnet). */
function strollerMom(cfg) {
  const pz = person({ ...cfg, grip: true });
  const pram = g({ class: 'pb-pram' });
  const N = tone(cfg.pram);
  const wheels = [];
  const wheel = (x, r) => {
    const W = g({ class: 'pb-wheel' }, [
      s('circle', { r, fill: '#2B2B2B' }),
      s('circle', { r: r - 3.6, fill: '#55585C' }),
      L(`M${-r + 4} 0H${r - 4}M0 ${-r + 4}V${r - 4}M${f(-(r - 4) * 0.7)} ${f(-(r - 4) * 0.7)}L${f((r - 4) * 0.7)} ${f((r - 4) * 0.7)}M${f((r - 4) * 0.7)} ${f(-(r - 4) * 0.7)}L${f(-(r - 4) * 0.7)} ${f((r - 4) * 0.7)}`, '#A3A6AA', 1.3),
      s('circle', { r: 3.4, fill: '#C9CCCF' }),
    ]);
    const holder = g({ transform: `translate(${x} ${-r})` }, W);
    wheels.push({ W, r });
    return holder;
  };
  const HX = 74;
  const HY = -206;
  pram.append(
    // châssis chromé
    L(`M${HX} ${HY}L122 -126L132 -20M124 -92L222 -96M222 -96L222 -16M150 -70L222 -96`, '#AEB2B6', 3.6),
    L(`M${HX} ${HY}L122 -126`, '#E4E6E8', 1.2, { opacity: 0.7 }),
    // nacelle
    P('M112 -150C112 -112 138 -94 172 -94C206 -94 230 -112 232 -150Z', grad(pz.defs, [[0, N.light], [0.5, N.base], [1, N.shade]], { x2: 0, y2: 1 })),
    P('M108 -156H236V-148H108Z', N.deep),
    L('M118 -136C130 -112 150 -104 172 -104C196 -104 214 -112 226 -134', N.light, 1.4, { opacity: 0.5 }),
    // bébé, bonnet à pompon, couverture
    s('circle', { cx: 152, cy: -168, r: 12.5, fill: '#F4D8C6' }),
    s('circle', { cx: 159, cy: -169, r: 1.3, fill: '#3A2618' }),
    s('ellipse', { cx: 157.4, cy: -163, rx: 3.2, ry: 2, fill: '#EE9A88', opacity: 0.6 }),
    L('M161.6 -164.4C162.6 -163.6 162.8 -162.6 162.2 -161.8', '#C9886F', 1),
    P('M138.6 -172C138.6 -188 164 -190 166 -174C158 -178 146 -178 138.6 -172Z', '#D9453F'),
    L('M139.6 -174C148 -177 158 -177 165.4 -174', '#B5302B', 1.6),
    s('circle', { cx: 150, cy: -188, r: 4.6, fill: '#F2EEE6' }),
    P('M126 -154C136 -166 170 -170 198 -160L198 -150H126Z', '#BFD3B4'),
    P('M126 -154C136 -166 170 -170 198 -160L197 -156C170 -164 138 -162 128 -151Z', '#D7E4CF'),
    L('M140 -160l.1 0M152 -162.6l.1 0M164 -163l.1 0M176 -161.6l.1 0M188 -159.4l.1 0M146 -155l.1 0M158 -156.4l.1 0M170 -156.4l.1 0M182 -155l.1 0', '#F7F3EA', 2.4),
    // capote plissée
    P('M184 -152C184 -196 210 -214 240 -204C248 -190 250 -170 242 -150Z', grad(pz.defs, [[0, N.light], [1, N.shade]], { x2: 1, y2: 0.3 })),
    L('M194 -196C208 -205 226 -206 241 -199M188 -180C204 -190 226 -192 245 -184M186 -164C202 -173 226 -175 245 -168', N.deep, 1.4, { opacity: 0.45 }),
    L('M184 -152C184 -196 210 -214 240 -204', N.light, 1.6, { opacity: 0.55 }),
    // poignée en mousse
    L(`M${HX - 8} ${HY - 6}L${HX + 8} ${HY + 6}`, '#262626', 9),
    wheel(132, 20),
    wheel(222, 16),
  );
  pz.behind.append(pram);
  const opts = { stride: 168, swingArm: 0, lean: 7 };
  return {
    g: pz.g,
    stride: opts.stride,
    update(phase, dist) {
      const st = gait(phase / (Math.PI * 2), opts);
      const bob = st.hipY + 197;
      st.arms = [{ hx: HX + 2, hy: HY + bob * 0.4 }, { hx: HX - 3, hy: HY - 2 + bob * 0.4 }];
      pz.pose(st);
      wheels.forEach(({ W, r }) => W.setAttribute('transform', `rotate(${f((dist / UNIT / r) * 57.3)})`));
    },
  };
}

/** Cycliste sur un vélo de ville (cadre vert, garde-boue crème, panier d'osier plein de légumes). */
function cyclist(cfg) {
  const pz = person(cfg);
  const R = 62;
  const rear = [-104, -R];
  const front = [122, -R];
  const crank = [0, -R + 4];
  const seat = [-42, -198];
  const bar = [82, -238];
  const F = tone(cfg.bike);
  const bike = g({ class: 'pb-bike' });
  const wheels = [];
  const wheel = (cx) => {
    const W = g({}, [
      s('circle', { r: R, fill: 'none', stroke: '#262626', 'stroke-width': 8 }),
      s('circle', { r: R - 6, fill: 'none', stroke: '#9A9A9A', 'stroke-width': 1.6 }),
      L(Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return `M${f(Math.cos(a) * 5)} ${f(Math.sin(a) * 5)}L${f(Math.cos(a + 0.4) * (R - 6))} ${f(Math.sin(a + 0.4) * (R - 6))}`;
      }).join(''), '#B5B5B5', 0.9),
      s('circle', { r: 6, fill: '#8C8C8C' }),
    ]);
    wheels.push(W);
    return g({ transform: `translate(${cx} ${-R})` }, W);
  };
  bike.append(
    wheel(rear[0]),
    wheel(front[0]),
    // garde-boue crème
    L(`M${rear[0] - 60} ${-R + 6}A${R + 8} ${R + 8} 0 0 1 ${rear[0] + 42} ${-R - 54}`, '#EDE5CC', 6),
    L(`M${front[0] - 46} ${-R - 48}A${R + 8} ${R + 8} 0 0 1 ${front[0] + 62} ${-R + 12}`, '#EDE5CC', 6),
    // cadre col de cygne, fourche
    L(`M${rear[0]} ${-R}L${crank[0]} ${crank[1]}L${seat[0] + 4} ${seat[1] + 14}L${rear[0]} ${-R}`, F.base, 7),
    L(`M${crank[0]} ${crank[1]}C30 -120 50 -170 72 -196`, F.base, 8),
    L(`M72 -196L${front[0]} ${-R}`, F.base, 6.4),
    L(`M${crank[0]} ${crank[1]}C30 -120 50 -170 72 -196`, F.light, 2, { opacity: 0.6 }),
    // tige de selle, selle en cuir
    L(`M${seat[0] + 4} ${seat[1] + 14}L${seat[0]} ${seat[1]}`, '#9A9A9A', 4),
    P(`M${seat[0] - 26} ${seat[1] - 6}C${seat[0] - 20} ${seat[1] - 12} ${seat[0] + 12} ${seat[1] - 12} ${seat[0] + 22} ${seat[1] - 4}C${seat[0] + 10} ${seat[1] + 2} ${seat[0] - 16} ${seat[1] + 2} ${seat[0] - 26} ${seat[1] - 6}Z`, '#6B4026'),
    // potence, guidon, poignée en cuir, sonnette
    L('M72 -196L78 -232L96 -240', '#3A3A3A', 4.4),
    P('M92 -244h18a3 3 0 0 1 0 6h-18z', '#6B4026'),
    s('circle', { cx: 86, cy: -246, r: 4.4, fill: '#C9CCCF' }),
    // panier d'osier plein de légumes : poireau, fanes de carottes, salade, radis, baguette
    L('M116 -196L90 -150', '#3A3A3A', 2.4),
    P('M112 -254C112 -270 116 -300 122 -318C124 -324 130 -323 129 -316C125 -298 122 -270 122 -254Z', '#D9A45A'),
    L('M116 -296l6 2M115 -284l6 2M114 -272l6 2', '#B07A36', 1.2),
    P('M134 -256L150 -300L156 -298L142 -254Z', '#F1ECDD'),
    P('M150 -300C146 -316 140 -328 132 -336C144 -330 152 -318 155 -306ZM153 -299C158 -316 166 -328 176 -334C168 -322 162 -310 157 -297Z', '#4F8A3B'),
    P('M158 -258C156 -276 152 -290 146 -300C154 -292 160 -280 162 -262ZM164 -258C168 -276 174 -288 182 -296C176 -284 170 -272 168 -258Z', '#79AE55'),
    s('circle', { cx: 160, cy: -258, r: 5.6, fill: '#EE7F2A' }),
    s('circle', { cx: 168, cy: -256, r: 5, fill: '#F08A33' }),
    s('circle', { cx: 132, cy: -258, r: 14, fill: '#8DB86B' }),
    L('M122 -262C126 -256 134 -254 142 -256M124 -252C130 -248 138 -248 144 -251M132 -270C130 -264 131 -258 134 -254', '#5E8E46', 1.6),
    s('circle', { cx: 150, cy: -254, r: 7, fill: '#D3304B' }),
    s('circle', { cx: 157, cy: -251, r: 6, fill: '#E04A65' }),
    L('M150 -261C148 -270 146 -276 142 -280M157 -257C158 -266 162 -272 166 -276', '#5E9B3A', 1.6),
    P('M108 -256H178L172 -196H114Z', '#C98D44'),
    L('M110 -244H176M111 -232H175M112 -220H174M113 -208H173', '#9A6530', 2),
    L('M122 -256L124 -196M136 -256L137 -196M150 -256L150 -196M164 -256L163 -196', '#B57A38', 1.6),
    P('M106 -260H180V-254H106Z', '#A66E33'),
  );
  pz.behind.append(bike);
  // pédalier et carter : entre la jambe de derrière et celle de devant
  const crankArm = L('', '#2A2A2A', 4.4);
  pz.g.insertBefore(g({ class: 'pb-crank' }, [
    s('circle', { cx: crank[0], cy: crank[1], r: 16, fill: 'none', stroke: '#555', 'stroke-width': 3 }),
    P(`M${rear[0] + 4} ${-R - 5}L${crank[0] - 2} ${crank[1] - 9}A10 10 0 0 1 ${crank[0] + 8} ${crank[1] + 8}L${rear[0] + 3} ${-R + 5}Z`, F.shade),
    crankArm,
  ]), pz.nearLeg.thigh);
  return {
    g: pz.g,
    stride: Math.PI * 2 * R * 1.6,
    update(phase, dist) {
      wheels.forEach((W) => W.setAttribute('transform', `rotate(${f((dist / UNIT / R) * 57.3)})`));
      const pedal = (k) => [crank[0] + Math.cos(phase + k) * 34, crank[1] + Math.sin(phase + k) * 34];
      const p1 = pedal(0);
      const p2 = pedal(Math.PI);
      crankArm.setAttribute('d', `M${f(p1[0])} ${f(p1[1])}L${f(p2[0])} ${f(p2[1])}`);
      pz.pose({
        hipX: seat[0] - 2,
        hipY: seat[1] - 14 + Math.sin(phase * 2) * 1,
        lean: 26,
        nod: -18,
        legs: [
          { ax: p1[0] - 6, ay: p1[1] - BODY.ankle + 3, pitch: Math.sin(phase) * 12 - 4 },
          { ax: p2[0] - 6, ay: p2[1] - BODY.ankle + 3, pitch: Math.sin(phase + Math.PI) * 12 - 4 },
        ],
        arms: [{ hx: bar[0] + 16, hy: bar[1] }, { hx: bar[0] + 12, hy: bar[1] }],
      });
    },
  };
}

// ---------------------------------------------------------------- clients assis en terrasse
/**
 * Client assis de profil (vers la droite), une boisson à la main. Origine : l'assise du tabouret.
 * `sip()` : il porte la tasse ou le verre à la bouche.
 */
export function seatedGuest(p = {}) {
  const cfg = GUESTS[p.who || p.drink] || GUESTS.latte;
  const pz = person({ ...cfg, grip: true });
  const drink = cfg.drink === 'juice'
    ? g({ class: 'pb-juice' }, [
      P('M-9 -40H9L7.4 2C6 4 -6 4 -7.4 2Z', '#EAF4F6', { opacity: 0.6, stroke: '#A9C2C6', 'stroke-width': 1.2 }),
      P('M-8.2 -28H8.2L7.2 1C5.6 2.8 -5.6 2.8 -7.2 1Z', '#F39A2E'),
      P('M-8.2 -28H8.2V-25H-8.2Z', '#F7B65A'),
      L('M3 -40L10 -58', '#E8E2D6', 2.4),
      L('M3.6 -44L8 -56', '#D9453F', 1, { 'stroke-dasharray': '2 2' }),
      P('M-7 -38H-4L-4.6 -2H-6Z', '#fff', { opacity: 0.45 }),
    ])
    : g({ class: 'pb-latte' }, [
      P('M-10 -18H10L8.4 -2C6 2 -6 2 -8.4 -2Z', '#F7F2E8'),
      L('M10 -14C17 -14 17 -5 9 -5', '#F7F2E8', 2.6),
      P('M-10 -18H10V-15.4H-10Z', '#C08B5C'),
      L('M-6 -16.6C-2 -15 2 -15 6 -16.6', '#F2E6D0', 1),
      s('circle', { cx: 0, cy: -10, r: 2.6, fill: '#12432B' }),
    ]);
  const holder = g({ class: 'pb-drink' }, drink);
  // le verre se tient par le milieu, la tasse par son anse (tournée vers soi)
  const grip = cfg.drink === 'juice' ? 'translate(-2 18)' : 'translate(14 9) scale(-1 1)';
  pz.near.fore.append(holder);
  // pose assise : les pieds au sol (tabouret bas) ou sur le repose-pieds (tabouret haut)
  const base = {
    hipX: 0,
    hipY: -6,
    lean: -3,
    nod: 2,
    legs: [
      { ax: 60 + (cfg.feet?.[0] || 0), ay: cfg.floor - BODY.ankle, pitch: 4 },
      { ax: 50 + (cfg.feet?.[1] || 0), ay: cfg.floor - BODY.ankle - 1, pitch: 2 },
    ],
    arms: [{ a1: 22, a2: 108, wrist: 6 }, { a1: 34, a2: 96 }],
  };
  const pose = (st, tilt = 0) => {
    const o = pz.pose(st);
    holder.setAttribute('transform', `translate(3 ${BODY.fore + 12}) rotate(${f(-o.fore[0] + tilt)}) ${grip}`);
  };
  pose(base);
  let busy = false;
  return {
    g: g({ class: 'pb-seated' }, g({ transform: `scale(${UNIT})` }, pz.g)),
    /** Gorgée (2,2 s) : l'avant-bras remonte la boisson à la bouche, la tête bascule un peu. */
    sip() {
      if (busy) return;
      busy = true;
      const t0 = performance.now();
      const dur = 2200;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        // on lève (0 → 0,28), on boit (→ 0,62), on repose (→ 0,9)
        const k = t < 0.28 ? ease(t / 0.28) : t < 0.62 ? 1 : t < 0.9 ? 1 - ease((t - 0.62) / 0.28) : 0;
        pose({
          ...base,
          nod: base.nod - 12 * k,
          lean: base.lean - 3 * k,
          arms: [{ a1: lerp(22, 10, k), a2: lerp(108, 160, k), wrist: lerp(6, -10, k) }, base.arms[1]],
        }, -34 * k);
        if (t < 1) requestAnimationFrame(step);
        else {
          pose(base);
          busy = false;
        }
      };
      requestAnimationFrame(step);
    },
  };
}

const GUESTS = {
  latte: {
    skin: SKINS.fair, face: 'soft', lashes: true, earring: 'stud',
    hair: { style: 'bob', color: '#5B3A26' },
    top: { kind: 'stripes', color: '#F4EFE4', stripe: '#2B3A63', sleeve: 'long', cuff: '#F4EFE4' },
    legs: { kind: 'jeans', color: '#33466B', stitch: '#C9A15A' },
    shoes: { kind: 'flat', color: '#C0392B' },
    drink: 'latte', floor: 116,
  },
  juice: {
    skin: SKINS.tan, face: 'strong', build: 'man', glasses: '#2A2A2A', beard: '#5B4030',
    hair: { style: 'crop', color: '#6B4A32' },
    top: { kind: 'shirt', color: '#9DBAD6', sleeve: 'rolled' },
    legs: { kind: 'chino', color: '#CDB894' },
    shoes: { kind: 'leather', color: '#7A5236' },
    drink: 'juice', floor: 84, feet: [-6, -10],
  },
};

// ---------------------------------------------------------------- la distribution
const CAST_CFG = {
  lucie: {
    skin: SKINS.peach, face: 'soft', lashes: true, earring: 'stud', iris: '#4B6B3A',
    hair: { style: 'pony', color: '#8C4A2A' },
    top: { kind: 'knit', color: '#C8643E', knit: true, cuff: '#D97C55' },
    legs: { kind: 'jeans', color: '#7F9BBB', cuff: true, stitch: '#D3A65E' },
    shoes: { kind: 'sneaker', color: '#F4F1EA', accent: '#3E7A4C', sole: '#E6E0D4' },
    tote: '#E9DDC3', stride: 196,
  },
  hugo: {
    skin: SKINS.brown, face: 'strong', build: 'man', helmet: '#E2B33D',
    hair: { style: 'crop', color: '#1E1612' },
    top: { kind: 'jacket', color: '#5E6B3A', cuff: '#4C5730' },
    legs: { kind: 'chino', color: '#CBB78F', cuff: true, sock: '#B5532F' },
    shoes: { kind: 'sneaker', color: '#2F3E5C', accent: '#D9D2C2', sole: '#F1ECE2' },
    bike: '#2F6B4F',
  },
  camille: {
    skin: SKINS.fair, face: 'soft', lashes: true, earring: 'stud',
    hair: { style: 'bun', color: '#4A3226' },
    top: { kind: 'coat', color: '#8FAE8E', cuff: '#7F9E7E' },
    legs: { kind: 'slim', color: '#2A2A30' },
    shoes: { kind: 'boot', color: '#6B4630' },
    scarf: '#E2B33D', pram: '#2E4A6B',
  },
  rene: {
    skin: SKINS.tan, face: 'strong', build: 'man', beard: '#C9C4BA', cap: '#7A6650',
    hair: { style: 'short', color: '#B8B4AC', grey: true, brow: '#9E978C' },
    top: { kind: 'peacoat', color: '#2F3B55', cuff: '#283249' },
    legs: { kind: 'cord', color: '#7A5A3A' },
    shoes: { kind: 'leather', color: '#4A3020', brogue: true },
    cup: true, stride: 180, swingArm: 12, lean: 4,
  },
  aicha: {
    skin: SKINS.deep, face: 'soft', lashes: true, earring: 'hoop', iris: '#2A1A10',
    hair: { style: 'afro', color: '#1E1612', band: '#3E7A4C' },
    top: { kind: 'dress', color: '#E3B23C', sleeve: 'short', dots: '#FBF3DC' },
    legs: { kind: 'bare' },
    shoes: { kind: 'sneaker', color: '#F4F1EA', accent: '#E3B23C', sole: '#E6E0D4' },
    bag: '#B27A4A', stride: 204,
  },
};

export const CAST = [
  { kind: 'walker', who: 'lucie', dir: 1, speed: 34, k: 0.98 },
  { kind: 'cyclist', who: 'hugo', dir: -1, speed: 84, k: 1 },
  { kind: 'stroller', who: 'camille', dir: 1, speed: 24, k: 0.98 },
  { kind: 'walker', who: 'rene', dir: -1, speed: 26, k: 1.02 },
  { kind: 'walker', who: 'aicha', dir: 1, speed: 35, k: 0.96 },
];

/** Fabrique le passant `c` (voir CAST). */
export function buildActor(c) {
  const cfg = CAST_CFG[c.who];
  const a = c.kind === 'cyclist' ? cyclist(cfg) : c.kind === 'stroller' ? strollerMom(cfg) : walker(cfg);
  return { g: g({ transform: `scale(${UNIT})` }, a.g), stride: a.stride * UNIT, update: a.update };
}

/**
 * Crée la couche des passants. `tick(dt)` les fait avancer ; un nouveau passant part toutes les
 * quelques secondes (jamais plus de deux à la fois).
 */
export function createStreet({ y0 = 416, xMin = -80, xMax = 480, firstDelay = 4.5 } = {}) {
  const layer = g({ class: 'pb-street' });
  const active = [];
  let next = firstDelay;
  let cast = 0;
  function spawn() {
    const c = CAST[cast % CAST.length];
    cast += 1;
    const actor = buildActor(c);
    const wrap = g({ class: 'pb-actor' });
    const inner = g({ transform: `scale(${c.dir < 0 ? -c.k : c.k} ${c.k})` }, actor.g);
    wrap.append(
      s('ellipse', { cx: c.kind === 'stroller' ? 22 * c.dir : 0, cy: y0 + 1, rx: c.kind === 'cyclist' ? 44 : c.kind === 'stroller' ? 46 : 15, ry: 2.6, fill: '#3E2F26', opacity: 0.18 }),
      g({ transform: `translate(0 ${y0})` }, inner),
    );
    layer.append(wrap);
    const x = c.dir > 0 ? xMin : xMax;
    actor.update(0, 0);
    active.push({ c, actor, wrap, x, dist: 0 });
  }
  return {
    g: layer,
    tick(dt) {
      next -= dt;
      if (next <= 0 && active.length < 2) {
        spawn();
        next = 5.5 + Math.random() * 4;
      }
      for (let i = active.length - 1; i >= 0; i--) {
        const a = active[i];
        const step = a.c.speed * dt;
        a.x += step * a.c.dir;
        a.dist += step;
        a.wrap.setAttribute('transform', `translate(${f(a.x)} 0)`);
        a.actor.update((a.dist / (a.actor.stride * a.c.k)) * Math.PI * 2, a.dist / a.c.k);
        if (a.x < xMin - 20 || a.x > xMax + 20) {
          a.wrap.remove();
          active.splice(i, 1);
        }
      }
    },
  };
}
