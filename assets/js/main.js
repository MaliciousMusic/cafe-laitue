// Café Laitue — démarrage de l'appli : navigation par onglets, statut d'ouverture,
// feuilles d'infos, installation (PWA) et chargement paresseux des scènes.

import { anim, EASE, isReduced } from './lib/motion.js';
import { openStatus, todayHours, parisNow } from './features/hours.js';
import { createStamp } from './scenes/stamp.js';
import { dragScroll, pager } from './lib/hscroll.js';
import { play as sfx, soundSupported, soundOn, setSound, onSoundChange } from './lib/sound.js';
import { startSplash } from './features/splash.js';

const SCREENS = ['accueil', 'comptoir', 'etals', 'primeur', 'fidelite'];
const TITLES = {
  accueil: null,
  comptoir: 'Le comptoir',
  etals: 'Les étals',
  primeur: 'Votre primeur',
  fidelite: 'Carte fidélité',
};
const LOADERS = {
  accueil: () => import('./screens/home.js'),
  comptoir: () => import('./screens/bar.js'),
  etals: () => import('./screens/stalls.js'),
  primeur: () => import('./screens/owner.js'),
  fidelite: () => import('./screens/loyalty.js'),
};

const baseTitle = document.title;
const controllers = {};
let current = null;
let navToken = 0;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function controllerFor(id) {
  if (!controllers[id]) {
    controllers[id] = LOADERS[id]()
      .then((m) => m.default(document.getElementById(id)))
      .catch((err) => {
        console.error(`[Café Laitue] écran ${id} :`, err);
        return null;
      });
  }
  return controllers[id];
}

// --------------------------------------------------------------------------
// Navigation
// --------------------------------------------------------------------------

function placePill(animate = true) {
  const bar = $('.tabbar');
  const pill = $('.tab-pill');
  const tab = $(`.tab[data-tab="${current}"]`);
  if (!bar || !pill || !tab) return;
  const icon = $('.i', tab);
  const b = bar.getBoundingClientRect();
  const r = icon.getBoundingClientRect();
  const x = r.left - b.left + r.width / 2 - pill.offsetWidth / 2;
  const y = r.top - b.top + r.height / 2 - pill.offsetHeight / 2;
  if (!animate) pill.style.transition = 'none';
  bar.style.setProperty('--pill-x', `${x}px`);
  pill.style.top = `${y}px`;
  if (!animate) requestAnimationFrame(() => (pill.style.transition = ''));
}

async function go(id, { push = false, replace = false } = {}) {
  if (!SCREENS.includes(id)) id = 'accueil';
  if (id === current) return;
  const token = ++navToken;
  const prev = current;
  current = id;
  const from = prev && document.getElementById(prev);
  const to = document.getElementById(id);
  const dir = prev ? Math.sign(SCREENS.indexOf(id) - SCREENS.indexOf(prev)) : 0;

  $$('.tab').forEach((t) => (t.dataset.tab === id ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
  placePill(!!prev);

  to.classList.add('is-active');
  to.removeAttribute('inert');
  to.removeAttribute('aria-hidden');
  to.scrollTop = 0;
  if (from) {
    from.setAttribute('inert', '');
    from.setAttribute('aria-hidden', 'true');
    if (!isReduced()) {
      from.style.zIndex = '0';
      to.style.zIndex = '2';
      const out = anim(from, [
        { transform: 'translateX(0)', opacity: 1 },
        { transform: `translateX(${-dir * 36}px)`, opacity: 0 },
      ], { duration: 240, easing: EASE.in, fill: 'none' });
      anim(to, [
        { transform: `translateX(${dir * 56}px)`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ], { duration: 380, delay: 60, easing: EASE.out, fill: 'backwards' });
      out?.finished.then(() => {
        if (current !== prev) from.classList.remove('is-active');
        from.style.zIndex = '';
        to.style.zIndex = '';
      }).catch(() => {});
    } else {
      from.classList.remove('is-active');
    }
  }

  document.title = TITLES[id] ? `${TITLES[id]} · Café Laitue` : baseTitle;
  const hash = `#${id}`;
  if (push && location.hash !== hash) history.pushState({ id }, '', hash);
  else if (replace) history.replaceState({ id }, '', id === 'accueil' && !location.hash ? location.pathname + location.search : hash);

  if (prev) (await controllers[prev])?.leave?.();
  const ctrl = await controllerFor(id);
  if (token === navToken) ctrl?.enter?.({ first: !prev });
  // Précharge les autres écrans quand le navigateur est libre.
  if (!prev) idle(() => SCREENS.forEach((s) => s !== id && LOADERS[s]().catch(() => {})));
}

const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  if (SCREENS.includes(id)) {
    e.preventDefault();
    sfx('tab', { i: SCREENS.indexOf(id) });
    go(id, { push: true });
  } else if (id === 'infos') {
    e.preventDefault();
    openSheet($('#infos'));
  }
});

window.addEventListener('popstate', () => {
  const id = location.hash.slice(1);
  if (id === 'infos') return openSheet($('#infos'));
  go(SCREENS.includes(id) ? id : 'accueil');
});

// Navigation au clavier dans la barre d'onglets (flèches).
$('.tabbar')?.addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const i = SCREENS.indexOf(current) + (e.key === 'ArrowRight' ? 1 : -1);
  const id = SCREENS[(i + SCREENS.length) % SCREENS.length];
  sfx('tab', { i: SCREENS.indexOf(id) });
  go(id, { push: true });
  $(`.tab[data-tab="${id}"]`)?.focus();
});

// --------------------------------------------------------------------------
// Feuilles (dialog)
// --------------------------------------------------------------------------

export function openSheet(dlg) {
  if (!dlg || dlg.open) return;
  sfx('open');
  dlg.showModal();
  anim(dlg, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 420, easing: EASE.out, fill: 'none' });
}

export function closeSheet(dlg) {
  if (!dlg || !dlg.open) return;
  sfx('close');
  const a = anim(dlg, [{ transform: 'translateY(0)' }, { transform: 'translateY(105%)' }], { duration: 260, easing: EASE.in, fill: 'forwards' });
  const done = () => {
    dlg.close();
    a?.cancel();
  };
  if (a) a.finished.then(done).catch(done);
  else done();
}

$$('dialog.sheet').forEach((dlg) => {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) closeSheet(dlg);
  });
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeSheet(dlg);
  });
  // Glisser vers le bas pour fermer
  let y0 = null;
  const grip = $('.sheet-head', dlg);
  dlg.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.sheet-grip, .sheet-head')) return;
    y0 = e.clientY;
    dlg.setPointerCapture?.(e.pointerId);
  });
  dlg.addEventListener('pointermove', (e) => {
    if (y0 == null) return;
    const dy = Math.max(0, e.clientY - y0);
    dlg.style.transform = `translateY(${dy}px)`;
  });
  const end = (e) => {
    if (y0 == null) return;
    const dy = e.clientY - y0;
    y0 = null;
    dlg.style.transform = '';
    if (dy > 90) closeSheet(dlg);
  };
  dlg.addEventListener('pointerup', end);
  dlg.addEventListener('pointercancel', end);
  void grip;
});

$('#status')?.addEventListener('click', () => {
  // La pancarte se balance (et toque) quand on la touche
  sfx('sign');
  anim($('#status .sign'), [
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(-13deg)' },
    { transform: 'rotate(9deg)' },
    { transform: 'rotate(-5deg)' },
    { transform: 'rotate(2deg)' },
    { transform: 'rotate(0deg)' },
  ], { duration: 900, easing: 'ease-out', fill: 'none' });
  openSheet($('#infos'));
});
$('#today')?.addEventListener('click', () => openSheet($('#infos')));

// --------------------------------------------------------------------------
// Statut d'ouverture (à l'heure de Paris)
// --------------------------------------------------------------------------

function refreshStatus() {
  const st = openStatus();
  const btn = $('#status');
  if (btn) {
    btn.dataset.state = st.state;
    $('#status-text').textContent = st.short;
    if (st.state === 'closed') $('#sign-closed-sub').textContent = st.sub;
    else $('#sign-open-sub').textContent = st.sub;
    btn.setAttribute('aria-label', `${st.label}. Voir les horaires et infos pratiques`);
  }
  const today = $('#today-hours');
  if (today) today.textContent = `${todayHours()} · ${st.label.split(' · ')[0]}`;
  const { day } = parisNow();
  $$('#hours-table tr').forEach((tr) => tr.classList.toggle('is-today', Number(tr.dataset.day) === day));
  document.dispatchEvent(new CustomEvent('cl:status', { detail: st }));
}
refreshStatus();
setInterval(refreshStatus, 30000);
document.addEventListener('visibilitychange', () => !document.hidden && refreshStatus());

// --------------------------------------------------------------------------
// Logo de la barre du haut
// --------------------------------------------------------------------------

createStamp().then((st) => {
  const host = $('#brand-mark');
  if (host) host.append(st.svg);
});

// --------------------------------------------------------------------------
// Sons : bouton haut-parleur de la barre du haut
// --------------------------------------------------------------------------

const soundBtn = $('#sound-toggle');
if (soundBtn && soundSupported) {
  const syncSound = (on) => {
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.title = on ? 'Couper les sons' : 'Activer les sons';
  };
  syncSound(soundOn());
  onSoundChange(syncSound);
  soundBtn.hidden = false;
  soundBtn.addEventListener('click', () => setSound(!soundOn()));
}

// --------------------------------------------------------------------------
// Installation (PWA) + service worker
// --------------------------------------------------------------------------

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__installPrompt = e;
  document.dispatchEvent(new CustomEvent('cl:installable'));
});

const devHost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
if ('serviceWorker' in navigator && (!devHost || new URLSearchParams(location.search).has('sw'))) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// --------------------------------------------------------------------------
// Bureau : ruban géant en arrière-plan
// --------------------------------------------------------------------------

const desk = window.matchMedia('(min-width: 880px) and (min-height: 620px)');
let backdropDone = false;
async function backdrop() {
  if (!desk.matches || backdropDone) return;
  backdropDone = true;
  try {
    const { createBackdrop } = await import('./scenes/backdrop.js');
    await createBackdrop($('#backdrop'));
  } catch (e) {
    backdropDone = false;
  }
}
desk.addEventListener?.('change', backdrop);
backdrop();

// --------------------------------------------------------------------------
// Démarrage
// --------------------------------------------------------------------------

// Écran d'ouverture (une fois par visite) : le logo s'assemble avant tout le reste
startSplash();

// Bandeaux horizontaux : glisser à la souris, molette, points de pagination
$$('.cards, .months, .values, .composer-list').forEach(dragScroll);
$$('.cards').forEach((el) => pager(el, { label: 'Carte' }));

SCREENS.forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('is-active');
  el.setAttribute('inert', '');
  el.setAttribute('aria-hidden', 'true');
});
const startId = location.hash.slice(1);
go(SCREENS.includes(startId) ? startId : 'accueil', { replace: true });
if (startId === 'infos') openSheet($('#infos'));
window.addEventListener('resize', () => placePill(false));
document.fonts?.ready.then(() => placePill(false));
