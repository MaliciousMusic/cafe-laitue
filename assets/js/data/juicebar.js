// Bar à jus : formules, ingrédients et leurs bienfaits.
//
// Bienfaits : seules les allégations de santé autorisées par l'Union européenne
// (règlement CE 1924/2006, registre des allégations) sont employées. Un nutriment n'est
// cité que si l'ingrédient en est une source (au moins 15 % des valeurs de référence pour
// 100 g), et pour les herbes, à la dose utilisée dans un jus. Les épices, le miel ou l'eau
// de coco sont décrits par leur goût, sans allégation.

import { mixColors } from '../scenes/glass.js';

/** Formules : nombre d'ingrédients et prix (à confirmer avec Vincent). */
export const TIERS = [
  { n: 3, price: 4.5 },
  { n: 5, price: 5.5 },
  { n: 7, price: 6.5 },
];

export const GROUPS = [
  { id: 'fruit', label: 'Fruits' },
  { id: 'legume', label: 'Légumes' },
  { id: 'aromate', label: 'Aromates' },
  { id: 'epice', label: 'Épices & +' },
];

/** Nutriments mis en avant, avec leur allégation autorisée. */
export const NUTRIENTS = {
  vitc: { label: 'Vitamine C', subject: 'La vitamine C', claim: 'contribue au fonctionnement normal du système immunitaire et à réduire la fatigue' },
  vita: { label: 'Vitamine A', subject: 'La vitamine A', claim: 'contribue au maintien d’une vision et d’une peau normales' },
  vitk: { label: 'Vitamine K', subject: 'La vitamine K', claim: 'contribue à une coagulation sanguine normale et au maintien d’une ossature normale' },
  b9: { label: 'Folates (B9)', subject: 'Les folates', claim: 'contribuent à réduire la fatigue et à la formation normale du sang' },
  k: { label: 'Potassium', subject: 'Le potassium', claim: 'contribue au fonctionnement normal des muscles et du système nerveux' },
  mn: { label: 'Manganèse', subject: 'Le manganèse', claim: 'contribue à protéger les cellules contre le stress oxydatif' },
};

export const TASTES = [
  { id: 'doux', label: 'Douceur' },
  { id: 'acide', label: 'Acidité' },
  { id: 'frais', label: 'Fraîcheur' },
  { id: 'piquant', label: 'Piquant' },
  { id: 'vegetal', label: 'Végétal' },
];

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// id, nom, groupe, icône (scenes/produce.js), couleur du jus, poids dans la couleur,
// mois de disponibilité, nutriments, goût (0 à 3), une phrase. `seed` choisit la variante du dessin.
const I = (id, name, group, color, m, nut, taste, note, extra = {}) => ({ id, name, group, color, m, nut, taste, note, w: 1, icon: id, seed: 1, ...extra });

export const INGREDIENTS = [
  // --- Fruits
  I('pomme', 'Pomme', 'fruit', '#E8D27A', ALL, [], { doux: 2, acide: 2, frais: 1 }, 'Croquante et acidulée, la base douce de la plupart des jus.'),
  I('poire', 'Poire', 'fruit', '#DCD46E', ALL, [], { doux: 3, frais: 1 }, 'Fondante et sucrée, elle arrondit les mélanges les plus verts.'),
  I('orange', 'Orange', 'fruit', '#F4972E', ALL, ['vitc', 'b9'], { doux: 2, acide: 2, frais: 1 }, 'Pressée minute : du soleil et de la vitamine C dans le verre.'),
  I('citron', 'Citron', 'fruit', '#F2DA5A', ALL, ['vitc'], { acide: 3, frais: 2 }, 'Quelques gouttes réveillent tout le jus.', { w: 0.6 }),
  I('citronvert', 'Citron vert', 'fruit', '#C2D96A', ALL, ['vitc'], { acide: 3, frais: 3 }, 'Plus vif et plus parfumé que le citron jaune.', { w: 0.6 }),
  I('pamplemousse', 'Pamplemousse', 'fruit', '#F3A08C', ALL, ['vitc'], { doux: 1, acide: 2, frais: 2 }, 'Acidulé, légèrement amer, très désaltérant.'),
  I('clementine', 'Clémentine', 'fruit', '#F59A30', [11, 12, 1, 2], ['vitc'], { doux: 3, acide: 1 }, 'Douce et parfumée, la reine des agrumes d’hiver.'),
  I('kiwi', 'Kiwi', 'fruit', '#9BC24A', [11, 12, 1, 2, 3, 4], ['vitc', 'vitk', 'k'], { doux: 1, acide: 2, frais: 1, vegetal: 1 }, 'Acidulé et très riche en vitamine C.'),
  I('ananas', 'Ananas', 'fruit', '#F6D046', ALL, ['vitc', 'mn'], { doux: 2, acide: 2, frais: 1 }, 'Sucré et exotique, il adoucit les jus de légumes.'),
  I('mangue', 'Mangue', 'fruit', '#F7B32B', ALL, ['vitc', 'b9'], { doux: 3 }, 'Onctueuse et très parfumée.'),
  I('fraise', 'Fraise', 'fruit', '#E0485A', [4, 5, 6, 7], ['vitc', 'mn'], { doux: 2, acide: 1 }, 'Le parfum de l’été, et une belle source de vitamine C.'),
  I('framboise', 'Framboise', 'fruit', '#D8436A', [6, 7, 8, 9], ['vitc', 'mn'], { doux: 1, acide: 2 }, 'Acidulée et intense, une couleur éclatante.'),
  I('myrtille', 'Myrtille', 'fruit', '#5A4E8E', [7, 8, 9], ['vitk', 'mn'], { doux: 2, acide: 1 }, 'Petite baie bleue au goût profond.'),
  I('raisin', 'Raisin', 'fruit', '#8C3B6E', [8, 9, 10], ['vitk'], { doux: 3 }, 'Naturellement sucré, parfait avec une pointe de gingembre.'),
  I('peche', 'Pêche', 'fruit', '#F5A55C', [6, 7, 8, 9], [], { doux: 3, frais: 1 }, 'Juteuse et fondante, l’été en bouteille.'),
  I('abricot', 'Abricot', 'fruit', '#F4A13C', [6, 7, 8], [], { doux: 2, acide: 1 }, 'Doux et légèrement acidulé.'),
  I('melon', 'Melon', 'fruit', '#F3A35A', [6, 7, 8, 9], ['vitc', 'vita'], { doux: 3, frais: 1 }, 'Sucré et parfumé, source de vitamines C et A.'),
  I('pasteque', 'Pastèque', 'fruit', '#EC6072', [7, 8, 9], [], { doux: 2, frais: 3 }, 'Gorgée d’eau, la plus désaltérante de toutes.'),
  I('grenade', 'Grenade', 'fruit', '#C22F4A', [9, 10, 11, 12, 1], ['vitk', 'b9'], { doux: 2, acide: 2 }, 'Des grains acidulés et juteux, rouge rubis.'),
  I('passion', 'Fruit de la passion', 'fruit', '#E8B33A', ALL, ['vitc', 'k'], { doux: 1, acide: 3 }, 'Explosif et exotique : un seul fruit parfume tout le jus.', { w: 0.6 }),
  I('prune', 'Prune', 'fruit', '#9A4A7A', [7, 8, 9], [], { doux: 2, acide: 1 }, 'Douce et charnue, un goût de fin d’été.', { seed: 6 }),
  // --- Légumes
  I('carotte', 'Carotte', 'legume', '#F08A2A', ALL, ['vita', 'vitk', 'k'], { doux: 2, vegetal: 1 }, 'Douce, et source de vitamine A grâce au bêta-carotène.'),
  I('betterave', 'Betterave', 'legume', '#9C2748', [7, 8, 9, 10, 11, 12, 1, 2, 3], ['b9', 'k', 'mn'], { doux: 2, vegetal: 2 }, 'Sucrée et terreuse, d’un rouge intense.'),
  I('concombre', 'Concombre', 'legume', '#B9D58C', [5, 6, 7, 8, 9], ['vitk'], { frais: 3, vegetal: 2 }, 'Frais et léger, gorgé d’eau.'),
  I('celeribr', 'Céleri branche', 'legume', '#A9C77A', [6, 7, 8, 9, 10, 11], ['vitk', 'b9'], { frais: 1, vegetal: 3 }, 'Croquant et légèrement salé : la base des jus verts.'),
  I('epinard', 'Épinard', 'legume', '#4F8A3B', [3, 4, 5, 9, 10, 11], ['vitk', 'vita', 'b9', 'k'], { vegetal: 3 }, 'Des feuilles tendres et une très bonne source de vitamine K.'),
  I('kale', 'Chou kale', 'legume', '#3E7A40', [10, 11, 12, 1, 2, 3], ['vitk', 'vitc', 'vita', 'b9'], { piquant: 1, vegetal: 3 }, 'Le chou vert star des jus verts.'),
  I('fenouil', 'Fenouil', 'legume', '#D8E4A8', [6, 7, 8, 9, 10, 11], ['vitc', 'vitk', 'k'], { doux: 1, frais: 2, vegetal: 1 }, 'Anisé et frais, surprenant avec la pomme.'),
  I('tomate', 'Tomate', 'legume', '#E5533D', [6, 7, 8, 9, 10], ['vitc'], { doux: 1, acide: 1, vegetal: 2 }, 'Pour un jus salé, façon gaspacho.'),
  I('poivron', 'Poivron rouge', 'legume', '#D9412F', [7, 8, 9, 10], ['vitc', 'vita', 'b9'], { doux: 2, vegetal: 1 }, 'Doux et croquant, très riche en vitamine C.', { seed: 7 }),
  // --- Aromates
  I('menthe', 'Menthe', 'aromate', '#7CC46E', ALL, [], { frais: 3, vegetal: 1 }, 'Une fraîcheur intense en quelques feuilles.', { w: 0.25 }),
  I('basilic', 'Basilic', 'aromate', '#5FA052', ALL, ['vitk'], { frais: 1, piquant: 1, vegetal: 2 }, 'Parfum d’été, il aime la fraise et la tomate.', { w: 0.25 }),
  I('persil', 'Persil', 'aromate', '#4E9A44', ALL, ['vitk', 'vitc'], { vegetal: 3 }, 'Bien plus qu’une décoration : une source de vitamine K.', { w: 0.3 }),
  I('coriandre', 'Coriandre', 'aromate', '#6DAE5A', ALL, ['vitk'], { frais: 1, vegetal: 2 }, 'Fraîche et citronnée, pour les jus exotiques.', { w: 0.25 }),
  // --- Épices & +
  I('gingembre', 'Gingembre', 'epice', '#E6C765', ALL, [], { frais: 1, piquant: 3 }, 'Piquant et chaleureux : le coup de fouet.', { w: 0.25 }),
  I('curcuma', 'Curcuma frais', 'epice', '#F2B21B', ALL, [], { piquant: 1, vegetal: 1 }, 'Racine dorée au goût légèrement poivré.', { w: 0.5 }),
  I('cannelle', 'Cannelle', 'epice', '#A0602E', ALL, [], { doux: 1, piquant: 1 }, 'Une note chaude et gourmande.', { w: 0.1 }),
  I('piment', 'Piment d’Espelette', 'epice', '#C8382A', ALL, [], { piquant: 3 }, 'Pour les audacieux : une chaleur douce et fruitée.', { w: 0.1 }),
  I('coco', 'Eau de coco', 'epice', '#F3F1E4', ALL, [], { doux: 1, frais: 2 }, 'Légère et naturellement douce, elle allonge le jus.', { w: 0.5 }),
  I('miel', 'Miel', 'epice', '#E9A93A', ALL, [], { doux: 3 }, 'Une cuillère pour arrondir les saveurs.', { w: 0.2 }),
];

export const BY_ID = Object.fromEntries(INGREDIENTS.map((x) => [x.id, x]));

/** Les classiques de l'ardoise (prix fixes). */
export const CLASSICS = [
  { id: 'ace', name: 'A.C.E.', price: '4 €', ids: ['orange', 'carotte', 'citron'], note: 'Orange, carotte, citron : le classique vitaminé.' },
  { id: 'detox', name: 'Détox', price: '4 €', ids: ['pomme', 'carotte', 'citron', 'gingembre'], note: 'Pomme, carotte, citron, gingembre : frais et piquant.' },
  { id: 'p2', name: 'P²', price: '4 €', ids: ['pomme', 'poire'], note: 'Pomme, poire : tout en douceur.' },
  { id: 'ginger', name: 'Ginger shot', price: 'shot', ids: ['gingembre', 'citron'], note: 'Gingembre pressé, en format shot : le coup de fouet.' },
];

/** Disponible ce mois-ci ? */
export const available = (ing, month) => ing.m.includes(month);

/** Prochain mois de retour (1-12) d'un ingrédient hors saison. */
export function backIn(ing, month) {
  for (let i = 1; i <= 12; i++) {
    const mo = ((month - 1 + i) % 12) + 1;
    if (ing.m.includes(mo)) return mo;
  }
  return month;
}

/** Couleur du jus : moyenne pondérée (une herbe teinte moins qu'un fruit). */
export function juiceColor(ids) {
  const list = ids.map((id) => BY_ID[id]).filter(Boolean);
  return mixColors(list.map((x) => x.color), list.map((x) => x.w));
}

/** Profil de goût de 0 à 1 par saveur (moyenne pondérée des ingrédients). */
export function tasteProfile(ids) {
  const list = ids.map((id) => BY_ID[id]).filter(Boolean);
  const total = list.reduce((a, x) => a + x.w, 0) || 1;
  return Object.fromEntries(TASTES.map((t) => [t.id, Math.min(1, list.reduce((a, x) => a + (x.taste[t.id] || 0) * x.w, 0) / total / 3 * 1.4)]));
}

/** Nutriments apportés par la sélection, avec les ingrédients qui les apportent. */
export function benefits(ids) {
  const out = [];
  Object.entries(NUTRIENTS).forEach(([key, n]) => {
    const from = ids.map((id) => BY_ID[id]).filter((x) => x && x.nut.includes(key));
    if (from.length) out.push({ key, ...n, from: from.map((x) => x.name) });
  });
  return out.sort((a, b) => b.from.length - a.from.length);
}

function hue(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255;
  const gg = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const mx = Math.max(r, gg, b);
  const mn = Math.min(r, gg, b);
  if (mx === mn) return 0;
  const d = mx - mn;
  const h = mx === r ? (gg - b) / d + (gg < b ? 6 : 0) : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4;
  return h * 60;
}

/** Nom du jus composé : d'après sa couleur et sa saveur dominante. */
export function juiceName(ids) {
  if (!ids.length) return 'Ton jus';
  if (ids.length === 1) return `100 % ${BY_ID[ids[0]].name.toLowerCase()}`;
  const h = hue(juiceColor(ids));
  let base;
  if (ids.includes('betterave')) base = 'Rouge de terre';
  else if (ids.includes('raisin') || ids.includes('myrtille')) base = 'Vendanges';
  else if (h < 12 || h >= 330) base = 'Rouge passion';
  else if (h < 36) base = 'Soleil d’Auvergne';
  else if (h < 58) base = 'Rayon doux';
  else if (h < 160) base = 'Vert tonique';
  else base = 'Petit grain de folie';
  // Une épice qui pique se remarque toujours, même en petite quantité
  if (ids.some((id) => BY_ID[id].taste.piquant >= 3)) return `${base} qui pique`;
  const p = tasteProfile(ids);
  const top = Object.entries(p).sort((a, b) => b[1] - a[1])[0];
  const suffix = { piquant: ' qui pique', frais: ' fraîcheur', acide: ' acidulé', vegetal: ' du jardin', doux: ' tout doux' };
  return base + (top && top[1] > 0.3 ? suffix[top[0]] : '');
}

export const euro = (v) => `${v.toFixed(2).replace('.', ',').replace(',00', '')} €`;
