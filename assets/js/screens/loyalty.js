// Carte de fidélité : tampons enregistrés sur l'appareil, validés par le code du primeur.

import { LOYALTY } from '../config.js';
import { anim, EASE, isReduced, vibrate, wait } from '../lib/motion.js';
import { play as sfx } from '../lib/sound.js';
import { createStamp } from '../scenes/stamp.js';
import { s, svgRoot } from '../lib/svg.js';

const KEY = 'cafe-laitue.carte.v1';
const LOCK = 'cafe-laitue.carte.lock';

const store = {
  get(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      /* stockage indisponible (navigation privée) */
    }
  },
};

const fresh = () => ({ v: 1, stamps: 0, total: 0, rewards: 0, name: '', history: [], created: new Date().toISOString() });

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const CUP_ICON = '<svg class="slot-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10h12v4a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 11h1.3a2.4 2.4 0 0 1 0 4.8h-1.8"/><path d="M8.3 3.5c-.9 1 .9 2 0 3.3M12.3 3.5c-.9 1 .9 2 0 3.3"/></svg>';
const GIFT_ICON = '<svg class="slot-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M12 9v11M3.5 13h17M12 9C10 5 6.5 5.5 7 7.5S12 9 12 9zM12 9c2-4 5.5-3.5 5-1.5S12 9 12 9z"/></svg>';

export default function loyalty(el) {
  const $ = (q) => el.querySelector(q);
  const card = $('#lcard');
  const slotsEl = $('#slots');
  const countEl = $('#lcard-count');
  const footEl = $('#lcard-foot');
  const nameEl = $('#lcard-name');
  const btnStamp = $('#btn-stamp');
  const btnReward = $('#btn-reward');
  const btnInstall = $('#btn-install');
  const note = el.querySelector('.install-note');
  const sheet = document.getElementById('pin-sheet');
  const dots = [...sheet.querySelectorAll('.pin-dots i')];
  const hint = sheet.querySelector('#pin-hint');
  const keypad = sheet.querySelector('#keypad');
  const qtyBox = sheet.querySelector('#pin-qty');
  const qtyOut = sheet.querySelector('#qty-value');
  const confirmBtn = sheet.querySelector('#pin-confirm');
  const goal = LOYALTY.goal;

  let state = { ...fresh(), ...store.get(KEY, {}) };
  let mode = 'stamp';
  let code = '';
  let qty = 1;
  let unlocked = false;

  // Filtre « encre » partagé
  const defs = svgRoot('0 0 1 1', { width: 0, height: 0, style: 'position:absolute' });
  defs.append(s('defs', {}, s('filter', { id: 'ink-rough', x: '-10%', y: '-10%', width: '120%', height: '120%' }, [
    s('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.55, numOctaves: 2, seed: 3, result: 'n' }),
    s('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 1.8, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }),
    s('feTurbulence', { type: 'fractalNoise', baseFrequency: 1.6, numOctaves: 1, seed: 8, result: 'speck' }),
    s('feColorMatrix', { in: 'speck', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.6', result: 'holes' }),
    s('feComposite', { in: 'd', in2: 'holes', operator: 'in' }),
  ])));
  el.append(defs);

  // Cases
  const slots = Array.from({ length: goal }, (_, i) => {
    const li = document.createElement('li');
    li.className = `slot${i === goal - 1 ? ' is-gift' : ''}`;
    li.innerHTML = i === goal - 1 ? GIFT_ICON : CUP_ICON;
    li.setAttribute('aria-label', i === goal - 1 ? `Case ${goal} : boisson offerte` : `Case ${i + 1}`);
    slotsEl.append(li);
    return li;
  });

  createStamp().then((st) => $('#lcard-mark').append(st.svg));

  const save = () => store.set(KEY, state);

  async function inkInto(slot, i, animate) {
    if (slot.querySelector('.slot-ink')) return;
    const st = await createStamp({ ink: true, disc: false });
    const wrap = document.createElement('span');
    wrap.className = 'slot-ink';
    const rot = ((i * 47) % 50) - 25;
    wrap.style.transform = `rotate(${rot}deg)`;
    st.svg.style.filter = 'url(#ink-rough)';
    wrap.append(st.svg);
    slot.append(wrap);
    slot.setAttribute('aria-label', `Case ${i + 1} : tamponnée`);
    if (animate && !isReduced()) {
      anim(wrap, [
        { transform: `rotate(${rot}deg) scale(1.35)`, opacity: 0 },
        { transform: `rotate(${rot}deg) scale(.94)`, opacity: 1, offset: 0.6 },
        { transform: `rotate(${rot}deg) scale(1)`, opacity: 0.9 },
      ], { duration: 360, easing: EASE.out, fill: 'none' });
    }
  }

  function render() {
    const shown = Math.min(state.stamps, goal);
    countEl.textContent = String(shown);
    slots.forEach((slot, i) => {
      if (i < shown) inkInto(slot, i, false);
      else {
        slot.querySelector('.slot-ink')?.remove();
        slot.setAttribute('aria-label', i === goal - 1 ? `Case ${goal} : boisson offerte` : `Case ${i + 1}`);
      }
    });
    const full = state.stamps >= goal;
    card.classList.toggle('is-full', full);
    btnReward.disabled = !full;
    const last = state.history.filter((h) => h.k === 'stamp').pop();
    const lastTxt = last ? ` · dernier tampon le ${new Date(last.t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : '';
    let txt;
    if (full) {
      const extra = state.stamps - goal;
      txt = `Votre boisson offerte vous attend !${extra ? ` (+${extra} d’avance)` : ''}`;
    } else {
      const left = goal - state.stamps;
      txt = `Encore ${left} boisson${left > 1 ? 's' : ''} avant la prochaine offerte${lastTxt}.`;
    }
    if (state.rewards) txt += ` ${state.rewards} boisson${state.rewards > 1 ? 's' : ''} offerte${state.rewards > 1 ? 's' : ''} jusqu’ici.`;
    footEl.textContent = txt;
    if (nameEl.value !== state.name) nameEl.value = state.name || '';
  }

  // Prénom
  let nameTimer = 0;
  nameEl.addEventListener('input', () => {
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => {
      state.name = nameEl.value.trim().slice(0, 24);
      save();
    }, 300);
  });

  // ---------------------------------------------------------------- Code commerçant
  function lockState() {
    const l = store.get(LOCK, { fails: 0, until: 0 });
    return l;
  }

  function setDots() {
    dots.forEach((d, i) => d.classList.toggle('is-on', i < code.length));
  }

  function openPin(m) {
    mode = m;
    code = '';
    qty = 1;
    unlocked = false;
    setDots();
    qtyBox.hidden = true;
    confirmBtn.hidden = true;
    keypad.hidden = false;
    sheet.querySelector('.pin-dots').hidden = false;
    hint.classList.remove('is-error');
    hint.textContent = m === 'reward' ? 'Code commerçant pour offrir la boisson' : 'Code commerçant';
    const l = lockState();
    if (l.until > Date.now()) {
      hint.textContent = 'Trop d’essais. Réessayez dans une minute.';
      hint.classList.add('is-error');
    }
    sfx('open');
    import('../main.js').then((m2) => m2.openSheet(sheet));
  }

  async function checkCode() {
    const l = lockState();
    if (l.until > Date.now()) {
      code = '';
      setDots();
      return;
    }
    const ok = (await sha256(`${LOYALTY.salt}:${code}`)) === LOYALTY.pinHash;
    if (!ok) {
      const fails = l.fails + 1;
      store.set(LOCK, { fails: fails >= 5 ? 0 : fails, until: fails >= 5 ? Date.now() + 60000 : 0 });
      hint.textContent = fails >= 5 ? 'Trop d’essais. Réessayez dans une minute.' : 'Code incorrect';
      hint.classList.add('is-error');
      sfx('nope');
      const dotsBox = sheet.querySelector('.pin-dots');
      dotsBox.classList.remove('is-shake');
      void dotsBox.offsetWidth;
      dotsBox.classList.add('is-shake');
      vibrate([40, 40, 40]);
      code = '';
      setDots();
      return;
    }
    store.set(LOCK, { fails: 0, until: 0 });
    sfx('yes');
    unlocked = true;
    keypad.hidden = true;
    sheet.querySelector('.pin-dots').hidden = true;
    hint.classList.remove('is-error');
    if (mode === 'stamp') {
      hint.textContent = 'Combien de boissons ?';
      qtyBox.hidden = false;
      qtyOut.textContent = String(qty);
      confirmBtn.textContent = 'Tamponner';
    } else {
      hint.textContent = `Offrir la boisson à ${state.name || 'ce client'} ?`;
      confirmBtn.textContent = 'Valider la boisson offerte';
    }
    confirmBtn.hidden = false;
    confirmBtn.focus();
  }

  function press(k) {
    if (unlocked) return;
    sfx(k === 'del' ? 'erase' : 'key');
    if (k === 'del') code = code.slice(0, -1);
    else if (/^\d$/.test(k) && code.length < 4) code += k;
    setDots();
    if (code.length === 4) setTimeout(checkCode, 120);
  }

  keypad.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]');
    if (b) press(b.dataset.k);
  });
  sheet.addEventListener('keydown', (e) => {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
  });
  sheet.querySelector('#qty-minus').addEventListener('click', () => {
    sfx('down');
    qty = Math.max(1, qty - 1);
    qtyOut.textContent = String(qty);
  });
  sheet.querySelector('#qty-plus').addEventListener('click', () => {
    sfx('up');
    qty = Math.min(LOYALTY.maxPerVisit, qty + 1);
    qtyOut.textContent = String(qty);
  });
  confirmBtn.addEventListener('click', async () => {
    if (!unlocked) return;
    unlocked = false;
    const { closeSheet } = await import('../main.js');
    closeSheet(sheet);
    await wait(280);
    if (mode === 'stamp') await addStamps(qty);
    else await redeem();
  });

  btnStamp.addEventListener('click', () => openPin('stamp'));
  btnReward.addEventListener('click', () => openPin('reward'));

  // ---------------------------------------------------------------- Animations
  async function flyStamp(slot) {
    const r = slot.getBoundingClientRect();
    const size = r.width * 1.9;
    const fly = document.createElement('div');
    fly.className = 'stamp-fly';
    Object.assign(fly.style, { left: `${r.left + r.width / 2 - size / 2}px`, top: `${r.top + r.height / 2 - size / 2}px`, width: `${size}px`, height: `${size}px` });
    const st = await createStamp({ ink: false });
    fly.append(st.svg);
    document.body.append(fly);
    sfx('fly');
    if (!isReduced()) {
      await anim(fly, [
        { transform: 'translateY(-160px) rotate(-18deg) scale(1.3)', opacity: 0 },
        { transform: 'translateY(-40px) rotate(-6deg) scale(1.15)', opacity: 1, offset: 0.55 },
        { transform: 'translateY(0) rotate(0) scale(.9)', opacity: 1 },
      ], { duration: 420, easing: EASE.in, fill: 'forwards' })?.finished.catch(() => {});
    }
    sfx('stamp');
    vibrate(25);
    anim(card, [{ transform: 'translateY(0)' }, { transform: 'translateY(3px)' }, { transform: 'translateY(0)' }], { duration: 180, fill: 'none' });
    const up = anim(fly, [
      { transform: 'translateY(0) scale(.9)', opacity: 1 },
      { transform: 'translateY(-70px) scale(1.05)', opacity: 0 },
    ], { duration: 320, easing: EASE.out, fill: 'forwards' });
    up?.finished.then(() => fly.remove()).catch(() => fly.remove());
    if (!up) fly.remove();
  }

  async function addStamps(n) {
    for (let k = 0; k < n; k++) {
      const i = state.stamps;
      state.stamps += 1;
      state.total += 1;
      state.history.push({ t: new Date().toISOString(), k: 'stamp' });
      state.history = state.history.slice(-60);
      save();
      if (i < goal) {
        await flyStamp(slots[i]);
        await inkInto(slots[i], i, true);
      }
      countEl.textContent = String(Math.min(state.stamps, goal));
      await wait(120);
    }
    render();
    if (state.stamps >= goal) celebrate('Carte complète !');
  }

  async function redeem() {
    if (state.stamps < goal) return;
    state.stamps -= goal;
    state.rewards += 1;
    state.history.push({ t: new Date().toISOString(), k: 'reward' });
    save();
    celebrate('Boisson offerte !');
    slots.forEach((slot, i) => {
      const ink = slot.querySelector('.slot-ink');
      if (ink && !isReduced()) {
        anim(ink, [{ opacity: 0.9, transform: `${ink.style.transform} scale(1)` }, { opacity: 0, transform: `${ink.style.transform} scale(.4)` }], { duration: 380, delay: i * 50, fill: 'forwards' });
      }
    });
    await wait(isReduced() ? 0 : 900);
    slots.forEach((slot) => slot.querySelector('.slot-ink')?.remove());
    render();
  }

  function celebrate(title) {
    sfx('chime');
    const layer = document.createElement('div');
    layer.className = 'confetti';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
    const W = window.innerWidth;
    const H = window.innerHeight;
    const shapes = [
      '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 19C4 11 9 5 19 4c1 9-4 15-14 15z" fill="#7DB356"/><path d="M5 19c4-5 7-8 11-11" stroke="#12432B" stroke-width="1.3" fill="none"/></svg>',
      '<svg viewBox="0 0 24 24" width="16" height="16"><ellipse cx="12" cy="12" rx="6" ry="8.5" transform="rotate(35 12 12)" fill="#6B3A1E"/><path d="M8.6 17c2.4-3 1.2-7 6.6-10" stroke="#C9955E" stroke-width="1.4" fill="none"/></svg>',
      '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 19C4 11 9 5 19 4c1 9-4 15-14 15z" fill="#12432B"/></svg>',
      '<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="7" fill="#E97A2C"/></svg>',
      '<svg viewBox="0 0 24 24" width="18" height="18"><ellipse cx="12" cy="13" rx="7" ry="5.5" fill="#D8345A"/><path d="M5 13a7 5.5 0 0 0 5 5.2" fill="#F8F1F3"/></svg>',
    ];
    if (!isReduced()) {
      for (let i = 0; i < 42; i++) {
        const p = document.createElement('span');
        p.style.cssText = `position:fixed;left:${Math.random() * W}px;top:-30px;`;
        p.innerHTML = shapes[i % shapes.length];
        layer.append(p);
        const dx = (Math.random() - 0.5) * 160;
        const rot = (Math.random() - 0.5) * 900;
        p.animate([
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx}px, ${H + 60}px) rotate(${rot}deg)`, opacity: 0.9 },
        ], { duration: 1600 + Math.random() * 1400, delay: Math.random() * 400, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' });
      }
    }
    const banner = document.createElement('div');
    banner.className = 'celebrate';
    banner.setAttribute('role', 'status');
    banner.textContent = title;
    layer.append(banner);
    anim(banner, [{ transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translate(-50%, -60%) scale(.95)', opacity: 0 }], { duration: 2400, easing: EASE.out, fill: 'forwards', keepWhenReduced: true });
    vibrate([30, 60, 30]);
    setTimeout(() => layer.remove(), 3200);
  }

  // ---------------------------------------------------------------- Installation (PWA)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  function refreshInstall() {
    if (standalone) {
      btnInstall.hidden = true;
      note.textContent = 'Appli installée. Vos tampons restent sur ce téléphone.';
      return;
    }
    if (window.__installPrompt) {
      btnInstall.hidden = false;
    } else if (ios) {
      btnInstall.hidden = true;
      note.innerHTML = 'Sur iPhone : touchez <strong>Partager</strong> puis <strong>« Sur l’écran d’accueil »</strong> pour garder votre carte à portée de main.';
    }
  }
  document.addEventListener('cl:installable', refreshInstall);
  btnInstall.addEventListener('click', async () => {
    const p = window.__installPrompt;
    if (!p) return;
    p.prompt();
    await p.userChoice.catch(() => {});
    window.__installPrompt = null;
    btnInstall.hidden = true;
  });
  refreshInstall();

  // Synchronise si la carte change dans un autre onglet
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = { ...fresh(), ...store.get(KEY, {}) };
      render();
    }
  });

  render();

  return {
    enter() {
      render();
      if (!isReduced()) {
        anim(card, [{ transform: 'translateY(18px) rotate(-1.5deg)', opacity: 0 }, { transform: 'translateY(0) rotate(0)', opacity: 1 }], { duration: 520, easing: EASE.back, fill: 'none' });
      }
    },
    leave() {},
  };
}
