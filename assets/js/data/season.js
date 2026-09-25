// Calendrier des fruits et légumes de saison (France métropolitaine).
// `m` = mois de pleine saison (1 = janvier). `p` = priorité d'affichage sur les étals.

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MONTHS_SHORT = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const PRODUCE = [
  // --- Fruits ---
  { id: 'fraise', name: 'Fraise', kind: 'fruit', m: [4, 5, 6, 7], p: 9, tip: 'À déguster à température ambiante : c’est là qu’elle est la plus parfumée.' },
  { id: 'cerise', name: 'Cerise', kind: 'fruit', m: [5, 6, 7], p: 9, tip: 'Choisissez-les brillantes, la queue bien verte.' },
  { id: 'rhubarbe', name: 'Rhubarbe', kind: 'fruit', m: [4, 5, 6], p: 6, tip: 'En compote ou en tarte, avec quelques fraises.' },
  { id: 'abricot', name: 'Abricot', kind: 'fruit', m: [6, 7, 8], p: 8, tip: 'Sur demande, il finit aussi dans votre jus pressé.' },
  { id: 'peche', name: 'Pêche & nectarine', kind: 'fruit', m: [6, 7, 8, 9], p: 8, tip: 'Blanches ou jaunes : laissez-les mûrir hors du frigo.' },
  { id: 'melon', name: 'Melon', kind: 'fruit', m: [6, 7, 8, 9], p: 9, tip: 'Lourd et parfumé côté pédoncule : il est prêt. Parfait avec un jambon sec.' },
  { id: 'pasteque', name: 'Pastèque', kind: 'fruit', m: [7, 8, 9], p: 7, tip: 'Tapotez-la : un son creux, c’est bon signe.' },
  { id: 'framboise', name: 'Framboise', kind: 'fruit', m: [6, 7, 8, 9], p: 6, tip: 'Fragile : à consommer dans les deux jours.' },
  { id: 'myrtille', name: 'Myrtille', kind: 'fruit', m: [7, 8, 9], p: 5, tip: 'Au petit-déjeuner, sur un yaourt ou dans un smoothie.' },
  { id: 'prune', name: 'Prune & mirabelle', kind: 'fruit', m: [7, 8, 9], p: 7, tip: 'Reine-claude, mirabelle, quetsche : la fin d’été en tartes.' },
  { id: 'figue', name: 'Figue', kind: 'fruit', m: [8, 9, 10], p: 8, tip: 'Rôtie au miel ou crue avec un fromage de chèvre.' },
  { id: 'raisin', name: 'Raisin', kind: 'fruit', m: [8, 9, 10], p: 10, tip: 'De fin août à octobre, blanc ou noir : une journée sans pépins !' },
  { id: 'poire', name: 'Poire', kind: 'fruit', m: [8, 9, 10, 11, 12, 1, 2, 3], p: 7, tip: 'Pressée avec une pomme, c’est notre jus P².' },
  { id: 'pomme', name: 'Pomme', kind: 'fruit', m: [8, 9, 10, 11, 12, 1, 2, 3, 4], p: 6, tip: 'La base de nos jus : détox, P², pomme-carotte-gingembre…' },
  { id: 'coing', name: 'Coing', kind: 'fruit', m: [10, 11, 12], p: 5, tip: 'Il se cuisine : gelée, pâte de coing, tajine.' },
  { id: 'chataigne', name: 'Châtaigne', kind: 'fruit', m: [10, 11, 12], p: 7, tip: 'Grillée, en velouté ou avec une volaille.' },
  { id: 'kiwi', name: 'Kiwi', kind: 'fruit', m: [11, 12, 1, 2, 3, 4], p: 6, tip: 'Plein de vitamine C pour passer l’hiver.' },
  { id: 'clementine', name: 'Clémentine', kind: 'fruit', m: [11, 12, 1, 2], p: 8, tip: 'Celle de Corse se reconnaît à ses feuilles.' },
  { id: 'orange', name: 'Orange', kind: 'fruit', m: [12, 1, 2, 3, 4], p: 7, tip: 'Pressée minute dans le jus A.C.E. (orange, carotte, citron).' },
  // --- Légumes ---
  { id: 'asperge', name: 'Asperge', kind: 'legume', m: [4, 5, 6], p: 9, tip: 'Blanche ou verte, à peine cuite, avec une vinaigrette.' },
  { id: 'petitspois', name: 'Petits pois', kind: 'legume', m: [5, 6, 7], p: 6, tip: 'À écosser en terrasse, c’est presque méditatif.' },
  { id: 'radis', name: 'Radis', kind: 'legume', m: [3, 4, 5, 6, 7, 8, 9, 10], p: 8, tip: 'Beurre, fleur de sel, pain frais : l’apéro parfait.' },
  { id: 'artichaut', name: 'Artichaut', kind: 'legume', m: [5, 6, 7, 8, 9], p: 5, tip: 'Cuit à la vapeur, feuille à feuille, à la vinaigrette.' },
  { id: 'laitue', name: 'Laitue', kind: 'legume', m: [4, 5, 6, 7, 8, 9, 10], p: 8, tip: 'Forcément, chez Café Laitue, on en a toujours une belle.' },
  { id: 'concombre', name: 'Concombre', kind: 'legume', m: [5, 6, 7, 8, 9], p: 5, tip: 'En tzatziki, ou pressé dans un jus bien frais.' },
  { id: 'courgette', name: 'Courgette', kind: 'legume', m: [6, 7, 8, 9], p: 7, tip: 'Petite et ferme, elle se mange même crue.' },
  { id: 'tomate', name: 'Tomate', kind: 'legume', m: [6, 7, 8, 9, 10], p: 9, tip: 'Jamais au frigo : elle y perd son goût.' },
  { id: 'aubergine', name: 'Aubergine', kind: 'legume', m: [6, 7, 8, 9], p: 6, tip: 'Rôtie entière au four, puis en caviar.' },
  { id: 'poivron', name: 'Poivron', kind: 'legume', m: [7, 8, 9, 10], p: 7, tip: 'Rouge, jaune ou vert : grillé puis mariné à l’huile d’olive.' },
  { id: 'haricot', name: 'Haricot vert', kind: 'legume', m: [6, 7, 8, 9], p: 6, tip: 'Cuisson courte, ils doivent rester croquants.' },
  { id: 'brocoli', name: 'Brocoli', kind: 'legume', m: [6, 7, 8, 9, 10, 11], p: 5, tip: 'Cinq minutes à la vapeur, pas plus.' },
  { id: 'fenouil', name: 'Fenouil', kind: 'legume', m: [6, 7, 8, 9, 10, 11], p: 4, tip: 'Cru en fines lamelles, avec de l’orange.' },
  { id: 'carotte', name: 'Carotte', kind: 'legume', m: ALL, p: 7, tip: 'Nouvelle au printemps, de garde l’hiver : dans le jus détox toute l’année.' },
  { id: 'betterave', name: 'Betterave', kind: 'legume', m: [7, 8, 9, 10, 11, 12, 1, 2, 3], p: 5, tip: 'Crue râpée ou rôtie, avec du chèvre frais.' },
  { id: 'patate', name: 'Patate douce', kind: 'legume', m: [9, 10, 11, 12], p: 6, tip: 'En frites au four, avec un filet d’huile et du paprika.' },
  { id: 'courge', name: 'Butternut & potimarron', kind: 'legume', m: [9, 10, 11, 12, 1, 2], p: 9, tip: 'Le potimarron se cuisine avec la peau.' },
  { id: 'poireau', name: 'Poireau', kind: 'legume', m: [9, 10, 11, 12, 1, 2, 3, 4], p: 8, tip: 'Fondue de poireaux, vinaigrette, velouté : l’indispensable d’hiver.' },
  { id: 'celeri', name: 'Céleri-rave', kind: 'legume', m: [9, 10, 11, 12, 1, 2, 3], p: 6, tip: 'En rémoulade, ou en purée avec la pomme de terre.' },
  { id: 'choufleur', name: 'Chou-fleur', kind: 'legume', m: [9, 10, 11, 12, 1, 2, 3, 4], p: 6, tip: 'Rôti entier au four avec des épices.' },
  { id: 'chou', name: 'Chou', kind: 'legume', m: [10, 11, 12, 1, 2, 3], p: 7, tip: 'Vert, rouge ou kale : en potée ou en salade croquante.' },
  { id: 'endive', name: 'Endive', kind: 'legume', m: [10, 11, 12, 1, 2, 3, 4], p: 6, tip: 'En salade avec noix et pomme.' },
  { id: 'mache', name: 'Mâche', kind: 'legume', m: [10, 11, 12, 1, 2, 3], p: 5, tip: 'La salade d’hiver, avec une betterave.' },
  { id: 'panais', name: 'Panais', kind: 'legume', m: [10, 11, 12, 1, 2, 3], p: 5, tip: 'Un goût de noisette, parfait rôti au miel.' },
  { id: 'navet', name: 'Navet', kind: 'legume', m: [10, 11, 12, 1, 2, 3], p: 4, tip: 'Glacé au beurre, avec un canard.' },
  { id: 'epinard', name: 'Épinard', kind: 'legume', m: [3, 4, 5, 9, 10, 11], p: 5, tip: 'En pousses crues ou juste tombés au beurre.' },
];

export const byId = Object.fromEntries(PRODUCE.map((p) => [p.id, p]));

/** Produits de saison pour un mois donné (1-12), triés par priorité. */
export function inSeason(month) {
  return PRODUCE.filter((p) => p.m.includes(month)).sort((a, b) => b.p - a.p);
}

/** Sélection pour les étals : `nf` fruits + le reste en légumes, triés par priorité. */
export function stallPick(month, total = 9, nf = 4) {
  const list = inSeason(month);
  const fruits = list.filter((p) => p.kind === 'fruit').slice(0, nf);
  const veg = list.filter((p) => p.kind === 'legume').slice(0, total - fruits.length);
  // Alterne fruits et légumes pour un étal coloré.
  const out = [];
  while (out.length < total && (fruits.length || veg.length)) {
    if (veg.length) out.push(veg.shift());
    if (fruits.length && out.length < total) out.push(fruits.shift());
  }
  return out;
}

/** « d’août à octobre », « toute l’année »… */
export function seasonLabel(p) {
  if (p.m.length === 12) return 'toute l’année';
  // Trouve le début de la plage (le mois dont le précédent n’est pas en saison).
  const set = new Set(p.m);
  const start = p.m.find((mo) => !set.has(((mo + 10) % 12) + 1)) ?? p.m[0];
  const len = p.m.length;
  const end = ((start - 1 + len - 1) % 12) + 1;
  const de = (m) => (/^[aeiouéô]/i.test(MONTHS[m - 1]) ? 'd’' : 'de ') + MONTHS[m - 1];
  return `${de(start)} à ${MONTHS[end - 1]}`;
}
