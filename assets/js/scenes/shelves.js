// L'intérieur de la boutique : pilier de briques, mur vert olive, étagère à vins et
// épicerie, présentoir à trois niveaux de cagettes garnies selon le mois.

import { s, g, svgRoot, rng, uid } from '../lib/svg.js';
import { anim, EASE, isReduced, settle } from '../lib/motion.js';
import { crateHeap, crateFront, drawProduce } from './produce.js';
import { BRAND, brandFontsReady } from './stamp.js';

const FONT_CHALK = '"Caveat", "Segoe Print", cursive';
const TIERS = [118, 198, 278];
const COLS = [74, 182, 290];
const CW = 102;

function bricks(x0, x1, y0, y1, seed = 2) {
  const r = rng(seed);
  const G = g({ class: 'sh-bricks' }, [s('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: '#E4C9A6' })]);
  const tones = ['#C7784F', '#BD6E47', '#D08158', '#B5673F', '#C9805A'];
  for (let y = y0, row = 0; y < y1; y += 10, row++) {
    for (let x = x0 - (row % 2 ? 12 : 0); x < x1; x += 24) {
      const bx = Math.max(x0, x + 1);
      const bw = Math.min(x + 23, x1) - bx;
      if (bw <= 2) continue;
      G.append(s('rect', { x: bx, y: y + 1, width: bw, height: 8, rx: 0.8, fill: tones[Math.floor(r() * tones.length)] }));
    }
  }
  G.append(s('rect', { x: x1 - 8, y: y0, width: 8, height: y1 - y0, fill: '#000', opacity: 0.16 }));
  return G;
}

function bottle(x, y, i) {
  const glass = ['#2F3A26', '#3B2A22', '#26342E'][i % 3];
  return g({ class: 'sh-bottle' }, [
    s('rect', { x: x - 6, y: y - 34, width: 12, height: 34, rx: 3, fill: glass }),
    s('path', { d: `M${x - 6} ${y - 30} Q${x - 6} ${y - 40} ${x - 2.5} ${y - 42} V${y - 52} H${x + 2.5} V${y - 42} Q${x + 6} ${y - 40} ${x + 6} ${y - 30} Z`, fill: glass }),
    s('rect', { x: x - 2.8, y: y - 55, width: 5.6, height: 6, fill: i % 2 ? '#C23A3A' : '#E9D8A6' }),
    s('rect', { x: x - 5, y: y - 24, width: 10, height: 12, fill: '#F1E7D2' }),
    s('rect', { x: x - 5, y: y - 20, width: 10, height: 2, fill: i % 2 ? '#C23A3A' : '#12432B' }),
    s('rect', { x: x - 4, y: y - 32, width: 2, height: 26, fill: '#fff', opacity: 0.12 }),
  ]);
}

function jar(x, y, kind) {
  const fill = { miel: '#E0A93B', confiture: '#A8324A', pickles: '#8FA64A' }[kind];
  const lidId = uid('lid');
  return g({ class: 'sh-jar' }, [
    s('defs', {}, s('pattern', { id: lidId, width: 4, height: 4, patternUnits: 'userSpaceOnUse' }, [
      s('rect', { width: 4, height: 4, fill: '#F4EEE0' }),
      s('rect', { width: 2, height: 2, fill: kind === 'miel' ? '#12432B' : '#C23A3A' }),
      s('rect', { x: 2, y: 2, width: 2, height: 2, fill: kind === 'miel' ? '#12432B' : '#C23A3A' }),
    ])),
    s('rect', { x: x - 9, y: y - 22, width: 18, height: 22, rx: 3, fill }),
    s('rect', { x: x - 9, y: y - 22, width: 18, height: 22, rx: 3, fill: '#fff', opacity: 0.12 }),
    s('path', { d: `M${x - 11} ${y - 22} Q${x} ${y - 30} ${x + 11} ${y - 22} L${x + 9} ${y - 20} H${x - 9} Z`, fill: `url(#${lidId})` }),
    s('rect', { x: x - 6, y: y - 15, width: 12, height: 8, fill: '#F7F1E3' }),
  ]);
}

function poster(x, y, w, h) {
  const G = g({ class: 'sh-poster' }, [
    s('rect', { x: x - 3, y: y - 3, width: w + 6, height: h + 6, fill: '#E9D6B0' }),
    s('rect', { x, y, width: w, height: h, fill: '#FBF7EA' }),
    s('text', { x: x + w / 2, y: y + 10, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 8, fill: BRAND.forest, text: 'Fruits & légumes' }),
  ]);
  const ids = ['tomate', 'poire', 'raisin', 'carotte', 'pomme', 'poireau', 'fraise', 'courge', 'cerise'];
  ids.forEach((id, i) => {
    const cx = x + 12 + (i % 3) * ((w - 24) / 2);
    const cy = y + 22 + Math.floor(i / 3) * ((h - 28) / 3);
    G.append(g({ transform: `translate(${cx} ${cy}) scale(.5)` }, drawProduce(id, 30 + i)));
  });
  return G;
}

/**
 * @param {{ items: Array<{id:string,name:string}> }} o  9 produits (3 × 3)
 */
export async function createShelves({ items }) {
  await brandFontsReady();
  const svg = svgRoot('0 0 400 360', { preserveAspectRatio: 'xMidYMid meet', class: 'shelves' });
  svg.style.overflow = 'visible';
  const wallId = uid('wall');
  const glowId = uid('glow');
  svg.append(
    s('defs', {}, [
      s('linearGradient', { id: wallId, x1: 0, y1: 0, x2: 0, y2: 1 }, [
        s('stop', { offset: 0, 'stop-color': '#617046' }),
        s('stop', { offset: 1, 'stop-color': '#4B5835' }),
      ]),
      s('radialGradient', { id: glowId }, [
        s('stop', { offset: 0, 'stop-color': '#FFE3A0', 'stop-opacity': 0.55 }),
        s('stop', { offset: 1, 'stop-color': '#FFE3A0', 'stop-opacity': 0 }),
      ]),
    ]),
    s('rect', { x: -400, y: -200, width: 1200, height: 760, fill: `url(#${wallId})` }),
    bricks(-400, 58, -200, 560, 3),
    s('rect', { x: -400, y: 332, width: 1200, height: 230, fill: '#2E3222' }),
    s('rect', { x: -400, y: 332, width: 1200, height: 3, fill: '#1E2016' }),
  );

  // Suspension en rotin + halo
  const lampGlow = s('circle', { cx: 196, cy: 44, r: 120, fill: `url(#${glowId})`, class: 'sh-glow' });
  svg.append(lampGlow, g({ class: 'sh-lamp' }, [
    s('path', { d: 'M196 -200 V18', stroke: '#1E1E1C', 'stroke-width': 1.2 }),
    s('path', { d: 'M176 42 Q196 8 216 42 Z', fill: '#C98A4A' }),
    s('path', { d: 'M181 41 Q187 26 192 16 M189 42 Q193 26 196 14 M203 42 Q199 26 196 14 M211 41 Q205 26 200 16', stroke: '#9E6532', 'stroke-width': 1, fill: 'none' }),
    s('ellipse', { cx: 196, cy: 42, rx: 12, ry: 3, fill: '#FFE9B0' }),
  ]));

  // Étagère haute : vins & épicerie fine + affiche
  svg.append(poster(300, 6, 76, 56));
  const top = g({ class: 'sh-top' });
  const shelfY = 76;
  [84, 100, 116, 132, 148].forEach((x, i) => top.append(bottle(x, shelfY, i)));
  top.append(jar(172, shelfY, 'miel'), jar(192, shelfY, 'confiture'), jar(212, shelfY, 'miel'), jar(232, shelfY, 'pickles'));
  [258, 274, 290].forEach((x, i) => top.append(bottle(x, shelfY, i + 5)));
  top.append(
    s('rect', { x: 64, y: shelfY, width: 336, height: 4, fill: '#1E1D1A' }),
    s('text', { x: 350, y: shelfY - 8, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 10, fill: BRAND.cream, opacity: 0.85, text: 'épicerie fine' }),
  );
  svg.append(top);

  // Montants du présentoir
  svg.append(
    s('rect', { x: 64, y: 84, width: 5, height: 250, fill: '#1E1D1A' }),
    s('rect', { x: 395, y: 84, width: 5, height: 250, fill: '#1E1D1A' }),
  );

  // Cagettes
  const crates = [];
  const heapsLayer = [];
  TIERS.forEach((ty, t) => {
    COLS.forEach((cx, c) => {
      const idx = t * 3 + c;
      const wrap = g({ transform: `translate(${cx} ${ty})`, class: 'sh-crate-wrap' });
      const crate = g({ class: 'sh-crate fx-bottom', tabindex: -1 });
      const back = s('path', { d: `M4 -40 H${CW - 4} L${CW} 0 H0 Z`, fill: '#C9A874' });
      const heapHost = g({ class: 'sh-heap' });
      const front = crateFront(CW, 22, { tone: idx });
      crate.append(back, heapHost, front);
      wrap.append(crate);
      svg.append(wrap);
      crates.push({ wrap, crate, heapHost, idx });
      heapsLayer.push(heapHost);
    });
    // Rail noir + étiquettes craie
    svg.append(s('rect', { x: 64, y: ty + 22, width: 336, height: 11, fill: '#1E1D1A' }));
  });
  const tags = crates.map(({ idx }) => {
    const t = Math.floor(idx / 3);
    const c = idx % 3;
    const cx = COLS[c] + CW / 2;
    const y = TIERS[t] + 22;
    const txt = s('text', { x: cx, y: y + 9.2, 'text-anchor': 'middle', 'font-family': FONT_CHALK, 'font-size': 10.5, fill: '#F4F1E6', class: 'sh-tag' });
    const grp = g({}, [s('rect', { x: cx - 30, y: y + 1, width: 60, height: 10, rx: 1, fill: '#161614' }), txt]);
    svg.append(grp);
    return txt;
  });

  // Sélection
  const halo = s('rect', { x: 0, y: -44, width: CW + 8, height: 70, rx: 10, fill: 'none', stroke: '#FDFBEB', 'stroke-width': 2.4, 'stroke-dasharray': '5 4', opacity: 0, class: 'sh-halo' });

  let current = [];
  let selected = -1;
  let onPick = () => {};

  function fillCrates(list, { animate = false, stagger = 45 } = {}) {
    current = list;
    const anims = [];
    crates.forEach((c, i) => {
      const item = list[i % list.length];
      c.heapHost.replaceChildren(crateHeap(item.id, { w: CW, h: 34, scale: 1.12, seed: 100 + i * 7 + item.id.length }));
      c.crate.setAttribute('aria-label', item.name);
      tags[i].textContent = item.name.split(' & ')[0];
      if (animate && !isReduced()) {
        c.heapHost.querySelectorAll('.pz').forEach((p, j) => anims.push(anim(p, [
          { transform: 'translateY(-70px) scale(.5)', opacity: 0 },
          { transform: 'translateY(0) scale(1)', opacity: 1 },
        ], { duration: 520, delay: i * stagger + j * 14, easing: EASE.back })));
        anims.push(anim(tags[i], [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 200 + i * stagger }));
      }
    });
    return Promise.all(anims.map((a) => settle(a)));
  }

  async function dropOut() {
    if (isReduced()) return;
    const anims = [];
    crates.forEach((c, i) => {
      c.heapHost.querySelectorAll('.pz').forEach((p, j) => anims.push(anim(p, [
        { transform: 'translateY(0) rotate(0)', opacity: 1 },
        { transform: `translateY(40px) rotate(${j % 2 ? 30 : -30}deg)`, opacity: 0 },
      ], { duration: 300, delay: i * 18 + j * 6, easing: EASE.in })));
    });
    await Promise.all(anims.map((a) => a && a.finished.catch(() => {})));
  }

  function select(i) {
    selected = i;
    if (i < 0) {
      halo.setAttribute('opacity', 0);
      return;
    }
    const c = crates[i];
    c.wrap.append(halo);
    halo.setAttribute('x', -4);
    halo.setAttribute('opacity', 1);
    anim(c.crate, [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-6px) scale(1.04)' }, { transform: 'translateY(0) scale(1)' }], { duration: 480, easing: EASE.out, fill: 'none' });
    onPick(current[i % current.length], i);
  }

  crates.forEach((c, i) => {
    c.crate.style.cursor = 'pointer';
    c.crate.addEventListener('click', (e) => {
      e.stopPropagation();
      select(selected === i ? -1 : i);
      if (selected === -1) onPick(null, -1);
    });
  });

  fillCrates(items);

  return {
    svg,
    async intro() {
      if (isReduced()) return;
      const list = [];
      crates.forEach((c, i) => list.push(anim(c.wrap.firstChild, [
        { transform: 'translateX(60px)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ], { duration: 520, delay: Math.floor(i / 3) * 120 + (i % 3) * 60, easing: EASE.snap })));
      list.push(anim(top, [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 600 }));
      await Promise.all(list.map((a) => settle(a)));
      await fillCrates(current, { animate: true, stagger: 40 });
    },
    async setItems(list) {
      select(-1);
      await dropOut();
      await fillCrates(list, { animate: true });
    },
    select,
    onPick(fn) {
      onPick = fn;
    },
    idle(ambient) {
      ambient.add(anim(lampGlow, [{ opacity: 0.8 }, { opacity: 1 }], { duration: 2400, direction: 'alternate', iterations: Infinity, easing: EASE.inOut, fill: 'none' }));
      ambient.every(3500, () => {
        const c = crates[Math.floor(Math.random() * crates.length)];
        const p = c.heapHost.querySelectorAll('.pz');
        const one = p[Math.floor(Math.random() * p.length)];
        if (one) anim(one, [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 600, fill: 'none' });
      }, 2500);
    },
  };
}
