// Écran « Comptoir » : carte façon lettres murales + boissons en vue éclatée.

import { createDrinkScene } from '../scenes/drinks.js';
import { CATEGORIES, DRINKS } from '../data/drinks.js';
import { inSeason } from '../data/season.js';
import { parisNow } from '../features/hours.js';

export default function bar(el) {
  const $ = (s) => el.querySelector(s);
  const host = $('#scene-drink');
  const btnPrev = $('#drink-prev');
  const btnNext = $('#drink-next');
  const btnExplode = $('#drink-explode');
  const btnIced = $('#drink-iced');
  const tabs = { cafes: $('#cat-cafes'), jus: $('#cat-jus') };
  const panels = { cafes: $('#menu-cafes'), jus: $('#menu-jus') };
  const rows = [...el.querySelectorAll('.menu-item')];
  const order = [...CATEGORIES.cafes, ...CATEGORIES.jus];
  const month = parisNow().month;

  let scene;
  let current = 'cappuccino';
  let iced = false;
  let started = false;

  const ready = createDrinkScene().then((sc) => {
    scene = sc;
    sc.setMonth(month);
    sc.season = inSeason(month).filter((p) => p.kind === 'fruit');
    host.append(sc.svg);
    return sc;
  });

  function setCat(cat) {
    Object.entries(tabs).forEach(([k, b]) => {
      const on = k === cat;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
      panels[k].hidden = !on;
    });
  }

  function syncButtons() {
    const def = DRINKS[current];
    const canIce = !!(def.icedVersion || def.iced);
    btnIced.disabled = !canIce;
    btnIced.setAttribute('aria-pressed', String(iced && canIce));
    btnExplode.setAttribute('aria-pressed', String(!!scene?.exploded));
  }

  async function select(id, { keepIced = false } = {}) {
    await ready;
    current = id;
    const def = DRINKS[id];
    if (!keepIced || !(def.icedVersion || def.iced)) iced = false;
    setCat(CATEGORIES.cafes.includes(id) ? 'cafes' : 'jus');
    rows.forEach((li) => {
      const on = li.dataset.drink === id;
      li.classList.toggle('is-on', on);
      li.querySelector('.menu-row').setAttribute('aria-expanded', String(on));
    });
    syncButtons();
    await scene.show(id, { iced });
    syncButtons();
  }

  const step = (d) => select(order[(order.indexOf(current) + d + order.length) % order.length]);

  btnPrev.addEventListener('click', () => step(-1));
  btnNext.addEventListener('click', () => step(1));
  btnExplode.addEventListener('click', async () => {
    await ready;
    btnExplode.setAttribute('aria-pressed', String(!scene.exploded));
    await scene.toggle();
    syncButtons();
  });
  btnIced.addEventListener('click', () => {
    iced = !iced;
    select(current, { keepIced: true });
  });
  Object.entries(tabs).forEach(([k, b]) => b.addEventListener('click', () => select(CATEGORIES[k][0])));
  rows.forEach((li) => li.querySelector('.menu-row').addEventListener('click', () => select(li.dataset.drink)));

  // Glisser à gauche / à droite sur la scène
  let x0 = null;
  host.addEventListener('pointerdown', (e) => {
    x0 = e.clientX;
  });
  host.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    else scene?.toggle().then(syncButtons);
  });
  host.addEventListener('pointercancel', () => (x0 = null));
  host.style.touchAction = 'pan-y';
  host.style.cursor = 'pointer';

  return {
    async enter() {
      await ready;
      if (!started) {
        started = true;
        select(current);
      } else {
        scene.resume();
      }
    },
    leave() {
      scene?.pause();
    },
  };
}
