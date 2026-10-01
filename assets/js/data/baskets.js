// Paniers à prix fixe (étals) : composés avec les produits de saison du mois choisi,
// avec des idées de plats. Prix à confirmer avec Vincent.

import { inSeason, byId } from './season.js';

export const BASKETS = [
  { id: 'duo', name: 'Le panier duo', price: '15 €', people: 'pour 1 à 2 personnes', fruits: 2, legumes: 4, size: 0, recipes: 3 },
  { id: 'famille', name: 'Le panier famille', price: '25 €', people: 'pour 3 à 4 personnes', fruits: 3, legumes: 6, size: 1, recipes: 3 },
  {
    id: 'gourmand', name: 'Le panier gourmand', price: '35 €', people: 'pour 4 personnes, avec l’épicerie', fruits: 4, legumes: 6, size: 1, recipes: 3,
    extras: ['Un pain d’Atelier Bon', 'Une douceur de l’épicerie fine'],
  },
];

// Quantités par produit : [panier duo, paniers famille et gourmand]
const QTY = {
  fraise: ['250 g', '500 g'], cerise: ['500 g', '1 kg'], rhubarbe: ['1 botte', '2 bottes'], abricot: ['500 g', '1 kg'],
  peche: ['500 g', '1 kg'], melon: ['1', '2'], pasteque: ['½', '1'], framboise: ['125 g', '250 g'], myrtille: ['125 g', '250 g'],
  prune: ['500 g', '1 kg'], figue: ['4', '8'], raisin: ['500 g', '1 kg'], poire: ['500 g', '1 kg'], pomme: ['1 kg', '1,5 kg'],
  coing: ['2', '3'], chataigne: ['300 g', '500 g'], kiwi: ['4', '8'], clementine: ['1 kg', '1,5 kg'], orange: ['1 kg', '2 kg'],
  asperge: ['1 botte', '2 bottes'], petitspois: ['500 g', '1 kg'], radis: ['1 botte', '2 bottes'], artichaut: ['2', '4'],
  laitue: ['1', '2'], concombre: ['1', '2'], courgette: ['2', '4'], tomate: ['500 g', '1 kg'], aubergine: ['1', '2'],
  poivron: ['2', '3'], haricot: ['300 g', '500 g'], brocoli: ['1', '2'], fenouil: ['1', '2'], carotte: ['500 g', '1 kg'],
  betterave: ['2', '4'], patate: ['500 g', '1 kg'], courge: ['1', '1'], poireau: ['2', '3'], celeri: ['½', '1'],
  choufleur: ['½', '1'], chou: ['½', '1'], endive: ['4', '6'], mache: ['150 g', '250 g'], panais: ['300 g', '500 g'],
  navet: ['300 g', '500 g'], epinard: ['300 g', '500 g'],
};

// Libellés plus parlants dans un panier que sur l'étal
const NAME = { courge: 'Butternut ou potimarron', peche: 'Pêches ou nectarines', prune: 'Prunes ou mirabelles' };

// Idées de plats : ce qu'il faut du panier (`needs`) et une phrase.
const RECIPES = [
  // Printemps
  { name: 'Asperges, vinaigrette aux herbes', needs: ['asperge'], note: 'Juste cuites, encore croquantes.' },
  { name: 'Petits pois à la française', needs: ['petitspois', 'laitue'], note: 'Mijotés avec la laitue et un oignon nouveau.' },
  { name: 'Radis, beurre et fleur de sel', needs: ['radis'], note: 'L’apéro le plus simple du monde.' },
  { name: 'Tarte rhubarbe-fraise', needs: ['rhubarbe', 'fraise'], note: 'L’acidulé de l’une, le sucré de l’autre.' },
  { name: 'Salade d’épinards et radis', needs: ['epinard', 'radis'], note: 'Avec un œuf mollet et des croûtons.' },
  { name: 'Artichauts vinaigrette', needs: ['artichaut'], note: 'Feuille à feuille, sans se presser.' },
  // Été
  { name: 'Ratatouille', needs: ['courgette', 'aubergine', 'poivron', 'tomate'], note: 'Chaque légume cuit à part, puis réunis.' },
  { name: 'Gaspacho', needs: ['tomate', 'concombre', 'poivron'], note: 'Mixé, bien frais, un filet d’huile d’olive.' },
  { name: 'Tomates et pêches au basilic', needs: ['tomate', 'peche'], note: 'Une salade sucrée-salée qui surprend.' },
  { name: 'Tian de légumes', needs: ['courgette', 'tomate', 'aubergine'], note: 'En rosace, une heure au four.' },
  { name: 'Haricots verts, échalote et noisettes', needs: ['haricot'], note: 'Cuisson courte, assaisonnés tièdes.' },
  { name: 'Tarte fine aux abricots', needs: ['abricot'], note: 'Pâte feuilletée, un peu de miel.' },
  { name: 'Melon, jambon cru et menthe', needs: ['melon'], note: 'Le classique de l’été.' },
  { name: 'Pastèque, feta et menthe', needs: ['pasteque'], note: 'Frais, salé, sucré.' },
  { name: 'Clafoutis aux cerises', needs: ['cerise'], note: 'Avec les noyaux, pour le goût d’amande.' },
  { name: 'Tzatziki', needs: ['concombre'], note: 'Yaourt grec, ail et aneth.' },
  { name: 'Brocoli rôti, citron et amandes', needs: ['brocoli'], note: 'Vingt minutes au four, bien doré.' },
  { name: 'Crumble aux prunes', needs: ['prune'], note: 'Une pâte sablée émiettée, de la cannelle.' },
  { name: 'Salade de fruits rouges', needs: ['framboise', 'myrtille'], note: 'Quelques feuilles de menthe.' },
  { name: 'Fenouil braisé à l’huile d’olive', needs: ['fenouil'], note: 'Fondant, légèrement anisé.' },
  { name: 'Tomates à la provençale', needs: ['tomate'], note: 'Ail, persil, chapelure, et au four.' },
  { name: 'Courgettes farcies', needs: ['courgette', 'tomate'], note: 'Farce aux herbes et chèvre, sur un lit de tomates.' },
  { name: 'Poivrons rôtis à l’huile d’olive', needs: ['poivron'], note: 'Pelés, marinés avec un peu d’ail.' },
  // Automne
  { name: 'Velouté de potimarron', needs: ['courge', 'carotte'], note: 'Le potimarron se cuisine avec la peau.' },
  { name: 'Butternut rôtie au miel', needs: ['courge'], note: 'En quartiers, avec du thym.' },
  { name: 'Poêlée de poireaux aux pommes', needs: ['poireau', 'pomme'], note: 'Un accompagnement doux pour une volaille.' },
  { name: 'Figues rôties au miel', needs: ['figue'], note: 'Avec un fromage de chèvre frais.' },
  { name: 'Salade de betterave et chèvre', needs: ['betterave'], note: 'Rôtie ou crue, en fines lamelles.' },
  { name: 'Gratin de chou-fleur', needs: ['choufleur'], note: 'Béchamel légère et comté râpé.' },
  { name: 'Frites de patate douce', needs: ['patate'], note: 'Au four, avec du paprika fumé.' },
  { name: 'Compote pomme-poire', needs: ['pomme', 'poire'], note: 'Sans sucre ajouté, une gousse de vanille.' },
  { name: 'Raisins rôtis et fromage frais', needs: ['raisin'], note: 'Sur une tartine grillée.' },
  { name: 'Velouté de châtaignes', needs: ['chataigne'], note: 'Avec une pointe de crème.' },
  { name: 'Soupe de courge et châtaignes', needs: ['courge', 'chataigne'], note: 'Veloutée, avec quelques châtaignes émiettées dessus.' },
  { name: 'Poires pochées à la cannelle', needs: ['poire'], note: 'Dans un sirop léger, servies tièdes.' },
  { name: 'Pâte de coing', needs: ['coing'], note: 'La recette de grand-mère, à couper en cubes.' },
  { name: 'Épinards à la crème', needs: ['epinard'], note: 'Juste tombés, une pincée de muscade.' },
  // Hiver
  { name: 'Potée au chou', needs: ['chou', 'carotte', 'poireau'], note: 'Le plat qui réchauffe toute la maison.' },
  { name: 'Endives au jambon', needs: ['endive'], note: 'Gratinées, comme il se doit.' },
  { name: 'Salade d’endives, pomme et noix', needs: ['endive', 'pomme'], note: 'Croquante, une vinaigrette au miel.' },
  { name: 'Mâche et betterave', needs: ['mache', 'betterave'], note: 'La salade d’hiver par excellence.' },
  { name: 'Purée de céleri-rave', needs: ['celeri'], note: 'Moitié céleri, moitié pomme de terre.' },
  { name: 'Panais rôtis au miel', needs: ['panais'], note: 'Un goût de noisette.' },
  { name: 'Navets glacés', needs: ['navet'], note: 'Au beurre, avec un peu de sucre.' },
  { name: 'Salade d’agrumes', needs: ['orange', 'clementine'], note: 'Un filet de fleur d’oranger.' },
  { name: 'Velouté poireaux-pommes de terre', needs: ['poireau'], note: 'Simple, bon, efficace.' },
  { name: 'Carottes rôties au cumin', needs: ['carotte'], note: 'Avec un yaourt citronné.' },
  { name: 'Kiwis et clémentines à la vanille', needs: ['kiwi', 'clementine'], note: 'Un dessert vitaminé.' },
];

/** Contenu et idées de plats d'un panier pour un mois donné (1-12). */
export function basketFor(basket, month) {
  const list = inSeason(month);
  const fruits = list.filter((p) => p.kind === 'fruit').slice(0, basket.fruits);
  const veg = list.filter((p) => p.kind === 'legume').slice(0, basket.legumes);
  const items = [...veg, ...fruits].map((p) => ({ id: p.id, kind: p.kind, name: NAME[p.id] || p.name, qty: (QTY[p.id] || ['', ''])[basket.size] }));
  const have = new Set(items.map((x) => x.id));
  // Les plats faisables avec le panier : les plus complets d'abord, puis ceux des produits à
  // la saison la plus courte (les plus « du moment ») ; chacun apporte un produit nouveau
  const used = new Set();
  const recipes = [];
  const span = (r) => r.needs.reduce((t, id) => t + (byId[id]?.m.length || 12), 0) / r.needs.length;
  RECIPES
    .filter((r) => r.needs.every((id) => have.has(id)))
    .sort((a, b) => b.needs.length - a.needs.length || span(a) - span(b))
    .forEach((r) => {
      if (recipes.length < basket.recipes && r.needs.some((id) => !used.has(id))) {
        recipes.push(r);
        r.needs.forEach((id) => used.add(id));
      }
    });
  return { items, recipes };
}
