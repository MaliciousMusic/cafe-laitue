# Café Laitue — site vitrine & appli

Site vitrine « monobloc » pensé comme une petite appli mobile pour **Café Laitue**, primeur gourmet au 20 rue Ballainvilliers, Clermont-Ferrand.

- **Ouverture** : le logo s'assemble en grand au centre d'un **plateau de légumes** qui remplit l'écran (laitues, radis, poivrons, carottes, betteraves, herbes : comme la photo de l'enseigne) ; « Entrer » lance le **jingle**, les légumes **éclatent comme des bulles** du haut vers le bas, le logo danse sur les notes, tamponne, puis rétrécit jusqu'à sa place sur la devanture pendant que la boutique se construit, avec ses **petits bruits de chantier**. Une fois par visite ; `?intro` dans l'adresse le rejoue.
- **Accueil** : la devanture **reproduite d'après la photo** en SVG animé : immeuble clermontois (enduit crème, fenêtres en pierre de Volvic, persiennes), devanture vert amande sur deux niveaux (pilastres à chapiteaux, garde-corps en fonte, consoles), store banne à barre bordeaux, vitrines sombres (ampoules, logo, « Café de spécialité »), deux bacs en bois à roulettes garnis des produits du mois, ardoise, terrasse, arbres, et Vincent devant la porte ; elle se construit avec ses petits bruits de chantier. Puis la rue vit, avec des personnages dessinés aussi finement que Vincent (vêtements ombrés, coutures, plis, chaussures, visages de profil) et **articulés** : la marche est calculée pied par pied (le pied posé reste collé au trottoir), le corps monte et descend, les bras balancent, la queue-de-cheval et la jupe suivent. Une passante au cabas Café Laitue (baguette et poireau), un cycliste (panier de légumes), une maman et sa poussette, un monsieur à casquette avec son café à emporter, une passante en robe jaune ; en terrasse, une cliente en marinière boit son latte et un client son jus pressé, gorgée après gorgée. Un petit cycle de vent fait plier les arbres, frémir le store et le parasol, et tomber quelques feuilles. Puis le **tampon** qui s'assemble et la **typo rubanée** (lettres blanches sur ruban vert) qui défile.
- **Café** : la carte des cafés de spécialité façon lettres murales ; chaque boisson apparaît **en vue éclatée** (expresso, lait, mousse, glaçons…) puis **se prépare étape par étape** : grains moulus dans le porte-filtre, tassage, extraction sous la tête de groupe, lait versé au pichet. Le **procédé** s'affiche dessous et suit l'animation. Pour les cafés au lait, la caméra passe au-dessus de la tasse et **les mains de Vincent versent un latte art tiré au hasard** (cœur, cygne, tulipe ou rosette), avant son clin d'œil « Et voilà ! ». Versions glacées, V60 (rinçage, mouture, bloom, versements).
- **Étals** : l'intérieur de la boutique (briques, mur vert, vins, épicerie) avec 9 cagettes qui suivent **le mois choisi** ; toucher une cagette ouvre la fiche du produit. Dessous, les **paniers de saison à prix fixe** (duo, famille, gourmand) composés avec les produits du mois, avec des **idées de plats**.
- **Bar à jus** : en haut, **Vincent derrière son comptoir** presse les jus (le bras suit l'extracteur, le verre se remplit de la bonne couleur) ; en bas, **« Compose ton jus »** : 3, 5 ou 7 ingrédients parmi une quarantaine (fruits, légumes, aromates, épices), chacun avec ses **bienfaits** (allégations nutritionnelles autorisées), profil de goût, nom du jus, ticket à montrer au comptoir, et les classiques. Bascule vers la vraie photo de Vincent.
- **Fidélité** : une **carte en papier imprimée** façon fiche (un panier en osier à l'encre verte, « Nom », « Tél. », logo, compteur dans le coin) ; le client la **crée avec son nom et son numéro de téléphone**, écrits au stylo bille sur la carte (numéro en partie masqué). À chaque boisson, le primeur donne un **vrai coup de tampon** : un légume, **chacun de sa couleur d'encre** (bords irréguliers, manques d'encre), qui chevauche un peu les autres dans le panier ; le 10e tampon est le logo, boisson offerte. Validée par le **code du primeur** (6 chiffres).
- **Installation** : invitation à ajouter l'appli à l'**écran d'accueil** (PWA, fonctionne hors connexion) : petit bandeau sur téléphone, marche à suivre adaptée (iPhone, Android, navigateur d'Instagram/Facebook) et, sur ordinateur, un encart avec un **QR code** à scanner (généré dans la page, sans bibliothèque : il suit l'adresse de la balise canonical).
- **Petits sons** sur tout ce qui se touche (bulles des onglets, toc de la pancarte, tintements de la tasse qui s'assemble, filet de lait, plouf des fruits, xylophone des mois, « tchac » du tampon, murmure du primeur quand il parle…). Synthétisés dans le navigateur, sans fichier audio ; bouton haut-parleur en haut pour les couper. Sur iPhone, ils suivent le mode silencieux.

Aucune dépendance, aucun build : HTML + CSS + JavaScript (modules ES) + SVG généré.

## Lancer en local

```bash
python tools/dev-server.py
```

Puis ouvrir http://localhost:5173 (serveur sans cache). Le service worker est désactivé en local ; ajouter `?sw` à l'URL pour le tester.

## En ligne (GitHub Pages)

Le site est publié par GitHub Pages depuis la branche `main` de ce dépôt :
**https://maliciousmusic.github.io/cafe-laitue/**

Mettre à jour le site = pousser sur `main` (GitHub republie en une minute environ) :

```bash
git add -A
git commit -m "Mise à jour"
git push
```

Avant chaque publication, incrémenter `VERSION` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.

### Brancher un nom de domaine (recommandé)

Avec un domaine (ex. `cafelaitue.fr`), `robots.txt`, `sitemap.xml` et `llms.txt` sont servis à la racine, là où les moteurs et les IA les cherchent ; sur `github.io/cafe-laitue/` ils ne sont pas à la racine du domaine.

1. Chez le registrar : enregistrements `A` vers `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (et `CNAME www` → `maliciousmusic.github.io`).
2. Dans le dépôt : Settings → Pages → Custom domain, puis cocher « Enforce HTTPS ».
3. Mettre à jour les adresses SEO puis publier :
   ```bash
   node tools/set-domain.mjs https://www.cafelaitue.fr
   ```

### Code commerçant

Le code (6 chiffres) n'est pas écrit dans le dépôt : seule son empreinte est dans `assets/js/config.js`. **La démo utilise un code d'essai (000000) : à remplacer avant la mise en service.** Pour le changer :

```bash
node tools/set-pin.mjs 482193
```

Puis publier. Penser aussi à compléter `mentions-legales.html` (passages surlignés en jaune).

## Personnaliser

| Quoi | Où |
| --- | --- |
| Horaires, fermetures exceptionnelles, téléphone | `assets/js/config.js` **et** `index.html` (tableau + JSON-LD) **et** `llms.txt` |
| Carte et prix du café | `assets/js/data/drinks.js` **et** `index.html` (liste + JSON-LD) **et** `llms.txt` |
| Bar à jus : ingrédients, bienfaits, prix 3/5/7, classiques | `assets/js/data/juicebar.js` **et** `index.html` (boutons de prix + JSON-LD) **et** `llms.txt` |
| Paniers de saison : formats, prix, quantités, idées de plats | `assets/js/data/baskets.js` **et** `llms.txt` |
| Calendrier des saisons | `assets/js/data/season.js`, puis `node tools/gen-season.mjs` pour régénérer le tableau HTML |
| Règles de la carte fidélité (10 tampons, 5 max par passage) | `assets/js/config.js` (`LOYALTY`) |
| Icônes, favicon, image de partage | `python tools/render-assets.py` et `node tools/make-favicon.mjs` (Chrome requis) |
| Polices (hébergées sur le site) | `python tools/fetch-fonts.py` pour les re-télécharger |

Les fermetures (congés) s'ajoutent dans `SHOP.closures` : le statut « Ouvert / Fermé » et le panneau de la porte suivent automatiquement, à l'heure de Paris.

### Bienfaits des jus : règle à respecter

Les textes de bienfaits du bar à jus suivent le règlement européen sur les allégations de santé (CE 1924/2006) : un nutriment n'est cité que si l'ingrédient en apporte au moins 15 % des apports de référence pour 100 g, avec la formulation autorisée (« contribue à… »), et la mention sur l'alimentation variée et équilibrée reste affichée. Ne pas ajouter d'allégation « détox », « brûle-graisse », « booste l'immunité » ou de promesse médicale.

## Référencement local, SEO & GEO (IA)

Déjà en place :

- tout le contenu est **dans le HTML** (lisible sans JavaScript par Google et par les robots d'IA qui n'exécutent pas le JS) ;
- données structurées **schema.org** : `GroceryStore` + `CafeOrCoffeeShop`, horaires, coordonnées GPS, carte (`Menu`), FAQ, image, réseaux ;
- `llms.txt` : fiche de synthèse pour les assistants IA (ChatGPT, Claude, Perplexity, Gemini…) ;
- `robots.txt` qui autorise explicitement les robots des moteurs et des IA, `sitemap.xml` avec images ;
- balises Open Graph (image de partage 1200×630), géolocalisation, favicon, PWA.

À faire après la mise en ligne :

1. **Google Business Profile** : renseigner l'URL du site, vérifier que nom, adresse, téléphone et horaires sont **identiques** partout (site, fiche Google, Instagram, annuaires).
2. **Google Search Console** et **Bing Webmaster Tools** (Bing alimente aussi Copilot et la recherche de ChatGPT) : déclarer le site et le sitemap.
3. **Apple Business Connect** (Plans d'Apple, Siri).
4. Mettre le lien du site dans la bio Instagram.
5. Demander des **avis Google** (le bouton « Laisser un avis » y mène).
6. Obtenir des liens locaux : Kaduck Roaster, Atelier Bon, office de tourisme, presse locale.

## Carte de fidélité : fonctionnement et limites

- Le nom, le numéro de téléphone et les tampons sont stockés **dans le navigateur du client** : rien n'est envoyé, aucune donnée collectée, pas de bandeau cookies nécessaire.
- Le primeur valide avec son code : seule l'empreinte SHA-256 du code est publiée, 5 essais maximum puis blocage d'une minute, 5 tampons maximum par passage.
- Limite assumée d'une version sans serveur : un client très technique pourrait modifier sa carte, et vider les données du navigateur efface la carte. Pour une version infalsifiable (cartes nominatives, historique côté commerçant, plusieurs appareils), il faut un petit back-office (par exemple Supabase), à brancher sur `assets/js/screens/loyalty.js`.

## Structure

```
index.html              contenu complet + JSON-LD
mentions-legales.html   404.html   manifest.webmanifest   sw.js
robots.txt   sitemap.xml   llms.txt
assets/css/app.css      assets/css/fonts.css (polices locales)
assets/js/main.js       navigation, statut d'ouverture, feuilles, PWA
assets/js/lib/          animation, SVG, bandeaux défilants, sons (sound.js)
assets/js/config.js     données du commerce, règles fidélité
assets/js/data/         saisons, carte du café, bar à jus, paniers
assets/js/scenes/       tampon, ruban, personnage, boutique, étagères, verrerie, café, bar à jus, latte art
assets/js/screens/      un module par onglet
assets/img/  assets/icons/  assets/fonts/
tools/                  serveur local, code commerçant, domaine, saisons, icônes, polices
```

## Accessibilité & performance

- Navigation au clavier (onglets, flèches), focus visibles, libellés ARIA, contenu décoratif masqué aux lecteurs d'écran.
- `prefers-reduced-motion` respecté : animations coupées, tout reste lisible.
- Scènes chargées à la demande, animations en pause hors écran, photos WebP en deux tailles, préchargement des modules de l'accueil.

## Typographies

Lilita One, Patrick Hand SC, Caveat, Bricolage Grotesque — licence SIL Open Font License (textes dans `assets/fonts/LICENSE-*.txt`). Elles sont **hébergées sur le site** (`assets/fonts/`, sous-ensembles latin et latin étendu) : aucune requête vers Google au chargement des pages, donc aucun transfert d'adresse IP (RGPD). `python tools/fetch-fonts.py` les re-télécharge et régénère `assets/css/fonts.css`.
