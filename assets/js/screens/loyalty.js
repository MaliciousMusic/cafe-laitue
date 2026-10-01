// Carte de fidélité imprimée (une fiche avec un panier en osier) : le client la crée avec son
// nom et son numéro de téléphone ; chaque passage est un vrai coup de tampon encreur, un légume
// de couleur ; le 10e tampon, le logo, donne la boisson offerte. Tout reste sur l'appareil ;
// les tampons sont validés par le code du primeur (6 chiffres).

import { LOYALTY } from '../config.js';
import { anim, EASE, isReduced, vibrate, wait } from '../lib/motion.js';
import { play as sfx } from '../lib/sound.js';
import { createBasket } from '../scenes/basket.js';
import { env, install } from '../features/install.js';

const KEY = 'cafe-laitue.carte.v1';
const PIN_LEN = 6;
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

const fresh = () => ({ v: 1, stamps: 0, total: 0, rewards: 0, name: '', phone: '', history: [], created: new Date().toISOString() });

/** Numéro saisi → forme rangée (0612345678 ou +447911123456), ou null s'il est incomplet. */
export function normPhone(v) {
  let d = String(v || '').replace(/[\s.\-()/]/g, '');
  if (/^00\d+$/.test(d)) d = `+${d.slice(2)}`;
  if (/^\+330?\d{9}$/.test(d)) d = `0${d.slice(-9)}`;
  if (/^0[1-9]\d{8}$/.test(d)) return d;
  if (/^\+[1-9]\d{7,14}$/.test(d) && !d.startsWith('+33')) return d;
  return null;
}
/** 06 12 34 56 78 */
const spaced = (d) => (/^0\d{9}$/.test(d) ? d.match(/\d\d/g).join(' ') : d);
/** Sur la carte, le numéro est en partie masqué : 06 •• •• •• 78. */
const masked = (d) => (/^0\d{9}$/.test(d) ? `${d.slice(0, 2)} •• •• •• ${d.slice(-2)}` : d ? `${d.slice(0, 4)} •• •• ${d.slice(-2)}` : '');

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function loyalty(el) {
  const $ = (q) => el.querySelector(q);
  const card = $('#lcard');
  const basketBox = $('#lbasket');
  const footEl = $('#lcard-foot');
  const editBtn = $('#lcard-edit');
  const form = $('#lform');
  const inName = $('#lf-name');
  const inTel = $('#lf-tel');
  const errEl = $('#lf-error');
  const cancelBtn = $('#lf-cancel');
  const actions = $('#lactions');
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
  let editing = false;

  // La carte (les légumes tamponnés dans le panier)
  const basket = createBasket();
  basketBox.prepend(basket.svg);
  basketBox.setAttribute('role', 'img');
  basket.ready.then(() => render());

  const save = () => store.set(KEY, state);
  const hasCard = () => Boolean(state.name && state.phone);
  const firstName = () => (state.name || '').split(' ')[0];

  function render({ owner = true } = {}) {
    const shown = Math.min(state.stamps, goal);
    basket.setCount(shown);
    for (let i = 0; i < goal; i++) {
      if (i < shown) basket.put(i);
      else basket.remove(i);
    }
    if (owner) basket.setOwner(state.name, masked(state.phone));
    basketBox.setAttribute('aria-label', `Carte fidélité${state.name ? ` de ${state.name}` : ''} : ${shown} légume${shown > 1 ? 's' : ''} tamponné${shown > 1 ? 's' : ''} sur ${goal}`);
    const full = state.stamps >= goal;
    card.classList.toggle('is-full', full);
    btnReward.disabled = !full;
    // carte à créer : le formulaire remplace les boutons du primeur
    const ok = hasCard();
    if (!ok && form.hidden) showForm('create');
    if (ok && !editing) form.hidden = true;
    actions.hidden = !ok || editing;
    editBtn.hidden = !ok || editing;
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
    if (!ok && !state.stamps) txt = 'Votre carte vous attend : écrivez-y votre nom et votre numéro.';
    footEl.textContent = txt;
  }

  // ---------------------------------------------------------------- Créer / modifier la carte
  function setError(msg, input) {
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
  }

  function showForm(mode) {
    editing = mode === 'edit';
    $('#lform-title').textContent = editing ? 'Modifier ma carte' : 'Créez votre carte';
    $('#lform-text').textContent = editing
      ? 'Votre nom et votre numéro restent sur ce téléphone.'
      : 'Il suffit de votre nom et de votre numéro de téléphone : ils s’inscrivent sur la carte et restent sur ce téléphone.';
    $('#lf-submit-text').textContent = editing ? 'Enregistrer' : 'Créer ma carte';
    cancelBtn.hidden = !editing;
    inName.value = state.name || '';
    inTel.value = state.phone ? spaced(state.phone) : '';
    inName.removeAttribute('aria-invalid');
    inTel.removeAttribute('aria-invalid');
    setError(null);
    form.hidden = false;
    actions.hidden = true;
    editBtn.hidden = true;
  }

  function closeForm() {
    editing = false;
    form.hidden = true;
    render({ owner: false });
  }

  [inName, inTel].forEach((inp) => inp.addEventListener('input', () => {
    inp.removeAttribute('aria-invalid');
    if (!errEl.hidden) setError(null);
  }));
  // le numéro se range par paires une fois saisi
  inTel.addEventListener('blur', () => {
    const d = normPhone(inTel.value);
    if (d) inTel.value = spaced(d);
  });
  inName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inTel.focus();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = inName.value.replace(/\s+/g, ' ').trim().slice(0, 32);
    const tel = normPhone(inTel.value);
    if (!name) return setError('Indiquez votre nom.', inName);
    if (!tel) return setError('Ce numéro semble incomplet (par exemple : 06 12 34 56 78).', inTel);
    const isNew = !hasCard();
    state.name = name;
    state.phone = tel;
    save();
    inName.blur();
    inTel.blur();
    editing = false;
    form.hidden = true;
    sfx(isNew ? 'chime' : 'yes');
    render({ owner: false });
    if (!isReduced()) {
      anim(actions, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 200, easing: EASE.out, fill: 'backwards' });
      basketBox.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
    await basket.setOwner(name, masked(tel), { animate: !isReduced() });
  });
  cancelBtn.addEventListener('click', () => {
    sfx('down');
    closeForm();
  });
  editBtn.addEventListener('click', () => {
    sfx('open');
    showForm('edit');
    form.scrollIntoView?.({ block: 'nearest', behavior: isReduced() ? 'auto' : 'smooth' });
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
      hint.textContent = `Offrir la boisson à ${firstName() || 'ce client'} ?`;
      confirmBtn.textContent = 'Valider la boisson offerte';
    }
    confirmBtn.hidden = false;
    confirmBtn.focus();
  }

  function press(k) {
    if (unlocked) return;
    sfx(k === 'del' ? 'erase' : 'key');
    if (k === 'del') code = code.slice(0, -1);
    else if (/^\d$/.test(k) && code.length < PIN_LEN) code += k;
    setDots();
    if (code.length === PIN_LEN) setTimeout(checkCode, 120);
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
  /** Coup de tampon : le tampon en bois descend, presse, remonte ; l'encre reste sur le papier. */
  async function stampAt(i) {
    if (isReduced()) {
      basket.put(i);
      sfx('stamp');
      return;
    }
    const { body, shadow } = basket.toolAt(i);
    body.style.transformBox = 'fill-box';
    body.style.transformOrigin = '50% 100%';
    shadow.style.transformBox = 'fill-box';
    shadow.style.transformOrigin = '50% 50%';
    basket.tool.setAttribute('opacity', 1);
    sfx('fly');
    const down = anim(body, [
      { transform: 'translateY(-150px) rotate(-10deg)', opacity: 0 },
      { transform: 'translateY(-46px) rotate(-3deg)', opacity: 1, offset: 0.6 },
      { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
    ], { duration: 360, easing: EASE.in, fill: 'forwards' });
    anim(shadow, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 360, easing: EASE.in, fill: 'forwards' });
    await down?.finished.catch(() => {});
    // la gomme s'écrase, l'encre se dépose
    sfx('stamp');
    vibrate(25);
    const st = basket.put(i);
    anim(st.outer, [{ opacity: 0 }, { opacity: 1 }], { duration: 90, fill: 'none' });
    anim(body, [{ transform: 'translateY(0px) scaleY(1)' }, { transform: 'translateY(1.5px) scaleY(.93)' }, { transform: 'translateY(0px) scaleY(1)' }], { duration: 170, fill: 'none' });
    anim(basketBox, [{ transform: 'translateY(0)' }, { transform: 'translateY(2px)' }, { transform: 'translateY(0)' }], { duration: 170, fill: 'none' });
    await wait(170);
    const up = anim(body, [
      { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
      { transform: 'translateY(-110px) rotate(8deg)', opacity: 0 },
    ], { duration: 380, easing: EASE.out, fill: 'forwards' });
    anim(shadow, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
    await up?.finished.catch(() => {});
    basket.tool.setAttribute('opacity', 0);
  }

  async function addStamps(n) {
    for (let k = 0; k < n; k++) {
      const i = state.stamps;
      state.stamps += 1;
      state.total += 1;
      state.history.push({ t: new Date().toISOString(), k: 'stamp' });
      state.history = state.history.slice(-60);
      save();
      if (i < goal) await stampAt(i);
      basket.setCount(Math.min(state.stamps, goal));
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
    // la carte se retourne : une carte neuve, sans tampon
    if (!isReduced()) {
      const flip = anim(basketBox, [{ transform: 'perspective(900px) rotateY(0deg)' }, { transform: 'perspective(900px) rotateY(90deg)' }], { duration: 380, delay: 900, easing: EASE.in, fill: 'forwards' });
      sfx('swoosh', { delay: 900 });
      await flip?.finished.catch(() => {});
      for (let i = 0; i < goal; i++) basket.remove(i);
      render({ owner: false });
      flip?.cancel();
      anim(basketBox, [{ transform: 'perspective(900px) rotateY(-90deg)' }, { transform: 'perspective(900px) rotateY(0deg)' }], { duration: 440, easing: EASE.out, fill: 'none' });
    } else {
      for (let i = 0; i < goal; i++) basket.remove(i);
      render();
    }
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
  if (env.standalone) {
    btnInstall.hidden = true;
    note.textContent = 'Appli installée. Votre nom, votre numéro et vos tampons restent sur ce téléphone.';
  } else {
    btnInstall.hidden = false;
    note.textContent = 'Gratuit. Ajoutez l’appli à votre écran d’accueil pour garder votre carte à portée de main ; votre nom, votre numéro et vos tampons restent sur ce téléphone.';
    btnInstall.addEventListener('click', () => install());
  }

  // Synchronise si la carte change dans un autre onglet
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = { ...fresh(), ...store.get(KEY, {}) };
      if (hasCard() && !editing) form.hidden = true;
      render();
    }
  });

  render();

  return {
    enter() {
      render({ owner: false });
      if (!isReduced()) {
        basketBox.style.transformOrigin = '50% 8%';
        anim(basketBox, [
          { transform: 'translateY(-14px) rotate(-4deg)', opacity: 0 },
          { transform: 'translateY(0) rotate(2.4deg)', opacity: 1, offset: 0.45 },
          { transform: 'rotate(-1.2deg)', offset: 0.75 },
          { transform: 'rotate(0deg)' },
        ], { duration: 900, easing: 'ease-out', fill: 'none' });
      }
    },
    leave() {},
  };
}
