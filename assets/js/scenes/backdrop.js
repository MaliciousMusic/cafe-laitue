// Grand écran : l'appli est posée sur un ruban géant qui traverse la page.

import { svgRoot, g } from '../lib/svg.js';
import { Ambient } from '../lib/motion.js';
import { createRibbon } from './ribbon.js';
import { createStamp, brandFontsReady, BRAND } from './stamp.js';

export async function createBackdrop(host) {
  if (!host) return;
  await brandFontsReady();
  const svg = svgRoot('0 0 1600 1000', { preserveAspectRatio: 'xMidYMid slice' });
  const big = createRibbon({
    d: 'M-260 760 C120 420 420 980 800 600 C1120 280 1340 60 1880 330',
    width: 118,
    text: 'CAFÉ LAITUE ✦ PRIMEUR GOURMET ✦ FRUITS & LÉGUMES ✦ JUS PRESSÉS MINUTE ✦ CAFÉ DE SPÉCIALITÉ ✦ ÉPICERIE FINE ✦ ',
    fontSize: 46,
    letterSpacing: 4,
    speed: 26,
  });
  const small = createRibbon({
    d: 'M-200 140 C260 300 520 -40 900 120 C1240 260 1400 520 1860 470',
    width: 46,
    color: BRAND.sage,
    text: '20 RUE BALLAINVILLIERS ✦ CLERMONT-FERRAND ✦ ',
    fontSize: 19,
    textColor: BRAND.cream,
    letterSpacing: 3,
    speed: -18,
  });
  svg.append(small.g, big.g);
  host.append(svg);
  const note = document.createElement('p');
  note.className = 'desk-note';
  note.textContent = 'Café Laitue · primeur gourmet · ouvrez-moi aussi sur votre téléphone';
  host.append(note);
  big.layout();
  small.layout();
  const ambient = new Ambient();
  big.run(ambient);
  small.run(ambient);
  big.drawIn({ duration: 1800 });
  small.drawIn({ duration: 1800, delay: 200 });
  const st = await createStamp();
  const mark = document.createElement('div');
  mark.className = 'desk-stamp';
  mark.append(st.svg);
  host.append(mark);
  st.play({ delay: 400 });
  st.idle(ambient);
  document.addEventListener('visibilitychange', () => (document.hidden ? ambient.pause() : ambient.play()));
  void g;
}
