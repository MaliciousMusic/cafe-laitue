// Écran d'accueil : la boutique en SVG, le tampon, le ruban.

import { Ambient } from '../lib/motion.js';
import { createStorefront } from '../scenes/storefront.js';
import { inSeason } from '../data/season.js';
import { openStatus, parisNow } from '../features/hours.js';

const LINES = (month) => {
  const fruits = inSeason(month).filter((p) => p.kind === 'fruit').slice(0, 2).map((p) => p.name.split(' ')[0].toLowerCase());
  return [
    'Bonjour !',
    fruits.length ? `Arrivage : ${fruits.join(' & ')} !` : 'Les étals sont prêts !',
    'Un jus pressé minute ?',
    'Café Kaduck, torréfié ici !',
    'On vous attend !',
  ];
};

export default function home(el) {
  const host = el.querySelector('#scene-storefront');
  const stampBtn = el.querySelector('#hero-stamp');
  const ambient = new Ambient();
  ambient.pause();
  const month = parisNow().month;
  const fruits = inSeason(month).filter((p) => p.kind === 'fruit');
  const picks = fruits.length >= 3 ? fruits.slice(0, 3) : inSeason(month).slice(0, 3);
  let scene;
  let played = false;
  let line = 0;

  const placeStampButton = () => {
    if (!scene || !stampBtn) return;
    const r = scene.stampEl.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    Object.assign(stampBtn.style, {
      left: `${r.left - h.left}px`,
      top: `${r.top - h.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
      bottom: 'auto',
    });
  };

  const ready = createStorefront({ picks, open: openStatus().state !== 'closed' }).then((sc) => {
    scene = sc;
    host.append(sc.svg);
    sc.layout();
    sc.idle(ambient);
    placeStampButton();
    new ResizeObserver(placeStampButton).observe(host);
    // Interactions
    sc.charEl.style.cursor = 'pointer';
    sc.charEl.addEventListener('click', () => {
      const lines = LINES(month);
      line = (line + 1) % lines.length;
      sc.greet(lines[line]);
    });
    stampBtn?.addEventListener('click', () => sc.stamp.play({ speed: 1.3 }));
    document.addEventListener('cl:status', (e) => sc.setOpen(e.detail.state !== 'closed'));
    return sc;
  });

  return {
    async enter() {
      await ready;
      ambient.play();
      if (!played) {
        played = true;
        scene.play();
      }
    },
    leave() {
      ambient.pause();
    },
  };
}
