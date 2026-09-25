// Horaires : statut « ouvert / fermé » calculé à l'heure de Paris, quel que soit le fuseau du visiteur.

import { SHOP } from '../config.js';

export const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const toMin = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

/** « 8h », « 19h30 » */
export const fmt = (s) => {
  const [h, m] = s.split(':').map(Number);
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

export function parisNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    iso: `${get('year')}-${get('month')}-${get('day')}`,
    month: Number(get('month')),
  };
}

const closureOn = (iso) => SHOP.closures.find((c) => iso >= c.from && iso <= c.to);

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** { state: 'open'|'soon'|'closed', label, short } */
export function openStatus(date = new Date()) {
  const now = parisNow(date);
  const closure = closureOn(now.iso);
  const slots = closure ? [] : SHOP.hours[now.day] || [];
  for (const [o, c] of slots) {
    const om = toMin(o);
    const cm = toMin(c);
    if (now.minutes >= om && now.minutes < cm) {
      const left = cm - now.minutes;
      return left <= 30
        ? { state: 'soon', label: `Ferme bientôt · ${fmt(c)}`, short: `Jusqu’à ${fmt(c)}`, sub: `ferme à ${fmt(c)}` }
        : { state: 'open', label: `Ouvert · jusqu’à ${fmt(c)}`, short: 'Ouvert', sub: `jusqu’à ${fmt(c)}` };
    }
    if (now.minutes < om) return { state: 'closed', label: `Fermé · ouvre à ${fmt(o)}`, short: `Ouvre à ${fmt(o)}`, sub: `ouvre à ${fmt(o)}` };
  }
  for (let i = 1; i <= 21; i++) {
    const d = (now.day + i) % 7;
    const iso = addDays(now.iso, i);
    if (closureOn(iso)) continue;
    const next = SHOP.hours[d] || [];
    if (next.length) {
      const when = i === 1 ? 'demain' : DAYS[d];
      return {
        state: 'closed',
        label: closure ? `${closure.label} · réouverture ${when} ${fmt(next[0][0])}` : `Fermé · ouvre ${when} à ${fmt(next[0][0])}`,
        short: 'Fermé',
        sub: `${closure ? 'réouvre' : 'ouvre'} ${when} ${fmt(next[0][0])}`,
      };
    }
  }
  return { state: 'closed', label: 'Fermé', short: 'Fermé', sub: 'à bientôt' };
}

/** Horaires du jour en clair. */
export function todayHours(date = new Date()) {
  const now = parisNow(date);
  const closure = closureOn(now.iso);
  if (closure) return `Fermé · ${closure.label}`;
  const slots = SHOP.hours[now.day] || [];
  if (!slots.length) return `Fermé le ${DAYS[now.day]}`;
  return slots.map(([o, c]) => `${fmt(o)} – ${fmt(c)}`).join(' · ');
}
