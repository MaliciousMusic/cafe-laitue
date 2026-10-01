// Le primeur, Vincent, dessiné en SVG d'après ses photos (vue de face) : cheveux bruns coiffés
// vers l'arrière, tempes dégagées, moustache et bouc sur une barbe de trois jours, joues rosées,
// chemise en denim (col pointu, poche poitrine, manches retroussées), velours côtelé olive,
// montre au poignet gauche. Deux poses : cagette de radis sous le bras (`crate`) ou derrière le
// comptoir du bar à jus, les deux bras libres et articulés (`bar`).
// Repère : viewBox 0 0 300 580, pieds vers y = 566. Tout est groupé pour être animé.

import { s, g, rng, uid } from '../lib/svg.js';
import { anim, EASE, isReduced } from '../lib/motion.js';
import { play as sfx } from '../lib/sound.js';

export const PAL = {
  skin: '#E8B89D',
  skinLight: '#F2CDB5',
  skinShade: '#D29C80',
  skinDeep: '#B97D64',
  blush: '#E58A7C',
  lip: '#B8645A',
  hair: '#2A1F18',
  hairMid: '#3B2C22',
  hairLight: '#5A4535',
  beard: '#33251D',
  eyeWhite: '#FBF6EF',
  iris: '#4A2F1E',
  denim: '#4F6B90',
  denimDark: '#3C5476',
  denimDeep: '#2F4462',
  denimLight: '#6C88AE',
  denimPale: '#8EA6C6',
  stitch: '#B7C6DA',
  button: '#1D2430',
  pants: '#59583F',
  pantsDark: '#45442F',
  pantsLight: '#6D6C51',
  shoe: '#4A3020',
  shoeLight: '#6E4A32',
  sole: '#231912',
  crate: '#F2E6C9',
  crateShade: '#DCC89F',
  crateLine: '#BFA67A',
  radish: '#D8345A',
  radishLight: '#EE7A95',
  radishWhite: '#F8F1F3',
  leaf: '#4F8A3B',
  leafLight: '#79AE55',
};

function radishPile(rnd) {
  const G = g({ class: 'ch-radishes' });
  const leaves = g({ class: 'ch-leaves' });
  // Fanes (derrière, surtout à droite)
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const x = 176 + t * 116 + (rnd() - 0.5) * 10;
    const y = 212 - t * 16 - rnd() * 14;
    const a = -40 + t * 55 + (rnd() - 0.5) * 40;
    const L = 16 + t * 16 + rnd() * 12;
    leaves.append(
      s('ellipse', {
        cx: 0, cy: -L / 2, rx: 4.5 + rnd() * 3.5, ry: L / 2,
        fill: rnd() > 0.35 ? PAL.leaf : PAL.leafLight,
        transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)})`,
      }),
    );
  }
  G.append(leaves);
  const gradId = uid('rad');
  G.append(
    s('defs', {}, [
      s('linearGradient', { id: gradId, x1: '0', y1: '0', x2: '1', y2: '0' }, [
        s('stop', { offset: '0', 'stop-color': PAL.radishWhite }),
        s('stop', { offset: '.3', 'stop-color': PAL.radishWhite }),
        s('stop', { offset: '.5', 'stop-color': PAL.radishLight }),
        s('stop', { offset: '.74', 'stop-color': PAL.radish }),
      ]),
    ]),
  );
  const rows = [
    { y: 203, x0: 178, n: 9, dx: 11.5 },
    { y: 212, x0: 168, n: 11, dx: 11 },
    { y: 221, x0: 160, n: 12, dx: 10.8 },
    { y: 231, x0: 154, n: 12, dx: 11.2 },
  ];
  rows.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) {
      const x = r.x0 + i * r.dx + (rnd() - 0.5) * 7;
      const y = r.y + (rnd() - 0.5) * 7;
      const a = -30 + (rnd() - 0.5) * 50 + ri * 4;
      const k = 0.85 + rnd() * 0.3;
      const rad = g({ transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)}) scale(${k.toFixed(2)})` }, [
        s('path', { d: 'M-8 0 Q-14 1 -20 5', stroke: '#E9D9DC', 'stroke-width': 1, fill: 'none', 'stroke-linecap': 'round' }),
        s('ellipse', { cx: 0, cy: 0, rx: 8.6, ry: 6.3, fill: `url(#${gradId})` }),
        s('ellipse', { cx: 2.6, cy: -2.2, rx: 2.4, ry: 1.3, fill: '#fff', opacity: 0.35 }),
      ]);
      G.append(rad);
    }
  });
  return G;
}

/** Géométrie du bras droit (repère du personnage) : épaule, coude, main au repos. */
export const ARM = { shoulder: [76, 164], elbow: [60, 248], hand: [57, 360] };

/**
 * Bras droit : manche, avant-bras articulé (pivots à l'épaule et au coude), revers retroussé,
 * main. `watch` : montre au poignet (bras gauche, dessiné en miroir).
 */
function buildArm({ watch = false } = {}) {
  const arm = g({ class: 'ch-arm-r' });
  arm.style.transformBox = 'view-box';
  arm.style.transformOrigin = `${ARM.shoulder[0]}px ${ARM.shoulder[1]}px`;
  const forearm = g({ class: 'ch-forearm' });
  forearm.style.transformBox = 'view-box';
  forearm.style.transformOrigin = `${ARM.elbow[0]}px ${ARM.elbow[1]}px`;
  forearm.append(
    // manche (avant-bras), plis du coude
    s('path', { d: 'M49 242C47 268 46 292 46 318L69 320C70 294 71 270 73 244Z', fill: PAL.denim }),
    s('path', { d: 'M49 242C47.5 266 47 290 46.5 318L52 318.5C52.5 292 53 268 54.5 243Z', fill: PAL.denimDark, opacity: 0.55 }),
    s('path', { d: 'M52 256q8 3 17 -1M51 268q7 2 15 -2', fill: 'none', stroke: PAL.denimDark, 'stroke-width': 1, 'stroke-linecap': 'round', opacity: 0.55 }),
    // revers retroussé (envers plus clair) et couture
    s('path', { d: 'M44.6 312C44 318 44 324 44.4 330L68.6 332C69 326 69.4 320 69.6 314Z', fill: PAL.denimLight }),
    s('path', { d: 'M44.4 321.5L69 323.4', stroke: PAL.denimDark, 'stroke-width': 0.9, opacity: 0.7 }),
    s('path', { d: 'M45 314.5L69.4 316.4M44.6 328L68.8 330', stroke: PAL.stitch, 'stroke-width': 0.6, 'stroke-dasharray': '1.6 1.4', opacity: 0.8 }),
    // poignet et main détendue, pouce en avant
    s('path', { d: 'M47.5 330C46 338 45.4 346 47 352C48.6 358 53 362.6 58 362.8C63.6 363 67.6 358.6 68.4 352C69.2 345 68.6 338 67.6 331.4Z', fill: PAL.skin }),
    s('path', { d: 'M47.5 330C46 338 45.4 346 47 352C48 355.4 49.6 358 52 360C50.4 352 50.4 340 51.8 330.4Z', fill: PAL.skinShade, opacity: 0.7 }),
    s('path', { d: 'M66.6 336C71.4 339 72.4 346 69.4 351.6C68.4 353.4 66.6 353.6 66 352Z', fill: PAL.skinLight }),
    s('path', { d: 'M51 352.6C53 356 56 358.4 59.6 358.6M51.4 346.6C53.6 350 57 352.4 60.6 352.6', fill: 'none', stroke: PAL.skinDeep, 'stroke-width': 0.9, 'stroke-linecap': 'round', opacity: 0.6 }),
  );
  if (watch) {
    forearm.append(
      s('path', { d: 'M46.4 331.6L68.2 333.4L68 338.4L46.2 336.6Z', fill: '#2B2B2B' }),
      s('rect', { x: 51.6, y: 330.2, width: 11, height: 8.6, rx: 1.6, fill: '#C9CCCF', stroke: '#8D9196', 'stroke-width': 0.7 }),
      s('rect', { x: 53.4, y: 332, width: 7.4, height: 4.6, rx: 0.6, fill: '#9FB09A' }),
      s('path', { d: 'M54.4 334.6h5.4', stroke: '#2E3A2C', 'stroke-width': 0.7 }),
    );
  } else {
    // bracelet en cuir fin
    forearm.append(s('path', { d: 'M46.6 332.6L68.2 334.6', stroke: '#2A1D16', 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
  }
  arm.append(
    // manche (haut du bras), ombre côté corps, couture d'emmanchure
    s('path', { d: 'M76 158C61 163 52 182 50 208L49 248L73 249L74.5 214C76 196 78.5 178 81 164Z', fill: PAL.denim }),
    s('path', { d: 'M52.6 200C50.6 220 50 236 49.4 248L56 248.4C56.4 232 57.6 218 60 202Z', fill: PAL.denimDark, opacity: 0.5 }),
    s('path', { d: 'M70 170C72 188 72.6 208 72 226', fill: 'none', stroke: PAL.denimLight, 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.45 }),
    s('path', { d: 'M76 159C66 166 60 178 58 192', fill: 'none', stroke: PAL.stitch, 'stroke-width': 0.6, 'stroke-dasharray': '1.6 1.4', opacity: 0.7 }),
    forearm,
  );
  return { arm, forearm };
}

function crate() {
  const G = g({ class: 'ch-crate' });
  G.append(
    s('path', { d: 'M286 232 L297 222 L297 292 L286 302 Z', fill: PAL.crateShade }),
    s('rect', { x: 150, y: 232, width: 136, height: 70, rx: 3, fill: PAL.crate }),
    s('rect', { x: 150, y: 232, width: 9, height: 70, fill: PAL.crateShade }),
    s('rect', { x: 277, y: 232, width: 9, height: 70, fill: PAL.crateShade }),
    s('path', { d: 'M159 255 H277 M159 279 H277', stroke: PAL.crateLine, 'stroke-width': 1.3 }),
    s('rect', { x: 150, y: 232, width: 136, height: 5, fill: PAL.crateLine, opacity: 0.55 }),
    s('path', { d: 'M152 237V300M284 237V300', stroke: '#fff', 'stroke-width': 1, opacity: 0.35 }),
  );
  // Étiquette de producteur (code-barres stylisé)
  const label = g({ class: 'ch-label' }, [
    s('rect', { x: 198, y: 259, width: 62, height: 34, rx: 2, fill: '#FBFAF6', stroke: '#E4DED0', 'stroke-width': 0.8 }),
    s('path', { d: 'M203 266 H232 M203 270 H226 M236 266 H255 M236 270 H250', stroke: '#9A9486', 'stroke-width': 1.2 }),
  ]);
  const bars = [];
  for (let i = 0; i < 17; i++) bars.push(`M${204 + i * 1.5 + (i % 3 === 0 ? 0.4 : 0)} 276 v12`);
  label.append(s('path', { d: bars.join(' '), stroke: '#3B3B3B', 'stroke-width': 0.8 }));
  G.append(label);
  return G;
}

/**
 * Crée le personnage.
 * @returns {{ g: SVGGElement, parts: object, idle: Function, wave: Function, blink: Function, say: Function, look: Function }}
 */
export function createCharacter({ seed = 4, pose = 'crate' } = {}) {
  const bar = pose === 'bar';
  const rnd = rng(seed);
  const root = g({ class: 'ch' });
  const body = g({ class: 'ch-body fx-bottom' });
  root.append(body);

  // Dégradés et motifs partagés
  const ids = { cord: uid('cord'), stub: uid('stub'), soft: uid('soft'), shirt: uid('shirt'), face: uid('face'), hairG: uid('hairg') };
  root.append(s('defs', {}, [
    s('pattern', { id: ids.cord, width: 2.2, height: 8, patternUnits: 'userSpaceOnUse' }, [
      s('rect', { width: 2.2, height: 8, fill: PAL.pants }),
      s('rect', { width: 0.7, height: 8, fill: PAL.pantsDark, opacity: 0.55 }),
      s('rect', { x: 1.3, width: 0.4, height: 8, fill: PAL.pantsLight, opacity: 0.5 }),
    ]),
    s('pattern', { id: ids.stub, width: 2.4, height: 2.4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(20)' }, [
      s('circle', { cx: 0.7, cy: 0.7, r: 0.4, fill: PAL.beard }),
      s('circle', { cx: 1.9, cy: 1.8, r: 0.34, fill: PAL.beard }),
    ]),
    s('filter', { id: ids.soft, x: '-15%', y: '-15%', width: '130%', height: '130%' }, s('feGaussianBlur', { stdDeviation: 1.6 })),
    s('linearGradient', { id: ids.shirt, x1: 0, y1: 0, x2: 1, y2: 0 }, [
      s('stop', { offset: 0, 'stop-color': PAL.denimLight }),
      s('stop', { offset: 0.35, 'stop-color': PAL.denim }),
      s('stop', { offset: 1, 'stop-color': PAL.denimDark }),
    ]),
    s('linearGradient', { id: ids.face, x1: 0, y1: 0, x2: 1, y2: 0 }, [
      s('stop', { offset: 0, 'stop-color': PAL.skinLight }),
      s('stop', { offset: 0.45, 'stop-color': PAL.skin }),
      s('stop', { offset: 1, 'stop-color': PAL.skinShade }),
    ]),
    s('linearGradient', { id: ids.hairG, x1: 0, y1: 0, x2: 0.4, y2: 1 }, [
      s('stop', { offset: 0, 'stop-color': PAL.hairMid }),
      s('stop', { offset: 1, 'stop-color': PAL.hair }),
    ]),
  ]));

  // Jambes (velours côtelé) & chaussures
  const legs = g({ class: 'ch-legs' }, [
    s('path', { d: 'M70 318L128 318L126.5 372L120 548L84 548L74 372Z', fill: `url(#${ids.cord})` }),
    s('path', { d: 'M132 318L190 318L186 372L176 548L140 548L133.5 372Z', fill: `url(#${ids.cord})` }),
    s('path', { d: 'M118 380L120 548L109 548Z M134 380L140 548L151 548Z', fill: PAL.pantsDark, opacity: 0.5 }),
    s('path', { d: 'M74 372L84 548L90 548L81 372Z M186 372L176 548L170 548L179 372Z', fill: PAL.pantsLight, opacity: 0.25 }),
    // plis aux genoux et à la cheville
    s('path', { d: 'M86 430q10 4 22 -1M88 446q8 3 18 0M144 430q10 4 22 -1M146 446q8 3 18 0M88 530q12 5 30 0M142 530q12 5 30 0', fill: 'none', stroke: PAL.pantsDark, 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.6 }),
    // chaussures en cuir
    s('path', { d: 'M80 542L121 542C126.5 549 127 559 121 563.6L69.6 564.6C61.4 562.6 63.4 549 80 542Z', fill: PAL.shoe }),
    s('path', { d: 'M139 542L180 542C196.6 549 198.6 562.6 190.4 564.6L139 563.6C133 559 133.5 549 139 542Z', fill: PAL.shoe }),
    s('path', { d: 'M76 548C82 545 92 544.6 98 546M146 546C154 544.6 164 545 172 548', fill: 'none', stroke: PAL.shoeLight, 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
    s('path', { d: 'M66 562.6L122.4 561.6L122 566L68 566.6Z M137.6 561.6L194 562.6L192 566.6L138 566Z', fill: PAL.sole }),
  ]);
  body.append(legs);

  // Buste (respire)
  const torso = g({ class: 'ch-torso fx-bottom' });
  body.append(torso);

  // Bras gauche (côté cagette) — derrière la cagette
  if (!bar) {
    torso.append(g({ class: 'ch-arm-l' }, [
      s('path', { d: 'M184 158C199 163 208 182 210 208L212.6 250L191.6 252L189.4 214C188 196 184.6 178 180 164Z', fill: PAL.denim }),
      s('path', { d: 'M204.4 210L212.6 250L205.6 251Z', fill: PAL.denimDark, opacity: 0.45 }),
    ]));
  }

  // Chemise en denim : corps, ombres latérales, plis, empiècement, col, patte, poche
  const shirtD = 'M72 157C86 147.6 104 145.6 116 145.6L144 145.6C156 145.6 174 147.6 188 157C198 164 202 179 200.4 196L197.6 326C186 333.6 158 336.6 130 336.6C102 336.6 74 333.6 62.4 326L59.6 196C58 179 62 164 72 157Z';
  torso.append(
    s('path', { d: shirtD, fill: `url(#${ids.shirt})` }),
    s('path', { d: 'M59.6 196C61.6 250 61.8 300 62.4 326C68.6 329.4 74.6 331 81 331.6C77 290 74 240 73 204Z', fill: PAL.denimDark, opacity: 0.5 }),
    s('path', { d: 'M200.4 196C198.4 250 198.2 300 197.6 326C191.4 329.4 185.4 331 179 331.6C183 290 186 240 187 204Z', fill: PAL.denimDeep, opacity: 0.45 }),
    // plis à la taille et sous les bras
    s('path', { d: 'M80 214q14 10 30 8M84 236q10 6 22 5M178 214q-12 9 -26 9M176 240q-8 5 -18 4M92 300q16 6 34 4M150 302q14 2 28 -6', fill: 'none', stroke: PAL.denimDark, 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.45 }),
    s('path', { d: 'M88 210q12 8 24 7M98 296q14 5 28 3', fill: 'none', stroke: PAL.denimPale, 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.35 }),
    // ourlet arrondi
    s('path', { d: 'M62.6 324C74 331.6 102 334.6 130 334.6C158 334.6 186 331.6 197.4 324', fill: 'none', stroke: PAL.stitch, 'stroke-width': 0.7, 'stroke-dasharray': '1.8 1.5', opacity: 0.7 }),
    // empiècement d'épaules
    s('path', { d: 'M74 168C92 172 110 173 130 173C150 173 168 172 186 168', fill: 'none', stroke: PAL.denimDark, 'stroke-width': 1.1, opacity: 0.55 }),
    s('path', { d: 'M74 170.4C92 174.4 110 175.4 130 175.4C150 175.4 168 174.4 186 170.4', fill: 'none', stroke: PAL.stitch, 'stroke-width': 0.6, 'stroke-dasharray': '1.6 1.4', opacity: 0.65 }),
    // encolure ouverte : cou, creux de la poitrine
    s('path', { d: 'M117.6 146L130 171L142.4 146Z', fill: PAL.skinShade }),
    s('path', { d: 'M122 150L130 166.6L138 150Z', fill: PAL.skinDeep, opacity: 0.35 }),
    // pied de col
    s('path', { d: 'M113 140.6Q130 151 147 140.6L147.6 147Q130 158.6 112.4 147Z', fill: PAL.denimDeep }),
    // patte de boutonnage, coutures, boutons pression
    s('path', { d: 'M130.4 168V334', stroke: PAL.denimDark, 'stroke-width': 1.5 }),
    s('path', { d: 'M126.6 172V333M136 168V334', stroke: PAL.stitch, 'stroke-width': 0.6, 'stroke-dasharray': '1.8 1.5', opacity: 0.7 }),
    ...[188, 220, 252, 284, 314].map((y) => g({}, [
      s('circle', { cx: 132.6, cy: y, r: 2.5, fill: PAL.button }),
      s('circle', { cx: 132.1, cy: y - 0.6, r: 0.9, fill: '#55657C' }),
    ])),
    // poche poitrine (côté gauche du torse = à droite à l'écran)
    s('path', { d: 'M146.4 188.6L172.4 186.6L172.4 211C166 214.6 154 215 147 212Z', fill: PAL.denim }),
    s('path', { d: 'M146.4 188.6L172.4 186.6L172.4 211C166 214.6 154 215 147 212Z', fill: 'none', stroke: PAL.denimDeep, 'stroke-width': 1 }),
    s('path', { d: 'M148.4 191.4L170.6 189.6M148.6 209.6C155 212.2 165 212 170.6 209', fill: 'none', stroke: PAL.stitch, 'stroke-width': 0.6, 'stroke-dasharray': '1.6 1.3', opacity: 0.8 }),
    s('path', { d: 'M146.4 188.6L172.4 186.6L172 190.6L146.6 192.4Z', fill: PAL.denimDeep, opacity: 0.35 }),
    // col pointu (dessus éclairé à gauche)
    s('path', { d: 'M115.6 142.6L102.4 173.4L129 161.4Z', fill: PAL.denimLight }),
    s('path', { d: 'M144.4 142.6L157.6 173.4L131 161.4Z', fill: PAL.denim }),
    s('path', { d: 'M115.6 142.6L102.4 173.4L129 161.4ZM144.4 142.6L157.6 173.4L131 161.4Z', fill: 'none', stroke: PAL.denimDeep, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }),
    s('path', { d: 'M115 147.6L105.8 169.4L125.4 160.6M145 147.6L154.2 169.4L134.6 160.6', fill: 'none', stroke: PAL.stitch, 'stroke-width': 0.55, 'stroke-dasharray': '1.4 1.2', opacity: 0.8 }),
  );

  // Tête (s'incline)
  const head = g({ class: 'ch-head' });
  head.style.transformBox = 'view-box';
  head.style.transformOrigin = '130px 140px';

  // Yeux en amande : blanc, iris qui suit le regard, paupière ; groupes séparés (clignement)
  const eyeClip = [uid('eyeL'), uid('eyeR')];
  const irisL = g({ class: 'ch-iris' });
  const irisR = g({ class: 'ch-iris' });
  const eyeShape = (cx, dir) => `M${cx - 6.2 * dir} 80.6Q${cx - 0.6 * dir} 76.2 ${cx + 6 * dir} 79.8Q${cx + 0.6 * dir} 82.6 ${cx - 6.2 * dir} 80.6Z`;
  const buildEye = (cx, dir, clipId, iris) => {
    iris.append(
      s('circle', { cx, cy: 79.9, r: 2.75, fill: PAL.iris }),
      s('circle', { cx, cy: 79.9, r: 1.3, fill: '#120B07' }),
      s('circle', { cx: cx - 0.9, cy: 78.9, r: 0.75, fill: '#fff' }),
    );
    const eye = g({ class: 'ch-eye' }, [
      s('clipPath', { id: clipId }, s('path', { d: eyeShape(cx, dir) })),
      s('path', { d: eyeShape(cx, dir), fill: PAL.eyeWhite }),
      g({ 'clip-path': `url(#${clipId})` }, [iris, s('path', { d: `M${cx - 7} 76H${cx + 7}V79.2Q${cx} 77.4 ${cx - 7} 79.2Z`, fill: '#9C6C58', opacity: 0.35 })]),
      s('path', { d: `M${cx - 6.6 * dir} 80.8Q${cx - 0.6 * dir} 75.2 ${cx + 6.4 * dir} 79.6`, fill: 'none', stroke: '#2A1A12', 'stroke-width': 1.3, 'stroke-linecap': 'round' }),
    ]);
    eye.style.transformBox = 'view-box';
    eye.style.transformOrigin = `${cx}px 80px`;
    return eye;
  };
  const eyeL = buildEye(117, 1, eyeClip[0], irisL);
  const eyeR = buildEye(143, -1, eyeClip[1], irisR);
  const pupils = g({ class: 'ch-pupils' }, [eyeL, eyeR]);
  const eyes = g({ class: 'ch-eyes' }, pupils);

  // Mâchoire : barbe de trois jours, bouc, bouche articulée (descend quand il parle)
  const stubbleD = 'M99.6 88C100 110 112 131.6 130 131.6C148 131.6 160 110 160.4 88C158 96 154 100.6 148 102.4C142.6 103.6 137 102.6 133 103.4C131 103.8 129 103.8 127 103.4C123 102.6 117.4 103.6 112 102.4C106 100.6 102 96 99.6 88Z';
  const jaw = g({ class: 'ch-jaw' });
  const beardHairs = [];
  for (let i = 0; i < 26; i++) {
    const x = 123.6 + (i % 13) * 1.05 + (i > 12 ? 0.5 : 0);
    const y = 118 + (i > 12 ? 6 : 0) + ((i * 7) % 5) * 0.6;
    beardHairs.push(`M${x.toFixed(1)} ${y.toFixed(1)}l${(((i * 3) % 5) - 2) * 0.25} 2.4`);
  }
  jaw.append(
    // ombre rasée : joues, mâchoire, menton (douce, bleutée)
    s('path', { d: stubbleD, fill: '#4A3A32', opacity: 0.2, filter: `url(#${ids.soft})` }),
    s('path', { d: stubbleD, fill: `url(#${ids.stub})`, opacity: 0.12 }),
    // bouc court : mouche sous la lèvre et menton
    s('path', { d: 'M123.8 115C126.8 117.2 133.2 117.2 136.2 115C138.6 119.2 139 125 136.8 129.8C133.4 131.8 126.6 131.8 123.2 129.8C121 125 121.4 119.2 123.8 115Z', fill: PAL.beard, opacity: 0.48 }),
    s('path', { d: 'M120.6 106.4C119.6 110.4 120.6 114 123.4 116.4M139.4 106.4C140.4 110.4 139.4 114 136.6 116.4', fill: 'none', stroke: PAL.beard, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.22 }),
    s('path', { d: 'M127.4 114.6C128.6 116.6 131.4 116.6 132.6 114.6L131.8 119.6Q130 120.6 128.2 119.6Z', fill: PAL.beard, opacity: 0.5 }),
    s('path', { d: beardHairs.join(''), stroke: PAL.hairLight, 'stroke-width': 0.4, opacity: 0.55 }),
  );
  const mouthClipId = uid('mouth');
  const mouthClip = s('path', {});
  const mouthFill = s('path', { fill: '#5A2420' });
  const lipTop = s('path', { fill: 'none', stroke: '#87412F', 'stroke-width': 1.7, 'stroke-linecap': 'round' });
  const lipBottom = s('path', { fill: 'none', stroke: PAL.lip, 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0 });
  const lipShade = s('path', { fill: 'none', stroke: PAL.skinDeep, 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: 0.5 });
  const mouthG = g({ class: 'ch-mouth' }, [
    s('clipPath', { id: mouthClipId }, mouthClip),
    mouthFill,
    g({ 'clip-path': `url(#${mouthClipId})` }, [
      s('ellipse', { cx: 130, cy: 121, rx: 6.5, ry: 3.4, fill: '#C95A5E' }),
      s('rect', { x: 116, y: 104, width: 28, height: 9.4, rx: 2, fill: '#FBF7F0' }),
    ]),
    lipBottom,
    lipTop,
    lipShade,
  ]);
  jaw.append(mouthG);

  // Sourcils (droits, effilés vers l'extérieur)
  const brows = g({ class: 'ch-brows' }, [
    s('path', { d: 'M108.4 73.6C111 70.6 117 68.8 124.8 70.2L124.6 72.8C118 72 112.4 73.2 109.4 75.6Z', fill: PAL.hair }),
    s('path', { d: 'M151.6 73.6C149 70.6 143 68.8 135.2 70.2L135.4 72.8C142 72 147.6 73.2 150.6 75.6Z', fill: PAL.hair }),
  ]);

  head.append(
    // cou et ombre sous le menton
    s('path', { d: 'M116.4 112L143.6 112L145.6 150Q130 158 114.4 150Z', fill: PAL.skinShade }),
    s('path', { d: 'M116 122Q130 138 144 122L144.6 134Q130 146 115.4 134Z', fill: PAL.skinDeep, opacity: 0.45 }),
    // oreilles
    s('path', { d: 'M101 78.6C95 75.6 91.6 81.6 92.8 88.6C93.8 95.6 97.4 100.6 101.6 99.6Z', fill: PAL.skinShade }),
    s('path', { d: 'M99.2 82.6C96.6 82.2 95.6 86 96.4 89.6C97 93 98.6 95.4 100.2 95.2', fill: 'none', stroke: PAL.skinDeep, 'stroke-width': 1, 'stroke-linecap': 'round' }),
    s('path', { d: 'M159 78.6C165 75.6 168.4 81.6 167.2 88.6C166.2 95.6 162.6 100.6 158.4 99.6Z', fill: PAL.skinShade }),
    s('path', { d: 'M160.8 82.6C163.4 82.2 164.4 86 163.6 89.6C163 93 161.4 95.4 159.8 95.2', fill: 'none', stroke: PAL.skinDeep, 'stroke-width': 1, 'stroke-linecap': 'round' }),
    // visage : ovale allongé, mâchoire nette
    s('path', { d: 'M100 62C100 44 112 33.6 130 33.6C148 33.6 160 44 160 62L161.4 86C161.4 100.6 158.4 112 151.4 121C146.4 127.6 138.6 131.6 130 131.6C121.4 131.6 113.6 127.6 108.6 121C101.6 112 98.6 100.6 98.6 86Z', fill: `url(#${ids.face})` }),
    // modelé : tempe et joue droites à l'ombre, pommettes, front
    s('path', { d: 'M152 60C156 70 158.6 84 158 98C157.4 110 153 120 146 126.6C152.6 124 158.4 114 160.6 102C162 92 161.6 76 160 62Z', fill: PAL.skinShade, opacity: 0.6 }),
    s('ellipse', { cx: 110.6, cy: 94.6, rx: 7.6, ry: 4.6, fill: PAL.blush, opacity: 0.26, filter: `url(#${ids.soft})` }),
    s('ellipse', { cx: 149.6, cy: 94.6, rx: 7.6, ry: 4.6, fill: PAL.blush, opacity: 0.24, filter: `url(#${ids.soft})` }),
    s('ellipse', { cx: 109, cy: 88.6, rx: 4.6, ry: 2.4, fill: PAL.skinLight, opacity: 0.55 }),
    s('ellipse', { cx: 121, cy: 58, rx: 12, ry: 5, fill: PAL.skinLight, opacity: 0.45 }),
    jaw,
    // nez droit : arête, bout, narines (ombre à droite, soleil à gauche)
    s('path', { d: 'M131.6 80.6C132.6 86.6 134.6 92 136 96.2C135 98.4 132.4 99.2 130.2 98.8L130 96.2C132.2 96 133.4 95.4 133.6 94.4C132.4 90.4 131.6 85.6 131.6 80.6Z', fill: PAL.skinShade, opacity: 0.85 }),
    s('ellipse', { cx: 129.4, cy: 95.2, rx: 2.6, ry: 1.9, fill: PAL.skinLight, opacity: 0.7 }),
    s('path', { d: 'M125.4 96.8Q127.4 99.4 129.6 98.6M130.6 98.6Q132.8 99.4 134.8 96.8', fill: 'none', stroke: '#A05E4C', 'stroke-width': 1.1, 'stroke-linecap': 'round' }),
    s('path', { d: 'M127.4 80.6C127.6 86 127.2 90.6 126 93.6', fill: 'none', stroke: PAL.skinShade, 'stroke-width': 0.8, opacity: 0.6 }),
    // sillons du sourire
    s('path', { d: 'M122.4 98.8C118.6 102.6 117.8 107.6 119.4 111.8M137.6 98.8C141.4 102.6 142.2 107.6 140.6 111.8', fill: 'none', stroke: PAL.skinDeep, 'stroke-width': 1, 'stroke-linecap': 'round', opacity: 0.45 }),
    // moustache courte au-dessus de la lèvre
    s('path', { d: 'M120 104.8C123.6 101.6 127.4 101.4 130 102.6C132.6 101.4 136.4 101.6 140 104.8C136.6 104.2 133.2 104.6 130 105.6C126.8 104.6 123.4 104.2 120 104.8Z', fill: PAL.beard, opacity: 0.82 }),
    s('path', { d: 'M121.4 104.2C124.4 102.4 127.4 102.4 129.6 103.4M130.4 103.4C132.6 102.4 135.6 102.4 138.6 104.2', fill: 'none', stroke: PAL.hairLight, 'stroke-width': 0.5, opacity: 0.6 }),
    // pattes d'oie et creux des yeux rieurs
    s('path', { d: 'M110.6 77.4Q117 73.6 123.4 77M136.6 77Q143 73.6 149.4 77.4', fill: 'none', stroke: PAL.skinDeep, 'stroke-width': 0.8, 'stroke-linecap': 'round', opacity: 0.55 }),
    s('path', { d: 'M112 83.4Q117 85.6 122 83.2M138 83.2Q143 85.6 148 83.4', fill: 'none', stroke: PAL.skinDeep, 'stroke-width': 0.8, 'stroke-linecap': 'round', opacity: 0.55 }),
    s('path', { d: 'M106.6 80.6l-3 -1.2M106.8 82.6l-3 0.4M153.4 80.6l3 -1.2M153.2 82.6l3 0.4', fill: 'none', stroke: PAL.skinDeep, 'stroke-width': 0.7, 'stroke-linecap': 'round', opacity: 0.5 }),
    eyes,
    brows,
    // cheveux : courts sur les côtés, volume coiffé vers l'arrière, tempes dégagées
    s('path', { d: 'M98.8 88C97.2 77 97 66 99.2 57C100.6 46 105.6 36.6 113 30.4C116.6 27 120.6 24.6 125 23.2C126.4 21 129.4 19.8 132.4 20.6C135 19.4 138.6 19.6 141 21.2C144.4 21 147.8 22.4 150.2 24.8C155.6 27.6 159.8 32.6 162 38.6C164 44 164.4 50 164 56C163.6 66 162.8 77 161.4 88L159.4 88C159.2 79 158.8 70.6 157.4 63.4C156.4 58.4 154 54.4 150.6 52.2C147.6 50.6 144.4 50.6 141.4 51.6C138.4 50 134.8 49.4 131.4 50.2C128 49.6 124.4 50 121.4 51.4C117.6 50.2 113.4 50.4 110.2 52.2C106.4 54.4 103.8 58.6 102.6 63.6C101.4 70.6 100.8 79 100.6 88Z', fill: `url(#${ids.hairG})` }),
    // tempes dégagées : la peau remonte en golfe de chaque côté
    s('path', { d: 'M102.4 64C103.6 58.6 106.4 54.8 110.4 52.6C108.8 57 108.4 61.6 109 66.4C106.4 65.4 104.2 64.8 102.4 64Z M157.6 64C156.4 58.6 153.6 54.8 149.6 52.6C151.2 57 151.6 61.6 151 66.4C153.6 65.4 155.8 64.8 157.6 64Z', fill: PAL.skin }),
    // mèches coiffées vers l'arrière, reflets et petits épis
    s('path', { d: 'M112 50C116 40 124 33.6 136 31.6M118.6 49.6C122.4 41.6 130 36.4 142 35.6M126 49C129.4 42.6 136 39 147.6 39.6M134 49.4C138 44 144.6 41.6 153.6 43.6M141 50.6C146 47.6 151.6 47 156.6 49.6M106 56C107.6 46 113 37.6 121.6 32', fill: 'none', stroke: PAL.hairLight, 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.85 }),
    s('path', { d: 'M115.6 51C119 44 125 39 133 36.6M130 49.8C133.6 44.6 139.4 42 146.6 42.4M121.4 28.6C125 25.6 130 24 135 24.4', fill: 'none', stroke: '#76604C', 'stroke-width': 0.9, 'stroke-linecap': 'round', opacity: 0.7 }),
    // pattes courtes devant les oreilles
    s('path', { d: 'M99.4 78L102 77.6L101.8 90.6L99.8 89.4Z M160.6 78L158 77.6L158.2 90.6L160.2 89.4Z', fill: PAL.hair, opacity: 0.85 }),
  );
  torso.append(head);

  // Cagette de radis (devant le bras gauche)
  let crateG = null;
  if (!bar) {
    crateG = g({ class: 'ch-crate-wrap fx-box' }, [radishPile(rnd), crate()]);
    // Main gauche qui tient le bord de la cagette
    crateG.append(
      s('path', { d: 'M172 299.6C170 308 176 314 186 313C196 312 200 306 198 298.6Z', fill: PAL.skin }),
      s('path', { d: 'M178 302v6M184 302v7M190 302v6', stroke: PAL.skinShade, 'stroke-width': 1, 'stroke-linecap': 'round' }),
      s('path', { d: 'M172 299.6C171.4 303 172 306 173.6 308.6', fill: 'none', stroke: PAL.skinDeep, 'stroke-width': 0.9, opacity: 0.6 }),
    );
    torso.append(crateG);
  }

  // Bras droit (pendant) : bras + avant-bras articulé pour saluer
  const { arm: armR, forearm } = buildArm();
  torso.append(armR);
  // Au bar : bras gauche articulé lui aussi (le bras droit en miroir, même repère intérieur), avec la montre
  let armL = null;
  let forearmL = null;
  if (bar) {
    ({ arm: armL, forearm: forearmL } = buildArm({ watch: true }));
    torso.append(g({ class: 'ch-arm-l', transform: 'matrix(-1 0 0 1 260 0)' }, armL));
  }

  // Formes de bouche (visèmes) : largeur, coins, lèvre du haut, lèvre du bas
  const VISEMES = {
    smile: { w: 9.6, cy: 108.6, tc: 116, bc: 116 },
    happy: { w: 11.6, cy: 107.4, tc: 116.6, bc: 122.6 },
    A: { w: 8.4, cy: 108.8, tc: 113, bc: 125.5 },
    E: { w: 10.4, cy: 108.4, tc: 114.2, bc: 121.2 },
    O: { w: 6, cy: 110, tc: 105.6, bc: 124.5 },
    M: { w: 8.8, cy: 109.8, tc: 112.4, bc: 112.8 },
  };
  let mouthState = { ...VISEMES.smile };
  function drawMouth(m) {
    const L = (130 - m.w).toFixed(2);
    const Rr = (130 + m.w).toFixed(2);
    const cy = m.cy.toFixed(2);
    const top = `M${L} ${cy}Q130 ${m.tc.toFixed(2)} ${Rr} ${cy}`;
    const shape = `${top}Q130 ${m.bc.toFixed(2)} ${L} ${cy}Z`;
    mouthClip.setAttribute('d', shape);
    mouthFill.setAttribute('d', shape);
    lipTop.setAttribute('d', top);
    lipBottom.setAttribute('d', `M${(130 - m.w + 1.6).toFixed(2)} ${(m.cy + 0.6).toFixed(2)}Q130 ${(m.bc + 0.8).toFixed(2)} ${(130 + m.w - 1.6).toFixed(2)} ${(m.cy + 0.6).toFixed(2)}`);
    // petit creux sous la lèvre (ombre), qui suit l'ouverture
    lipShade.setAttribute('d', `M${(130 - m.w * 0.45).toFixed(2)} ${(Math.max(m.bc, m.tc) + 2.6).toFixed(2)}Q130 ${(Math.max(m.bc, m.tc) + 3.6).toFixed(2)} ${(130 + m.w * 0.45).toFixed(2)} ${(Math.max(m.bc, m.tc) + 2.6).toFixed(2)}`);
    const open = Math.max(0, m.bc - m.tc);
    lipBottom.setAttribute('opacity', Math.min(0.85, open / 6).toFixed(2));
    jaw.setAttribute('transform', `translate(0 ${(open * 0.16).toFixed(2)})`);
    mouthState = m;
  }
  drawMouth(mouthState);
  const mix = (a, b, t) => ({ w: a.w + (b.w - a.w) * t, cy: a.cy + (b.cy - a.cy) * t, tc: a.tc + (b.tc - a.tc) * t, bc: a.bc + (b.bc - a.bc) * t });
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  let talkRun = 0;
  /** Articule pendant `ms` : suite de syllabes interpolées, puis retour au sourire. */
  function talk(ms = 1400) {
    const my = ++talkRun;
    if (isReduced()) return Promise.resolve();
    const seq = ['A', 'E', 'M', 'O', 'A', 'E', 'A', 'M', 'E', 'O'];
    // Chaque syllabe fait un petit murmure (voyelle filtrée)
    const pick = (prev) => {
      let v;
      do v = seq[Math.floor(Math.random() * seq.length)]; while (VISEMES[v] === prev);
      sfx('voice', { v });
      return VISEMES[v];
    };
    return new Promise((resolve) => {
      const start = performance.now();
      let from = { ...mouthState };
      let to = pick(null);
      let t0 = start;
      let dur = 85;
      let hold = 120;
      let ending = false;
      const frame = (now) => {
        if (my !== talkRun) return resolve();
        const k = Math.min(1, (now - t0) / dur);
        drawMouth(mix(from, to, ease(k)));
        if (ending && k >= 1) return resolve();
        if (!ending && now - t0 > hold) {
          ending = now - start > ms;
          from = { ...mouthState };
          to = ending ? VISEMES.smile : pick(to);
          dur = ending ? 140 : 70 + Math.random() * 40;
          hold = 100 + Math.random() * 90;
          t0 = now;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  const parts = { root, body, torso, head, eyes, eyeL, eyeR, pupils, mouth: mouthG, armR, forearm, armL, forearmL, crate: crateG };
  let waving = false;

  const api = {
    g: root,
    parts,
    blink() {
      const kf = [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)' }, { transform: 'scaleY(1)' }];
      anim(eyeL, kf, { duration: 190, easing: 'ease-in-out', fill: 'none' });
      return anim(eyeR, kf, { duration: 190, easing: 'ease-in-out', fill: 'none' });
    },
    /** Clin d'œil complice. */
    wink() {
      anim(brows, [{ transform: 'translateY(0)' }, { transform: 'translateY(1.5px)' }, { transform: 'translateY(0)' }], { duration: 460, fill: 'none' });
      return anim(eyeR, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.06)', offset: 0.3 }, { transform: 'scaleY(.06)', offset: 0.7 }, { transform: 'scaleY(1)' }], { duration: 460, easing: 'ease-in-out', fill: 'none' });
    },
    /** Grand sourire (true) ou sourire simple (false). */
    smile(big = true) {
      talkRun++;
      const from = { ...mouthState };
      const to = big ? VISEMES.happy : VISEMES.smile;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 220);
        drawMouth(mix(from, to, ease(k)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    idle(ambient) {
      ambient.add(anim(torso, [{ transform: 'translateY(0) scaleY(1)' }, { transform: 'translateY(-1.2px) scaleY(1.006)' }], {
        duration: 1900, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none',
      }));
      ambient.add(anim(head, [{ transform: 'rotate(-1.4deg)' }, { transform: 'rotate(1.6deg)' }], {
        duration: 4200, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none',
      }));
      const leaves = root.querySelector('.ch-leaves');
      if (leaves) {
        leaves.style.transformBox = 'fill-box';
        leaves.style.transformOrigin = '50% 100%';
        ambient.add(anim(leaves, [{ transform: 'rotate(-2deg)' }, { transform: 'rotate(2.5deg)' }], {
          duration: 2300, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none',
        }));
      }
      ambient.every(3800, () => api.blink(), 2600);
    },
    /** Salut de la main. */
    async wave() {
      if (waving || isReduced()) return;
      waving = true;
      const up = anim(armR, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(148deg)' }], { duration: 420, easing: EASE.back });
      const bend = anim(forearm, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(26deg)' }], { duration: 420, easing: EASE.out });
      await up?.finished.catch(() => {});
      const shake = anim(forearm, [
        { transform: 'rotate(26deg)' },
        { transform: 'rotate(-8deg)' },
        { transform: 'rotate(30deg)' },
        { transform: 'rotate(-6deg)' },
        { transform: 'rotate(26deg)' },
      ], { duration: 900, easing: EASE.inOut });
      await shake?.finished.catch(() => {});
      const down = anim(armR, [{ transform: 'rotate(148deg)' }, { transform: 'rotate(0deg)' }], { duration: 520, easing: EASE.inOut });
      const unbend = anim(forearm, [{ transform: 'rotate(26deg)' }, { transform: 'rotate(0deg)' }], { duration: 520, easing: EASE.inOut });
      await down?.finished.catch(() => {});
      [up, bend, shake, down, unbend].forEach((a) => a && a.cancel());
      waving = false;
    },
    /** Fait parler la bouche pendant `ms` (les sourcils suivent). */
    async say(ms = 1400) {
      if (isReduced()) return;
      anim(brows, [{ transform: 'translateY(0)' }, { transform: 'translateY(-1.6px)' }, { transform: 'translateY(0)' }], { duration: Math.min(ms, 900), easing: EASE.inOut, fill: 'none' });
      await talk(ms);
    },
    /** Oriente le regard (valeurs -1..1) : les iris bougent dans le blanc des yeux. */
    look(x = 0, y = 0) {
      const t = `translate(${(x * 1.6).toFixed(2)} ${(y * 0.9).toFixed(2)})`;
      irisL.setAttribute('transform', t);
      irisR.setAttribute('transform', t);
    },
  };
  return api;
}
