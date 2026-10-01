// Le bar à jus vu de face : Vincent derrière son comptoir, l'extracteur et le verre.
// Chaque ingrédient choisi vole jusqu'à la trémie, Vincent le pousse dans l'extracteur,
// le jus coule dans le verre, qui prend la couleur du mélange. viewBox 0 0 400 270.

import { s, g, svgRoot, uid, f2 } from '../lib/svg.js';
import { anim, EASE, isReduced } from '../lib/motion.js';
import { channel } from '../lib/sound.js';
import { createCharacter, ARM } from './character.js';
import { drawProduce, crateHeap, crateFront } from './produce.js';
import { BRAND, brandFontsReady } from './stamp.js';
import { VESSELS, vesselBack, vesselFront, liquidEls, strawEl, wheel, hw, lerp, easeInOut } from './glass.js';
import { BY_ID, juiceColor } from '../data/juicebar.js';

const FONT_CHALK = '"Caveat", "Segoe Print", cursive';
const BACK = 188; // bord arrière du comptoir : Vincent est caché en dessous
const BASE = 193; // pose des objets sur le comptoir
const CH = { tx: 74.6, ty: 22, k: 0.58 }; // Vincent : repère du personnage → scène
const PLUNGER = [274, 56]; // poussoir de l'extracteur (en haut)
const SPOUT = [228, 128]; // bec verseur
const CRATE = [48, 168]; // d'où partent les fruits des classiques
const GLASS = { x: 218, k: 0.42 };
const V = VESSELS.juice;
const MAX = V.h * 0.84;
const pause = (ms) => new Promise((r) => setTimeout(r, isReduced() ? 0 : ms));
const norm = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

/** Angles (degrés) du bras puis de l'avant-bras pour poser la main en `t` (repère du bras droit). */
function ik(t) {
  const [sx, sy] = ARM.shoulder;
  const [ex, ey] = ARM.elbow;
  const [hx, hy] = ARM.hand;
  const L1 = Math.hypot(ex - sx, ey - sy);
  const L2 = Math.hypot(hx - ex, hy - ey);
  const u1 = Math.atan2(ey - sy, ex - sx);
  const u2 = Math.atan2(hy - ey, hx - ex);
  const d = Math.min(L1 + L2 - 0.5, Math.max(Math.abs(L1 - L2) + 0.5, Math.hypot(t[0] - sx, t[1] - sy)));
  const phi = Math.atan2(t[1] - sy, t[0] - sx);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const a1 = phi + alpha; // coude vers le bas
  const E = [sx + L1 * Math.cos(a1), sy + L1 * Math.sin(a1)];
  const a2 = Math.atan2(sy + d * Math.sin(phi) - E[1], sx + d * Math.cos(phi) - E[0]);
  const deg = (r) => (r * 180) / Math.PI;
  const t1 = norm(deg(a1 - u1));
  return [t1, norm(deg(a2 - u2) - t1)];
}

/** Point de la scène → repère intérieur du bras gauche (miroir du bras droit). */
const leftTarget = ([x, y]) => [260 - (x - CH.tx) / CH.k, (y - CH.ty) / CH.k];

function bottle(x, color, h) {
  return g({ transform: `translate(${x} 64)` }, [
    s('path', { d: `M-6 0L-6 ${-h + 8}Q-6 ${-h + 4} -3 ${-h + 2}L-3 ${-h - 3}L3 ${-h - 3}L3 ${-h + 2}Q6 ${-h + 4} 6 ${-h + 8}L6 0Z`, fill: 'rgba(255,255,255,.3)', stroke: BRAND.forest, 'stroke-width': 1.2 }),
    s('rect', { x: -5, y: -h + 9, width: 10, height: h - 10, rx: 2, fill: color }),
    s('rect', { x: -5, y: -h + 14, width: 10, height: 6, fill: BRAND.cream, opacity: 0.85 }),
    s('rect', { x: -3.4, y: -h - 6, width: 6.8, height: 4, rx: 1, fill: BRAND.forest }),
  ]);
}

export async function createJuiceBar() {
  await brandFontsReady();
  const svg = svgRoot('0 0 400 270', { preserveAspectRatio: 'xMidYMax slice', class: 'juicebar' });
  const sfx = channel();

  // --- Mur carrelé vert, lampe, étagère de jus, ardoise
  const tiles = [];
  for (let y = -10, row = 0; y < BACK; y += 10, row++) {
    tiles.push(`M-60 ${y}H460`);
    for (let x = -60 + (row % 2) * 10; x < 460; x += 20) tiles.push(`M${x} ${y}v10`);
  }
  const glow = uid('glow');
  svg.append(
    s('defs', {}, s('radialGradient', { id: glow, cx: 0.5, cy: 0.5, r: 0.5 }, [
      s('stop', { offset: 0, 'stop-color': '#FFE6A3', 'stop-opacity': 0.42 }),
      s('stop', { offset: 1, 'stop-color': '#FFE6A3', 'stop-opacity': 0 }),
    ])),
    s('rect', { x: -60, y: -40, width: 520, height: 330, fill: '#2E5B3F' }),
    s('path', { d: tiles.join(''), stroke: '#3B6B4C', 'stroke-width': 1, fill: 'none' }),
  );
  const lampGlow = s('ellipse', { cx: 222, cy: 52, rx: 110, ry: 62, fill: `url(#${glow})` });
  svg.append(
    lampGlow,
    s('path', { d: 'M222 -10V14', stroke: '#1B1B1B', 'stroke-width': 1.4 }),
    s('path', { d: 'M209 14H235L241 28H203Z', fill: '#F3E6C4', stroke: BRAND.forest, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }),
    s('ellipse', { cx: 222, cy: 29, rx: 7, ry: 2.4, fill: '#FFE6A3' }),
  );
  const shelf = g({ class: 'jb-shelf' }, [
    s('rect', { x: 10, y: 64, width: 112, height: 6, fill: '#B98B5A' }),
    s('rect', { x: 10, y: 70, width: 112, height: 3, fill: '#000', opacity: 0.18 }),
  ]);
  [['#F4972E', 30], ['#9BC24A', 34], ['#D8436A', 28], ['#F2DA5A', 32], ['#8C3B6E', 30]].forEach(([c, h], i) => shelf.append(bottle(22 + i * 22, c, h)));
  svg.append(shelf);
  svg.append(g({ class: 'jb-slate', transform: 'translate(294 12)' }, [
    s('rect', { x: 0, y: 0, width: 76, height: 52, rx: 4, fill: '#22302A', stroke: '#B98B5A', 'stroke-width': 4 }),
    s('text', { x: 38, y: 23, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 19, 'font-weight': 600, fill: BRAND.cream, text: 'Bar à jus' }),
    s('text', { x: 38, y: 41, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 13, fill: '#DCE7C9', text: '3 · 5 · 7' }),
  ]));

  // --- Comptoir (dessus en zinc, façade en bois)
  const planks = [];
  for (let x = -20; x < 420; x += 26) planks.push(`M${x} 200V290`);
  svg.append(g({ class: 'jb-counter' }, [
    s('rect', { x: -20, y: BACK, width: 440, height: 9, fill: '#C9D2D4' }),
    s('rect', { x: -20, y: BACK, width: 440, height: 1.6, fill: '#EEF2F3' }),
    s('rect', { x: -20, y: 197, width: 440, height: 4, fill: '#8F9A9E' }),
    s('rect', { x: -20, y: 201, width: 440, height: 90, fill: '#A8744A' }),
    s('path', { d: planks.join(''), stroke: '#8E5E38', 'stroke-width': 1.4 }),
    s('rect', { x: -20, y: 201, width: 440, height: 5, fill: '#000', opacity: 0.16 }),
  ]));

  // --- Sur le comptoir : cagette d'oranges, extracteur, verre
  svg.append(g({ transform: `translate(4 ${BASE - 22})` }, [crateHeap('orange', { w: 88, h: 22, scale: 1.05, seed: 3 }), crateFront(88, 22, { tone: 1 })]));

  const steel = uid('steel');
  const plunger = g({ class: 'jb-plunger' }, [
    s('rect', { x: 266, y: 56, width: 16, height: 18, fill: '#D7DDE0', stroke: '#8E9AA2', 'stroke-width': 1 }),
    s('ellipse', { cx: 274, cy: 56, rx: 9, ry: 3, fill: '#EEF1F2', stroke: '#8E9AA2', 'stroke-width': 1 }),
    s('rect', { x: 270, y: 49, width: 8, height: 7, rx: 2, fill: '#2C3438' }),
  ]);
  const light = s('circle', { cx: 296, cy: 151, r: 2.4, fill: '#5FA36A' });
  const machine = g({ class: 'jb-juicer' }, [
    s('defs', {}, s('linearGradient', { id: steel, x1: 0, y1: 0, x2: 1, y2: 0 }, [
      s('stop', { offset: 0, 'stop-color': '#B9C3C8' }),
      s('stop', { offset: 0.35, 'stop-color': '#EEF1F2' }),
      s('stop', { offset: 1, 'stop-color': '#A9B4BA' }),
    ])),
    s('path', { d: 'M244 119L232 122Q228 123 228 128', fill: 'none', stroke: '#6E7A80', 'stroke-width': 8, 'stroke-linecap': 'round' }),
    s('path', { d: 'M244 119L232 122Q228 123 228 128', fill: 'none', stroke: '#D7DDE0', 'stroke-width': 5, 'stroke-linecap': 'round' }),
    plunger,
    s('rect', { x: 263, y: 70, width: 22, height: 36, fill: `url(#${steel})`, stroke: '#6E7A80', 'stroke-width': 1.4 }),
    s('ellipse', { cx: 274, cy: 70, rx: 11, ry: 3, fill: '#3A4448', stroke: '#6E7A80', 'stroke-width': 1.2 }),
    s('rect', { x: 242, y: 104, width: 64, height: 84, rx: 10, fill: `url(#${steel})`, stroke: '#6E7A80', 'stroke-width': 1.6 }),
    s('rect', { x: 242, y: 146, width: 64, height: 10, fill: '#2C3438' }),
    light,
    s('path', { d: 'M250 112V182', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.55 }),
    s('rect', { x: 236, y: 187, width: 76, height: 6, rx: 2, fill: '#8F9A9E' }),
  ]);
  machine.style.transformBox = 'fill-box';
  machine.style.transformOrigin = '50% 100%';
  svg.append(machine);

  const stream = s('path', { fill: 'none', 'stroke-width': 3.2, 'stroke-linecap': 'round', opacity: 0 });
  const liquid = liquidEls(V);
  const garnish = g({ class: 'jb-garnish', opacity: 0 });
  const glass = g({ transform: `translate(${GLASS.x} ${BASE}) scale(${GLASS.k})` }, [vesselBack(V), liquid.g, vesselFront(V), garnish]);
  svg.append(stream, glass);

  // --- Vincent, caché sous le bord du comptoir
  const ch = createCharacter({ seed: 9, pose: 'bar' });
  const clip = uid('vincent');
  svg.append(
    s('defs', {}, s('clipPath', { id: clip }, s('rect', { x: -100, y: -100, width: 600, height: BACK + 100 }))),
    g({ 'clip-path': `url(#${clip})` }, g({ transform: `translate(${CH.tx} ${CH.ty}) scale(${CH.k})`, class: 'jb-vincent' }, ch.g)),
  );

  // --- Fruits qui volent, bulle
  const fly = g({ class: 'jb-fly' });
  const bubbleRect = s('rect', { x: 8, y: 8, height: 30, rx: 12, fill: BRAND.cream, stroke: BRAND.forest, 'stroke-width': 1.5 });
  const bubbleText = s('text', { x: 20, y: 29, 'font-family': FONT_CHALK, 'font-size': 18, 'font-weight': 600, fill: BRAND.forest });
  const bubble = g({ class: 'jb-bubble', opacity: 0 }, [
    s('path', { d: 'M104 36L134 56L114 36Z', fill: BRAND.cream, stroke: BRAND.forest, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
    bubbleRect,
    bubbleText,
  ]);
  bubble.style.transformBox = 'fill-box';
  bubble.style.transformOrigin = '90% 100%';
  svg.append(fly, bubble);

  // ------------------------------------------------------------ bras gauche (cinématique inverse)
  const pose = { t1: 0, t2: 0 };
  const setArm = (t1, t2) => {
    Object.assign(pose, { t1, t2 });
    ch.parts.armL.style.transform = `rotate(${f2(t1)}deg)`;
    ch.parts.forearmL.style.transform = `rotate(${f2(t2)}deg)`;
  };
  /** Amène la main gauche en `pt` (scène), ou au repos si `pt` est nul. */
  const armTo = (pt, ms) => new Promise((resolve) => {
    const [a1, a2] = pt ? ik(leftTarget(pt)) : [0, 0];
    const b1 = pose.t1;
    const b2 = pose.t2;
    if (isReduced()) {
      setArm(a1, a2);
      return resolve();
    }
    const t0 = performance.now();
    const step = (now) => {
      const k = easeInOut(Math.min(1, (now - t0) / ms));
      setArm(lerp(b1, a1, k), lerp(b2, a2, k));
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });

  // ------------------------------------------------------------ bulle
  let bubbleTimer = 0;
  function say(text, ms = 2200) {
    bubbleText.textContent = text;
    const w = (bubbleText.getComputedTextLength?.() || text.length * 8) + 24;
    bubbleRect.setAttribute('width', f2(w));
    bubble.setAttribute('opacity', 1);
    anim(bubble, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 360, easing: EASE.back, fill: 'none' });
    ch.say(Math.min(1600, 300 + text.length * 45));
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      const a = anim(bubble, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
      const done = () => {
        bubble.setAttribute('opacity', 0);
        a?.cancel();
      };
      a ? a.finished.then(done).catch(done) : done();
    }, ms);
  }

  // ------------------------------------------------------------ un ingrédient passe dans l'extracteur
  const level = (n, tier) => MAX * Math.min(1, n / Math.max(1, tier));
  const surfaceY = (lv) => BASE - lv * GLASS.k;

  async function press(id, from, nextLevel, color) {
    const ing = BY_ID[id];
    if (!ing || isReduced()) return;
    // 1. Le fruit vole jusqu'au-dessus de la trémie ; Vincent lève le bras
    const start = from || CRATE;
    const top = [PLUNGER[0], 44];
    const fruit = g({}, g({ transform: 'scale(1.25)' }, drawProduce(ing.icon, ing.seed)));
    fly.append(fruit);
    const mid = [lerp(start[0], top[0], 0.5), Math.min(start[1], top[1]) - 40];
    const flight = anim(fruit, [
      { transform: `translate(${f2(start[0])}px, ${f2(start[1])}px) rotate(0deg) scale(1)` },
      { transform: `translate(${f2(mid[0])}px, ${f2(mid[1])}px) rotate(160deg) scale(1.1)`, offset: 0.5 },
      { transform: `translate(${top[0]}px, ${top[1]}px) rotate(330deg) scale(.9)` },
    ], { duration: 620, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' });
    armTo([PLUNGER[0] + 6, 40], 520);
    await flight?.finished.catch(() => {});
    // 2. Il tombe dans la trémie
    sfx.play('plop', { v: 0.1 });
    const drop = anim(fruit, [
      { transform: `translate(${top[0]}px, ${top[1]}px) scale(.9)`, opacity: 1 },
      { transform: `translate(${top[0]}px, 72px) scale(.4)`, opacity: 0 },
    ], { duration: 220, easing: EASE.in, fill: 'forwards' });
    await drop?.finished.catch(() => {});
    fruit.remove();
    // 3. Vincent appuie sur le poussoir, le moteur tourne
    await armTo(PLUNGER, 160);
    sfx.play('juicer', { dur: 0.55 });
    light.setAttribute('fill', '#A6F29A');
    anim(plunger, [{ transform: 'translateY(0)' }, { transform: 'translateY(12px)' }, { transform: 'translateY(12px)', offset: 0.7 }, { transform: 'translateY(0)' }], { duration: 760, easing: EASE.inOut, fill: 'none' });
    armTo([PLUNGER[0], PLUNGER[1] + 12], 240);
    anim(machine, [
      { transform: 'rotate(0deg)' }, { transform: 'rotate(.7deg)' }, { transform: 'rotate(-.6deg)' }, { transform: 'rotate(.5deg)' },
      { transform: 'rotate(-.4deg)' }, { transform: 'rotate(0deg)' },
    ], { duration: 560, fill: 'none' });
    // 4. Le jus coule dans le verre
    await pause(200);
    const pour = sfx.voice('pour');
    pour.level(0.75);
    stream.setAttribute('stroke', color);
    stream.setAttribute('d', `M${SPOUT[0]} ${SPOUT[1]}L${SPOUT[0]} ${f2(surfaceY(nextLevel))}`);
    stream.setAttribute('opacity', 1);
    await liquid.tween(nextLevel, color, 680);
    stream.setAttribute('opacity', 0);
    pour.stop();
    light.setAttribute('fill', '#5FA36A');
    await armTo([PLUNGER[0], PLUNGER[1] - 4], 160);
    armTo(null, 420);
  }

  /** Paille et rondelle du premier fruit choisi. */
  function dress(ids) {
    const fruit = ids.map((id) => BY_ID[id]).find((x) => x?.group === 'fruit');
    garnish.replaceChildren(
      strawEl(V, 30),
      g({ transform: `translate(${f2(hw(V, V.h) - 2)} ${f2(-V.h + 2)})` }, wheel(fruit ? fruit.color : '#F4D23C', 13)),
    );
    garnish.setAttribute('opacity', 1);
  }

  async function finish(ids) {
    if (!ids.length) return;
    dress(ids);
    anim(garnish, [{ opacity: 0, transform: 'translateY(-40px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 480, easing: EASE.back, fill: 'none' });
    sfx.play('ding', { delay: 120 });
    ch.wink();
    say('Et voilà !', 1800);
  }

  // Les animations s'enchaînent dans l'ordre des choix
  let chain = Promise.resolve();
  const enqueue = (fn) => (chain = chain.then(fn).catch(() => {}));

  return {
    svg,
    character: ch,
    say,
    idle(ambient) {
      ch.idle(ambient);
      ambient.add(anim(lampGlow, [{ opacity: 0.85 }, { opacity: 1 }], { duration: 2600, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none' }));
      ambient.every(5200, () => ch.look((Math.random() - 0.3) * 1.4, Math.random() * 0.6), 3000);
    },
    /** Un ingrédient de plus (`from` = point de départ dans la scène, ou null). */
    add(id, { from = null, list, tier }) {
      return enqueue(async () => {
        await press(id, from, level(list.length, tier), juiceColor(list));
        if (list.length >= tier) await finish(list);
      });
    },
    /** Retrait, changement de formule : le niveau et la couleur suivent. */
    update(list, tier) {
      return enqueue(async () => {
        if (list.length < tier) garnish.setAttribute('opacity', 0);
        await liquid.tween(level(list.length, tier), list.length ? juiceColor(list) : liquid.state.color, 480);
      });
    },
    reset() {
      return enqueue(async () => {
        garnish.setAttribute('opacity', 0);
        await liquid.tween(0, liquid.state.color, 600);
      });
    },
    /** Un classique de l'ardoise : Vincent le prépare de bout en bout. */
    make(ids) {
      return enqueue(async () => {
        garnish.setAttribute('opacity', 0);
        if (liquid.state.level > 0.6) await liquid.tween(0, liquid.state.color, 420);
        for (let i = 0; i < ids.length; i++) {
          await press(ids[i], null, level(i + 1, ids.length), juiceColor(ids.slice(0, i + 1)));
        }
        if (isReduced()) liquid.set(MAX, juiceColor(ids));
        await finish(ids);
      });
    },
    /** Remet le verre dans l'état voulu sans animation (retour sur l'écran). */
    set(list, tier) {
      liquid.set(level(list.length, tier), list.length ? juiceColor(list) : '#F2A64A');
      garnish.setAttribute('opacity', 0);
      if (list.length && list.length >= tier) dress(list);
    },
    /** Coordonnées d'un point de l'écran dans la scène (départ des fruits). */
    toScene(rect) {
      const ctm = svg.getScreenCTM();
      if (!rect || !ctm) return null;
      const pt = new DOMPoint(rect.left + rect.width / 2, rect.top + rect.height / 2).matrixTransform(ctm.inverse());
      return [pt.x, pt.y];
    },
  };
}
