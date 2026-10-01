// Écran « Étals » : le présentoir suit le mois choisi, chaque cagette se touche ; dessous,
// les paniers de saison à prix fixe (composition du mois et idées de plats).

import { Ambient } from '../lib/motion.js';
import { createShelves } from '../scenes/shelves.js';
import { drawProduce } from '../scenes/produce.js';
import { BRAND } from '../scenes/stamp.js';
import { MONTHS, MONTHS_SHORT, stallPick, inSeason, seasonLabel } from '../data/season.js';
import { BASKETS, basketFor } from '../data/baskets.js';
import { parisNow } from '../features/hours.js';
import { s as svgEl, g, svgRoot, rng, f2 } from '../lib/svg.js';
import { play as sfx } from '../lib/sound.js';

const TEL = 'tel:+33473921642';
const WICKER = '#D9A45A';
const WICKER_DARK = '#B07A38';

const node = (tag, cls = '', text = '') => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
};

/** Panier en osier rempli des produits du mois (pain et bocal pour le gourmand). */
function basketArt(items, basket, seed) {
  const r = rng(seed * 7 + 3);
  const root = svgRoot('0 0 220 128', { class: 'basket-art', 'aria-hidden': 'true' });
  const handle = 'M46 72C46 2 174 2 174 72';
  root.append(
    svgEl('ellipse', { cx: 110, cy: 121, rx: 82, ry: 6, fill: 'rgba(18,67,43,.13)' }),
    svgEl('path', { d: handle, fill: 'none', stroke: '#7A4E26', 'stroke-width': 8, 'stroke-linecap': 'round' }),
    svgEl('path', { d: handle, fill: 'none', stroke: '#C98F4E', 'stroke-width': 3.4, 'stroke-linecap': 'round' }),
  );
  if (basket.extras) {
    root.append(g({ transform: 'translate(60 24) rotate(-40)' }, [
      svgEl('rect', { x: -40, y: -9, width: 80, height: 18, rx: 9, fill: '#D9A45A', stroke: BRAND.forest, 'stroke-width': 1.8 }),
      svgEl('path', { d: 'M-24 -5l6 9M-8 -6l6 10M8 -6l6 10M23 -5l5 8', stroke: '#8A5A2A', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
    ]));
  }
  // Le tas : fruits et légumes alternés, rangée de devant d'abord remplie
  const veg = items.filter((x) => x.kind !== 'fruit');
  const fruits = items.filter((x) => x.kind === 'fruit');
  const mix = [];
  while (veg.length || fruits.length) {
    if (veg.length) mix.push(veg.shift());
    if (fruits.length) mix.push(fruits.shift());
  }
  const front = [[60, 58], [94, 54], [128, 54], [161, 58]];
  const back = [[110, 36], [77, 41], [144, 41]];
  const spots = [...front.map((p) => [...p, 1.7]), ...back.map((p) => [...p, 1.5])];
  const placed = mix.slice(0, spots.length).map((it, i) => ({ it, at: spots[i], i }));
  // On dessine le fond d'abord
  [...placed].sort((a, b) => a.at[1] - b.at[1]).forEach(({ it, at: [x, y, k], i }) => {
    root.append(g({ transform: `translate(${x} ${y}) rotate(${f2((r() - 0.5) * 24)}) scale(${k})` }, drawProduce(it.id, 11 + i)));
  });
  // Corps tressé
  const xl = (y) => 32 + ((y - 72) * 15) / 46;
  const xr = (y) => 188 - ((y - 72) * 15) / 46;
  const rows = [[74, 86], [86, 99], [99, 111], [111, 118]];
  let weave = '';
  rows.forEach(([y0, y1], j) => {
    for (let x = 40 + (j % 2) * 7; x < 186; x += 14) {
      if (x > xl(y1) + 5 && x < xr(y1) - 5) weave += `M${x} ${y0 + 3}V${y1 - 3}`;
    }
  });
  root.append(
    svgEl('path', { d: 'M32 72H188L173 114Q171 120 165 120H55Q49 120 47 114Z', fill: WICKER, stroke: BRAND.forest, 'stroke-width': 2, 'stroke-linejoin': 'round' }),
    svgEl('path', { d: 'M35 86H185M39 99H181M43 111H177', stroke: WICKER_DARK, 'stroke-width': 2 }),
    svgEl('path', { d: weave, stroke: WICKER_DARK, 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
    svgEl('rect', { x: 27, y: 64, width: 166, height: 11, rx: 5.5, fill: '#C98F4E', stroke: BRAND.forest, 'stroke-width': 2 }),
  );
  if (basket.extras) {
    root.append(g({ transform: 'translate(190 100)' }, [
      svgEl('rect', { x: -12, y: -18, width: 24, height: 26, rx: 4, fill: '#E0A93B', stroke: BRAND.forest, 'stroke-width': 1.6 }),
      svgEl('rect', { x: -13, y: -25, width: 26, height: 8, rx: 2, fill: BRAND.forest }),
      svgEl('rect', { x: -8, y: -10, width: 16, height: 9, rx: 1, fill: '#FDFBEB' }),
    ]));
  }
  return root;
}

export default function stalls(el) {
  const $ = (s) => el.querySelector(s);
  const host = $('#scene-shelves');
  const monthsBar = $('#months');
  const card = $('#produce-card');
  const line = $('#season-line');
  const basketsEl = $('#baskets');
  const basketsMonth = $('#baskets-month');
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
    b.addEventListener('click', () => {
      sfx('note', { i });
      setMonth(i + 1);
    });
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

  function renderBaskets(m) {
    const of = m === nowMonth ? 'du moment' : (/^[aeiouéô]/i.test(MONTHS[m - 1]) ? 'd’' : 'de ') + MONTHS[m - 1];
    basketsMonth.textContent = `Prix fixe, composés avec les produits ${of}, et des idées de plats pour tout cuisiner.`;
    basketsEl.replaceChildren(...BASKETS.map((b, i) => {
      const { items, recipes } = basketFor(b, m);
      const li = node('li', 'basket');
      const head = node('div', 'basket-head');
      head.append(node('h4', '', b.name), node('p', 'basket-price', b.price));
      const list = node('ul', 'basket-items');
      list.setAttribute('aria-label', 'Dans le panier');
      items.forEach((x) => {
        const row = node('li');
        row.append(node('span', '', x.name), node('b', '', x.qty));
        list.append(row);
      });
      (b.extras || []).forEach((x) => list.append(node('li', 'basket-extra', `+ ${x}`)));
      li.append(basketArt(items, b, i), head, node('p', 'basket-people', b.people), list);
      if (recipes.length) {
        const ideas = node('div', 'basket-ideas');
        const ul = node('ul');
        recipes.forEach((rc) => {
          const it = node('li');
          it.append(node('b', '', rc.name), node('span', '', rc.note));
          ul.append(it);
        });
        ideas.append(node('p', '', 'Idées de plats'), ul);
        li.append(ideas);
      }
      const cta = node('a', 'btn btn--primary btn--wide', 'Réserver ce panier');
      cta.href = TEL;
      cta.setAttribute('aria-label', `Réserver ${b.name.toLowerCase()} par téléphone`);
      li.append(cta);
      return li;
    }));
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
    renderBaskets(m);
    showCard(null);
    if (scene) {
      sfx('tumble', { delay: 520 });
      await scene.setItems(stallPick(m));
    }
  }

  describe(month);
  renderBaskets(month);

  const ready = createShelves({ items: stallPick(month) }).then((sc) => {
    scene = sc;
    host.append(sc.svg);
    sc.onPick((item, i) => {
      sfx(item ? 'crate' : 'unpop', { i });
      showCard(item);
    });
    sc.idle(ambient);
    host.addEventListener('click', () => {
      if (!card.hidden) sfx('unpop');
      sc.select(-1);
      showCard(null);
    });
    return sc;
  });
  card.addEventListener('click', () => {
    sfx('unpop');
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
