// Écran « Le café » : la carte des cafés de spécialité, chaque boisson préparée en motion
// design étape par étape (le procédé suit en dessous), latte art tiré au hasard.

import { createDrinkScene } from '../scenes/drinks.js';
import { DRINKS, ORDER, STEPS, processOf } from '../data/drinks.js';
import { play as sfx } from '../lib/sound.js';

const ART_NAME = { heart: 'un cœur', swan: 'un cygne', tulip: 'une tulipe', rosetta: 'une rosette' };

export default function cafe(el) {
  const $ = (q) => el.querySelector(q);
  const host = $('#scene-drink');
  const btnPrev = $('#drink-prev');
  const btnNext = $('#drink-next');
  const btnExplode = $('#drink-explode');
  const btnIced = $('#drink-iced');
  const stepsEl = $('#process-steps');
  const subEl = $('#process-sub');
  const btnReplay = $('#process-replay');
  const rows = [...el.querySelectorAll('.menu-item')];

  let scene;
  let current = 'cappuccino';
  let iced = false;
  let started = false;
  let steps = [];
  let token = 0;
  let manual = false;

  // ------------------------------------------------------------ procédé
  function caption(label, text) {
    subEl.replaceChildren();
    if (label) {
      const b = document.createElement('b');
      b.textContent = label;
      subEl.append(b, ' ');
    }
    subEl.append(text);
  }

  function renderProcess() {
    steps = processOf(current, iced);
    stepsEl.replaceChildren(...steps.map((st, i) => {
      const li = document.createElement('li');
      li.dataset.step = st.k;
      const n = document.createElement('i');
      n.setAttribute('aria-hidden', 'true');
      n.textContent = String(i + 1);
      const label = document.createElement('span');
      label.textContent = STEPS[st.k];
      li.append(n, label);
      return li;
    }));
    caption('', 'Les ingrédients d’abord, puis la préparation pas à pas.');
  }

  function mark(k) {
    const idx = steps.findIndex((st) => st.k === k);
    if (idx < 0) return;
    [...stepsEl.children].forEach((li, i) => {
      li.classList.toggle('is-done', i < idx);
      if (i === idx) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    caption(STEPS[k], steps[idx].sub);
  }

  function markAll(done) {
    [...stepsEl.children].forEach((li) => {
      li.classList.toggle('is-done', done);
      li.removeAttribute('aria-current');
    });
  }

  function finished() {
    markAll(true);
    const def = DRINKS[current];
    const art = def.garnish?.k === 'art' && !(iced && def.icedVersion);
    if (art) caption('Prêt !', `Latte art tiré au hasard : ${ART_NAME[scene.artStyle] || 'un cœur'}. Rejouez pour un autre motif.`);
    else caption('Prêt !', 'Bonne dégustation.');
    btnReplay.hidden = false;
  }

  // ------------------------------------------------------------ scène
  const ready = createDrinkScene().then((sc) => {
    scene = sc;
    host.append(sc.svg);
    sc.onChange(({ phase, step }) => {
      if (phase === 'step') mark(step);
      else if (phase === 'exploded') {
        markAll(false);
        if (manual) caption('Vue éclatée', 'touchez la scène pour lancer la préparation.');
      } else if (phase === 'done') finished();
      btnExplode.setAttribute('aria-pressed', String(sc.exploded));
    });
    return sc;
  });

  function syncButtons() {
    const def = DRINKS[current];
    const canIce = !!(def.icedVersion || def.iced);
    btnIced.disabled = !canIce;
    btnIced.setAttribute('aria-pressed', String(iced && canIce));
    btnExplode.setAttribute('aria-pressed', String(!!scene?.exploded));
  }

  async function select(id, { keepIced = false } = {}) {
    await ready;
    const my = ++token;
    manual = false;
    current = id;
    const def = DRINKS[id];
    if (!keepIced || !(def.icedVersion || def.iced)) iced = false;
    rows.forEach((li) => {
      const on = li.dataset.drink === id;
      li.classList.toggle('is-on', on);
      li.querySelector('.menu-row').setAttribute('aria-expanded', String(on));
    });
    btnReplay.hidden = true;
    renderProcess();
    syncButtons();
    await scene.show(id, { iced });
    if (my === token) syncButtons();
  }

  const go = (d) => select(ORDER[(ORDER.indexOf(current) + d + ORDER.length) % ORDER.length]);

  /** Vue éclatée ↔ boisson préparée (sans relancer le latte art). */
  async function toggle() {
    await ready;
    manual = true;
    btnReplay.hidden = true;
    btnExplode.setAttribute('aria-pressed', String(!scene.exploded));
    await scene.toggle();
    syncButtons();
  }

  btnPrev.addEventListener('click', () => go(-1));
  btnNext.addEventListener('click', () => go(1));
  btnReplay.addEventListener('click', () => select(current, { keepIced: true }));
  btnExplode.addEventListener('click', toggle);
  btnIced.addEventListener('click', () => {
    iced = !iced;
    sfx(iced ? 'ice' : 'off', { n: 3 });
    select(current, { keepIced: true });
  });
  // Chaque ligne de la carte est une lame de xylophone : ça monte en descendant la carte
  rows.forEach((li) => li.querySelector('.menu-row').addEventListener('click', () => {
    sfx('note', { i: ORDER.indexOf(li.dataset.drink), base: 67 });
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
      go(dx < 0 ? 1 : -1);
    } else toggle();
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
