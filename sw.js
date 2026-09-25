// Service worker Café Laitue : l'appli (et la carte fidélité) fonctionne hors connexion.
// Pensez à incrémenter VERSION à chaque mise en ligne.

const VERSION = 'cl-2026-09-26-1';

const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/fonts.css',
  'assets/css/app.css',
  'assets/fonts/bricolage-grotesque-400-800-latin.woff2',
  'assets/fonts/caveat-600-latin.woff2',
  'assets/fonts/lilita-one-400-latin.woff2',
  'assets/fonts/patrick-hand-sc-400-latin.woff2',
  'assets/js/main.js',
  'assets/js/config.js',
  'assets/js/lib/svg.js',
  'assets/js/lib/motion.js',
  'assets/js/lib/hscroll.js',
  'assets/js/lib/sound.js',
  'assets/js/data/season.js',
  'assets/js/data/drinks.js',
  'assets/js/features/hours.js',
  'assets/js/features/splash.js',
  'assets/js/scenes/stamp.js',
  'assets/js/scenes/ribbon.js',
  'assets/js/scenes/character.js',
  'assets/js/scenes/produce.js',
  'assets/js/scenes/storefront.js',
  'assets/js/scenes/shelves.js',
  'assets/js/scenes/portrait.js',
  'assets/js/scenes/drinks.js',
  'assets/js/scenes/latteart.js',
  'assets/js/scenes/backdrop.js',
  'assets/js/screens/home.js',
  'assets/js/screens/bar.js',
  'assets/js/screens/stalls.js',
  'assets/js/screens/owner.js',
  'assets/js/screens/loyalty.js',
  'assets/icons/favicon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/apple-touch-icon.png',
  'assets/img/primeur-portrait-540.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // cache: 'reload' : ne pas recopier d'anciens fichiers restés dans le cache HTTP
      .then((cache) => cache.addAll(CORE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cl-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pages : réseau d'abord (contenu frais, revalidé), cache en secours.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('index.html'))),
    );
    return;
  }


  // Code du site (JS, CSS, manifeste) : réseau d'abord lui aussi, pour que page et code
  // restent de la même version après une mise en ligne ; cache si hors connexion.
  if (url.origin === self.location.origin && /\.(m?js|css|json|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // Polices et images : cache immédiat + mise à jour en arrière-plan.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(req).then((hit) => {
          const net = fetch(req)
            .then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(() => hit);
          return hit || net;
        }),
      ),
    );
  }
});
