// Écran « Comptoir » : carte façon lettres murales, boissons en motion design,
// latte art au choix (cœur ou cygne) et composeur de jus « sur demande ».

import { createDrinkScene } from '../scenes/drinks.js';
import { CATEGORIES, DRINKS, JUICE_BASE, JUICE_SEASONAL, JUICE_LABEL } from '../data/drinks.js';
import { inSeason } from '../data/season.js';
import { parisNow } from '../features/hours.js';
import { drawProduce } from '../scenes/produce.js';
import { svgRoot, g } from '../lib/svg.js';
import { play as sfx } from '../lib/sound.js';

export default function bar(el) {
  const $ = (s) => el.querySelector(s);
  const host = $('#scene-drink');
  const btnPrev = $('#drink-prev');
  const btnNext = $('#drink-next');
  const btnExplode = $('#drink-explode');
  const btnIced = $('#drink-iced');
  const artPick = $('#art-pick');
  const artButtons = [...artPick.querySelectorAll('button')];
  const composerBox = $('#composer');
  const composerList = $('#composer-list');
  const composerNote = $('#composer-note');
  const tabs = { cafes: $('#cat-cafes'), jus: $('#cat-jus') };
  const panels = { cafes: $('#menu-cafes'), jus: $('#menu-jus') };
  const rows = [...el.querySelectorAll('.menu-item')];
  const order = [...CATEGORIES.cafes, ...CATEGORIES.jus];
  const month = parisNow().month;

  let scene;
  let current = 'cappuccino';
  let iced = false;
  let started = false;

  // Ingrédients du jus sur demande : de saison d'abord, puis les incontournables
  const seasonalIds = inSeason(month).map((p) => p.id);
  const ingredients = [
    ...JUICE_SEASONAL.filter((id) => seasonalIds.includes(id)).map((id) => ({ id, season: true })),
    ...JUICE_BASE.map((id) => ({ id, season: false })),
  ];
  const chips = ingredients.map(({ id, season }, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `ing${season ? ' is-season' : ''}`;
    b.dataset.id = id;
    b.setAttribute('aria-pressed', 'false');
    const icon = svgRoot('-16 -16 32 32');
    icon.append(g({ transform: 'scale(1.1)' }, drawProduce(id, 50 + i)));
    b.append(icon, document.createTextNode(JUICE_LABEL[id]));
    b.addEventListener('click', () => {
      if (!scene) return;
      const on = b.getAttribute('aria-pressed') === 'true';
      sfx(on ? 'unpop' : 'pop');
      if (on) scene.composer.remove(id);
      else scene.composer.add(id, b.getBoundingClientRect());
    });
    composerList.append(b);
    return b;
  });
  $('#composer-reset').addEventListener('click', () => {
    sfx(scene?.composer.list.length ? 'drain' : 'tap');
    scene?.composer.reset();
  });

  function syncComposer(list = []) {
    chips.forEach((c) => {
      const on = list.includes(c.dataset.id);
      c.setAttribute('aria-pressed', String(on));
      c.disabled = !on && list.length >= 4;
    });
    composerNote.textContent = list.length === 0
      ? 'Touchez les fruits pour les ajouter au verre.'
      : list.length === 1
        ? 'Encore un ou deux fruits ?'
        : list.length >= 4
          ? 'Verre plein ! Montrez votre recette au comptoir.'
          : 'Montrez votre recette au comptoir, on la presse minute.';
  }

  const ready = createDrinkScene().then((sc) => {
    scene = sc;
    host.append(sc.svg);
    sc.onChange(({ phase, list }) => {
      artPick.classList.toggle('is-busy', phase === 'latte');
      if (phase === 'composer' && list) syncComposer(list);
      btnExplode.setAttribute('aria-pressed', String(sc.exploded));
    });
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
    const composer = !!def.seasonal;
    btnIced.disabled = !canIce;
    btnIced.setAttribute('aria-pressed', String(iced && canIce));
    btnExplode.disabled = composer;
    btnExplode.setAttribute('aria-pressed', String(!!scene?.exploded));
    const hasArt = def.garnish?.k === 'art' && !(iced && def.icedVersion);
    artPick.hidden = !hasArt;
    composerBox.hidden = !composer;
    artButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.art === (scene?.artStyle || 'heart'))));
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
    if (def.seasonal) syncComposer([]);
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
    sfx(iced ? 'ice' : 'off', { n: 3 });
    select(current, { keepIced: true });
  });
  artButtons.forEach((b) => b.addEventListener('click', async () => {
    sfx('on');
    await ready;
    artButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    scene.setArt(b.dataset.art);
  }));
  Object.entries(tabs).forEach(([k, b]) => b.addEventListener('click', () => select(CATEGORIES[k][0])));
  // Chaque ligne de la carte est une lame de xylophone : ça monte en descendant la carte
  rows.forEach((li) => li.querySelector('.menu-row').addEventListener('click', () => {
    sfx('note', { i: order.indexOf(li.dataset.drink), base: 67 });
    select(li.dataset.drink);
  }));

  // Glisser à gauche / à droite sur la scène ; toucher = vue éclatée
  let x0 = null;
  host.addEventListener('pointerdown', (e) => {
    x0 = e.clientX;
  });
  host.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) {
      sfx('swoosh');
      step(dx < 0 ? 1 : -1);
    }
    else if (!DRINKS[current].seasonal) scene?.toggle().then(syncButtons);
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
