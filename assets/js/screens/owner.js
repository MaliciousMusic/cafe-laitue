// Écran « Le primeur » : son portrait animé, ses bulles, et la vraie photo.

import { Ambient, anim, EASE, isReduced } from '../lib/motion.js';
import { createPortrait } from '../scenes/portrait.js';
import { inSeason, stallPick } from '../data/season.js';
import { parisNow, openStatus } from '../features/hours.js';
import { play as sfx } from '../lib/sound.js';

function lines(month) {
  const fruits = inSeason(month).filter((p) => p.kind === 'fruit').slice(0, 3).map((p) => p.name.split(' ')[0].toLowerCase());
  const veg = inSeason(month).filter((p) => p.kind === 'legume').slice(0, 2).map((p) => p.name.split(' ')[0].toLowerCase());
  const st = openStatus();
  return [
    'Bonjour ! Bienvenue au Café Laitue.',
    fruits.length ? `En ce moment : ${fruits.join(', ')}.` : 'Les étals changent avec les saisons.',
    veg.length ? `Côté légumes : ${veg.join(' et ')} !` : 'Toujours une belle laitue !',
    'Un jus pressé minute ? Je vous le fais.',
    'Le café vient de chez Kaduck, torréfié à Clermont.',
    st.state === 'closed' ? 'On se voit à la réouverture !' : 'Passez me voir, rue Ballainvilliers !',
  ];
}

export default function owner(el) {
  const $ = (s) => el.querySelector(s);
  const host = $('#scene-portrait');
  const bubble = $('#bubble');
  const photo = $('#portrait-photo');
  const toggle = $('#photo-toggle');
  const ambient = new Ambient();
  ambient.pause();
  const month = parisNow().month;
  let scene;
  let introDone = false;
  let i = -1;
  let bubbleTimer = 0;

  function say(text) {
    bubble.textContent = text;
    bubble.hidden = false;
    anim(bubble, [
      { opacity: 0, transform: 'translateY(8px) scale(.9)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ], { duration: 320, easing: EASE.back, fill: 'none' });
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      const a = anim(bubble, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      const done = () => {
        bubble.hidden = true;
        a?.cancel();
      };
      a ? a.finished.then(done).catch(done) : done();
    }, 3600);
  }

  function next() {
    const L = lines(month);
    i = (i + 1) % L.length;
    say(L[i]);
    scene?.character.say(1300);
    if (i === 0 || Math.random() > 0.55) scene?.character.wave();
  }

  const ready = createPortrait({ month, picks: stallPick(month).slice(0, 4) }).then((sc) => {
    scene = sc;
    host.append(sc.svg);
    sc.layout();
    sc.idle(ambient);
    sc.hit.style.cursor = 'pointer';
    sc.hit.addEventListener('click', next);
    // Le regard suit le doigt / la souris
    el.querySelector('.portrait').addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.45) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.2) * 2;
      sc.character.look(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
    });
    el.querySelector('.portrait').addEventListener('pointerleave', () => sc.character.look(0, 0));
    return sc;
  });

  // Illustration ↔ photo (révélation circulaire depuis le bouton)
  let showingPhoto = false;
  toggle.addEventListener('click', () => {
    sfx('shutter');
    showingPhoto = !showingPhoto;
    toggle.setAttribute('aria-pressed', String(showingPhoto));
    toggle.querySelector('span').textContent = showingPhoto ? 'Voir l’illustration' : 'Voir la photo';
    const r = toggle.getBoundingClientRect();
    const p = photo.parentElement.getBoundingClientRect();
    const at = `${r.left - p.left + r.width / 2}px ${r.top - p.top + r.height / 2}px`;
    if (showingPhoto) {
      photo.hidden = false;
      if (!isReduced()) anim(photo, [{ clipPath: `circle(0% at ${at})` }, { clipPath: `circle(150% at ${at})` }], { duration: 700, easing: EASE.inOut, fill: 'none' });
    } else {
      const a = anim(photo, [{ clipPath: `circle(150% at ${at})` }, { clipPath: `circle(0% at ${at})` }], { duration: 560, easing: EASE.inOut, fill: 'forwards' });
      const done = () => {
        photo.hidden = true;
        a?.cancel();
      };
      a ? a.finished.then(done).catch(done) : done();
    }
  });

  return {
    async enter() {
      const img = photo.querySelector('img');
      if (img && img.loading === 'lazy') img.loading = 'eager';
      await ready;
      ambient.play();
      if (!introDone) {
        introDone = true;
        await scene.intro();
        setTimeout(next, 250);
      }
    },
    leave() {
      ambient.pause();
      clearTimeout(bubbleTimer);
      bubble.hidden = true;
    },
  };
}
