// Écran d'ouverture : le tampon s'assemble en grand au centre, sur un plateau de légumes qui
// remplit l'écran (comme la photo de l'enseigne). « Entrer » débloque le son (les navigateurs
// l'exigent) et lance le jingle ; les légumes éclatent comme des bulles, du haut vers le bas,
// le logo danse sur les notes, tamponne, puis rétrécit jusqu'à sa place sur la devanture
// pendant que la boutique se construit autour (voir screens/home.js). Affiché une fois par
// visite, depuis l'accueil : la décision est prise dans le <head> d'index.html (classe
// « has-splash »), avant le premier affichage.

import { createStamp } from '../scenes/stamp.js';
import { layVeggies } from '../scenes/veggies.js';
import { anim, EASE } from '../lib/motion.js';
import { svgRoot, g } from '../lib/svg.js';
import { play as sfx, soundOn, setSound, latency, JINGLE } from '../lib/sound.js';

const AUTO_MS = 6500; // sans réponse, on entre sans le son
const later = (ms) => new Promise((r) => setTimeout(r, ms));

let active = null;

/** L'écran d'ouverture en cours (ou null) : l'accueil lui passe le relais. */
export const getSplash = () => active;

export function startSplash() {
  const html = document.documentElement;
  const root = document.getElementById('splash');
  if (!root) return null;
  if (!html.classList.contains('has-splash')) {
    root.remove();
    return null;
  }
  // JS arrivé après le filet de sécurité CSS (connexion très lente) : on n'insiste pas
  if (getComputedStyle(root).visibility === 'hidden') {
    html.classList.remove('has-splash');
    root.remove();
    return null;
  }
  root.classList.add('is-live');
  const logo = root.querySelector('.splash-logo');
  const dance = root.querySelector('.splash-dance');
  const actions = root.querySelector('.splash-actions');
  const enter = root.querySelector('#splash-enter');
  const alt = root.querySelector('#splash-alt');
  const behind = [...document.querySelectorAll('.topbar, #main, .tabbar')];
  behind.forEach((el) => el.setAttribute('inert', ''));

  // ---------------------------------------------------------------- le plateau de légumes
  const items = layVeggies();
  const plates = [['#splash-veg', 'under'], ['#splash-veg-over', 'over']].map(([sel, layer]) => {
    const host = root.querySelector(sel);
    const svg = svgRoot('0 0 400 800', { preserveAspectRatio: 'none' });
    const world = g();
    items.filter((it) => it.layer === layer).forEach((it) => world.append(it.el));
    svg.append(world);
    host?.append(svg);
    return { svg, world };
  });
  // Le centre de la composition (200, 338) se cale sur le centre du logo, quelle que soit la taille d'écran
  const fit = () => {
    const box = root.getBoundingClientRect();
    const lr = logo.getBoundingClientRect();
    if (!box.width || !lr.width) return;
    const k = Math.max(box.width / 400, box.height / 800, lr.width / 250) * 1.18;
    const cx = lr.left - box.left + lr.width / 2;
    const cy = lr.top - box.top + lr.height / 2;
    plates.forEach(({ svg, world }) => {
      svg.setAttribute('viewBox', `0 0 ${box.width.toFixed(1)} ${box.height.toFixed(1)}`);
      world.setAttribute('transform', `translate(${(cx - 200 * k).toFixed(1)} ${(cy - 338 * k).toFixed(1)}) scale(${k.toFixed(4)})`);
    });
  };
  fit();
  window.addEventListener('resize', fit);
  const ground = items.find((it) => it.ground);
  const veg = items.filter((it) => !it.ground);
  veg.forEach((it) => {
    it.pop.style.transformBox = 'fill-box';
    it.pop.style.transformOrigin = '50% 50%';
  });
  // Arrivée : les légumes poussent comme des bulles, du logo vers les bords
  anim(ground.el, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'backwards' });
  veg.forEach((it) => {
    const dist = Math.hypot(it.x - 200, it.y - 338);
    anim(it.pop, [
      { transform: 'scale(0)', opacity: 0 },
      { transform: 'scale(1.08)', opacity: 1, offset: 0.7 },
      { transform: 'scale(1)', opacity: 1 },
    ], { duration: 420, delay: Math.min(700, dist * 1.1) + Math.random() * 90, easing: EASE.out, fill: 'backwards' });
  });

  /** Les légumes éclatent comme des bulles, du haut vers le bas. Résout à la fin de la vague. */
  function burst(withSound) {
    const order = [...veg].sort((a, b) => a.y - b.y);
    const span = 1050;
    let last = 0;
    order.forEach((it, n) => {
      const delay = Math.max(0, ((it.y + 110) / 1000) * span) + Math.random() * 70;
      last = Math.max(last, delay);
      anim(it.pop, [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.16)', opacity: 1, offset: 0.4 },
        { transform: 'scale(.15)', opacity: 0 },
      ], { duration: 260, delay, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
      if (withSound && n % 3 === 0) sfx('bubble', { i: Math.floor(Math.random() * 9), delay: delay + 90 });
    });
    anim(ground.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, delay: 60, easing: 'ease-out', fill: 'forwards' });
    return later(last + 280);
  }

  const labels = () => {
    const on = soundOn();
    enter.classList.toggle('is-sound', on);
    enter.setAttribute('aria-label', on ? 'Entrer avec le son' : 'Entrer');
    alt.textContent = on ? 'sans le son' : 'avec le son';
  };
  labels();

  // ---------------------------------------------------------------- le choix du visiteur
  let choice = null;
  let resolveChoice;
  const chosen = new Promise((r) => (resolveChoice = r));
  let autoTimer = 0;
  const choose = (how) => {
    if (choice) return;
    choice = how;
    clearTimeout(autoTimer);
    root.classList.add('is-chosen');
    resolveChoice(how);
  };
  // Toucher n'importe où = entrer ; le petit lien inverse le son d'abord
  root.addEventListener('click', (e) => {
    if (choice) return;
    if (e.target.closest('#splash-alt')) setSound(!soundOn(), { chime: false });
    choose(soundOn() ? 'sound' : 'quiet');
  });
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(soundOn() ? 'sound' : 'quiet');
    } else if (e.key === 'Escape') {
      choose('quiet');
    }
  };
  document.addEventListener('keydown', onKey);

  // ---------------------------------------------------------------- le logo s'assemble
  const built = createStamp().then(async (st) => {
    dance.append(st.svg);
    later(900).then(() => {
      if (choice) return;
      actions.classList.add('is-on');
      autoTimer = setTimeout(() => choose('auto'), AUTO_MS);
    });
    await st.play({ speed: 1.45, press: false });
    return st;
  });

  // Le logo danse sur les notes du jingle
  function dancing(lag) {
    anim(dance, [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-3deg)' },
      { transform: 'rotate(2deg)' },
      { transform: 'rotate(0deg)' },
    ], { duration: 280, delay: lag, easing: 'ease-in-out', fill: 'none' });
    JINGLE.beats.forEach((b, k) => {
      const big = k === 1 || k === 3;
      anim(dance, [
        { transform: 'scale(1) rotate(0deg)' },
        { transform: `scale(${big ? 1.07 : 1.045}) rotate(${k % 2 ? 2.5 : -2.5}deg)`, offset: 0.35 },
        { transform: 'scale(1) rotate(0deg)' },
      ], { duration: 240, delay: lag + b * 1000, easing: 'ease-out', fill: 'none' });
    });
  }

  // L'appli apparaît autour : barre du haut, onglets, texte de l'accueil
  function revealApp() {
    const rise = (el, from, delay) => el && anim(el, [
      { opacity: 0, transform: from },
      { opacity: 1, transform: 'none' },
    ], { duration: 560, delay, easing: EASE.out, fill: 'backwards' });
    rise(document.querySelector('.topbar'), 'translateY(-100%)', 150);
    rise(document.querySelector('.tabbar'), 'translateY(100%)', 300);
    document.querySelectorAll('#accueil .home-body > *').forEach((el, i) => rise(el, 'translateY(16px)', 420 + i * 70));
  }

  let over = false;
  function finish() {
    if (over) return;
    over = true;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', fit);
    behind.forEach((el) => el.removeAttribute('inert'));
    html.classList.remove('has-splash');
    root.remove();
    active = null;
    document.dispatchEvent(new CustomEvent('cl:splash-done'));
  }

  // Le logo rétrécit jusqu'à sa place sur la devanture
  async function leave(h) {
    root.classList.add('is-leaving');
    revealApp();
    const target = h?.target;
    const to = target?.getBoundingClientRect();
    if (!to || !to.width) {
      h?.onFlight?.();
      await anim(logo, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: 'forwards' })?.finished.catch(() => {});
      h?.onLanded?.();
      return;
    }
    const from = logo.getBoundingClientRect();
    const k = to.width / from.width;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    h.onFlight?.();
    const flight = anim(logo, [
      { transform: 'translate(0px, 0px) scale(1)' },
      { transform: `translate(${(dx * 0.62).toFixed(1)}px, ${(dy * 0.42).toFixed(1)}px) scale(${(1 + (k - 1) * 0.7).toFixed(3)})`, offset: 0.6 },
      { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${k.toFixed(4)})` },
    ], { duration: 760, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' });
    await flight?.finished.catch(() => {});
    h.onLanded?.();
    sfx('land');
  }

  let resolveHandover;
  const handover = new Promise((r) => (resolveHandover = r));

  const done = (async () => {
    try {
      const st = await built;
      const how = await chosen;
      const withSound = how === 'sound' && soundOn();
      const popped = burst(withSound);
      if (withSound) {
        sfx('jingle');
        const lag = latency() * 1000;
        dancing(lag);
        await Promise.all([later(lag + JINGLE.hit * 1000), popped]);
      } else {
        await popped;
      }
      st.press({ sound: withSound, gain: 0.35 });
      await later(170);
      // L'accueil donne la cible du logo (il est prêt bien avant, en pratique)
      const h = await Promise.race([handover, later(5000).then(() => null)]);
      await leave(h);
    } catch (e) {
      console.error('[Café Laitue] écran d’ouverture :', e);
    } finally {
      finish();
    }
  })();

  active = {
    /**
     * L'accueil est prêt : `target` = où poser le logo ; `onFlight` au décollage (la boutique
     * commence à se construire) ; `onLanded` quand le logo est posé.
     */
    handover(h) {
      resolveHandover(h);
      return done;
    },
  };
  return active;
}
