// Animation : Web Animations API + quelques aides. Aucune dépendance.

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const isReduced = () => reducedMotion.matches;

export const EASE = {
  out: 'cubic-bezier(.2,.8,.2,1)',
  in: 'cubic-bezier(.55,0,.8,.2)',
  inOut: 'cubic-bezier(.65,0,.35,1)',
  back: 'cubic-bezier(.34,1.56,.64,1)',
  snap: 'cubic-bezier(.18,1.25,.4,1)',
  soft: 'cubic-bezier(.33,1,.68,1)',
};

/** element.animate avec des valeurs par défaut raisonnables. */
export function anim(el, keyframes, opts = {}) {
  if (!el || !el.animate) return null;
  const o = { duration: 500, easing: EASE.out, fill: 'both', ...opts };
  if (isReduced() && !opts.keepWhenReduced) {
    o.duration = 1;
    o.delay = 0;
    if (o.iterations === Infinity) return null;
  }
  return el.animate(keyframes, o);
}

/** Tracé progressif d'un chemin (stroke). */
export function drawIn(path, opts = {}) {
  path.setAttribute('pathLength', '1');
  path.style.strokeDasharray = '1 1';
  const from = opts.reverse ? -1 : 1;
  return anim(path, [{ strokeDashoffset: from }, { strokeDashoffset: 0 }], { duration: 900, easing: EASE.inOut, ...opts });
}

/** Fige l'état final d'une animation terminée puis la libère. */
export function settle(a) {
  if (!a) return Promise.resolve();
  return a.finished
    .then(() => {
      try {
        a.commitStyles();
      } catch (e) {
        /* élément détaché */
      }
      a.cancel();
    })
    .catch(() => {});
}

export const wait = (ms) => new Promise((r) => setTimeout(r, isReduced() ? 0 : ms));

/** Boucle requestAnimationFrame pausable. fn(dtSecondes, tMs). */
export function ticker(fn) {
  let raf = 0;
  let last = 0;
  let running = false;
  const tick = (t) => {
    if (!running) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    fn(dt, t);
    raf = requestAnimationFrame(tick);
  };
  return {
    start() {
      if (running) return this;
      running = true;
      last = 0;
      raf = requestAnimationFrame(tick);
      return this;
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      return this;
    },
    get running() {
      return running;
    },
  };
}

/** Groupe d'animations « d'ambiance » que l'on met en pause quand l'écran est caché. */
export class Ambient {
  constructor() {
    this.items = [];
    this.tickers = [];
    this.timers = [];
    this.active = true;
  }
  add(a) {
    if (a) {
      this.items.push(a);
      if (!this.active) a.pause();
    }
    return a;
  }
  addTicker(t) {
    this.tickers.push(t);
    if (this.active) t.start();
    return t;
  }
  /** setInterval-like qui ne tourne que lorsque la scène est active. */
  every(ms, fn, jitter = 0) {
    const t = { ms, fn, jitter, id: 0 };
    const schedule = () => {
      t.id = setTimeout(() => {
        if (this.active && !document.hidden) fn();
        schedule();
      }, ms + Math.random() * jitter);
    };
    schedule();
    this.timers.push(t);
    return t;
  }
  pause() {
    this.active = false;
    this.items.forEach((a) => a.playState === 'running' && a.pause());
    this.tickers.forEach((t) => t.stop());
  }
  play() {
    this.active = true;
    if (isReduced()) return;
    this.items.forEach((a) => a.playState === 'paused' && a.play());
    this.tickers.forEach((t) => t.start());
  }
}

/** Petit « tchac » synthétisé (tampon) — uniquement après un geste de l'utilisateur. */
let _ctx;
export function thump(volume = 0.25) {
  try {
    _ctx = _ctx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    gn.gain.setValueAtTime(volume, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(gn).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.18);
  } catch (e) {
    /* audio indisponible */
  }
}

export function vibrate(pattern = 18) {
  try {
    navigator.vibrate && navigator.vibrate(pattern);
  } catch (e) {
    /* rien */
  }
}
