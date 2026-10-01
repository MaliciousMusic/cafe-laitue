// La carte du café (prix : tableau mural de la boutique). Source des vues éclatées et du
// procédé : chaque boisson liste ses étapes, que la scène joue dans le même ordre.

export const ORDER = ['expresso', 'cappuccino', 'v60', 'latte', 'flatwhite', 'matcha', 'chai'];

/** Étapes du procédé (libellés communs) ; `k` = ce que la scène anime. */
export const STEPS = {
  grind: 'Mouture',
  tamp: 'Tassage',
  extract: 'Extraction',
  milk: 'Lait',
  art: 'Latte art',
  ice: 'Glaçons',
  matcha: 'Matcha',
  infuse: 'Infusion',
  rinse: 'Rinçage',
  bloom: 'Bloom',
  pour: 'Versements',
};

const ICED_MILK = { k: 'milk', sub: 'lait froid, bien frais' };
const ICE = { k: 'ice', sub: 'beaucoup de glaçons' };
const V60 = [
  { k: 'rinse', sub: 'filtre rincé à l’eau chaude' },
  { k: 'grind', sub: 'mouture moyenne, à la minute' },
  { k: 'bloom', sub: 'le café gonfle et dégaze' },
  { k: 'pour', sub: 'versements lents, en spirale' },
];

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
    process: [
      { k: 'grind', sub: 'grains Kaduck moulus à la minute' },
      { k: 'tamp', sub: 'une galette bien régulière' },
      { k: 'extract', sub: 'court et intense, sous une crème noisette' },
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
    garnish: { k: 'art', label: 'Latte art', sub: 'versé à la main' },
    surface: 'coffee',
    process: [
      { k: 'grind', sub: 'moulu à la minute' },
      { k: 'extract', sub: 'un expresso, la base' },
      { k: 'milk', sub: 'chauffé à la vapeur, mousse épaisse' },
      { k: 'art', sub: 'versé à la main, motif surprise' },
    ],
  },
  v60: {
    name: 'V60',
    price: '5 €',
    special: 'v60',
    hot: true,
    iced: true,
    process: V60,
    icedProcess: [{ k: 'ice', sub: 'le café coule directement sur la glace' }, ...V60],
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
    garnish: { k: 'art', label: 'Latte art', sub: 'versé à la main' },
    surface: 'coffee',
    process: [
      { k: 'grind', sub: 'moulu à la minute' },
      { k: 'extract', sub: 'un expresso, la base' },
      { k: 'milk', sub: 'lait velouté, fine micro-mousse' },
      { k: 'art', sub: 'versé à la main, motif surprise' },
    ],
    icedVersion: {
      vessel: 'tall',
      layers: [
        { k: 'milkCold', h: 74, label: 'Lait froid', sub: 'bien frais' },
        { k: 'espresso', h: 28, label: 'Expresso', sub: 'versé sur la glace' },
      ],
      ice: { label: 'Glaçons', sub: 'beaucoup !' },
      garnish: { k: 'straw', label: 'Paille', sub: 'en papier' },
      process: [ICE, ICED_MILK, { k: 'grind', sub: 'moulu à la minute' }, { k: 'extract', sub: 'l’expresso coule sur la glace' }],
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
    garnish: { k: 'art', label: 'Latte art', sub: 'versé à la main' },
    surface: 'coffee',
    process: [
      { k: 'grind', sub: 'moulu à la minute' },
      { k: 'extract', sub: 'un double ristretto' },
      { k: 'milk', sub: 'micro-moussé, texture soyeuse' },
      { k: 'art', sub: 'versé à la main, motif surprise' },
    ],
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
    garnish: { k: 'art', label: 'Latte art', sub: 'lait sur matcha' },
    surface: 'matcha',
    process: [
      { k: 'matcha', sub: 'thé vert fouetté à l’eau chaude' },
      { k: 'milk', sub: 'chauffé à la vapeur' },
      { k: 'art', sub: 'versé à la main, motif surprise' },
    ],
    icedVersion: {
      vessel: 'tall',
      layers: [
        { k: 'milkCold', h: 76, label: 'Lait froid', sub: 'bien frais' },
        { k: 'matcha', h: 30, label: 'Matcha', sub: 'fouetté, versé sur la glace' },
      ],
      ice: { label: 'Glaçons', sub: 'beaucoup !' },
      garnish: { k: 'straw', label: 'Paille', sub: 'en papier' },
      process: [ICE, ICED_MILK, { k: 'matcha', sub: 'fouetté, versé sur la glace' }],
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
    garnish: { k: 'art', cinnamon: true, label: 'Latte art & cannelle', sub: 'une pincée' },
    surface: 'chai',
    process: [
      { k: 'infuse', sub: 'thé noir & épices douces' },
      { k: 'milk', sub: 'chauffé à la vapeur' },
      { k: 'art', sub: 'versé à la main, une pincée de cannelle' },
    ],
    icedVersion: {
      vessel: 'tall',
      layers: [
        { k: 'milkCold', h: 70, label: 'Lait froid', sub: 'bien frais' },
        { k: 'chai', h: 32, label: 'Chai', sub: 'infusé, versé sur la glace' },
      ],
      ice: { label: 'Glaçons', sub: 'beaucoup !' },
      garnish: { k: 'straw', label: 'Paille', sub: 'en papier' },
      process: [ICE, ICED_MILK, { k: 'infuse', sub: 'infusé, versé sur la glace' }],
    },
  },
};

/** Étapes d'une boisson, chaude ou glacée. */
export function processOf(id, iced = false) {
  const def = DRINKS[id];
  if (!def) return [];
  if (iced && def.icedVersion?.process) return def.icedVersion.process;
  if (iced && def.icedProcess) return def.icedProcess;
  return def.process || [];
}
