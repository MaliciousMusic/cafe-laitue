// Le primeur, dessiné en SVG (vue de face, cagette de radis sous le bras).
// Repère : viewBox 0 0 300 580, pieds vers y = 566. Tout est groupé pour être animé.

import { s, g, rng, uid } from '../lib/svg.js';
import { anim, EASE, isReduced, wait } from '../lib/motion.js';
import { play as sfx } from '../lib/sound.js';

export const PAL = {
  skin: '#E2AE91',
  skinShade: '#CC9075',
  skinDeep: '#B97B62',
  blush: '#E98E7C',
  hair: '#2B211A',
  hairLight: '#44352A',
  beard: '#3A2A21',
  denim: '#516E94',
  denimDark: '#3E5779',
  denimLight: '#6D89AF',
  stitch: '#A4B8D1',
  button: '#1F2837',
  pants: '#5E5C46',
  pantsDark: '#4A4836',
  shoe: '#3A2B22',
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

function crate() {
  const G = g({ class: 'ch-crate' });
  G.append(
    s('path', { d: 'M286 232 L297 222 L297 292 L286 302 Z', fill: PAL.crateShade }),
    s('rect', { x: 150, y: 232, width: 136, height: 70, rx: 3, fill: PAL.crate }),
    s('rect', { x: 150, y: 232, width: 9, height: 70, fill: PAL.crateShade }),
    s('rect', { x: 277, y: 232, width: 9, height: 70, fill: PAL.crateShade }),
    s('path', { d: 'M159 255 H277 M159 279 H277', stroke: PAL.crateLine, 'stroke-width': 1.3 }),
    s('rect', { x: 150, y: 232, width: 136, height: 5, fill: PAL.crateLine, opacity: 0.55 }),
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
export function createCharacter({ seed = 4 } = {}) {
  const rnd = rng(seed);
  const root = g({ class: 'ch' });
  const body = g({ class: 'ch-body fx-bottom' });
  root.append(body);

  // Jambes & chaussures
  const legs = g({ class: 'ch-legs' }, [
    s('path', { d: 'M70 318 L128 318 L126 372 L119 550 L84 550 L74 372 Z', fill: PAL.pants }),
    s('path', { d: 'M132 318 L190 318 L186 372 L176 550 L141 550 L134 372 Z', fill: PAL.pants }),
    s('path', { d: 'M118 380 L119 550 L110 550 Z M134 380 L141 550 L150 550 Z', fill: PAL.pantsDark, opacity: 0.55 }),
    s('path', { d: 'M78 544 L121 544 C126 552 126 562 119 566 L70 566 C62 563 66 550 78 544 Z', fill: PAL.shoe }),
    s('path', { d: 'M139 544 L182 544 C194 550 198 562 190 566 L141 566 C134 562 134 552 139 544 Z', fill: PAL.shoe }),
  ]);
  body.append(legs);

  // Buste (respire)
  const torso = g({ class: 'ch-torso fx-bottom' });
  body.append(torso);

  // Bras gauche (côté cagette) — derrière la cagette
  const armL = g({ class: 'ch-arm-l' }, [
    s('path', { d: 'M186 160 C201 166 209 186 211 212 L213 250 L192 252 L190 214 C188 196 184 178 182 166 Z', fill: PAL.denim }),
    s('path', { d: 'M205 214 L213 250 L206 251 Z', fill: PAL.denimDark, opacity: 0.4 }),
  ]);
  torso.append(armL);

  // Chemise
  torso.append(
    s('path', {
      d: 'M72 158 C86 148 104 146 116 146 L144 146 C156 146 174 148 188 158 C198 165 202 180 200 196 L197 326 C176 334 84 334 63 326 L60 196 C58 180 62 165 72 158 Z',
      fill: PAL.denim,
    }),
    s('path', { d: 'M60 196 C62 250 62 300 63 326 C69 329 75 330 81 331 C77 290 74 240 73 204 Z', fill: PAL.denimDark, opacity: 0.45 }),
    s('path', { d: 'M200 196 C198 250 198 300 197 326 C191 329 185 330 179 331 C183 290 186 240 187 204 Z', fill: PAL.denimDark, opacity: 0.45 }),
    // Encolure ouverte
    s('path', { d: 'M119 146 L130 168 L141 146 Z', fill: PAL.skinShade }),
    s('path', { d: 'M113 141 Q130 151 147 141 L147 147 Q130 158 113 147 Z', fill: PAL.denimDark }),
    // Col
    s('path', { d: 'M116 143 L103 172 L129 161 Z', fill: PAL.denimLight, stroke: PAL.denimDark, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }),
    s('path', { d: 'M144 143 L157 172 L131 161 Z', fill: PAL.denimLight, stroke: PAL.denimDark, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }),
    // Patte de boutonnage
    s('path', { d: 'M130 166 V330', stroke: PAL.denimDark, 'stroke-width': 1.6 }),
    s('path', { d: 'M135.5 166 V330', stroke: PAL.stitch, 'stroke-width': 0.8, 'stroke-dasharray': '2 2', opacity: 0.7 }),
    ...[182, 214, 246, 278, 310].map((y) => s('circle', { cx: 132.6, cy: y, r: 2.3, fill: PAL.button })),
    // Poche poitrine
    s('path', { d: 'M147 186 H172 V210 Q159.5 214 147 210 Z', fill: 'none', stroke: PAL.denimDark, 'stroke-width': 1.3 }),
    s('path', { d: 'M147 186 H172 L170 194 L159.5 197 L149 194 Z', fill: PAL.denimDark, opacity: 0.35 }),
    // Coutures d'épaule
    s('path', { d: 'M78 160 Q86 176 84 196 M182 160 Q174 176 176 196', stroke: PAL.denimDark, 'stroke-width': 1, fill: 'none', opacity: 0.6 }),
  );

  // Tête (s'incline)
  const head = g({ class: 'ch-head' });
  head.style.transformBox = 'view-box';
  head.style.transformOrigin = '130px 140px';

  // Yeux séparés (clignement, clin d'œil) + pupilles qui suivent le regard
  const pupils = g({ class: 'ch-pupils' });
  const eyeL = g({ class: 'ch-eye' }, [
    s('ellipse', { cx: 117, cy: 80, rx: 3.3, ry: 3.7, fill: '#2A1E17' }),
    s('circle', { cx: 118.3, cy: 78.7, r: 1.05, fill: '#fff' }),
  ]);
  const eyeR = g({ class: 'ch-eye' }, [
    s('ellipse', { cx: 143, cy: 80, rx: 3.3, ry: 3.7, fill: '#2A1E17' }),
    s('circle', { cx: 144.3, cy: 78.7, r: 1.05, fill: '#fff' }),
  ]);
  [[eyeL, 117], [eyeR, 143]].forEach(([e, x]) => {
    e.style.transformBox = 'view-box';
    e.style.transformOrigin = `${x}px 80px`;
  });
  pupils.append(eyeL, eyeR);
  const eyes = g({ class: 'ch-eyes' }, pupils);

  // Barbe de trois jours : ombre rasée uniforme (joues, menton, lèvre supérieure)
  const stubbleId = uid('stubble');
  const softId = uid('soft');
  const stubbleD = 'M100 86 C100 112 114 132 130 132 C146 132 160 112 160 86 C158 94 154 99 148 101 C142 102.5 138 101.5 134 101 C131 100.5 129 100.5 126 101 C122 101.5 118 102.5 112 101 C106 99 102 94 100 86 Z';
  const defs = s('defs', {}, [
    s('pattern', { id: stubbleId, width: 2.6, height: 2.6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(20)' }, [
      s('circle', { cx: 0.8, cy: 0.8, r: 0.42, fill: PAL.beard }),
      s('circle', { cx: 2.1, cy: 1.9, r: 0.36, fill: PAL.beard }),
    ]),
    s('filter', { id: softId, x: '-15%', y: '-15%', width: '130%', height: '130%' }, s('feGaussianBlur', { stdDeviation: 2.2 })),
    s('filter', { id: `${softId}-t`, x: '-10%', y: '-10%', width: '120%', height: '120%' }, s('feGaussianBlur', { stdDeviation: 0.7 })),
  ]);
  const jaw = g({ class: 'ch-jaw' });
  jaw.append(
    s('path', { d: stubbleD, fill: PAL.beard, opacity: 0.15, filter: `url(#${softId})` }),
    s('path', { d: stubbleD, fill: `url(#${stubbleId})`, opacity: 0.5, filter: `url(#${softId}-t)` }),
  );

  // Bouche articulée : intérieur, dents, langue, lèvres (formes interpolées)
  const mouthClipId = uid('mouth');
  const mouthClip = s('path', {});
  const mouthFill = s('path', { fill: '#5E2620' });
  const lipTop = s('path', { fill: 'none', stroke: '#7B3A2C', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
  const lipBottom = s('path', { fill: 'none', stroke: '#9A4F43', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0 });
  const mouthG = g({ class: 'ch-mouth' }, [
    s('clipPath', { id: mouthClipId }, mouthClip),
    mouthFill,
    g({ 'clip-path': `url(#${mouthClipId})` }, [
      s('ellipse', { cx: 130, cy: 121, rx: 6.5, ry: 3.4, fill: '#C95A5E' }),
      s('rect', { x: 116, y: 104, width: 28, height: 9.6, rx: 2, fill: '#FBF7F0' }),
    ]),
    lipBottom,
    lipTop,
  ]);
  jaw.append(mouthG);

  const brows = s('path', { d: 'M110 70 Q117 65.5 124.5 69 M135.5 69 Q143 65.5 150 70', fill: 'none', stroke: PAL.hair, 'stroke-width': 3.4, 'stroke-linecap': 'round', class: 'ch-brows' });
  head.append(
    defs,
    s('path', { d: 'M117 118 L143 118 L145 150 Q130 158 115 150 Z', fill: PAL.skinShade }),
    s('ellipse', { cx: 98, cy: 88, rx: 7, ry: 11, fill: PAL.skinShade }),
    s('ellipse', { cx: 162, cy: 88, rx: 7, ry: 11, fill: PAL.skinShade }),
    s('path', { d: 'M100 62 C100 38 160 38 160 62 L161 92 C161 117 145 131 130 131 C115 131 99 117 99 92 Z', fill: PAL.skin }),
    s('ellipse', { cx: 110, cy: 94, rx: 6.5, ry: 3.4, fill: PAL.blush, opacity: 0.26 }),
    s('ellipse', { cx: 150, cy: 94, rx: 6.5, ry: 3.4, fill: PAL.blush, opacity: 0.26 }),
    jaw,
    // Nez
    s('path', { d: 'M129 82 Q125.5 95 130 97.5 Q134 98.5 136 95.5', fill: 'none', stroke: PAL.skinDeep, 'stroke-width': 2, 'stroke-linecap': 'round' }),
    // Yeux rieurs
    s('path', { d: 'M112 86 Q117 88.5 122 86 M138 86 Q143 88.5 148 86', fill: 'none', stroke: PAL.skinDeep, 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: 0.6 }),
    eyes,
    brows,
    // Cheveux : courts, coiffés vers l'arrière, volume discret
    s('path', { d: 'M99 82 C95 70 95 59 99 51 C101 43 106 36 114 31.5 C121 27.5 129 26 137 26.5 C146 27 154 30 159 36 C164 42 166 50 165 58 C165 66 164 74 161 82 C160 74 159 68 156 63 C154 58 150 55 144 54 C138 51 130 50.5 122 52 C115 53 109 56 106 60 C103 65 101 73 99 82 Z', fill: PAL.hair }),
    s('path', { d: 'M109 44 C117 35 131 31 147 33.5 M113 50 C121 42 135 38 151 40.5 M147 32 C155 35 160 41 161.5 49', fill: 'none', stroke: '#54432F', 'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: 0.75 }),
    s('path', { d: 'M99.5 78 L102 77.5 L101.8 91 L99.8 89.5 Z M160.5 78 L158 77.5 L158.2 91 L160.2 89.5 Z', fill: PAL.hair, opacity: 0.85 }),
  );
  torso.append(head);

  // Cagette de radis (devant le bras gauche)
  const crateG = g({ class: 'ch-crate-wrap fx-box' }, [radishPile(rnd), crate()]);
  // Main gauche qui tient le bord de la cagette
  crateG.append(
    s('path', { d: 'M172 300 C170 308 176 314 186 313 C196 312 200 306 198 299 Z', fill: PAL.skin }),
    s('path', { d: 'M178 302 v6 M184 302 v7 M190 302 v6', stroke: PAL.skinShade, 'stroke-width': 1, 'stroke-linecap': 'round' }),
  );
  torso.append(crateG);

  // Bras droit (pendant) : bras + avant-bras articulé pour saluer
  const armR = g({ class: 'ch-arm-r' });
  armR.style.transformBox = 'view-box';
  armR.style.transformOrigin = '76px 164px';
  const forearm = g({ class: 'ch-forearm' });
  forearm.style.transformBox = 'view-box';
  forearm.style.transformOrigin = '60px 248px';
  forearm.append(
    s('path', { d: 'M49 244 L46 322 L68 324 L72 246 Z', fill: PAL.denim }),
    s('path', { d: 'M45 310 L68 312 L67 330 L44 328 Z', fill: PAL.denimLight }),
    s('path', { d: 'M45 318 L67 320', stroke: PAL.denimDark, 'stroke-width': 0.9, opacity: 0.6 }),
    s('rect', { x: 46, y: 329, width: 20, height: 4.2, rx: 2, fill: '#1B1B1B' }),
    s('path', { d: 'M46 332 C43 348 48 360 57 362 C66 363 70 350 68 334 Z', fill: PAL.skin }),
    s('path', { d: 'M47 340 C43 344 43 350 46 353', fill: 'none', stroke: PAL.skinShade, 'stroke-width': 1.2, 'stroke-linecap': 'round' }),
  );
  armR.append(
    s('path', { d: 'M74 160 C60 166 52 186 50 212 L49 250 L72 250 L74 214 C76 196 78 178 80 166 Z', fill: PAL.denim }),
    s('path', { d: 'M52 206 C50 226 50 238 49 250 L56 250 C56 232 57 220 60 206 Z', fill: PAL.denimDark, opacity: 0.4 }),
    forearm,
  );
  torso.append(armR);

  // Formes de bouche (visèmes) : largeur, coins, lèvre du haut, lèvre du bas
  const VISEMES = {
    smile: { w: 10, cy: 108, tc: 116, bc: 116 },
    happy: { w: 12, cy: 106.5, tc: 117, bc: 123 },
    A: { w: 8.6, cy: 108.4, tc: 113, bc: 125.5 },
    E: { w: 10.6, cy: 108, tc: 114.2, bc: 121.2 },
    O: { w: 6.2, cy: 109.6, tc: 105.2, bc: 124.5 },
    M: { w: 9, cy: 109.5, tc: 112.2, bc: 112.6 },
  };
  let mouthState = { ...VISEMES.smile };
  function drawMouth(m) {
    const L = (130 - m.w).toFixed(2);
    const R = (130 + m.w).toFixed(2);
    const cy = m.cy.toFixed(2);
    const top = `M${L} ${cy}Q130 ${m.tc.toFixed(2)} ${R} ${cy}`;
    const shape = `${top}Q130 ${m.bc.toFixed(2)} ${L} ${cy}Z`;
    mouthClip.setAttribute('d', shape);
    mouthFill.setAttribute('d', shape);
    lipTop.setAttribute('d', top);
    lipBottom.setAttribute('d', `M${(130 - m.w + 1.6).toFixed(2)} ${(m.cy + 0.6).toFixed(2)}Q130 ${(m.bc + 0.8).toFixed(2)} ${(130 + m.w - 1.6).toFixed(2)} ${(m.cy + 0.6).toFixed(2)}`);
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

  const parts = { root, body, torso, head, eyes, eyeL, eyeR, pupils, mouth: mouthG, armR, forearm, crate: crateG };
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
    /** Oriente le regard (valeurs -1..1). */
    look(x = 0, y = 0) {
      pupils.setAttribute('transform', `translate(${(x * 2.2).toFixed(2)} ${(y * 1.6).toFixed(2)})`);
    },
  };
  return api;
}
