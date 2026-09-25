// Écran « Étals » : le présentoir suit le mois choisi, chaque cagette se touche.

import { Ambient } from '../lib/motion.js';
import { createShelves } from '../scenes/shelves.js';
import { MONTHS, MONTHS_SHORT, stallPick, inSeason, seasonLabel } from '../data/season.js';
import { parisNow } from '../features/hours.js';

export default function stalls(el) {
  const $ = (s) => el.querySelector(s);
  const host = $('#scene-shelves');
  const monthsBar = $('#months');
  const card = $('#produce-card');
  const line = $('#season-line');
  const nowMonth = parisNow().month;
  const ambient = new Ambient();
  ambient.pause();
  let month = nowMonth;
  let scene;
  let introDone = false;

  // Sélecteur de mois
  const buttons = MONTHS_SHORT.map((label, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `month${i + 1 === nowMonth ? ' is-now' : ''}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(i + 1 === month));
    b.setAttribute('aria-label', MONTHS[i] + (i + 1 === nowMonth ? ' (ce mois-ci)' : ''));
    b.textContent = label;
    b.addEventListener('click', () => setMonth(i + 1));
    monthsBar.append(b);
    return b;
  });

  function describe(m) {
    const list = inSeason(m);
    const fruits = list.filter((p) => p.kind === 'fruit').slice(0, 4).map((p) => p.name.toLowerCase());
    const veg = list.filter((p) => p.kind === 'legume').slice(0, 4).map((p) => p.name.toLowerCase());
    const prefix = m === nowMonth ? 'En ce moment' : `En ${MONTHS[m - 1]}`;
    line.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = `${prefix} : `;
    line.append(strong, document.createTextNode(`${fruits.join(', ')}${fruits.length && veg.length ? ' · ' : ''}${veg.join(', ')}… Touchez une cagette.`));
  }

  function showCard(item) {
    if (!item) {
      card.hidden = true;
      return;
    }
    $('#produce-name').textContent = item.name;
    $('#produce-season').textContent = `De saison ${seasonLabel(item)}`;
    $('#produce-tip').textContent = item.tip;
    card.hidden = false;
    card.animate?.([{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  async function setMonth(m) {
    if (m === month && scene) return;
    month = m;
    buttons.forEach((b, i) => b.setAttribute('aria-selected', String(i + 1 === m)));
    buttons[m - 1].scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    describe(m);
    showCard(null);
    if (scene) await scene.setItems(stallPick(m));
  }

  describe(month);

  const ready = createShelves({ items: stallPick(month) }).then((sc) => {
    scene = sc;
    host.append(sc.svg);
    sc.onPick((item) => showCard(item));
    sc.idle(ambient);
    host.addEventListener('click', () => {
      sc.select(-1);
      showCard(null);
    });
    return sc;
  });
  card.addEventListener('click', () => {
    scene?.select(-1);
    showCard(null);
  });

  return {
    async enter() {
      await ready;
      ambient.play();
      buttons[month - 1].scrollIntoView({ inline: 'center', block: 'nearest' });
      if (!introDone) {
        introDone = true;
        scene.intro();
      }
    },
    leave() {
      ambient.pause();
    },
  };
}
