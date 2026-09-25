// Petits sons d'interface, synthétisés à la volée (Web Audio) : rien à télécharger, tout
// fonctionne hors ligne. Ils ne démarrent qu'après un premier geste, suivent le mode
// silencieux de l'iPhone, et se coupent d'un geste (bouton haut-parleur de la barre du haut).
//
// play('nom', { delay, gain, … })   son ponctuel (delay en ms, planifié sur l'horloge audio)
// channel()                         sous-bus coupable net (séquences interrompues)
// Tout bouton ou lien sans son dédié fait un petit « toc » ; data-sfx="nom" en choisit un
// autre, data-sfx="none" le rend muet.

const KEY = 'cafe-laitue.sons';
const AC = window.AudioContext || window.webkitAudioContext;

let ctx = null;
let bus = null;
let enabled = readPref();
let gestureAt = -1e9;
let lastAny = -1e9;
const lastBy = {};
const noiseCache = new WeakMap();
const watchers = new Set();

function readPref() {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch (e) {
    return true;
  }
}

/** Bus principal : volume général + limiteur doux. Sert aussi au rendu hors ligne (tests). */
export function makeBus(c) {
  const master = c.createGain();
  master.gain.value = 0.9;
  const lim = c.createDynamicsCompressor();
  lim.threshold.value = -12;
  lim.knee.value = 8;
  lim.ratio.value = 10;
  lim.attack.value = 0.002;
  lim.release.value = 0.12;
  master.connect(lim).connect(c.destination);
  return master;
}

// ---------------------------------------------------------------- déblocage (geste requis)
function unlock() {
  gestureAt = performance.now();
  if (!enabled || !AC) return;
  if (!ctx) {
    try {
      // « ambient » : se mélange à la musique en cours et respecte le mode silencieux
      if (navigator.audioSession) navigator.audioSession.type = 'ambient';
    } catch (e) {
      /* API absente */
    }
    try {
      ctx = new AC();
      bus = makeBus(ctx);
    } catch (e) {
      ctx = null;
      return;
    }
  }
  if (ctx.state !== 'running') {
    ctx.resume().catch(() => {});
    try {
      // iOS : un tampon muet joué pendant le geste ouvre la sortie audio
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) {
      /* rien */
    }
  }
}
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((type) => {
  window.addEventListener(type, unlock, { capture: true, passive: true });
});

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend().catch(() => {});
  else if (enabled) ctx.resume().catch(() => {});
});

/** Contexte utilisable maintenant (sinon rien : pas de sons « en attente » rejoués d'un coup). */
function live() {
  if (!enabled || !ctx) return null;
  if (ctx.state === 'running') return ctx;
  if (ctx.state === 'suspended' && performance.now() - gestureAt < 400) return ctx;
  return null;
}

// ---------------------------------------------------------------- briques de synthèse
function noiseBuffer(c) {
  let b = noiseCache.get(c);
  if (!b) {
    b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(c, b);
  }
  return b;
}

// Enveloppe : attaque courte (sans clic) puis extinction exponentielle
function env(c, t, a, d, v, hold) {
  const gn = c.createGain();
  gn.gain.setValueAtTime(0, t);
  gn.gain.linearRampToValueAtTime(v, t + a);
  gn.gain.setTargetAtTime(0, t + a + hold, d / 5);
  return gn;
}
const tail = (t, a, d, hold) => t + a + hold + d * 1.3 + 0.02;

function tone(c, dst, t, { f, f2, glide, type = 'sine', a = 0.004, d = 0.15, v = 0.1, hold = 0 }) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + (glide ?? a + d * 0.7));
  o.connect(env(c, t, a, d, v, hold)).connect(dst);
  o.start(t);
  o.stop(tail(t, a, d, hold));
}

function noise(c, dst, t, { f = 1200, f2, q = 0.8, type = 'bandpass', a = 0.004, d = 0.1, v = 0.08, hold = 0 }) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const flt = c.createBiquadFilter();
  flt.type = type;
  flt.Q.value = q;
  flt.frequency.setValueAtTime(f, t);
  if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + a + hold + d);
  src.connect(flt).connect(env(c, t, a, d, v, hold)).connect(dst);
  src.start(t, Math.random() * 1.5);
  src.stop(tail(t, a, d, hold));
}

// Corps résonnants : [rapport de fréquence, niveau, durée relative]
const BODY = {
  marimba: [[1, 1, 1], [3.93, 0.22, 0.28], [9.2, 0.05, 0.12]],
  wood: [[1, 1, 1], [2.45, 0.42, 0.5], [5.2, 0.12, 0.3]],
  bell: [[1, 1, 1], [2.76, 0.32, 0.55], [5.4, 0.12, 0.3], [8.93, 0.04, 0.18]],
  ceramic: [[1, 1, 1], [2.32, 0.5, 0.7], [4.25, 0.22, 0.45], [6.63, 0.1, 0.3]],
  glass: [[1, 1, 1], [2.71, 0.45, 0.85], [5.12, 0.2, 0.6]],
};
function strike(c, dst, t, f, body, { d = 0.3, v = 0.1, a = 0.002 } = {}) {
  BODY[body].forEach(([r, amp, dk]) => {
    if (f * r < 15000) tone(c, dst, t, { f: f * r, a, d: d * dk, v: v * amp });
  });
}

const PENTA = [0, 2, 4, 7, 9];
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
/** i-ème note de la gamme pentatonique à partir de `base` (numéro MIDI). */
const penta = (i, base = 72) => midi(base + 12 * Math.floor(i / 5) + PENTA[((i % 5) + 5) % 5]);
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------- la palette
// Registre médium-aigu : les haut-parleurs de téléphone ne rendent presque rien sous 300 Hz.
export const SOUNDS = {
  /** Bouton quelconque : petit « toc » feutré. */
  tap(c, o, t) {
    tone(c, o, t, { f: 820, f2: 560, a: 0.003, d: 0.07, v: 0.11 });
    tone(c, o, t, { f: 1640, a: 0.002, d: 0.03, v: 0.025 });
  },
  /** Onglets : une bulle dont la note monte vers la droite. */
  tab(c, o, t, { i = 0 }) {
    const f = penta(i + 2, 72);
    tone(c, o, t, { f: f * 0.72, f2: f, glide: 0.035, a: 0.004, d: 0.16, v: 0.13 });
    tone(c, o, t + 0.01, { f: f * 2, a: 0.003, d: 0.05, v: 0.025 });
  },
  on(c, o, t) {
    strike(c, o, t, midi(79), 'marimba', { d: 0.22, v: 0.09 });
    strike(c, o, t + 0.065, midi(84), 'marimba', { d: 0.3, v: 0.1 });
  },
  off(c, o, t) {
    strike(c, o, t, midi(84), 'marimba', { d: 0.2, v: 0.07 });
    strike(c, o, t + 0.065, midi(79), 'marimba', { d: 0.26, v: 0.08 });
  },
  /** Pancarte : toc de bois, petit balancement, la chaînette tinte. */
  sign(c, o, t) {
    strike(c, o, t, 520, 'wood', { d: 0.09, v: 0.16 });
    noise(c, o, t, { f: 2400, q: 1.2, d: 0.03, v: 0.05 });
    tone(c, o, t + 0.05, { f: 3300, a: 0.002, d: 0.06, v: 0.018 });
    tone(c, o, t + 0.12, { f: 4150, a: 0.002, d: 0.05, v: 0.014 });
    strike(c, o, t + 0.21, 470, 'wood', { d: 0.07, v: 0.07 });
  },
  open(c, o, t) {
    noise(c, o, t, { f: 380, f2: 1700, q: 0.9, a: 0.06, d: 0.2, v: 0.21 });
  },
  close(c, o, t) {
    noise(c, o, t, { f: 1500, f2: 380, q: 0.9, a: 0.02, d: 0.16, v: 0.13 });
  },
  /** Cran d'un bandeau qui défile. */
  tick(c, o, t) {
    tone(c, o, t, { f: 1500, a: 0.001, d: 0.025, v: 0.05 });
    noise(c, o, t, { f: 5000, type: 'highpass', q: 0.7, a: 0.001, d: 0.012, v: 0.02 });
  },
  /** Lame de xylophone (mois, carte des boissons…). */
  note(c, o, t, { i = 0, base = 65, v = 0.12 }) {
    strike(c, o, t, penta(i, base), 'marimba', { d: 0.36, v });
  },
  /** Cagette touchée : bois + note + froissement. */
  crate(c, o, t, { i = 0 }) {
    strike(c, o, t, penta(i, 67), 'marimba', { d: 0.3, v: 0.11 });
    strike(c, o, t, 330, 'wood', { d: 0.06, v: 0.08 });
    noise(c, o, t + 0.01, { f: 2600, q: 0.7, d: 0.08, v: 0.025 });
  },
  /** Les fruits retombent dans les cagettes. */
  tumble(c, o, t, { n = 9, span = 0.55 }) {
    for (let k = 0; k < n; k++) strike(c, o, t + Math.random() * span, rnd(480, 900), 'wood', { d: 0.05, v: rnd(0.025, 0.05) });
  },
  pop(c, o, t) {
    tone(c, o, t, { f: 520, f2: 1100, glide: 0.05, a: 0.003, d: 0.08, v: 0.13 });
  },
  unpop(c, o, t) {
    tone(c, o, t, { f: 950, f2: 430, glide: 0.06, a: 0.003, d: 0.08, v: 0.09 });
  },
  /** Goutte / fruit qui touche le liquide. */
  plop(c, o, t, { v = 0.16 }) {
    tone(c, o, t, { f: 400, f2: 1250, glide: 0.045, a: 0.002, d: 0.07, v });
    tone(c, o, t + 0.075, { f: 720, f2: 1700, glide: 0.03, a: 0.002, d: 0.045, v: v * 0.35 });
  },
  splash(c, o, t) {
    noise(c, o, t, { f: 1700, f2: 650, q: 0.7, a: 0.004, d: 0.22, v: 0.17 });
    for (let k = 0; k < 3; k++) {
      const f = rnd(900, 1600);
      tone(c, o, t + 0.03 + Math.random() * 0.16, { f, f2: f * 1.8, glide: 0.03, a: 0.002, d: 0.045, v: 0.06 });
    }
  },
  /** Le verre se vide (glouglou). */
  drain(c, o, t) {
    noise(c, o, t, { f: 900, f2: 300, q: 0.8, a: 0.03, d: 0.45, v: 0.05 });
    [640, 540, 470, 400, 350].forEach((f, k) => tone(c, o, t + k * 0.075 + Math.random() * 0.02, { f, f2: f * 1.5, glide: 0.035, a: 0.002, d: 0.05, v: 0.07 }));
  },
  whoosh(c, o, t) {
    noise(c, o, t, { f: 300, f2: 2300, q: 0.7, a: 0.08, d: 0.26, v: 0.18 });
  },
  gather(c, o, t) {
    noise(c, o, t, { f: 2000, f2: 420, q: 0.7, a: 0.08, d: 0.22, v: 0.09 });
  },
  swoosh(c, o, t) {
    noise(c, o, t, { f: 420, f2: 1300, q: 0.6, a: 0.22, d: 0.3, v: 0.1 });
  },
  /** Petite bulle d'apparition (pièces de la vue éclatée). */
  blip(c, o, t, { i = 0 }) {
    const f = penta(i, 76);
    tone(c, o, t, { f: f * 0.8, f2: f, glide: 0.03, a: 0.004, d: 0.06, v: 0.05 });
  },
  clink(c, o, t, { mat = 'ceramic', i = 0, v = 0.06 }) {
    if (mat === 'glass') strike(c, o, t, 2500 * (1 + i * 0.05), 'glass', { d: 0.3, v });
    else strike(c, o, t, 1750 * (1 + i * 0.06), 'ceramic', { d: 0.12, v: v * 1.1 });
  },
  liquid(c, o, t, { v = 0.09, i = 0 }) {
    const f = 300 * (1 + 0.12 * i);
    tone(c, o, t, { f, f2: f * 1.85, glide: 0.05, a: 0.004, d: 0.09, v });
    noise(c, o, t, { f: 700, type: 'lowpass', q: 0.5, a: 0.01, d: 0.1, v: v / 3 });
  },
  ice(c, o, t, { n = 2 }) {
    let tt = t;
    for (let k = 0; k < n; k++) {
      strike(c, o, tt, rnd(2900, 4100), 'glass', { d: 0.12, v: 0.042 });
      tt += rnd(0.035, 0.07);
    }
  },
  paper(c, o, t) {
    noise(c, o, t, { f: 3200, q: 1.1, a: 0.004, d: 0.05, v: 0.09 });
    tone(c, o, t, { f: 1300, a: 0.002, d: 0.03, v: 0.045 });
  },
  sprinkle(c, o, t) {
    for (let k = 0; k < 3; k++) noise(c, o, t + k * 0.09, { f: 6000, type: 'highpass', q: 0.5, a: 0.01, d: 0.05, v: 0.05 });
  },
  /** « Et voilà ! » */
  ding(c, o, t) {
    strike(c, o, t, midi(84), 'bell', { d: 0.7, v: 0.08 });
    strike(c, o, t + 0.11, midi(91), 'bell', { d: 0.9, v: 0.07 });
  },
  /** Une syllabe du primeur : murmure feutré, voyelle filtrée, mélodie pentatonique. */
  voice(c, o, t, { v = 'A' }) {
    const F1 = { A: 780, E: 520, O: 450, M: 320 }[v] || 600;
    const f0 = 205 * [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2][Math.floor(Math.random() * 5)];
    const src = c.createOscillator();
    src.type = 'sawtooth';
    src.frequency.setValueAtTime(f0, t);
    src.frequency.linearRampToValueAtTime(f0 * 1.04, t + 0.03);
    src.frequency.exponentialRampToValueAtTime(f0 * 0.93, t + 0.11);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = F1;
    bp.Q.value = 1.6;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = v === 'M' ? 700 : 1800;
    const a = 0.012;
    const d = 0.1;
    src.connect(bp).connect(lp).connect(env(c, t, a, d, 0.1, 0.03)).connect(o);
    src.start(t);
    src.stop(tail(t, a, d, 0.03));
  },
  /** Coup de tampon : « tchac ! » */
  stamp(c, o, t) {
    noise(c, o, t, { f: 1700, q: 0.8, a: 0.002, d: 0.07, v: 0.2 });
    strike(c, o, t, 380, 'wood', { d: 0.1, v: 0.2 });
    tone(c, o, t, { f: 150, f2: 60, glide: 0.12, a: 0.003, d: 0.14, v: 0.2 });
  },
  fly(c, o, t) {
    noise(c, o, t, { f: 600, f2: 1900, q: 0.8, a: 0.2, d: 0.1, v: 0.095 });
  },
  /** Cascade de petits crans (lettres du tampon qui se posent). */
  ratchet(c, o, t, { n = 12, gap = 0.04, f0 = 1200, f1 = 2000 }) {
    for (let k = 0; k < n; k++) tone(c, o, t + k * gap, { f: f0 + (f1 - f0) * (k / Math.max(1, n - 1)), a: 0.001, d: 0.02, v: 0.045 });
  },
  /** Carte complète / boisson offerte. */
  chime(c, o, t) {
    [72, 76, 79, 84, 88].forEach((m, k) => strike(c, o, t + k * 0.085, midi(m), k % 2 ? 'bell' : 'marimba', { d: k === 4 ? 1.1 : 0.45, v: 0.085 }));
    for (let k = 0; k < 7; k++) strike(c, o, t + 0.5 + Math.random() * 1.1, rnd(2200, 4200), 'bell', { d: 0.25, v: 0.015 });
  },
  key(c, o, t) {
    tone(c, o, t, { f: 1050, a: 0.002, d: 0.035, v: 0.06 });
    noise(c, o, t, { f: 4200, type: 'highpass', a: 0.001, d: 0.01, v: 0.012 });
  },
  erase(c, o, t) {
    tone(c, o, t, { f: 720, a: 0.002, d: 0.04, v: 0.05 });
  },
  nope(c, o, t) {
    tone(c, o, t, { f: 466, f2: 440, type: 'triangle', a: 0.005, d: 0.08, v: 0.1 });
    tone(c, o, t + 0.13, { f: 415, f2: 392, type: 'triangle', a: 0.005, d: 0.1, v: 0.1 });
  },
  yes(c, o, t) {
    strike(c, o, t, midi(79), 'bell', { d: 0.35, v: 0.07 });
    strike(c, o, t + 0.075, midi(86), 'bell', { d: 0.5, v: 0.07 });
  },
  up(c, o, t) {
    tone(c, o, t, { f: 900, f2: 1200, glide: 0.03, a: 0.002, d: 0.04, v: 0.06 });
  },
  down(c, o, t) {
    tone(c, o, t, { f: 1100, f2: 820, glide: 0.03, a: 0.002, d: 0.04, v: 0.06 });
  },
  shutter(c, o, t) {
    noise(c, o, t, { f: 2600, q: 0.9, a: 0.001, d: 0.025, v: 0.26 });
    noise(c, o, t + 0.075, { f: 2000, q: 0.9, a: 0.001, d: 0.03, v: 0.22 });
  },
};

// Sons qui peuvent légitimement se répéter vite (sinon : 50 ms minimum entre deux identiques)
const GAP = { tick: 25, key: 0, erase: 0, blip: 0, clink: 0, ice: 0, voice: 0, plop: 0, splash: 0, liquid: 0, note: 0, paper: 0, open: 150, close: 150 };

/** Voix continues pilotées par un niveau 0..1 (le filet de lait du latte art). */
export const VOICES = {
  pour(c, dst) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 650;
    bp.Q.value = 0.7;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000;
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = c.createGain();
    depth.gain.value = 170;
    lfo.connect(depth).connect(bp.frequency);
    const gn = c.createGain();
    gn.gain.value = 0;
    src.connect(bp).connect(lp).connect(gn).connect(dst);
    src.start(c.currentTime, Math.random());
    lfo.start();
    let level = 0;
    let lastSet = 0;
    // Quelques bulles discrètes tant que le filet coule
    const bubbles = setInterval(() => {
      if (level > 0.35 && Math.random() < 0.45 && c.state === 'running') {
        const f = rnd(700, 1300);
        tone(c, dst, c.currentTime + 0.01, { f, f2: f * 1.6, glide: 0.03, a: 0.002, d: 0.04, v: 0.018 * level });
      }
    }, 130);
    let stopped = false;
    return {
      level(x) {
        const v = Math.max(0, Math.min(1, x));
        const now = performance.now();
        if (Math.abs(v - level) < 0.03 && now - lastSet < 120) return;
        level = v;
        lastSet = now;
        gn.gain.setTargetAtTime(0.09 * Math.pow(v, 0.8), c.currentTime, 0.04);
      },
      stop() {
        if (stopped) return;
        stopped = true;
        clearInterval(bubbles);
        level = 0;
        gn.gain.setTargetAtTime(0, c.currentTime, 0.05);
        src.stop(c.currentTime + 0.4);
        lfo.stop(c.currentTime + 0.4);
      },
    };
  },
};
const MUTE_VOICE = { level() {}, stop() {} };

function emit(name, opts, dst) {
  lastAny = performance.now();
  const c = live();
  const fn = SOUNDS[name];
  if (!c || !fn || !dst) return;
  const now = performance.now();
  if (now - (lastBy[name] ?? -1e9) < (GAP[name] ?? 50)) return;
  lastBy[name] = now;
  let out = dst;
  if (opts.gain != null) {
    out = c.createGain();
    out.gain.value = opts.gain;
    out.connect(dst);
  }
  try {
    fn(c, out, c.currentTime + 0.005 + Math.max(0, opts.delay || 0) / 1000, opts);
  } catch (e) {
    /* audio indisponible */
  }
}

/** Joue un son de la palette. */
export function play(name, opts = {}) {
  emit(name, opts, bus);
}

/** Sous-bus qu'on peut couper net (quand une animation est interrompue). */
export function channel() {
  let node = null;
  const voices = new Set();
  const get = () => {
    const c = live();
    if (!c) return null;
    if (!node) {
      node = c.createGain();
      node.connect(bus);
    }
    return node;
  };
  return {
    play(name, opts = {}) {
      emit(name, opts, get());
    },
    voice(name) {
      const dst = get();
      if (!dst || !VOICES[name]) return MUTE_VOICE;
      const v = VOICES[name](ctx, dst);
      voices.add(v);
      return v;
    },
    cut() {
      voices.forEach((v) => v.stop());
      voices.clear();
      if (!node) return;
      const n = node;
      node = null;
      n.gain.setTargetAtTime(0, n.context.currentTime, 0.02);
      setTimeout(() => n.disconnect(), 300);
    },
  };
}

// ---------------------------------------------------------------- réglage
export const soundSupported = !!AC;
export const soundOn = () => enabled;

export function setSound(on) {
  enabled = !!on;
  try {
    localStorage.setItem(KEY, enabled ? 'on' : 'off');
  } catch (e) {
    /* navigation privée */
  }
  if (enabled) {
    unlock();
    play('on');
  } else if (ctx) {
    ctx.suspend().catch(() => {});
  }
  watchers.forEach((fn) => fn(enabled));
}

export function onSoundChange(fn) {
  watchers.add(fn);
}

// ---------------------------------------------------------------- « toc » par défaut
// Un clic sur un bouton ou un lien qui n'a pas joué de son dédié pendant sa propagation.
let dispatchAt = 0;
window.addEventListener('click', () => {
  dispatchAt = performance.now();
}, true);
window.addEventListener('click', (e) => {
  if (lastAny >= dispatchAt) return;
  const el = e.target.closest?.('button, a[href], summary, [role="tab"], [role="button"], [data-sfx]');
  if (!el) return;
  const name = el.closest('[data-sfx]')?.dataset.sfx || 'tap';
  if (name !== 'none') play(name);
});
