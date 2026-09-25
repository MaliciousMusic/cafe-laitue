// La carte du comptoir (prix : tableau mural de la boutique). Source des vues éclatées.

export const CATEGORIES = {
  cafes: ['expresso', 'cappuccino', 'v60', 'latte', 'flatwhite', 'matcha', 'chai'],
  jus: ['ace', 'detox', 'p2', 'ginger', 'surmesure'],
};

export const DRINKS = {
  expresso: {
    name: 'Expresso',
    price: '1,80 € · double 3 €',
    vessel: 'demitasse',
    hot: true,
    layers: [
      { k: 'espresso', h: 22, label: 'Expresso', sub: 'grains Kaduck, torréfiés à Clermont' },
      { k: 'crema', h: 6, label: 'Crème', sub: 'noisette, fine et dense' },
    ],
  },
  cappuccino: {
    name: 'Cappuccino',
    price: '3,50 €',
    vessel: 'cup',
    hot: true,
    layers: [
      { k: 'espresso', h: 18, label: 'Expresso', sub: 'grains Kaduck' },
      { k: 'milk', h: 20, label: 'Lait chaud', sub: 'chauffé à la vapeur' },
      { k: 'foam', h: 19, label: 'Mousse de lait', sub: 'épaisse et onctueuse' },
    ],
    garnish: { k: 'art', label: 'Latte art', sub: 'dessiné à la main' },
  },
  v60: {
    name: 'V60',
    price: '5 €',
    special: 'v60',
    hot: true,
    iced: true,
  },
  latte: {
    name: 'Latte',
    price: '4 €',
    vessel: 'glass',
    hot: true,
    layers: [
      { k: 'espresso', h: 20, label: 'Expresso', sub: 'grains Kaduck' },
      { k: 'milk', h: 62, label: 'Lait chauffé', sub: 'à la vapeur, velouté' },
      { k: 'foam', h: 13, label: 'Micro-mousse', sub: 'une fine couche' },
    ],
    garnish: { k: 'art', label: 'Latte art', sub: 'dessiné à la main' },
    icedVersion: {
      vessel: 'tall',
      layers: [
        { k: 'milkCold', h: 74, label: 'Lait froid', sub: 'bien frais' },
        { k: 'espresso', h: 28, label: 'Expresso', sub: 'versé sur la glace' },
      ],
      ice: { label: 'Glaçons', sub: 'beaucoup !' },
      garnish: { k: 'straw', label: 'Paille', sub: 'en papier' },
    },
  },
  flatwhite: {
    name: 'Flat white',
    price: '4 €',
    vessel: 'tulip',
    hot: true,
    layers: [
      { k: 'ristretto', h: 18, label: 'Double ristretto', sub: 'court et intense' },
      { k: 'milk', h: 27, label: 'Lait micro-moussé', sub: 'texture soyeuse' },
      { k: 'foam', h: 6, label: 'Fine mousse', sub: 'juste un voile' },
    ],
    garnish: { k: 'rosetta', label: 'Rosetta', sub: 'latte art' },
  },
  matcha: {
    name: 'Matcha latte',
    price: '4 €',
    vessel: 'glass',
    hot: true,
    layers: [
      { k: 'matcha', h: 22, label: 'Matcha', sub: 'thé vert fouetté' },
      { k: 'milk', h: 58, label: 'Lait', sub: 'chauffé à la vapeur' },
      { k: 'foam', h: 14, label: 'Mousse', sub: 'légère' },
    ],
    garnish: { k: 'art', color: '#8DB35A', label: 'Cœur matcha', sub: 'pour la gourmandise' },
    icedVersion: {
      vessel: 'tall',
      layers: [
        { k: 'milkCold', h: 76, label: 'Lait froid', sub: 'bien frais' },
        { k: 'matcha', h: 30, label: 'Matcha', sub: 'fouetté, versé sur la glace' },
      ],
      ice: { label: 'Glaçons', sub: 'beaucoup !' },
      garnish: { k: 'straw', label: 'Paille', sub: 'en papier' },
    },
  },
  chai: {
    name: 'Chai latte',
    price: '4 €',
    vessel: 'cup',
    hot: true,
    layers: [
      { k: 'chai', h: 22, label: 'Chai', sub: 'thé noir & épices douces' },
      { k: 'milk', h: 20, label: 'Lait chaud', sub: 'chauffé à la vapeur' },
      { k: 'foam', h: 16, label: 'Mousse', sub: 'onctueuse' },
    ],
    garnish: { k: 'cinnamon', label: 'Cannelle', sub: 'une pincée' },
    icedVersion: {
      vessel: 'tall',
      layers: [
        { k: 'milkCold', h: 70, label: 'Lait froid', sub: 'bien frais' },
        { k: 'chai', h: 32, label: 'Chai', sub: 'infusé, versé sur la glace' },
      ],
      ice: { label: 'Glaçons', sub: 'beaucoup !' },
      garnish: { k: 'straw', label: 'Paille', sub: 'en papier' },
    },
  },
  ace: {
    name: 'A.C.E.',
    price: '4 €',
    juice: true,
    vessel: 'juice',
    fruits: [
      { id: 'orange', label: 'Orange', sub: 'pressée minute' },
      { id: 'carotte', label: 'Carotte', sub: 'douce et sucrée' },
      { id: 'citron', label: 'Citron', sub: 'un trait de peps' },
    ],
    garnish: { k: 'wheel', color: '#F39A2D', label: 'Rondelle d’orange', sub: 'sur le verre' },
  },
  detox: {
    name: 'Détox',
    price: '4 €',
    juice: true,
    vessel: 'juice',
    fruits: [
      { id: 'pomme', label: 'Pomme', sub: 'croquante' },
      { id: 'carotte', label: 'Carotte', sub: 'douce et sucrée' },
      { id: 'citron', label: 'Citron', sub: 'un trait de peps' },
      { id: 'gingembre', label: 'Gingembre', sub: 'frais, ça pique un peu' },
    ],
    garnish: { k: 'wheel', color: '#F4D23C', label: 'Citron', sub: 'sur le verre' },
  },
  p2: {
    name: 'P²',
    price: '4 €',
    juice: true,
    vessel: 'juice',
    fruits: [
      { id: 'pomme', label: 'Pomme', sub: 'croquante' },
      { id: 'poire', label: 'Poire', sub: 'fondante' },
    ],
    garnish: { k: 'wheel', color: '#E8D27A', label: 'Tranche de pomme', sub: 'sur le verre' },
  },
  ginger: {
    name: 'Ginger shot',
    price: 'shot',
    juice: true,
    vessel: 'shot',
    fruits: [{ id: 'gingembre', label: 'Gingembre', sub: 'frais, pressé minute' }],
  },
  surmesure: {
    name: 'Jus sur demande',
    price: 'selon la saison',
    juice: true,
    vessel: 'juice',
    seasonal: true,
    fruits: [],
    garnish: { k: 'wheel', color: '#F5A55C', label: 'Fruit du moment', sub: 'sur le verre' },
  },
};

// Couleur du jus par fruit (moyennée pour les mélanges).
export const JUICE_COLOR = {
  orange: '#F4972E', carotte: '#F08A2A', pomme: '#E8D27A', poire: '#DCD46E', citron: '#F2DA5A',
  gingembre: '#E6C765', raisin: '#8C3B6E', peche: '#F5A55C', abricot: '#F4A13C', fraise: '#E0485A',
  melon: '#F3A35A', pasteque: '#EC6072', framboise: '#D8436A', prune: '#9A4A7A', kiwi: '#9BC24A',
  clementine: '#F59A30', figue: '#A8607A', myrtille: '#5A4E8E', cerise: '#B02A3E', coing: '#E3CB6A',
  rhubarbe: '#E07A8A',
};
