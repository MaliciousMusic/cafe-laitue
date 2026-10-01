// Inviter à installer l'appli en raccourci sur l'écran d'accueil (PWA) : petit bandeau sur
// téléphone, feuille d'explications adaptée au téléphone (iPhone, Android, navigateur
// d'Instagram), et QR code de l'adresse du site (sur ordinateur et pour la partager).

import { anim, EASE, isReduced } from '../lib/motion.js';
import { play as sfx } from '../lib/sound.js';
import { qrMatrix, qrSvg } from '../lib/qr.js';
import { createStamp } from '../scenes/stamp.js';

const NUDGE_KEY = 'cafe-laitue.install-nudge';
const NUDGE_PAUSE = 10 * 24 * 3600 * 1000; // après « Plus tard », on se fait oublier dix jours
const ua = navigator.userAgent;

export const env = {
  ios: /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1),
  android: /android/i.test(ua),
  // navigateurs intégrés (Instagram, Facebook…) : pas d'ajout possible à l'écran d'accueil
  inApp: /Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|musical_ly|Line\//i.test(ua),
  standalone: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
};

/** Adresse publique du site (celle de la balise canonical), pour le QR code. */
export function siteUrl() {
  return document.querySelector('link[rel="canonical"]')?.href || `${location.origin}${location.pathname}`;
}

/** QR code de l'adresse du site, le logo au centre (correction d'erreurs maximale). */
export async function siteQr(className = 'qr') {
  const url = siteUrl();
  const m = qrMatrix(url, { ecl: 'H' });
  // pas de logo à partir de la version 7 : il cacherait le motif d'alignement central
  const hole = m.version < 7 ? Math.round(m.size * 0.22) : 0;
  const q = qrSvg(url, { ecl: 'H', hole, className });
  q.svg.setAttribute('role', 'img');
  q.svg.removeAttribute('aria-hidden');
  q.svg.setAttribute('aria-label', `QR code vers ${url}`);
  if (q.hole) {
    const st = await createStamp();
    const pad = 0.3;
    st.svg.setAttribute('x', q.hole.x + pad);
    st.svg.setAttribute('y', q.hole.y + pad);
    st.svg.setAttribute('width', q.hole.size - pad * 2);
    st.svg.setAttribute('height', q.hole.size - pad * 2);
    q.svg.append(st.svg);
  }
  return q.svg;
}

let api = null;
/** Installe (fenêtre du navigateur) ou explique comment faire (feuille). */
export const install = () => api?.install();

export function initInstall({ openSheet, desk }) {
  const html = document.documentElement;
  html.classList.toggle('is-standalone', env.standalone);
  const sheet = document.getElementById('install-sheet');
  const nudge = document.getElementById('install-nudge');
  const show = (id, on) => {
    const el = document.getElementById(id);
    if (el) el.hidden = !on;
  };

  // ---------------------------------------------------------------- la feuille d'explications
  function fillSheet() {
    const native = Boolean(window.__installPrompt);
    show('install-native', native && !env.inApp);
    show('install-steps-inapp', env.inApp);
    show('install-steps-ios', !native && !env.inApp && env.ios);
    show('install-steps-android', !native && !env.inApp && !env.ios);
  }
  let sheetQr = false;
  async function openGuide() {
    fillSheet();
    openSheet(sheet);
    if (!sheetQr) {
      sheetQr = true;
      document.getElementById('install-qr')?.append(await siteQr('qr install-qr-svg'));
    }
  }

  async function prompt() {
    const p = window.__installPrompt;
    if (!p) return false;
    p.prompt();
    const choice = await p.userChoice.catch(() => null);
    window.__installPrompt = null;
    document.dispatchEvent(new CustomEvent('cl:installable'));
    return choice?.outcome === 'accepted';
  }

  async function doInstall() {
    hideNudge();
    if (window.__installPrompt && !env.inApp) return prompt();
    await openGuide();
    return false;
  }
  document.getElementById('install-native-btn')?.addEventListener('click', async () => {
    const ok = await prompt();
    if (ok) sheet.querySelector('[data-close]')?.click();
    else fillSheet();
  });

  // ---------------------------------------------------------------- le bandeau (téléphone)
  const recently = () => {
    try {
      return Date.now() - Number(localStorage.getItem(NUDGE_KEY) || 0) < NUDGE_PAUSE;
    } catch (e) {
      return false;
    }
  };
  const remember = () => {
    try {
      localStorage.setItem(NUDGE_KEY, String(Date.now()));
    } catch (e) {
      /* stockage indisponible */
    }
  };
  function hideNudge() {
    if (!nudge || nudge.hidden) return;
    remember();
    const a = anim(nudge, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(24px)', opacity: 0 }], { duration: 240, easing: EASE.in, fill: 'forwards' });
    const done = () => {
      nudge.hidden = true;
      a?.cancel();
    };
    if (a) a.finished.then(done).catch(done);
    else done();
  }
  // l'écran affiché (sur l'écran Fidélité, le bouton d'installation est déjà là)
  let screen = location.hash.slice(1) || 'accueil';
  document.addEventListener('cl:screen', (e) => {
    screen = e.detail;
    if (screen === 'fidelite' && nudge && !nudge.hidden) nudge.hidden = true;
  });
  function showNudge() {
    if (!nudge || env.standalone || desk.matches || recently()) return;
    if (screen === 'fidelite') return;
    nudge.hidden = false;
    sfx('pop');
    anim(nudge, [{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 480, easing: EASE.back, fill: 'none' });
  }
  if (nudge && !env.standalone) {
    document.getElementById('nudge-go')?.addEventListener('click', doInstall);
    document.getElementById('nudge-close')?.addEventListener('click', () => {
      sfx('down');
      hideNudge();
    });
    const later = () => setTimeout(showNudge, isReduced() ? 2500 : 7000);
    if (html.classList.contains('has-splash')) document.addEventListener('cl:splash-done', later, { once: true });
    else later();
  }
  window.addEventListener('appinstalled', () => {
    remember();
    if (nudge) nudge.hidden = true;
  });

  // ---------------------------------------------------------------- l'encart du bureau
  let deskQr = false;
  const deskBtn = document.getElementById('desk-install-btn');
  async function deskPanel() {
    if (!desk.matches || env.standalone) return;
    if (!deskQr) {
      deskQr = true;
      document.getElementById('desk-qr')?.append(await siteQr('qr desk-qr-svg'));
    }
    if (deskBtn) deskBtn.hidden = !window.__installPrompt;
  }
  deskBtn?.addEventListener('click', async () => {
    await prompt();
    deskBtn.hidden = !window.__installPrompt;
  });
  desk.addEventListener?.('change', deskPanel);
  document.addEventListener('cl:installable', deskPanel);
  deskPanel();

  api = { install: doInstall };
  return api;
}
