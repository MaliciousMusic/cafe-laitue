// Écran « Bar à jus » : en haut, Vincent presse les jus derrière son comptoir ; en bas, le
// compositeur. Formule 3, 5 ou 7 ingrédients, chacun avec ses bienfaits ; le verre résume
// le goût et les nutriments de la recette, à montrer au comptoir.

import { Ambient, anim, EASE, isReduced } from '../lib/motion.js';
import { play as sfx } from '../lib/sound.js';
import { svgRoot, g } from '../lib/svg.js';
import { createJuiceBar } from '../scenes/juicebar.js';
import { drawProduce } from '../scenes/produce.js';
import {
  TIERS, TASTES, NUTRIENTS, INGREDIENTS, BY_ID, CLASSICS,
  available, backIn, juiceName, tasteProfile, benefits, euro,
} from '../data/juicebar.js';
import { MONTHS } from '../data/season.js';
import { parisNow } from '../features/hours.js';

const KEY = 'cafe-laitue.jus.v1';
const store = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || null;
    } catch (e) {
      return null;
    }
  },
  set(v) {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch (e) {
      /* navigation privée */
    }
  },
};

// Quelques réactions de Vincent
const REACT = {
  gingembre: 'Ça va piquer !', piment: 'Audacieux !', menthe: 'Fraîcheur !', betterave: 'Quelle couleur !',
  curcuma: 'De l’or en racine !', kale: 'Le plein de vert !', passion: 'Exotique !', persil: 'Bien vu !',
};

function icon(ing) {
  const svg = svgRoot('-16 -16 32 32');
  svg.append(g({ transform: 'scale(1.15)' }, drawProduce(ing.icon, ing.seed)));
  return svg;
}

export default function juicebar(el) {
  const $ = (q) => el.querySelector(q);
  const host = $('#scene-juicebar');
  const tierBtns = [...$('#jb-tiers').querySelectorAll('[data-n]')];
  const slotsEl = $('#jb-slots');
  const nameEl = $('#jb-name');
  const priceEl = $('#jb-price');
  const tasteEl = $('#jb-taste');
  const nutEl = $('#jb-nutrients');
  const showBtn = $('#jb-show');
  const groupBtns = [...$('#jb-groups').querySelectorAll('[data-group]')];
  const listEl = $('#jb-list');
  const photo = $('#portrait-photo');
  const toggle = $('#photo-toggle');
  const month = parisNow().month;
  const ambient = new Ambient();
  ambient.pause();

  const saved = store.get();
  let tier = TIERS.some((t) => t.n === saved?.tier) ? saved.tier : TIERS[0].n;
  let list = (saved?.list || []).filter((id) => BY_ID[id] && available(BY_ID[id], month)).slice(0, tier);
  let classic = null; // un classique de l'ardoise affiché à la place de la composition
  let scene = null;
  let greeted = false;

  const save = () => store.set({ tier, list });
  const tierOf = (n) => TIERS.find((t) => t.n === n);

  // Prix des formules (depuis les données)
  tierBtns.forEach((b) => {
    const t = tierOf(Number(b.dataset.n));
    if (t) b.querySelector('em').textContent = euro(t.price);
  });

  // Barres du profil de goût
  const bars = TASTES.map((t) => {
    const row = document.createElement('div');
    row.className = 'jb-bar';
    row.innerHTML = `<span>${t.label}</span><i><b></b></i>`;
    tasteEl.append(row);
    return row.querySelector('b');
  });

  // Cartes d'ingrédients : de saison et disponibles d'abord, puis ceux qui reviendront
  const ordered = [...INGREDIENTS].sort((a, b) => Number(available(b, month)) - Number(available(a, month)));
  const cards = ordered.map((ing) => {
    const on = available(ing, month);
    const seasonal = ing.m.length < 12;
    const li = document.createElement('li');
    li.dataset.group = ing.group;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'jb-ing';
    b.dataset.sfx = 'none';
    b.setAttribute('aria-pressed', 'false');
    const name = document.createElement('b');
    name.textContent = ing.name;
    const tag = document.createElement('span');
    tag.className = `jb-tag${seasonal && on ? ' is-season' : ''}`;
    tag.textContent = !on ? `de retour en ${MONTHS[backIn(ing, month) - 1]}` : seasonal ? 'de saison' : 'toute l’année';
    const note = document.createElement('small');
    note.textContent = ing.note;
    b.append(icon(ing), name, tag, note);
    if (ing.nut.length) {
      const chips = document.createElement('span');
      chips.className = 'jb-chips';
      ing.nut.forEach((k) => {
        const c = document.createElement('i');
        c.textContent = NUTRIENTS[k].label;
        chips.append(c);
      });
      b.append(chips);
    }
    b.disabled = !on;
    b.addEventListener('click', () => pick(ing.id, b));
    li.append(b);
    listEl.append(li);
    return { li, b, ing };
  });

  function setGroup(id) {
    groupBtns.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.group === id)));
    cards.forEach((c) => (c.li.hidden = c.ing.group !== id));
  }

  // ------------------------------------------------------------ rendu
  function render() {
    const ids = classic ? classic.ids : list;
    const n = classic ? ids.length : tier;
    tierBtns.forEach((b) => b.setAttribute('aria-checked', String(!classic && Number(b.dataset.n) === tier)));

    // Le verre : une case par ingrédient de la formule
    slotsEl.replaceChildren(...Array.from({ length: n }, (_, i) => {
      const li = document.createElement('li');
      const ing = BY_ID[ids[i]];
      if (ing) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.sfx = 'none';
        b.setAttribute('aria-label', classic ? ing.name : `Retirer ${ing.name}`);
        b.append(icon(ing));
        if (!classic) b.addEventListener('click', () => pick(ing.id));
        else b.disabled = true;
        li.append(b);
      }
      return li;
    }));

    const t = tierOf(tier);
    nameEl.textContent = classic ? classic.name : list.length ? juiceName(list) : 'Ton jus';
    priceEl.textContent = classic
      ? `Le classique · ${classic.price}`
      : `${list.length} / ${tier} ingrédients · ${euro(t.price)}`;

    const p = tasteProfile(ids);
    bars.forEach((bar, i) => (bar.style.width = `${Math.round((p[TASTES[i].id] || 0) * 100)}%`));

    const ben = benefits(ids);
    nutEl.replaceChildren(...(ben.length ? ben.map((b) => {
      const li = document.createElement('li');
      li.innerHTML = `<b>${b.label}</b> <span>${b.from.join(', ')}</span><small>${b.subject} ${b.claim}.</small>`;
      return li;
    }) : [Object.assign(document.createElement('li'), {
      className: 'is-empty',
      textContent: ids.length ? 'Une recette toute en goût : ajoute un fruit ou un légume pour les vitamines.' : 'Choisis tes ingrédients : leurs bienfaits s’affichent ici.',
    })]));

    const full = list.length >= tier;
    cards.forEach(({ b, ing }) => {
      const on = !classic && list.includes(ing.id);
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-locked', !classic && full && !on);
    });
    showBtn.disabled = !(classic || full);
  }

  // ------------------------------------------------------------ actions
  function leaveClassic() {
    if (!classic) return;
    classic = null;
    scene?.set(list, tier);
  }

  function pick(id, btn) {
    leaveClassic();
    const i = list.indexOf(id);
    if (i >= 0) {
      list.splice(i, 1);
      sfx('unpop');
      scene?.update([...list], tier);
    } else if (list.length < tier) {
      list.push(id);
      sfx('pop');
      const from = btn ? scene?.toScene(btn.querySelector('svg').getBoundingClientRect()) : null;
      scene?.add(id, { from, list: [...list], tier });
      if (list.length === 1) scene?.say('C’est parti !', 1500);
      else if (REACT[id] && list.length < tier) scene?.say(REACT[id], 1500);
    } else {
      sfx('nope');
      if (!isReduced()) anim(slotsEl, [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 320, fill: 'none' });
      return;
    }
    save();
    render();
  }

  tierBtns.forEach((b) => b.addEventListener('click', () => {
    leaveClassic();
    const n = Number(b.dataset.n);
    if (n === tier) return;
    sfx('on');
    tier = n;
    if (list.length > tier) list = list.slice(0, tier);
    scene?.update([...list], tier);
    save();
    render();
  }));

  $('#jb-reset').addEventListener('click', () => {
    sfx(list.length || classic ? 'drain' : 'tap');
    classic = null;
    list = [];
    scene?.reset();
    save();
    render();
  });

  groupBtns.forEach((b) => b.addEventListener('click', () => setGroup(b.dataset.group)));

  el.querySelectorAll('[data-classic]').forEach((b) => b.addEventListener('click', () => {
    const c = CLASSICS.find((x) => x.id === b.dataset.classic);
    if (!c) return;
    classic = c;
    scene?.make(c.ids);
    scene?.say(`Un ${c.name}, ça marche !`, 1600);
    render();
    $('.jb-cup').scrollIntoView({ block: 'nearest', behavior: isReduced() ? 'auto' : 'smooth' });
  }));

  // La recette en grand, à montrer au comptoir
  showBtn.addEventListener('click', () => {
    const ids = classic ? classic.ids : list;
    const body = document.getElementById('ticket-body');
    const t = tierOf(tier);
    body.replaceChildren();
    const h = document.createElement('p');
    h.className = 'ticket-name';
    h.textContent = classic ? classic.name : juiceName(list);
    const meta = document.createElement('p');
    meta.className = 'ticket-meta';
    meta.textContent = classic ? `Le classique · ${classic.price}` : `${tier} ingrédients · ${euro(t.price)}`;
    const ul = document.createElement('ul');
    ul.className = 'ticket-list';
    ids.forEach((id) => {
      const li = document.createElement('li');
      li.append(icon(BY_ID[id]), document.createTextNode(BY_ID[id].name));
      ul.append(li);
    });
    const foot = document.createElement('p');
    foot.className = 'ticket-foot';
    foot.textContent = 'Pressé minute devant vous, au Café Laitue.';
    body.append(h, meta, ul, foot);
    import('../main.js').then((m) => m.openSheet(document.getElementById('ticket')));
  });

  // Illustration ↔ photo de Vincent (révélation circulaire depuis le bouton)
  let showingPhoto = false;
  toggle.addEventListener('click', () => {
    sfx('shutter');
    showingPhoto = !showingPhoto;
    toggle.setAttribute('aria-pressed', String(showingPhoto));
    toggle.querySelector('span').textContent = showingPhoto ? 'Retour au bar' : 'Vincent en vrai';
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

  setGroup('fruit');
  render();

  const ready = createJuiceBar().then((sc) => {
    scene = sc;
    host.append(sc.svg);
    sc.idle(ambient);
    sc.set(list, tier);
    return sc;
  });

  return {
    async enter() {
      const img = photo.querySelector('img');
      if (img && img.loading === 'lazy') img.loading = 'eager';
      await ready;
      ambient.play();
      if (!greeted) {
        greeted = true;
        setTimeout(() => scene.say(list.length ? 'On continue ton jus ?' : 'Salut ! On compose ?', 1900), 450);
      }
    },
    leave() {
      ambient.pause();
    },
  };
}
