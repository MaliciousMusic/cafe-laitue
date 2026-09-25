// Portrait du primeur : pilier de briques, mur vert, étals flous, ruban en arche et tampon.

import { s, g, svgRoot, rng, uid } from '../lib/svg.js';
import { anim, EASE, isReduced, settle } from '../lib/motion.js';
import { createCharacter } from './character.js';
import { createRibbon } from './ribbon.js';
import { createStamp, brandFontsReady } from './stamp.js';
import { crateHeap, crateFront } from './produce.js';

function brickColumn(x0, x1, y0, y1, seed) {
  const r = rng(seed);
  const G = g({ class: 'pt-bricks' }, [s('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: '#E6CDAA' })]);
  const tones = ['#CF8A63', '#C47B55', '#D8946B', '#BE734D', '#D2906A'];
  for (let y = y0, row = 0; y < y1; y += 13, row++) {
    for (let x = x0 - (row % 2 ? 16 : 0); x < x1; x += 32) {
      const bx = Math.max(x0, x + 1.2);
      const bw = Math.min(x + 30.8, x1) - bx;
      if (bw > 2) G.append(s('rect', { x: bx, y: y + 1.2, width: bw, height: 10.6, rx: 1, fill: tones[Math.floor(r() * tones.length)] }));
    }
  }
  G.append(
    s('rect', { x: x0, y: y0, width: 12, height: y1 - y0, fill: '#000', opacity: 0.12 }),
    s('rect', { x: x1 - 16, y: y0, width: 16, height: y1 - y0, fill: '#000', opacity: 0.18 }),
  );
  return G;
}

export async function createPortrait({ month = 9, picks = [] } = {}) {
  await brandFontsReady();
  const svg = svgRoot('0 0 390 440', { preserveAspectRatio: 'xMidYMin slice', class: 'portrait-svg' });
  const wall = uid('pw');
  const blur = uid('blur');
  svg.append(s('defs', {}, [
    s('linearGradient', { id: wall, x1: 0, y1: 0, x2: 0, y2: 1 }, [
      s('stop', { offset: 0, 'stop-color': '#5F6E45' }),
      s('stop', { offset: 1, 'stop-color': '#48552F' }),
    ]),
    s('filter', { id: blur, x: '-10%', y: '-10%', width: '120%', height: '120%' }, s('feGaussianBlur', { stdDeviation: 2.2 })),
  ]));
  svg.append(s('rect', { x: -200, y: -200, width: 800, height: 900, fill: `url(#${wall})` }));

  // Arrière-plan flou : étagères de part et d'autre
  const bg = g({ class: 'pt-bg', filter: `url(#${blur})`, opacity: 0.9 });
  bg.append(brickColumn(118, 262, -40, 440, 12));
  const sideItems = picks.length ? picks : [{ id: 'carotte' }, { id: 'poireau' }, { id: 'pomme' }, { id: 'celeri' }];
  [[-6, 250], [-6, 330], [276, 250], [276, 330]].forEach(([x, y], i) => {
    bg.append(g({ transform: `translate(${x} ${y})` }, [crateHeap(sideItems[i % sideItems.length].id, { w: 118, h: 34, scale: 1.1, seed: 60 + i }), crateFront(118, 26, { tone: i })]));
    bg.append(s('rect', { x, y: y + 26, width: 120, height: 9, fill: '#1E1D1A' }));
  });
  [8, 26, 44].forEach((x, i) => bg.append(
    s('rect', { x, y: 60, width: 13, height: 38, rx: 3, fill: i === 1 ? '#EDE3CF' : '#2F3A26' }),
    s('rect', { x: x + 4, y: 44, width: 5, height: 18, fill: i === 1 ? '#EDE3CF' : '#2F3A26' }),
  ));
  bg.append(s('rect', { x: -10, y: 98, width: 90, height: 5, fill: '#1E1D1A' }));
  svg.append(bg);

  // Ruban en arche derrière lui
  const ribbon = createRibbon({
    d: 'M-40 470 C-30 250 30 70 195 62 C360 70 420 250 430 470',
    width: 30,
    text: 'VOTRE PRIMEUR ✦ CAFÉ LAITUE ✦ 20 RUE BALLAINVILLIERS ✦ CLERMONT-FERRAND ✦ ',
    fontSize: 12.5,
    speed: -16,
  });
  svg.append(ribbon.g);

  // Lui
  const ch = createCharacter({ seed: 4 });
  const chWrap = g({ transform: 'translate(34 38) scale(1.12)', class: 'pt-char' });
  const chInner = g({ class: 'pt-char-inner' });
  chInner.append(ch.g);
  chWrap.append(chInner);
  svg.append(chWrap);

  // Tampon
  const stamp = await createStamp();
  const stWrap = g({ transform: 'translate(8 8) scale(.2)', class: 'pt-stamp' });
  stamp.svg.setAttribute('width', 400);
  stamp.svg.setAttribute('height', 400);
  stamp.svg.style.overflow = 'visible';
  stWrap.append(s('circle', { cx: 200, cy: 208, r: 198, fill: '#000', opacity: 0.15 }), stamp.svg);
  svg.append(stWrap);

  return {
    svg,
    character: ch,
    hit: chInner,
    layout() {
      ribbon.layout();
    },
    async intro() {
      if (isReduced()) return;
      const list = [
        anim(bg, [{ opacity: 0 }, { opacity: 0.9 }], { duration: 600 }),
        ribbon.drawIn({ delay: 150 }),
        anim(chInner, [{ transform: 'translateY(60px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 750, delay: 250, easing: EASE.snap }),
      ];
      stamp.play({ delay: 500, speed: 1.3 });
      await Promise.all(list.map((a) => settle(a)));
    },
    idle(ambient) {
      ch.idle(ambient);
      stamp.idle(ambient);
      ribbon.run(ambient);
    },
  };
}
