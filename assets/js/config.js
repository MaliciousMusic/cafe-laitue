// Données du commerce — source unique pour le JavaScript.
// (Le HTML statique, llms.txt et le JSON-LD reprennent les mêmes informations : pensez à tout mettre à jour ensemble.)

export const SHOP = {
  name: 'Café Laitue',
  tagline: 'Primeur gourmet',
  street: '20 rue Ballainvilliers',
  postalCode: '63000',
  city: 'Clermont-Ferrand',
  phone: '04 73 92 16 42',
  phoneIntl: '+33473921642',
  instagram: 'https://www.instagram.com/cafe.laitue/',
  geo: { lat: 45.7754452, lng: 3.0865071 },
  mapsPlace: 'https://maps.google.com/?cid=11650842022247132401',
  timezone: 'Europe/Paris',
  // 0 = dimanche … 6 = samedi. Plusieurs plages possibles par jour.
  hours: {
    0: [],
    1: [['14:00', '19:30']],
    2: [['08:00', '19:30']],
    3: [['08:00', '19:30']],
    4: [['08:00', '19:30']],
    5: [['08:00', '19:30']],
    6: [['08:00', '19:30']],
  },
  // Fermetures exceptionnelles (dates incluses, format AAAA-MM-JJ).
  // Exemple : { from: '2027-08-02', to: '2027-08-16', label: 'Congés d’été' }
  closures: [],
};

export const LOYALTY = {
  goal: 10, // nombre de tampons pour une récompense
  reward: 'une boisson offerte',
  rewardDetail: 'café ou jus au choix',
  // Code commerçant (4 chiffres) : SHA-256 de `${salt}:${code}`. Changer avec : node tools/set-pin.mjs 1234
  salt: 'cafe-laitue',
  pinHash: '8ab2493ba0775ddf3c6d6e65d14305f1cda4db7c473382988b328514eee743d4',
  maxPerVisit: 5,
};
