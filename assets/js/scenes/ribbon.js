// Ruban crème avec texte qui défile le long de la courbe (« typo rubanée »).

import { s, g, uid } from '../lib/svg.js';
import { drawIn, ticker, isReduced, anim, EASE } from '../lib/motion.js';
import { FONT_DISPLAY, BRAND } from './stamp.js';

const XLINK = 'http://www.w3.org/1999/xlink';

/**
 * @param {object} o
 * @param {string} o.d          tracé du ruban
 * @param {number} [o.width]    épaisseur du ruban
 * @param {string} [o.text]     motif de texte répété
 * @param {number} [o.speed]    vitesse de défilement (unités/s), négatif = sens inverse
 */
export function createRibbon({
  d,
  width = 28,
  color = BRAND.cream,
  edge = null,
  text = 'CAFÉ LAITUE ✦ PRIMEUR GOURMET ✦ ',
  fontSize = 12.5,
  textColor = BRAND.forest,
  font = FONT_DISPLAY,
  letterSpacing = 1.4,
  speed = 18,
} = {}) {
  const G = g({ class: 'ribbon' });
  const pid = uid('rib');
  const guide = s('path', { id: pid, d, fill: 'none' });
  const bandEdge = edge ? s('path', { d, fill: 'none', stroke: edge, 'stroke-width': width + 3, 'stroke-linecap': 'round', opacity: 0.35 }) : null;
  const band = s('path', { d, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', class: 'ribbon-band' });
  const tp = s('textPath', { href: `#${pid}`, startOffset: '0' });
  tp.setAttributeNS(XLINK, 'xlink:href', `#${pid}`);
  const txt = s('text', {
    'font-family': font,
    'font-size': fontSize,
    fill: textColor,
    'letter-spacing': letterSpacing,
    dy: (fontSize * 0.36).toFixed(2),
    class: 'ribbon-text',
  }, tp);
  G.append(s('defs', {}, guide));
  if (bandEdge) G.append(bandEdge);
  G.append(band, txt);

  let unit = 0;
  let offset = 0;
  const api = {
    g: G,
    band,
    text: txt,
    /** À appeler une fois le SVG dans le DOM (mesures). */
    layout() {
      const pathLen = guide.getTotalLength();
      tp.textContent = text;
      unit = txt.getComputedTextLength() || text.length * fontSize * 0.6;
      const reps = Math.ceil(pathLen / unit) + 2;
      tp.textContent = text.repeat(reps);
      offset = -unit;
      tp.setAttribute('startOffset', offset.toFixed(1));
    },
    drawIn(opts = {}) {
      const a = drawIn(band, { duration: 1300, easing: EASE.inOut, ...opts });
      if (bandEdge) drawIn(bandEdge, { duration: 1300, easing: EASE.inOut, ...opts });
      anim(txt, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: (opts.delay || 0) + 900 });
      return a;
    },
    /** Fait défiler le texte (via un Ambient pour la mise en pause). */
    run(ambient) {
      if (isReduced() || !unit) return;
      const t = ticker((dt) => {
        offset += speed * dt;
        if (speed > 0 && offset > 0) offset -= unit;
        if (speed < 0 && offset < -unit) offset += unit;
        tp.setAttribute('startOffset', offset.toFixed(1));
      });
      ambient.addTicker(t);
    },
  };
  return api;
}
