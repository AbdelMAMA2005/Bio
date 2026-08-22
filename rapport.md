# PlanAI — Rapport d'intégration front/back post-merge (21/07/2026)

> Contexte : merge de la branche `backend` (Abdel) dans le front (`master`). Ce rapport
> couvre la réparation du bundler, l'alignement front/back, les bugs trouvés et corrigés,
> les tests ajoutés et l'état de complétude par fonctionnalité. Aucun commit/push git
> n'a été effectué — toutes les modifications sont dans l'arbre de travail.

---

## -10. Session du 25/07/2026 (suite) — Bouton "+" story retiré, conseils d'entretien traduits en français, page détail conseil

> Demande de Djawad : 6 points, dont plusieurs recoupent des fonctionnalités déjà livrées en
> §-9/§-8 (défilement stories, expiration 24h, zoom plein écran Mon Quotidien) — revérifiées
> ci-dessous plutôt que réimplémentées, pour ne pas dupliquer du travail déjà fait. Les 3
> points réellement nouveaux : retrait du bouton "+" du header Communauté, traduction FR des
> conseils d'entretien (bug réel, diagnostiqué ci-dessous), troncature "… plus" avec page
> dédiée par conseil.

### -10.1 Stories : défilement + expiration 24h — déjà livrés, revérifiés sans régression

- `StoryViewer.tsx` (§-8.4) implémente déjà l'enchaînement automatique média→média puis
  bulle→bulle, le tap gauche/droite, et les barres de progression segmentées une par média —
  revérifié intact, toujours branché depuis `CommunityScreen.tsx`.
- Côté back, `StoriesService#getGroupedStories` filtre déjà les médias expirés en SQL
  (`WHERE s.dateExpiration > :now`) — revérifié intact. Pas de job de purge en base (les
  lignes expirées restent en base mais invisibles, décision déjà actée en §-8) : l'énoncé de
  cette session acceptait "filtrer/purger" (alternative), la lecture filtrée suffit au
  comportement demandé — une story disparaît bien de l'app 24h après publication.
- Aucun changement de code sur ces deux points.

### -10.2 Bouton "+" retiré du header Communauté

`CommunityScreen.tsx` : suppression du bouton "+" (dégradé, à côté du titre "Le Jardin") qui
ouvrait `StoryActionSheet` en doublon de la bulle "Ta story" (qui remplit déjà ce rôle : tap
sur la bulle vide = ajouter une première story, badge "+" superposé une fois qu'elle a du
contenu — voir `StoryBubble.tsx`, `onPressAdd`). Le FAB en bas à droite (`add_a_photo`,
création d'une **publication**, mécanisme distinct) n'est pas concerné. Imports/styles
devenus inutiles (`LinearGradient`, `AccentGradient`, `styles.addButton`) retirés au passage.

### -10.3 Zoom plein écran Mon Quotidien — déjà livré (§-9.1), revérifié intact

`ImageViewerModal` reste branché sur la vignette héro de `CloneCard.tsx` et la galerie
`PhotoTimeline.tsx`, avec pinch-to-zoom + pan actifs. Revérifié par lecture directe du code
(les deux points de câblage existent toujours) — aucune régression, aucun changement
nécessaire.

### -10.4 Conseils d'entretien traduits en français (bug réel, diagnostiqué)

- **Cause identifiée** : `apps/api/.../identification.service.ts` demande bien
  `language=fr` à Plant.id, mais ce paramètre ne traduit que les noms d'espèce/la
  description chez Plant.id — **pas** les champs catégoriels `best_light_condition` /
  `best_soil_type` / `propagation_methods`, renvoyés en anglais brut quelle que soit la
  langue demandée (vérifié en lisant le code d'assignation : `lumiere`/`sol`/
  `multiplication` copient ces champs sans traduction). `arrosage`, en revanche, est déjà
  calculé en français côté back (`common/watering.ts`, échelle structurée → "Faible" /
  "Modéré" / "Abondant") — n'était donc pas réellement en cause, contrairement à l'énoncé
  initial de Djawad (probablement une observation globale de la grille, 3 cases sur 4 en
  anglais suffisant à donner cette impression).
- **Choix d'architecture — traduction côté front, pas back** : `Plante.conseilsEntretien`
  n'a qu'UNE version en base par espèce (pas de colonne par langue) ; une traduction back
  figée en français casserait l'affichage pour un utilisateur en anglais. Nouveau fichier
  `apps/mobile/src/utils/careTranslation.ts#translateCareAdvice(care, language)`, appliqué
  dans `PlantDetailScreen.tsx` juste après `parseConseilsEntretien` — no-op si
  `language !== 'fr'` (l'anglais Plant.id est déjà correct pour une UI anglaise). Avantage
  supplémentaire : corrige aussi immédiatement les fiches déjà en cache en base (anglais),
  sans attendre un nouvel appel Plant.id — pas de "backfill paresseux" à subir ici,
  contrairement à `aPropos`/`urlImage` (voir sessions précédentes).
- **Méthode de traduction** : dictionnaire heuristique du vocabulaire horticole Plant.id le
  plus courant (lumière/sol : ~25 termes chacun ; multiplication : ~20 méthodes, vocabulaire
  fermé), remplacement des phrases les plus longues d'abord (pour matcher "rich in organic
  matter" avant "organic matter"). **Limite assumée et documentée plutôt que masquée** :
  c'est une substitution mot-à-mot/phrase, pas une vraie traduction NLP — l'ordre des mots
  n'est pas toujours idiomatique en français pour une tournure non anticipée (ex. vérifié par
  test : "Well-drained soil rich in organic matter" → "bien drainé sol riche en matière
  organique" — compréhensible mais pas parfaitement naturel) ; toute tournure hors
  dictionnaire reste affichée en anglais plutôt que traduite au hasard. Une vraie API de
  traduction (DeepL, Google Translate) donnerait un résultat plus naturel mais nécessite une
  clé/un coût non demandés dans cette session — piste pour plus tard si la couverture
  actuelle s'avère insuffisante en pratique.
- Espagnol (`es`) : mécanisme générique (`translateCareAdvice` prend la langue en paramètre)
  mais **pas de dictionnaire ES pour l'instant** — repli sur l'anglais brut. Non demandé
  explicitement par Djawad (seul le français était signalé en défaut), mais documenté ici
  comme limite connue plutôt que silencieuse.
- Tests unitaires ajoutés : `src/utils/__tests__/careTranslation.test.ts` (6 cas : traduction
  fr, `arrosage` jamais touché, `en`/`es` inchangés, repli "—" préservé, phrase non couverte
  laissée telle quelle).

### -10.5 Troncature "… plus" → page dédiée par conseil

- `PlantDetailScreen.tsx` : chaque valeur de la grille de conseils (lumière/sol/arrosage/
  multiplication) tronquée à 60 caractères avec "…" suivi d'un lien "plus" (nouvelle clé i18n
  `plant.care.more`, fr/en/es) quand elle dépasse ce seuil. Tap sur "plus" → nouvelle route
  `app/conseil/[type].tsx` (enregistrée dans le Stack racine, `_layout.tsx`), qui affiche
  `CareDetailScreen.tsx` (nouveau composant) : icône + libellé + texte complet du conseil,
  bouton retour. Texte transmis en paramètre de route (`text`), pas de nouvel endpoint ni de
  state global nécessaire — la donnée est déjà entièrement côté client à ce stade (post-
  traduction §-10.4).

### -10.6 État de vérification

- `tsc --noEmit` : 0 erreur. `jest` (mobile) : 100/100 (94 précédents + 6 nouveaux tests
  `careTranslation`). `expo lint` : 0 erreur (3 warnings préexistants, sans rapport avec
  cette session).
- **Non vérifié visuellement sur device** : contrairement à §-9, les changements de cette
  session sont purement JS (aucune nouvelle dépendance native) — un simple rechargement du
  bundle (`npx expo start --dev-client`) suffit à les voir apparaître sur le téléphone de
  Djawad, **pas besoin d'un nouveau build EAS**.

---

## -9. Session du 25/07/2026 — Visualiseur plein écran, partage natif du feed, clavier qui masque l'input de commentaire

> Demande de Djawad : trois améliorations front indépendantes de la couche donnée réelle
> (aucun endpoint `apps/api` requis) — (1) visualiseur plein écran réutilisable avec
> pinch-to-zoom, pour la vignette d'un clone (Mon Quotidien) et sa galerie de photos de suivi ;
> (2) bouton "Partager" fonctionnel sur le feed communauté (feuille de partage native) ;
> (3) correction du clavier qui recouvre le champ de saisie de `CommentsSheet`. Vérification
> bout-en-bout demandée ; voir §-9.4 pour ce qui reste à confirmer sur device (rebuild EAS
> requis, voir §-9.5).

### -9.1 Visualiseur plein écran (`ImageViewerModal`)

- Nouveau composant réutilisable : `apps/mobile/src/components/ImageViewerModal.tsx`. Reçoit
  `images: { uri, date? }[]` + `initialIndex` + `onClose` — une seule image (vignette héro
  d'un clone) ou plusieurs (galerie de photos de suivi, mode paginé horizontal).
  - Fond sombre plein écran (`Palette.dark`, indépendant du thème courant de l'app — même
    principe que `StoryViewer.tsx`, déjà construit ainsi pour les stories), `StatusBar`
    masquée pendant l'affichage.
  - Pinch-to-zoom + pan quand zoomé (`Gesture.Pinch` + `Gesture.Pan`, Reanimated), borné à
    1x–4x, retour automatique à 1x si relâché sous le seuil de zoom.
  - Fermeture par swipe bas (seuil 100px, désactivé pendant un zoom actif pour ne pas
    interférer avec le pan de l'image) ou bouton retour matériel Android
    (`Modal.onRequestClose`, même mécanisme que `StoryViewer`/`CommentsSheet`).
  - Mode galerie : `FlatList` horizontale paginée, dont le scroll natif est désactivé
    (`scrollEnabled={false}`) pendant qu'une photo est zoomée pour éviter un conflit de
    gestes pan-vs-swipe-page ; compteur "n / total" + date de la photo active
    (`formatRelativeDate`) affichés en overlay.
- Câblé aux deux endroits demandés (Mon Jardin > Mon Quotidien) :
  - `CloneCard.tsx` : la vignette héro devient un `Pressable` (désactivé si ni photo réelle
    ni image catalogue disponible — l'icône de repli n'ouvre rien) ouvrant le visualiseur en
    mode image unique.
  - `PhotoTimeline.tsx` : chaque miniature ouvre désormais la galerie complète, positionnée
    sur la photo tapée, avec la date de chaque photo affichée en défilant.
- Aucune nouvelle dépendance native : construit sur `react-native-gesture-handler` et
  `react-native-reanimated`, déjà présents dans le projet (utilisés par `StoryViewer.tsx`) —
  pas de rebuild EAS requis pour cette partie spécifiquement, contrairement à -9.2/-9.3.

### -9.2 Partage natif du feed (`sharePost.ts`)

- Nouveau helper `apps/mobile/src/features/feed/sharePost.ts`, appelé depuis le bouton
  "Partager" de `PostCard.tsx` (jusqu'ici affiché sans `onPress`, purement décoratif) via
  `CommunityScreen.tsx#handleShare`.
- Deux nouvelles dépendances natives : `expo-sharing` + `expo-file-system` (aucune des deux
  n'était installée). **`expo-file-system` a changé d'API en SDK 54** (voir `AGENTS.md`,
  "Expo HAS CHANGED") : l'ancienne `FileSystem.downloadAsync` est dépréciée et lève désormais
  une erreur à l'exécution si on l'utilise — le nouveau code utilise l'API "next" du paquet
  installé (`File.downloadFileAsync`, `Paths.cache`), vérifiée directement dans les `.d.ts`
  livrés plutôt que supposée depuis une doc potentiellement obsolète.
- Comportement :
  - Post avec image : téléchargée dans le cache local (`expo-sharing` n'accepte pas d'URL
    distante), puis proposée via `Sharing.shareAsync()` — ouvre la feuille système avec les
    apps installées capables de recevoir une image (WhatsApp, Instagram, Snapchat, etc.).
  - Post texte seul (pas d'image) : repli sur `Share.share()` (API cœur React Native, aucune
    dépendance) avec le texte de la légende.
  - Annulation par l'utilisateur : résout normalement (`'cancelled'`), ne lève jamais — gérée
    silencieusement par `CommunityScreen`. Un échec réel (téléchargement impossible, aucune
    app cible) lève une erreur, affichée via un toast (`community.shareErrorTitle`/`Sub`,
    nouvelles clés i18n fr/en/es).
  - Indicateur de chargement sur le bouton pendant le téléchargement/partage
    (`sharingPostId`, même pattern que `checkingHealth`/`addComment.isPending` ailleurs dans
    le code).
- **Limite connue, documentée plutôt que masquée** : `Sharing.shareAsync()` n'a pas de
  paramètre "texte" séparé de l'image sur cette API (ni iOS ni Android) — quand un post a une
  image, sa légende ne voyage donc **pas** avec elle dans la feuille de partage (seule
  l'image est transmise). Une alternative pour lier texte+image dans un même intent
  (`react-native-share`, tierce, non demandée explicitement) a été délibérément écartée pour
  rester sur les deux briques citées par Djawad (`expo-sharing` / `Share` RN). Pas de lien
  vers le post inclus : aucune route de détail de post (`/post/[id]`) n'existe côté front
  pour l'instant — un lien aurait été un artefact non fonctionnel plutôt qu'une vraie
  fonctionnalité.

### -9.3 Clavier qui masquait l'input de commentaire (`CommentsSheet.tsx`)

- Le correctif précédent (listener manuel `Keyboard.addListener('keyboardDidShow', …)` +
  `marginBottom` calculé à la main, avec un commentaire citant `facebook/react-native#20303`)
  était déjà une tentative consciente de contourner le bug connu "`Modal` Android + clavier"
  — toujours insuffisant d'après le retour de Djawad. Remplacé par
  `react-native-keyboard-controller` (suggéré explicitement dans la demande), qui suit le
  clavier nativement (indépendant du bridge JS, conçu spécifiquement pour ce cas `Modal` +
  clavier) plutôt que de rejouer les événements `Keyboard` à la main.
- `KeyboardProvider` (requis par la lib) ajouté à la racine de l'app,
  `apps/mobile/src/app/_layout.tsx`, à l'intérieur de `GestureHandlerRootView`.
- `CommentsSheet.tsx` : `KeyboardAvoidingView` importé désormais de
  `react-native-keyboard-controller` (plus `react-native`), `behavior="padding"` unique pour
  les deux plateformes (la lib gère la mesure native du clavier, contrairement à l'API cœur
  React Native qui ne reçoit pas les événements de resize d'un `Modal` sur Android). Le hack
  `androidKeyboardHeight`/listener manuel est supprimé entièrement — code plus court, plus
  fiable.
- Nouvelle dépendance native (`react-native-keyboard-controller`), pas de plugin Expo requis
  (autolinking standard).

### -9.4 État de vérification

- `tsc --noEmit` : 0 erreur. `jest` (mobile) : 94/94 (dont `CloneCard.test.tsx`, qui importe
  désormais `ImageViewerModal` → `react-native-gesture-handler`/`reanimated` sans casser le
  mock `jest-expo`). `expo lint` : 0 erreur (3 warnings préexistants, sans rapport avec cette
  session).
- **Non vérifié sur device** au moment de la rédaction : les trois fonctionnalités touchent
  des modules natifs (`expo-sharing`, `expo-file-system`, `react-native-keyboard-controller`)
  absents du dernier build EAS installé sur le téléphone de Djawad (celui du correctif
  `usesCleartextTraffic`, session précédente) — **un nouveau build EAS est nécessaire avant
  de pouvoir tester quoi que ce soit de cette session sur device**. Tap plein écran +
  pinch-zoom + swipe galerie, feuille de partage réelle, et confort clavier restent donc à
  confirmer visuellement une fois ce build installé.

### -9.5 Prochaine étape

Lancer un nouveau build EAS (`eas build --platform android --profile development`) incluant
ces trois nouvelles dépendances natives, puis reprendre la vérification bout-en-bout (§-9.4)
sur le téléphone une fois installé.

---

## -8. Session du 24/07/2026 (suite) — Stories réécrites façon "statuts WhatsApp" (multi-médias, lecture plein écran, vues réelles)

> Demande de Djawad : refaire les stories (introduites en §-7 ci-dessous sous une forme "une
> bulle = un média") pour qu'elles se comportent **exactement comme les statuts WhatsApp**,
> avec de vraies données du backend et zéro mock. 5 comportements numérotés : (1) plusieurs
> médias par bulle, empilés dans "ma story" du jour ; (2) lecture plein écran enchaînée avec
> barres de progression segmentées, tap gauche/droite, appui long = pause, swipe bas = fermer ;
> (3) "Ma story" affiche le nombre + la liste des personnes ayant vu chaque média ; (4) une
> vue réelle et unique par (personne, média), persistée en base ; (5) expiration 24h + tri
> non-vues d'abord + anneau dégradé sur bulle partiellement vue. Vérification bout-en-bout
> explicitement demandée avant de considérer la tâche terminée.

### -8.1 Pourquoi §-7 ne suffisait pas

Le modèle de §-7 (une entité `Story` = une bulle affichée) ne pouvait pas représenter
"plusieurs médias empilés sous une bulle" ni "qui a vu quel média" : il manquait à la fois le
regroupement par auteur et toute notion de vue individuelle. Plutôt que de faire évoluer ce
modèle en place, il a été étendu (voir -8.2) sans rien retirer de ce qui marchait déjà
(upload réel sur disque, expiration `+24h` exacte).

### -8.2 Modèle de données — décision : un média = une ligne, regroupement à la lecture

- **`Story` étendue** : ajout de la colonne `mediaType` (`'image' | 'video'`, détectée depuis
  le `mimetype` du fichier reçu). Chaque média garde sa **propre** `dateExpiration` (`+24h` à
  sa création) — comme sur WhatsApp, où les statuts d'un même jour n'expirent pas tous à la
  même seconde.
- **Nouvelle entité `StoryView`** (`storyId` + `viewerId`, contrainte unique) : une seule vue
  par personne et par média, jamais dupliquée même si l'appelant revoit le média plusieurs
  fois (`POST /stories/:mediaId/view` idempotent, vérifié §-8.6).
- **Le regroupement en bulles par auteur se fait à la lecture** (`StoriesService#
  getGroupedStories`), **pas** via une table de groupe dédiée : plus simple, et surtout
  correct pour l'expiration indépendante par média — une table de groupe aurait forcé un choix
  arbitraire ("la bulle expire quand ?" — au premier média expiré ? au dernier ?) que WhatsApp
  lui-même ne fait pas.
- `GET /stories` renvoie donc des `StoryGroupDto` (un par auteur ayant au moins un média
  actif), chacun avec `medias: StoryMediaDto[]`, `estMoi`, `entierementVue` (tous les médias
  vus par l'appelant) — remplace la forme "à plat" de §-7. `POST /stories` reste inchangée en
  forme de réponse (un seul média créé), mais s'empile désormais dans la bulle existante de
  l'auteur au lieu d'être la seule story affichée.

### -8.3 Nouveaux endpoints

| Endpoint | Rôle |
|---|---|
| `GET /stories` | Bulles groupées par auteur, triées "au moins un média non vu" d'abord (activité la plus récente en tête), puis bulles entièrement vues |
| `POST /stories` | Ajoute un média à la story du jour de l'appelant (inchangé en forme, nouveau comportement d'empilement) |
| `POST /stories/:mediaId/view` | Enregistre une vue — 204, idempotent, sans effet si l'appelant est l'auteur (jamais de vue sur son propre contenu) |
| `GET /stories/:mediaId/viewers` | Liste "vu par" d'un média — réservée à son auteur (403 sinon), triée vue la plus récente en premier |

Voir `API_CONTRACT.md` §5 pour la forme JSON complète et `ARCHITECTURE.md` pour les tables
`stories`/`story_views` mises à jour (les deux documents ont été corrigés pour refléter cette
réécriture — ils décrivaient encore la forme "à plat" de §-7).

### -8.4 Ce qui a été ajouté côté front

- **`StoryViewer.tsx`** (nouveau) : visualiseur plein écran Reanimated — barres de progression
  segmentées (une par média de la bulle courante, `useAnimatedStyle` sur un composant dédié
  par segment, pas un appel de hook dans une boucle `.map()`), avance automatique média→média
  puis bulle→bulle, tap gauche (35% de l'écran) = précédent, tap droite = suivant, appui long
  (`Gesture.LongPress`, 180ms) = vraie pause/reprise (le temps déjà écoulé est conservé, pas
  un redémarrage à 0 — `useStoryProgress`), swipe bas > 90px = fermeture. Ouvre la bulle sur
  son premier média **non vu** (`firstUnseenIndex`), pas systématiquement le premier.
- **`StoryViewersSheet.tsx`** (nouveau) : bottom sheet "vu par N" ouvert depuis une poignée en
  bas du visualiseur, visible uniquement quand `group.estMoi` — liste réelle
  (`GET /stories/:mediaId/viewers`), jamais affichée sur la story de quelqu'un d'autre.
- **`StoryBubble.tsx`** : anneau dégradé (`StoryGradient`) si `seen` est faux, anneau neutre
  sinon — reflète `entierementVue` du groupe, pas un flag par bulle inventé côté front.
  Badge "+" superposé uniquement sur "Ta story" quand elle a déjà du contenu (`onPressAdd`).
- **`useFeed.ts`** : `useStories()` (groupes), `usePublishStoryMedia()` (empile un média),
  `useRecordStoryView()` (invalide `stories` pour que l'anneau/`vuParMoi` réagissent tout de
  suite), `useStoryViewers(mediaId)`.
- **`CommunityScreen.tsx`** : "Ta story" séparée du défilement horizontal des autres bulles
  (jamais dupliquée), ouvre le visualiseur sur `[myStory]` seul ou sur `otherStories` selon la
  bulle tapée.
- **`packages/shared`** : `StoryMediaType`, `StoryMedia`, `StoryGroup`, `StoryViewer` exportés
  — types communs front/back pour cette forme groupée.

### -8.5 Décision de scope : vidéo non branchée cette passe

Le modèle (`mediaType`) et le cahier des charges ("photos/vidéos") prévoient la vidéo, mais
**`POST /stories` n'accepte en pratique que des images** : le `FileTypeValidator` du
contrôleur (`jpg/jpeg/png/webp`) rejette tout fichier vidéo (vérifié §-8.6 : upload d'un
`.mp4` → 400). Décision prise **avec Djawad** en cours de session plutôt qu'un oubli silencieux
: activer la vidéo demande d'installer une nouvelle dépendance native (`expo-video`, absente
de `package.json`, aucune lib de lecture vidéo installée côté mobile) et de rebrancher
caméra/galerie sur les deux types — changement à risque non testable sans device dans cet
environnement. `StoryViewer.tsx` affiche donc la première frame d'un média vidéo comme une
image plutôt que de simuler une lecture (commentaire explicite dans le code). La branche
vidéo de `StoriesService#createStoryMedia` reste en place (code mort tant que le contrôleur
bloque ces fichiers) pour ne pas avoir à retoucher le modèle de données le jour où elle sera
activée.

### -8.6 Vérification bout-en-bout avec de vraies données (serveur réel, Postgres réel, pas les tests unitaires)

Tests unitaires d'abord : **122/122 back** (dont `stories.service.spec.ts`, 13 tests couvrant
regroupement, tri, `vuParMoi`/`vuesCount`, idempotence des vues, confidentialité de
`getViewers`), **94/94 front**, `tsc --noEmit` propre sur les deux apps. Puis vérification
réelle contre le serveur `nest start --watch` déjà en cours d'exécution (donc avec le code de
cette session chargé), deux comptes réels créés via `POST /auth/register` :

1. **Empilement multi-médias** — 2 `POST /stories` (vraies images, ~630 octets chacune) par le
   même compte → `GET /stories` par l'autre compte renvoie **1 seule bulle** avec
   `medias.length === 2`, chacun avec sa propre `dateExpiration` à `+24h` exacte. Fichiers
   confirmés servis en HTTP 200 (`/uploads/stories/...`).
2. **Vue réelle et idempotente** — `POST /stories/:mediaId/view` par le second compte → `204`,
   rejoué une seconde fois → toujours `204` sans doublon (`getViewers` renvoie 1 seule entrée,
   pas 2). Le même appel fait par l'auteur sur son propre média → `204` mais **aucune ligne
   créée** (`getViewers` ne le liste jamais).
3. **Confidentialité des vues** — `GET /stories/:mediaId/viewers` par l'auteur → liste réelle
   (1 vue, vrai `username`, vrai `dateVue`). Même appel par le viewer (pas l'auteur) →
   **403** `Forbidden`, pas une liste vide silencieuse.
4. **Propagation `vuParMoi`/`vuesCount`** — après la vue, `GET /stories` recalculé pour le
   viewer montre `vuParMoi: true, vuesCount: 1` sur le média vu, `vuParMoi: false, vuesCount: 0`
   sur l'autre média de la même bulle (pas de propagation incorrecte au niveau bulle). Côté
   auteur, `GET /stories` sur sa propre bulle montre `estMoi: true`, `entierementVue: true` et
   `vuParMoi: true` sur les deux médias (un auteur "a toujours vu" son propre contenu) — avec
   le vrai `vuesCount: 1` reçu correctement transmis pour le média effectivement vu.
5. **Expiration 24h par média (pas par bulle)** — expiration forcée en base (`UPDATE stories
   SET "dateExpiration" = now() - interval '1 minute'`) sur un seul des deux médias de la
   bulle → `GET /stories` suivant ne renvoie plus que le média encore actif
   (`medias.length === 1`), et `entierementVue` repasse à `true` puisque le seul média restant
   avait déjà été vu — confirme que l'expiration est bien évaluée média par média, pas au
   niveau de la bulle entière.
6. **Vidéo honnêtement rejetée** — `POST /stories` avec un fichier `.mp4` → `400 Bad Request`
   explicite (`"current file type is video/mp4, expected type is ..."`), pas un succès
   silencieux qui aurait ensuite affiché une image cassée côté front.

### -8.7 État de complétude par exigence

| Exigence (énoncé de Djawad) | État | Preuve |
|---|---|---|
| 1. Plusieurs médias/story → une seule bulle, empilement dans "ma story" | ✅ | §-8.6.1 (2 médias réels, 1 bulle) |
| 2. Lecture plein écran enchaînée, progression segmentée, gestes (tap/appui long/swipe) | ✅ | `StoryViewer.tsx`, §-8.4 — non vérifiable visuellement sans device/simulateur dans cet environnement, revue de code uniquement pour la partie gestuelle |
| 3. "Ma story" : médias + nombre/liste des vues par média | ✅ | `StoryViewersSheet.tsx` + §-8.6.3-4 |
| 4. Vue réelle, unique par (personne, média), persistée | ✅ | §-8.6.2 (idempotence vérifiée par un vrai doublon d'appel) |
| 5. Expiration 24h + tri non-vues d'abord + anneau dégradé | ✅ | §-8.6.5 (expiration par média) + tests unitaires de tri (`stories.service.spec.ts`) |
| Vidéo (mentionnée au cahier des charges) | 🚧 **Hors scope, assumé** | Décision prise avec Djawad, §-8.5 — rejet propre vérifié §-8.6.6, pas un mock qui ferait semblant |

### -8.8 Limite honnête

Le visualiseur plein écran (gestes, animation de progression, pause) n'a été vérifié que par
lecture de code + tests unitaires du service back — aucun simulateur/device Expo n'était
disponible dans cet environnement pour une vérification visuelle réelle (comme cela avait pu
être fait partiellement en §-4bis pour une autre fonctionnalité). Toute la partie données
(regroupement, vues, expiration, confidentialité) a en revanche été vérifiée avec de vraies
requêtes HTTP contre un serveur réel, pas seulement des tests unitaires mockés.

---

## -7. Session du 24/07/2026 — Communauté 100 % réelle (fil d'actualité, "Près de moi", posts, likes, commentaires, stories)

> Demande de Djawad : rendre toute la partie Communauté fonctionnelle avec les vraies données
> du backend, zéro mock/fixture, conforme au cahier des charges §Communauté, à `TODO.md` et à
> `API_CONTRACT.md`. 5 exigences numérotées (fil réel, filtre "Près de moi" réel, publication
> avec vraie photo, likes/commentaires réels, stories réelles 24h). Vérification bout-en-bout
> avec de vraies données explicitement demandée avant de considérer la tâche terminée.

### -7.1 Audit initial : où étaient les vrais écarts

| Sous-fonctionnalité | État avant cette session |
|---|---|
| `GET /feed` | Déjà réel côté back, déjà branché côté front |
| Filtre "Près de moi" | Réel côté back (`distanceMetres`) mais **filtrage fait côté client** (`CommunityScreen.tsx`, seuil fixe), donc pouvait rater des posts proches hors de la première page |
| `POST /feed/posts` | Texte + `collectionId` seulement — **aucune photo réelle envoyée**, malgré un composeur qui en capture une |
| Likes | Déjà réel |
| Commentaires | Endpoints back déjà prêts (`GET/POST /feed/posts/:id/comments`) mais **aucune UI front** — écart le plus silencieux, invisible sans lire le back |
| Stories | **100 % mockées** (`api/mock/store.ts`), aucune entité, aucun endpoint côté back — écart le plus important |

### -7.2 Ce qui a été ajouté côté back

- **Nouveau module `stories`** (`apps/api/src/modules/stories/`) : entité `Story` dédiée
  (`userId`, `urlMedia`, `dateCreation`, `dateExpiration`), service (`getActiveStories` filtre
  `dateExpiration > maintenant`, `createStory` écrit le fichier réel sur disque et fixe
  l'expiration à `+24h` exactement), contrôleur (`GET/POST /stories`, upload multipart validé
  5 Mo / jpg-jpeg-png-webp comme le reste de l'app).
- **`GET /feed`** : filtre `filter=near` déplacé côté serveur en SQL — formule de haversine
  native Postgres (`acos`/`cos`/`sin`/`radians`, pas de PostGIS), `radiusMetres` (défaut 5000)
  — remplace le filtrage client qui pouvait manquer des posts proches hors première page.
- **`POST /feed/posts`** : accepte désormais un vrai fichier multipart (`image`), écrit dans
  `uploads/posts/` (même convention de chemin — 3×`'..'` depuis `dist/modules/feed/` — que le
  reste de l'app, cf. bug de chemin corrigé lors d'une session précédente). Repli JSON
  `imageUrl` conservé pour compatibilité descendante.

### -7.3 Ce qui a été ajouté côté front

- **`useFeed.ts` réécrit** : `useStories()`/`usePublishStory()` réels (`GET`/`POST /stories`,
  multipart), `usePublishPost()` réécrit en multipart (vraie photo envoyée), `useComments()`/
  `useAddComment()` nouveaux, `useFeed(coords, filter)` passe désormais `filter=near` +
  `radiusMetres` réels au lieu de filtrer côté client. Correctif de bord nécessaire : avec
  `enabled: false` (pas de position connue), une query react-query reste `isPending` pour
  toujours — traité explicitement comme "vide", pas comme "en chargement", pour éviter un
  spinner infini sur le filtre "Près de moi" sans position.
- **`CommentsSheet.tsx`** (nouveau) : bottom sheet de commentaires, ouvert depuis le compteur
  de commentaires d'un post (`PostCard.tsx`), liste réelle + ajout réel, état vide honnête.
- **`CommunityScreen.tsx`** : suppression du filtrage client (`useMemo` + seuil codé en dur),
  remplacé par la requête serveur réelle ; stories réelles au lieu de `store.ts`.

### -7.4 Décision de conception : pourquoi les stories ne réutilisent pas le pattern "dernier diagnostic"

Contrairement à `dernierDiagnostic` sur `collection` (une seule valeur, réécrite à chaque
nouvelle analyse), une story doit pouvoir **coexister avec les précédentes** de l'utilisateur
tant qu'aucune n'a expiré (plusieurs stories actives possibles en même temps, comportement
standard "story" du cahier des charges). D'où une entité dédiée avec sa propre table plutôt
qu'un champ unique sur `users` — c'était la seule option cohérente avec des stories multiples
et une expiration individuelle par story.

### -7.5 Tests ajoutés

- `stories.service.spec.ts` (nouveau, 3 tests) : `NotFoundException` si utilisateur supprimé,
  écriture réelle du fichier + expiration `+24h` précise (bornée par deux `Date.now()` avant/
  après l'appel), filtrage `dateExpiration > maintenant` + tri décroissant.
- `feed.service.spec.ts` (+5 tests) : upload réel de la photo d'un post (`writeFileSync` appelé,
  `imageUrl` correct), repli `imageUrl` JSON quand pas de fichier, filtre SQL "Près de moi"
  actif seulement avec `filter=near` **et** position fournie (2 cas négatifs vérifiés).
  Un bug de pollution de mocks entre tests (`jest.mock('fs')` sans `jest.clearAllMocks()` en
  `beforeEach`) a été découvert et corrigé pendant l'écriture de ces tests.
- `adapters.test.ts` (+3 tests) : `toStory` (initiale majuscule, résolution d'URL relative/
  absolue), `toComment` (mapping direct).
- Suite complète : **112/112 back**, **94/94 front** (91 avant + 3 nouveaux), `tsc --noEmit`
  propre sur les deux apps.

### -7.6 Vérification bout-en-bout avec de vraies données (serveur réel, Postgres réel)

Chaîne complète rejouée via appels HTTP réels contre le serveur `nest start --watch` déjà en
cours d'exécution (donc avec tous les changements de cette session chargés) :

1. **Story avec vraie photo** — `POST /stories` (multipart, image 825 octets) → fichier
   confirmé sur disque (`uploads/stories/...jpg`, taille identique), servi en HTTP 200 via
   `/uploads/stories/...`, `dateExpiration` vérifiée à `+24h` exactement, apparaît dans
   `GET /stories`.
2. **Post avec vraie photo** — `POST /feed/posts` (multipart, texte + image) → fichier confirmé
   sur disque (`uploads/posts/...jpg`), servi en HTTP 200, apparaît en tête de `GET /feed` avec
   la vraie `imageUrl`.
3. **Like persistant** — `POST /feed/posts/:id/like` → `{ liked: true, likesCount: 1 }`, puis
   nouvel appel `GET /feed` (simulation d'un rechargement) → `likesCount: 1`,
   `estLikedParUtilisateur: true` toujours présents : le like persiste bien après "reload".
4. **Commentaires réels** — `GET .../comments` vide au départ, `POST .../comments` avec un
   vrai texte → réapparaît immédiatement dans `GET .../comments`, `commentairesCount` du post
   passé de `0` à `1` dans `GET /feed`.
5. **Filtre "Près de moi" avec de vraies coordonnées** — deux plantes taguées créées avec de
   vraies coordonnées GPS (Lyon 45.7640/4.8357, Paris 48.8566/2.3522, ~391 km d'écart réel),
   chacune postée dans le feed. `GET /feed?filter=near&latitude=45.764&longitude=4.8357&
   radiusMetres=10000` → **1 seul résultat** (le post de Lyon, `distanceMetres: 0`), le post
   de Paris correctement exclu. Avec `radiusMetres=500000` → les deux réapparaissent, avec
   `distanceMetres: 391499` pour celui de Paris — cohérent avec la distance réelle Lyon-Paris
   (~392 km), confirmant l'exactitude de la formule de haversine SQL, pas seulement sa
   présence dans le code.

### -7.7 État de complétude par exigence

| Exigence (énoncé de Djawad) | État | Preuve |
|---|---|---|
| 1. Fil d'actualité réel, zéro mock | ✅ | `GET /feed` réel, mock non importé par `useFeed.ts`, §-7.6.2 |
| 2. "Près de moi" avec vraie distance et filtrage serveur | ✅ | Filtrage SQL réel testé avec coordonnées Lyon/Paris réelles, §-7.6.5 |
| 3. Publication avec vraie photo | ✅ | Fichier confirmé sur disque + servi en HTTP, §-7.6.2 |
| 4. Likes/commentaires réels et persistants | ✅ | Persistance vérifiée après rechargement simulé, §-7.6.3-4 |
| 5. Stories réelles avec expiration 24h | ✅ | Module `stories` complet, expiration exacte vérifiée, §-7.6.1 |

Aucune donnée fictive n'a été affichée à aucune étape ; tous les identifiants, photos, dates et
distances montrés dans cette vérification proviennent de vrais appels serveur/Postgres.

---

## -6. Session du 24/07/2026 (suite) — "le bouton Voir le diagnostic ne s'affiche pas" : investigation complète, aucun bug de code trouvé

> Signalement de Djawad : le bouton ajouté en §-5 n'apparaît pas, même sur une plante
> détectée malade. Demande de vérifier les 5 points de la chaîne (persistance back, réponse
> API, condition d'affichage front, invalidation react-query, bout-en-bout) avec preuves.

### -6.1 Les 5 points vérifiés un par un, avec preuves réelles

**1. Persistance back** — requête SQL directe sur la vraie base pendant l'investigation :
```
id=df7c5ced... | nomCommun=Basilic | etatSante=red | dernierDiagnostic non NULL
```
`Collection.dernierDiagnostic` est bien réécrit à chaque appel de
`POST /collection/:id/diagnosis` (voir §-5.1) — confirmé à nouveau, rien à corriger ici.

**2. Réponse API** — `collection.service.ts` aplatit bien `c.dernierDiagnostic` dans
`GetCollectionResponseDto` (voir §-5.1, déjà vérifié par `collection.service.spec.ts`) ; champ
nommé `dernierDiagnostic`, non `null` dès qu'un diagnostic existe. Rien à corriger.

**3. Condition d'affichage front** — relecture ligne à ligne de `CloneCard.tsx` :
`const hasSavedDiagnosis = isSick && !!clone.savedDiagnosis;` avec `isSick = etatSante ===
'malade'`. Le nom de champ (`savedDiagnosis`), le mapping `dernierDiagnostic` →
`savedDiagnosis` (`adapters.ts#savedDiagnosisFromBackend`) et l'enum `etatSante` ont été
relus intégralement : aucune faute de frappe, aucun nom de champ incohérent trouvé. Rien à
corriger.

**4. Invalidation react-query** — `useCheckHealth()` (`useMyGarden.ts`) appelle bien
`queryClient.invalidateQueries({ queryKey: queryKeys.garden })` dans son `onSuccess`, avec la
même clé (`['garden']`, `queryKeys.ts`) que celle utilisée par `useMyGarden()`. Rien à
corriger.

### -6.2 Reproduction en direct : le flux complet fonctionne réellement

Plutôt que de conclure sur la seule relecture de code, rejoué en direct sur le téléphone
physique de Djawad, avec un rechargement **garanti neuf** de l'app (force-stop + relance,
pas juste remise au premier plan) pour exclure un bundle JS obsolète :

1. Carte "Basilic" (`df7c5ced`), déjà malade d'un diagnostic antérieur à l'ajout de cette
   fonctionnalité (`dernierDiagnostic` légitimement vide pour cette entrée-là — comportement
   honnête déjà documenté en §-5, pas un bug) → **pas de bouton, correct**.
2. Tap "Vérifier la santé" → appareil photo → capture réelle → `POST
   /collection/:id/diagnosis` réel → **"nutrient deficiency" détecté, confiance 97 %,
   traitement réel en français** (confirmé en base par la requête SQL ci-dessus, horodatage
   `dernierDiagnostic.dateDiagnostic` concordant à la seconde près avec l'action).
3. Retour sur Mon Jardin (simple navigation d'onglet, **aucun rechargement forcé**) → la carte
   "Basilic" affiche désormais **"Voir le diagnostic"** (bouton rouge, icône `visibility`),
   sans action supplémentaire — confirme que l'invalidation react-query suffit à faire
   apparaître le bouton sans quitter/rouvrir l'écran (point 4 de la demande).
4. Tap sur le bouton → bottom sheet réel : *"nutrient deficiency détectée"*, *"Analyse IA ·
   confiance 97 % · Basilic"*, **"Diagnostiqué il y a 17 minutes"** (nouvelle ligne de date,
   §-5.2), traitement complet — **aucun nouvel appel caméra ni réseau déclenché** (pas de
   permission caméra redemandée, réouverture instantanée).

Les 5 points de la demande sont donc confirmés fonctionnels avec de vraies données, en
conditions réelles, sur le device physique.

### -6.3 Cause probable du signalement initial : bundle JS obsolète, pas un bug de code

Aucune anomalie de code n'a été trouvée après relecture complète des 4 couches (back, DTO,
adapter front, condition d'affichage) ni après un test bout-en-bout réel réussi à l'identique
de ce que Djawad décrit avoir tenté. L'explication la plus probable, cohérente avec le
déroulé de la session : entre l'implémentation de la fonctionnalité (§-5) et son test par
Djawad, la connexion de développement (USB puis WiFi, **trois changements de réseau** dans
cette même session — voir §-4bis, §-5) a occasionné plusieurs pertes de connexion Metro. Le
dev client Expo peut alors continuer à afficher un bundle JS **mis en cache**, antérieur au
correctif, sans rechargement automatique après une reconnexion réseau — déjà observé une fois
dans cette session (§-4.4, clés i18n affichées brutes, résolu par un rechargement complet).
Un simple retour au premier plan de l'app ne suffit pas dans ce cas ; il faut un rechargement
complet (secouer l'appareil → "Reload", ou fermer et rouvrir l'app) après toute reconnexion
Metro.

**Aucun correctif de code nécessaire** — confirmé par la suite de tests inchangée (104/104
back, 91/91 front, aucun fichier modifié dans cette section) et par la reproduction réelle en
§-6.2. Recommandation transmise à Djawad : après toute coupure/changement de réseau pendant le
développement, recharger complètement l'app (pas seulement revenir dessus) avant de
retester.

### -6.4 État de complétude

| Point vérifié | État | Preuve |
|---|---|---|
| Diagnostic sauvegardé en base (maladie, conseils, date, etatSante) | ✅ | Requête SQL directe, §-6.1 |
| Champ renvoyé par l'API, bien nommé, non null | ✅ | `dernierDiagnostic` dans `GetCollectionResponseDto`, §-6.1 |
| Condition d'affichage front correcte | ✅ | Relecture ligne à ligne, §-6.1 |
| Liste rechargée après diagnostic (invalidation react-query) | ✅ | Bouton apparu par simple navigation, sans rechargement forcé, §-6.2 |
| Bout-en-bout réel (sain → malade → bouton → bottom sheet) | ✅ | Rejoué en direct sur device physique, §-6.2 |

---

## -5. Session du 24/07/2026 — historique de diagnostic dans Mon Quotidien (nouvelle fonctionnalité)

> Demande de Djawad : quand "Vérifier la santé" détecte une plante malade, le résultat
> (maladie, confiance, traitement, date) doit être sauvegardé et réaffichable sans relancer
> une analyse, via un bouton sur la carte du clone, visible seulement si la plante est
> actuellement malade avec un diagnostic sauvegardé.

### -5.1 Champ ajouté côté back : `Collection.dernierDiagnostic`

**Choix d'architecture** : un diagnostic est une donnée **par exemplaire** (par ligne
`collection`), pas par espèce — pas de nouvelle table. Colonne JSONB `dernierDiagnostic` sur
`Collection` (comme `conseilsEntretien` sur `Plant`), **réécrite à chaque appel** de
`POST /collection/:id/diagnosis` (jamais un historique multi-entrées : la demande porte sur
"le diagnostic sauvegardé", au singulier, et le bouton n'a besoin que du plus récent).

```typescript
// Collection.dernierDiagnostic (nullable)
{
  maladieNom: string | null;      // null si la plante était saine à ce diagnostic
  scoreGlobal: number;            // confiance 0-100, même valeur que le diagnostic
  traitement: { biologique?: string; chimique?: string; prevention?: string } | null;
  description: string | null;
  estSain: boolean;
  dateDiagnostic: string;         // ISO 8601
}
```

`DiagnosisService#diagnosePlantHealth` calcule ce champ à partir de la suggestion la plus
probable (`suggestions[0]`), en même temps que `etatSante` — les deux sont donc **toujours
mis à jour ensemble**, ce qui garantit qu'un `etatSante: 'malade'` correspond toujours à un
`dernierDiagnostic.estSain: false` (pas de risque d'incohérence entre les deux champs). Plante
saine → `maladieNom`/`traitement`/`description` explicitement `null` (jamais un diagnostic
inventé pour masquer l'absence de maladie).

**Endpoint choisi** : embarqué dans `GetCollectionResponseDto` (`GET /collection`), **pas**
de `GET /collection/:id/diagnosis/latest` séparé — la demande proposait les deux options ;
celle-ci évite un appel réseau par carte affichée (le Jardin liste déjà tous les clones en un
seul appel) et réutilise exactement le pattern déjà en place pour `aPropos`/`conseilsEntretien`.
Toutes les données nécessaires à rouvrir le bottom sheet sont donc déjà présentes dans la
liste chargée par `useMyGarden()`, sans round-trip supplémentaire au tap du bouton.

`API_CONTRACT.md` (§4), `ARCHITECTURE.md` (table `collection`) et `packages/shared`
(`CollectionItem.dernierDiagnostic`, nouveau type `DernierDiagnostic`) mis à jour en
conséquence.

### -5.2 Logique d'affichage du bouton — choix retenu et justification

Le bouton **"Voir le diagnostic"** (icône `visibility`, style `destructive` du
`SecondaryButton` déjà utilisé pour "Vérifier la santé" en état malade) n'est rendu que si
`item.etatSante === 'malade'` **ET** `clone.savedDiagnosis` présent (`CloneCard.tsx`),
positionné en pleine largeur juste sous la ligne d'état de santé, avant la timeline photo.

**Question posée par la demande** : si une vérification ultérieure déclare la plante
saine/guérie, faut-il masquer le bouton ou le garder comme historique ? **Choix : masquer**,
pour deux raisons :
1. Le bouton représente un problème **actuellement actionnable** ("va voir ce qu'il faut
   traiter"), pas un journal — une fois la plante guérie, il n'y a plus rien à traiter.
2. La donnée sous-jacente n'est **jamais perdue** : `dernierDiagnostic` est réécrit (pas
   supprimé) à chaque nouveau diagnostic, donc si la plante retombe malade plus tard, le
   nouveau diagnostic réel réapparaît normalement. Un futur écran d'historique complet
   nécessiterait de passer à une table dédiée (plusieurs lignes par collection) — non demandé
   ici, donc non fait par anticipation.

Au tap, `handleViewDiagnosis()` (`QuotidienView.tsx`) réutilise directement
`clone.savedDiagnosis` (déjà chargé avec le Jardin) pour rouvrir le `DiagnosisSheet` — **aucun
appel réseau**, conforme à "sans relancer une analyse". `DiagnosisSheet` affiche désormais
aussi la date du diagnostic (`diagnosis.diagnosedAt`, relative — `formatRelativeDate`, déjà
utilisé ailleurs dans l'app), qu'il vienne d'un diagnostic tout juste lancé ou rouvert depuis
la sauvegarde.

### -5.3 Vérification bout-en-bout avec de vraies données Plant.id (pas de mock)

Testé en direct contre le serveur réel, avec de vraies photos (dont une réutilisée d'un
diagnostic réel obtenu plus tôt dans la session, qui avait détecté une vraie carence
nutritive) :

```
1. Sain (jamais diagnostiquée) → dernierDiagnostic: null → pas de bouton (logique front)
2. POST /collection/:id/diagnosis (photo réelle) → estSain: false, "nutrient deficiency",
   traitement réel (biologique/chimique/prevention en français), scoreGlobal: 99
3. GET /collection → etatSante: "red", dernierDiagnostic entièrement peuplé et identique
   au résultat de l'étape 2 → bouton visible (logique front)
4. Nouveau diagnostic avec une photo saine → estSain: true
5. GET /collection → etatSante: "green", dernierDiagnostic réécrit
   ({estSain:true, maladieNom:null, ...}) → bouton masqué (logique front), donnée conservée
```

Chaîne complète confirmée : les 5 étapes utilisent le vrai serveur, la vraie base Postgres et
(pour les diagnostics) le vrai Plant.id Health — aucune étape mockée.

### -5.4 Tests

- Backend (`diagnosis.service.spec.ts`, `collection.service.spec.ts`) : **+1 nouveau test**
  (écrasement du diagnostic précédent par le plus récent, pas d'accumulation) et 2 tests
  existants étoffés d'assertions (persistance du diagnostic malade/sain sans invention de
  maladie, aplatissement correct de `dernierDiagnostic` dans `GetCollectionResponseDto`).
  **104/104** ✅ au total.
- Frontend (`adapters.test.ts`, `CloneCard.test.tsx`) : **+8 tests** — conversion
  `dernierDiagnostic` → `savedDiagnosis` (malade/sain/repli description si pas de
  traitement), et les 4 cas de la logique d'affichage du bouton (masqué si saine, masqué si
  malade sans diagnostic sauvegardé — garde-fou de cohérence, visible si malade+diagnostic,
  déclenche bien `onViewDiagnosis` sans relancer d'analyse). **91/91** ✅ au total (83 avant).
- `tsc --noEmit` propre des deux côtés.

### -5.5 État de complétude

| Élément | État | Notes |
|---|---|---|
| Persistance du diagnostic (back) | ✅ | `Collection.dernierDiagnostic`, JSONB, réécrit à chaque diagnostic |
| Exposition API | ✅ | Embarqué dans `GetCollectionResponseDto` (`GET /collection`) — pas d'endpoint séparé, choix justifié en §-5.1 |
| Bouton "Voir le diagnostic" | ✅ | Visible seulement si `etatSante === 'malade'` ET diagnostic sauvegardé, masqué si guérie (choix justifié en §-5.2) |
| Réouverture sans relancer d'analyse | ✅ | Réutilise les données déjà chargées avec le Jardin, aucun appel réseau au tap |
| Date du diagnostic affichée | ✅ | `DiagnosisSheet`, nouvelle ligne relative (`formatRelativeDate`) |
| i18n (fr/en/es) | ✅ | `jardin.viewDiagnosis`, `diagnosis.diagnosedAt` |
| Design system | ✅ | `SecondaryButton`/`Icon`/theme existants, aucune couleur en dur ajoutée |
| Vérification bout-en-bout réelle | ✅ | 5 étapes rejouées avec le vrai Plant.id Health, voir §-5.3 |

---

## -4bis. Suite de la session du 24/07/2026 — vérification visuelle complète sur device réel

> Après §-4, la vérification visuelle sur le téléphone physique de Djawad (branché puis en
> WiFi, plusieurs coupures réseau en cours de route) a pu être menée à son terme.

**Régression trouvée et corrigée en direct** : après le correctif du chemin d'upload (§-4.4,
qui a vidé `dist/uploads/` — `deleteOutDir: true`), une capture "banane plantain" antérieure
à cette session avait sa photo de suivi devenue définitivement inaccessible (fichier détruit,
seule sa référence en base subsistait). La carte affichait alors un carré vide plutôt que de
retomber sur l'image générique de l'espèce, parce que `primaryPhotoUrl()` se contentait de
vérifier la présence d'une URL, jamais que le fichier se charge réellement. **Corrigé** :
nouveau composant partagé `apps/mobile/src/components/PlantPhoto.tsx`, qui gère un vrai repli
en cascade avec `onError` (photo propre → photo générique de catalogue → icône), utilisé par
`CloneCard`, `DiscoveryCard`, `PlantDetailScreen` et `IdentificationResultCard` (remplace la
fonction `primaryPhotoUrl`, désormais `ownPhotoUrl` — ne renvoie plus qu'un seul candidat,
`PlantPhoto` reçoit `ownPhotoUrl`/`catalogUrl` séparément pour pouvoir basculer de l'un à
l'autre si le premier échoue au chargement, pas seulement s'il est absent). Reconfirmé en
direct : la carte "banane plantain" retombe proprement sur sa photo de catalogue.

**Fausse alerte levée** : la carte "Basilic" (nouvelle capture de cette session) affichait une
vignette avec un fragment de texte "Visitor"/"Télécharger" visible en bas — pris de prime abord
pour un signe que le repli catalogue s'affichait à tort au lieu de la vraie photo. Vérification
en ouvrant le fichier réellement servi (`http://<host>:3000/uploads/collections/<id>/<uuid>.jpg`)
directement dans Chrome sur le téléphone : c'est bien la vraie photo capturée par
l'utilisateur — qui se trouve être une photo d'un écran d'ordinateur affichant une page web de
pépinière (bio "godet"), prise pendant les tests plutôt qu'une vraie plante. Le texte
"Visitor"/"Télécharger" fait partie du contenu réellement photographié (l'UI du navigateur sur
l'écran capturé), pas un artefact de repli. **Confirme que la priorité "photo propre" fonctionne
correctement** : c'est exactement, pixel pour pixel, le fichier uploadé qui s'affiche.

Tests : 83/83 front toujours verts après l'ajout de `PlantPhoto` (aucune régression), `tsc`
propre.

---

## -4. Session du 24/07/2026 — photo non fidèle au scan + "Vérifier la santé" cassé (3 bugs réels)

> Nouvelle demande de Djawad, avec deux symptômes précis : (1) l'image affichée après un
> scan/ajout n'est pas exactement la photo prise par l'utilisateur ; (2) "Vérifier la santé"
> (Mon Jardin > Mon Quotidien) ne fonctionne pas. Diagnostic mené par de vrais appels HTTP
> contre le serveur réellement démarré (`curl`, vraie clé Plant.id) et, quand la connexion USB
> au téléphone de Djawad le permettait, en pilotant l'app réelle via `adb`. **3 bugs réels**
> trouvés (2 attendus + 1 découvert en vérifiant que le fichier uploadé était bien réellement
> récupérable en HTTP, pas seulement que l'URL avait la bonne forme) :

### -4.1 Bug 1 — "Vérifier la santé" : requête Plant.id Health mal formée (500 systématique)

**Cause réelle** (`diagnosis.service.ts#callPlantIdHealth`) : `health`, `details`, `language`
étaient envoyés comme champs du **corps JSON**, alors que Plant.id v3 Health Assessment — comme
l'identification (`identification.service.ts`, déjà correcte) — les attend en **query string**.
Vérifié en conditions réelles (vraie clé, requête Python brute hors NestJS) : la forme
utilisée par l'ancien code renvoie **400 "Unknown modifier"**, capturé et transformé en 500
générique côté back, donc invisible sans regarder le corps de la vraie erreur Plant.id
(corrigé au passage : le message d'erreur réel de Plant.id est maintenant loggé). **Aucun test
n'exerçait le vrai appel HTTP** (seul le mode mock était couvert), donc ce bug n'avait jamais pu
être détecté par la suite de tests existante.

**Correctif** :
- URL : `.../v3/health_assessment?health=all&details=local_name,description,treatment,classification,common_names,cause&language=fr`
  (vérifié avec une vraie clé : 201, texte de traitement réel en français).
- Corps : `{ images: [base64], similar_images: true }` uniquement.
- **Bug annexe découvert dans la foulée** : `treatment.{biological,chemical,prevention}` sont en
  réalité des **tableaux** de conseils (`string[]`), pas des chaînes comme le supposait
  l'ancien mapping (`s.details.treatment.biological` aurait renvoyé un objet `Array`
  injecté tel quel dans le DTO puis probablement affiché comme `[object Object]` côté front).
  Nouvelle fonction `joinTreatment()` : joint chaque catégorie non vide, omet une catégorie
  vide plutôt que d'afficher une case de traitement vide.
- 3 nouveaux tests (`diagnosis.service.spec.ts`, avec `fetch` mocké plutôt que le mode mock) :
  verrouillent le format query string (jamais dans le body), le join des tableaux de
  traitement, et la propagation d'une erreur explicite si Plant.id rejette la requête.

### -4.2 Bug 2 — "Vérifier la santé" : aucune photo n'était jamais prise ni envoyée

**Cause réelle** (`QuotidienView.tsx#handleCheckHealth`) : le bouton appelait directement
`POST /collection/:id/diagnosis` **sans aucune image**, en s'appuyant entièrement sur
`historiquePhotos` côté back (repli sur la dernière photo de l'historique). Une plante tout
juste ajoutée au Jardin n'a **jamais** de photo dans son historique (`historiquePhotos: []` à
la création) — cas le plus courant en pratique — donc le back répondait 400 ("Aucune image
disponible pour le diagnostic") à chaque fois, et **l'erreur était silencieusement avalée**
(`checkHealth.mutate(...)` n'avait pas de `onError`) : le bouton semblait "inerte", sans aucun
retour visible pour l'utilisateur.

**Correctif** — conforme au cahier des charges ("L'utilisateur prend une photo d'une feuille
malade") :
- `handleCheckHealth` ouvre désormais l'appareil photo (`expo-image-picker#launchCameraAsync`,
  permission déjà provisionnée dans `app.json` — `cameraPermission` du plugin
  `expo-image-picker` mentionne déjà explicitement "le suivi de tes plantes") avant d'appeler
  le diagnostic ; annule proprement si l'utilisateur refuse la permission ou annule la prise
  de vue.
- `useCheckHealth()` (`useMyGarden.ts`) envoie maintenant la photo en `multipart/form-data`
  (`image`), exactement comme `useAddTrackingPhoto()`.
- Ajout d'un `onError` avec toast (`jardin.diagnosisErrorTitle`/`diagnosisErrorSub`, 3 langues) :
  un échec reste désormais visible plutôt que silencieux.
- Test d'intégration (`useMyGarden.integration.test.tsx`) mis à jour pour vérifier l'envoi en
  multipart plutôt qu'une requête sans corps.

### -4.3 Bug 3 — photo affichée non fidèle : jamais la photo de l'utilisateur, toujours l'image générique de l'espèce

**Cause réelle** : `POST /identification` reçoit bien le buffer de la photo prise par
l'utilisateur, mais **ne le sauvegarde jamais** — `urlImage` dans la réponse vient uniquement
de `details.image.value` de Plant.id, une photo de référence de l'espèce **partagée par tous
les utilisateurs** (catalogue Plant.id, pas la plante réellement photographiée). Le front
(`useAddToCollection`) n'envoyait par ailleurs jamais la photo capturée à `POST /collection`.
Résultat exact du symptôme signalé : la carte résultat du Scan, puis la carte Herbarium/Jardin,
puis la fiche détail affichaient toutes la même image de catalogue Plant.id pour une espèce
donnée — jamais l'exemplaire réellement photographié par l'utilisateur.

**Décision d'architecture** : une photo de capture est une donnée **par exemplaire**, pas par
espèce (deux utilisateurs qui scannent deux Rosa gallica différents ont deux vraies photos
différentes, aucune n'est "fausse") — elle ne doit donc pas écraser `Plant.urlImage`
(référentiel partagé, déjà alimenté par le catalogue Plant.id, utile comme repli). Plutôt que
d'ajouter un champ back dédié, réutilisation de l'infrastructure **déjà existante et testée** :
`historiquePhotos` (`POST /collection/:id/photos`), jusqu'ici réservée à la fonctionnalité
"Photo de suivi".

**Correctif** (aucun changement de schéma back nécessaire) :
- `ScanScreen.tsx` : la photo capturée (`capturedUri`, déjà disponible côté device) est
  affichée telle quelle dans `IdentificationResultCard` (nouvelle prop `photoUri`), **avant**
  même que l'ajout à la collection ait eu lieu.
- `finalizeAdd()` : après un `POST /collection` réussi, upload immédiat (best-effort, ne bloque
  pas le toast de succès) de cette même photo via `POST /collection/:id/photos` — désormais
  `historiquePhotos[0]` de cette collection est réellement la photo prise au scan.
- Nouvelle fonction `primaryPhotoUrl(item, plant)` (`api/types.ts`) : préfère
  `item.historiquePhotos[0].url` (vraie photo de cet exemplaire) à `plant.urlImage` (repli
  catalogue Plant.id, uniquement pour les captures antérieures à ce correctif qui n'ont pas
  encore de photo propre). Appliquée dans `CloneCard`, `DiscoveryCard`, `PlantDetailScreen`
  (via un nouveau champ `PlantDetail.photoUrl`, calculé dans `usePlantDetail`).
- `useAddToCollection()` renvoie désormais `{ collectionId }` (au lieu de `void`), nécessaire
  pour enchaîner l'upload de la photo sur le bon id.
- `useAddTrackingPhoto()` invalide maintenant le cache Jardin **et** Herbarium (la photo de
  capture initiale peut atterrir dans l'un ou l'autre selon le choix fait après le scan).

### -4.4 Bug 3 (bis) — découvert en vérifiant vraiment le fichier servi, pas juste la forme de l'URL

En voulant prouver bout-en-bout que la photo re-servie est bien identique octet pour octet à
celle envoyée (`diff` sur le fichier re-téléchargé), **un 4ᵉ bug pré-existant, sans rapport
avec le correctif ci-dessus, a été découvert** : `GET /uploads/collections/.../photo.jpg`
renvoyait **404** alors que `POST /collection/:id/photos` répondait 201 avec succès.

**Cause** : `path.join(__dirname, '..', '..', 'uploads', ...)` dans `collection.service.ts`
(`addPhoto`), `diagnosis.service.ts` (écriture ET lecture) et `user.controller.ts` (avatar) ne
remonte que 2 niveaux depuis `dist/modules/<module>/` — soit `apps/api/dist/`, alors que les
fichiers doivent atterrir dans `apps/api/uploads/` (racine servie par `main.ts`, qui lui est à
la bonne profondeur avec seulement 1 `..` depuis `dist/`). Toute photo uploadée (suivi Jardin,
photo de diagnostic, avatar) était donc écrite un niveau trop profond et **strictement
invisible** derrière son URL censée la servir — y compris la fiche "historiquePhotos" déjà
présentée comme fonctionnelle dans un rapport précédent (§2, "upload + stockage réels,
vérifié"), qui ne l'était en réalité que pour l'upload lui-même, jamais pour une relecture HTTP
réelle du fichier (le test e2e existant ne vérifie que la forme de l'URL renvoyée, jamais un
vrai `GET`, voir `test/garden-flow.e2e-spec.ts:128`).

**Correctif** : 3 `..` au lieu de 2 dans les 4 occurrences (`collection.service.ts`,
`diagnosis.service.ts` ×2, `user.controller.ts`). Nouveau test de régression
(`collection.service.spec.ts#addPhoto`) qui calcule le chemin attendu depuis le même
`__dirname` que le service (fichiers co-localisés) plutôt que de coder une valeur en dur —
verrouille le nombre de niveaux, pas un chemin absolu fragile.

**Vérifié en conditions réelles, bout-en-bout, avec le serveur relancé proprement** (l'ancien
process n'avait pas repris le correctif après un simple hot-reload, redémarrage manuel
nécessaire — note pour la suite : `nest start --watch` n'a pas toujours redémarré le process
enfant après une sauvegarde, à surveiller) :

```
POST /identification (vraie photo, vraie clé) → 201, plantId réel
POST /collection (type discovered) → 201, collectionId réel
POST /collection/:id/photos (même photo) → 201, historiquePhotos[0] = /uploads/collections/<id>/<uuid>.webp
GET  /uploads/collections/<id>/<uuid>.webp → 200, contenu identique octet pour octet
     (diff avant correctif : fichiers différents, 404 — diff après correctif : IDENTIQUE)
POST /collection/:id/diagnosis (vraie photo) → 201, estSain/traitement/description réels
```

### -4.5 Vérification visuelle sur device réel (partielle — connexion USB intermittente)

Le téléphone Android de Djawad (branché USB, piloté via `adb`) s'est déconnecté/reconnecté
plusieurs fois pendant la session (`adb: no devices/emulators found` récurrent, cause non
identifiée — câble ou port USB, sans lien avec le code). Ce qui a pu être confirmé visuellement
avant la perte de connexion :
- Tapoter "Vérifier la santé" ouvre désormais bien l'appareil photo natif (capture d'écran
  prise) — confirme le correctif -4.2 (le bouton n'est plus inerte).
- `Famille :` d'une session précédente déjà vérifiée fonctionnelle sur ce même device.

Non re-vérifié visuellement sur l'écran physique avant la fin de la session (déconnexion USB
persistante) : le rendu de la vraie photo sur la carte Herbarium/Jardin et la fiche détail
après un scan complet, et le bottom sheet de diagnostic après une capture réelle de feuille.
**Compensé par une vérification HTTP bout-en-bout complète** (voir -4.4) qui couvre exactement
la même chaîne de données que l'écran affiche (le code de rendu — `CloneCard`/`DiscoveryCard`/
`PlantDetailScreen`/`DiagnosisSheet` — est inchangé dans sa logique d'affichage, seule la
donnée qui l'alimente était fausse/manquante) ; reste, honnêtement, une vérification au niveau
HTTP/logique, pas un clic réel confirmé sur l'écran pour ces deux derniers points précis.

### -4.6 Tests

- Backend : **103/103** ✅ (+4 vs avant cette session : 3 tests `diagnosis.service.ts` réel-HTTP
  + 1 test régression chemin d'upload).
- Frontend : **83/83** ✅ (inchangé en nombre, `useMyGarden.integration.test.tsx` mis à jour
  pour le nouveau format multipart de `useCheckHealth`, `IdentificationResultCard.test.tsx`
  mis à jour pour la nouvelle prop `photoUri` obligatoire).
- `tsc --noEmit` propre (`apps/api`, `apps/mobile`) après tous les correctifs.

### -4.7 État de complétude

| Fonctionnalité | Back | Front | Notes |
|---|---|---|---|
| Photo affichée = photo prise par l'utilisateur | ✅ | ✅ | Résultat scan (URI locale immédiate) + carte Jardin/Herbarium + fiche détail (`historiquePhotos[0]`, repli catalogue Plant.id pour les captures antérieures à ce correctif) |
| Upload de fichiers récupérable en HTTP (photos suivi, diagnostic, avatar) | ✅ **corrigé** | — | Bug de profondeur de chemin (2 `..` au lieu de 3), touchait toute route d'upload, pas seulement celle de cette session |
| "Vérifier la santé" — capture de la photo | — | ✅ | Ouvre l'appareil photo natif avant diagnostic, erreur visible (toast) si ça échoue |
| "Vérifier la santé" — appel Plant.id Health | ✅ **corrigé** | ✅ | Format de requête corrigé (query string), traitement réel (tableaux joints en texte), `etatSante` mis à jour en base |
| "Vérifier la santé" — bottom sheet + rappel J+5 | ✅ (déjà existant, inchangé) | ✅ (déjà existant, inchangé) | `DiagnosisSheet`/`useCreateReminder` non modifiés, alimentés par des données désormais réelles |

---

## -3. Session du 23/07/2026 (suite, "vraie photo + fiche plante") — audit + 2 bugs réels trouvés et corrigés

> Nouvelle demande de Djawad : la fiche plante (Mon Herbarium/Mon Jardin) n'affichait pas de
> vraie description ni de vrais conseils d'entretien adaptés à l'espèce, et il voulait la vraie
> photo de la plante sur la carte ET dans le détail. Constat en ouvrant le code : la quasi-
> totalité de cette fonctionnalité (aPropos + conseilsEntretien + urlImage réels, alimentés par
> Plant.id, persistés à la capture) était **déjà implémentée** dans l'arbre de travail — cause
> probable : une session précédente (non visible dans cette conversation, elle a commencé sans
> historique) l'a déjà construite. Cette session a donc porté sur le **diagnostic de l'état
> réel** (§4 de la demande) et la **vérification bout-en-bout sur plusieurs espèces de familles
> différentes** (§5), via de vrais appels HTTP contre le serveur réellement démarré et, cette
> fois, en pilotant l'app réelle sur le téléphone Android de Djawad (branché USB, `adb`) — pas
> seulement en lisant le code ou en testant depuis un navigateur. Deux bugs réels ont été
> trouvés et corrigés au passage.

### -3.1 Ce qui était déjà en place (vérifié, pas juste lu)

- `IdentificationService.processPlantIdResponse()` extrait `aPropos` (`details.description.value`),
  `conseilsEntretien` (`best_light_condition`/`best_soil_type`/`watering`/`propagation_methods`)
  et `urlImage` (`details.image.value`) de la vraie réponse Plant.id, et les persiste sur
  l'entité `Plant` référentielle (partagée par tous les utilisateurs pour cette espèce).
- Backfill paresseux : une espèce déjà en base dont ces 3 champs sont encore `null` (capturée
  avant l'ajout de cette fonctionnalité) se voit compléter **uniquement les champs vides** au
  prochain scan de cette espèce — jamais écrasée si déjà renseignée (respecte une édition
  manuelle éventuelle), jamais de texte inventé si Plant.id ne fournit rien.
  `identification.service.spec.ts` couvre déjà les 3 cas (réutilisation, backfill, non-écrasement).
- `CollectionService` (create/findByUserAndType/findOneByUser/update) et `PlantsService`
  exposent déjà `aPropos`/`conseilsEntretien`/`urlImage` dans leurs DTOs de réponse.
- Front : `PlantDetailScreen.tsx` affiche déjà "À propos" (repli honnête
  `plant.aboutUnavailable` si `null`, jamais de texte démo) et une grille de 4 conseils
  (lumière/sol/arrosage/multiplication, repli "—" par case manquante). `CloneCard.tsx`,
  `DiscoveryCard.tsx` et `IdentificationResultCard.tsx` affichent déjà la vraie photo
  (`plant.urlImage`) avec repli sur une icône générique si absente. `adapters.ts` fait déjà
  toute la traduction back→front (`toPlantWithIcon`, `serializeConseilsEntretien`).
- 99/99 tests unitaires back, 83/83 front, `tsc --noEmit` propre des deux côtés — déjà verts
  avant toute intervention de cette session.

### -3.2 Vérification bout-en-bout réelle (curl + vrai Plant.id + app réelle sur téléphone)

Un utilisateur de test a été créé (`register`/`login` réels) et une vraie photo (`Tacca
chantrieri`, `apps/api/test/test-image.txt`, déjà utilisée en §-1) envoyée à `POST
/identification` contre le **vrai** Plant.id (`MOCK_PLANTID=false` en prod comme en dev ici) :

- Cette espèce était déjà en base **sans** `aPropos`/`conseilsEntretien`/`urlImage` (capturée
  avant l'ajout de la fonctionnalité, voir §-1.7) : le nouveau scan a bien déclenché le backfill
  — `aPropos` rempli d'un vrai texte français riche et spécifique (origine Thaïlande/Myanmar,
  caractéristiques, étymologie du nom "fleur chauve-souris"), `conseilsEntretien` rempli
  (lumière/sol/multiplication réels), `urlImage` une vraie URL Plant.id (CDN DigitalOcean).
- **Observation honnête, pas corrigée** : `aPropos` revient en français (`language=fr` respecté)
  mais `conseilsEntretien.lumiere`/`.sol` reviennent en **anglais** malgré le même paramètre —
  `best_light_condition`/`best_soil_type` semblent ne pas être traduits par Plant.id quel que
  soit `language=`. Vérifié une seule fois (pas assez pour conclure à une règle générale côté
  Plant.id), donc documenté ici plutôt que "corrigé" par un hack de traduction non fiable.
- `POST /collection` (owned) → `GET /collection?type=owned` : `aPropos`/`conseilsEntretien`/
  `urlImage` bien persistés et relus à l'identique (persistance offline/re-affichage demandée
  au §3 confirmée réelle, pas seulement au moment du scan).
- **Vérifié visuellement sur le téléphone Android réel de Djawad** (branché USB, piloté via
  `adb` — capture d'écran + tap, pas une simulation) : après connexion au Metro de cette
  session (voir §-3.4), la carte "Mon Quotidien" de `Tacca chantrieri` affiche la vraie photo
  (fleur violette/brune sur fond de feuilles) au lieu de l'icône générique ; ajoutée aussi en
  Herbarium, la carte plein cadre ET l'écran détail (hero photo + "À propos" en français réel +
  grille de conseils réels + `Famille : Dioscoreaceae` + badge "Toxique" réel) affichent tout
  correctement, différent d'espèce à espèce (comparé au `Rosa gallica` déjà en base avec sa
  propre description/conseils distincts).

### -3.3 Bug réel #1 trouvé et corrigé : `famille` absente de `GetCollectionResponseDto`

**Symptôme observé sur le téléphone réel** (pas une hypothèse) : la fiche plante d'`Ananas`
(Herbarium) affichait **"Famille : "** vide, alors que `GET /plants` confirmait
`"famille": "Bromeliaceae"` pour cette même espèce en base.

**Cause** : `GetCollectionResponseDto` (réponse de `GET /collection`, utilisée par
`usePlantDetail()`) n'a jamais eu de champ `famille`, contrairement à `PlantResponseDto` et à la
réponse de `POST /identification` qui l'ont déjà. `CollectionService` (3 méthodes :
`findByUserAndType`, `findOneByUser`, `update`) n'aplatissait donc jamais
`c.plante.famille` dans sa réponse — le front ne recevait tout simplement jamais cette donnée
pour une plante consultée depuis Mon Jardin/Herbarium (uniquement disponible via
`POST /identification` ou `GET /plants/:id`, deux chemins que `usePlantDetail()` n'emprunte pas).

**Correctif** :
- `apps/api/src/dto/shared.dto.ts` : `famille!: string | null;` ajouté à `GetCollectionResponseDto`.
- `apps/api/src/modules/collection/collection.service.ts` : `famille: c.plante.famille` (ou
  `saved.plante.famille`) ajouté aux 3 méthodes qui aplatissent la plante.
- `apps/mobile/src/api/adapters.ts` : `famille: string | null;` ajouté au type
  `BackendCollectionItem` (la fonction `toPlantWithIcon` gérait déjà ce champ structurellement,
  il manquait juste dans le type d'entrée pour que TypeScript le laisse passer).
- Tests mis à jour/étoffés : `collection.service.spec.ts` (assertion `result[0].famille`),
  `adapters.test.ts` et `useMyGarden.integration.test.tsx` (fixtures + assertion
  `clone.plant.famille`).
- **Revérifié en direct après correctif** : `GET /collection` renvoie maintenant `"famille":
  "Dioscoreaceae"`, et l'écran détail sur le téléphone réel affiche bien "Famille :
  Dioscoreaceae" (capture d'écran avant/après comparée).

### -3.4 Faux positif écarté : clés i18n `plant.care.watering`/`plant.care.propagation` affichées brutes

En ouvrant la fiche `Ananas` sur le téléphone pour la première fois, les cases "Arrosage" et
"Multiplication" affichaient le texte brut `plant.care.watering`/`plant.care.propagation` au
lieu du libellé traduit — alors que `fr.json`/`en.json`/`es.json` contiennent bien ces 2 clés.
**Diagnostic** : le téléphone exécutait un bundle JS **mis en cache par le dev client Expo**,
chargé avant que ces 2 clés n'existent dans l'arbre de travail (aucun Metro actif au début de
cette session — l'app tournait sur un bundle déjà chargé en mémoire). Reconnecté à un Metro
fraîchement démarré pour cette session (`adb reverse tcp:8081 tcp:8081` + `npx expo start`,
depuis `apps/mobile`) : après rechargement, les 2 clés s'affichent correctement ("Arrosage",
"Multiplication"). **Pas un bug de code** — juste un artefact d'environnement de dev (bundle
figé), signalé ici pour mémoire plutôt que traité comme un correctif.

### -3.5 Limite honnête : les captures antérieures à cette fonctionnalité restent incomplètes

`Ananas` (`Ananas comosus`) et `Manguier` (`Mangifera indica`), déjà dans la collection réelle de
Djawad, ont été capturés **avant** l'ajout d'`aPropos`/`conseilsEntretien`/`urlImage` (via de
vrais scans Plant.id antérieurs, voir §-1.7) — leur fiche `plants` a donc ces 3 champs à `null`
et continuera de les afficher en repli ("Aucune description disponible...", "—", icône
générique) **tant que l'espèce n'est pas re-scannée**. Le backfill est intentionnellement
paresseux (seulement au prochain appel Plant.id réel pour cette espèce, jamais rétroactif sans
photo) pour ne jamais inventer de donnée et ne jamais consommer de crédit Plant.id sans action
utilisateur explicite. **Pas corrigé automatiquement dans cette session** : Plant.id n'expose
pas de recherche par nom d'espèce (seulement par image), donc combler ces 2 fiches précises
aurait nécessité une vraie photo d'ananas/manguier, indisponible dans cet environnement de dev.
Si Djawad veut ces 2 fiches complètes, un nouveau scan de chacune (via l'app, une vraie plante
ou une vraie photo) suffit — le comportement de fond (fallback honnête plutôt que texte
inventé, cf. §3 de la demande) est déjà correct en attendant.

### -3.6 Tests et vérifications

- Backend : 99/99 ✅ (inchangé en nombre, assertions étoffées sur `famille`).
- Frontend : 83/83 ✅ (inchangé en nombre, assertions étoffées sur `famille`).
- `tsc --noEmit` propre (`apps/api`, `apps/mobile`) après les 2 correctifs.
- Vérification visuelle réelle sur device Android physique (pas un émulateur, pas juste le web) :
  premier constat du bug `famille` vide → correctif → nouvelle capture d'écran confirmant la
  correction, plus la carte réelle + l'écran détail avec vraie photo/description/conseils pour
  `Tacca chantrieri` (Herbarium ET Jardin).

### -3.7 État de complétude (remplace les lignes correspondantes des sections précédentes)

| Fonctionnalité | Back | Front | Notes |
|---|---|---|---|
| Fiche plante — vraie photo (carte + détail) | ✅ | ✅ **vérifié sur device réel** | `urlImage` Plant.id réel, repli icône générique si absent |
| Fiche plante — "À propos" réel | ✅ | ✅ **vérifié sur device réel** | Texte français riche et spécifique par espèce, repli honnête si absent |
| Fiche plante — conseils d'entretien réels | ✅ | ✅ **vérifié sur device réel** | Diffèrent par espèce (lumière/sol/arrosage/multiplication), repli "—" par case ; `lumiere`/`sol` parfois en anglais côté Plant.id malgré `language=fr` (non corrigé, limite Plant.id observée) |
| Fiche plante — famille botanique | ✅ **corrigé cette session** | ✅ | Manquait de `GetCollectionResponseDto`, affichait "Famille : " vide sur Mon Jardin/Herbarium |
| Backfill des captures antérieures à la fonctionnalité | 🚧 volontairement paresseux | — | `Ananas`/`Manguier` restent incomplets tant qu'ils ne sont pas re-scannés ; pas de recherche Plant.id par nom pour combler sans photo |

---

## -2. Session du 23/07/2026 (suite) — badge de toxicité incorrect (tomate/mangue classées "Toxique")

> Nouvelle demande de Djawad, après la mise en service de la vraie clé Plant.id (voir §-1) :
> le badge de toxicité "ne marche pas... reste vide, ou renvoie une valeur démo/fixe". En
> creusant les données réellement en base (créées par les propres tests de Djawad sur son
> téléphone), deux espèces parmi les plus communes et comestibles au monde — **la tomate**
> (`Solanum lycopersicum`) et **la mangue** (`Mangifera indica`) — étaient toutes les deux
> classées **"Toxique" (rouge)**, ce qui a permis de reproduire et diagnostiquer le bug
> précisément avec de vraies réponses Plant.id (pas une hypothèse).

### -2.1 Diagnostic : où est la panne ?

**Le front n'a aucun bug** — vérifié et confirmé, pas juste supposé :
- `apps/mobile/src/utils/toxicity.ts#toxicityDisplay()` gère exhaustivement les 3 valeurs de
  l'enum `Toxicite` (`toxique`/`non_toxique`/`incertaine`), déjà testé (4 tests existants,
  tous passants, y compris "chaque état a une couleur visuellement distincte").
- `apps/mobile/src/api/adapters.ts#toxiciteFromBackend()` mappe correctement
  `green→non_toxique`, `orange→incertaine`, `red→toxique`, déjà testé (3 tests existants).
- Les deux écrans concernés (`IdentificationResultCard.tsx` — carte résultat du Scan — et
  `PlantDetailScreen.tsx` — fiche plante) appellent tous les deux `toxicityDisplay(plant.toxicite)`
  et affichent fidèlement le badge coloré + libellé qui en résulte.
- Conclusion : le front **affichait fidèlement** une valeur envoyée par le back — la panne
  n'est donc pas un problème d'affichage/mapping/valeur manquante côté front, mais **la valeur
  elle-même était fausse à la source**.

**La panne est 100 % côté back**, dans `IdentificationService`, méthode
`processPlantIdResponse()` : la toxicité était déterminée en cherchant des **mots-clés dans le
texte libre** `details.toxicity` renvoyé par Plant.id (ex. "toxic", "poisonous"), avec 4
expressions de négation reconnues ("non toxique", "non-toxic", "not toxic", "sans danger").
Dès que le mot "toxic"/"toxique" apparaît **n'importe où** dans le texte — même à propos d'une
seule partie de la plante (feuilles, sève, graines non mûres...) — toute l'espèce était
classée ROUGE, sans nuance.

**Preuve réelle** (récupérée via `GET /v3/kb/plants/{token}?details=...,toxicity,edible_parts`,
vraie clé, pas une supposition) :

| Espèce | Texte réel Plant.id (extrait) | `edible_parts` réel | Résultat AVANT (faux) | Résultat APRÈS |
|---|---|---|---|---|
| Tomate (`Solanum lycopersicum`) | "...contains toxic compounds... **the ripe fruit is safe to eat**, the leaves, stems, and unripe green fruit are toxic..." | `["fruit","oil","seeds"]` | 🔴 Toxique | 🟠 Incertaine |
| Mangue (`Mangifera indica`) | "**generally safe** for humans and animals, but its sap can cause skin irritation... unripe fruit contain compounds that can be toxic..." | `["flowers","fruit","leaves","seeds"]` | 🔴 Toxique | 🟢 Non toxique |
| Muguet (`Convallaria majalis`, vraie plante très toxique, témoin) | "**highly toxic**... **all parts** of the plant contain cardiac glycosides..." | `null` | 🔴 Toxique | 🔴 Toxique (inchangé, correct) |

Le muguet (témoin d'une vraie plante dangereuse) était déjà correctement classé avant comme
après — la régression ne touchait que les cas nuancés (une partie toxique, une autre
comestible), pas les cas francs.

### -2.2 Correctif : classifieur ancré sur une donnée structurée, pas du texte libre

Plant.id fournit un détail **structuré** `edible_parts` (liste des parties réellement
comestibles), jamais demandé jusqu'ici (`details=` ne listait pas `edible_parts`). Nouveau
fichier `apps/api/src/common/toxicity-classifier.ts` (`classifyToxicity(texte, edibleParts)`) :

1. **Pas de texte de toxicité du tout** → `incertaine` (jamais une fausse assurance
   "non toxique" faute de donnée — cohérent avec l'existence même de la valeur "incertaine"
   dans l'enum, qui n'était quasiment jamais utilisée auparavant).
2. **Texte présent mais qui ne mentionne aucun risque réel, ou le nie explicitement**
   ("generally safe", "non toxique", "not toxic"...) → `non_toxique`.
3. **Risque mentionné ET aucune partie comestible listée** (ou texte insistant sur une
   gravité totale, "toutes les parties"/"all parts") → `toxique` : rien chez cette espèce
   n'est sans danger.
4. **Risque mentionné MAIS au moins une partie réellement comestible listée** (cas tomate,
   mangue) → `incertaine` : ni "sans danger" ni "toxique" en bloc ne seraient honnêtes pour
   une plante dont le fruit se mange mais dont une autre partie est signalée à risque.

`identification.service.ts` : `details=common_names,toxicity` → `details=common_names,taxonomy,toxicity,edible_parts`
(le fix de `famille`, §-1.1, avait déjà ajouté `taxonomy` ; `edible_parts` s'y ajoute ici).

### -2.3 Tests et vérification réelle

- `toxicity-classifier.spec.ts` (nouveau, 9 tests) : utilise les **vrais textes Plant.id**
  capturés ci-dessus (tomate, mangue, basilic, muguet, fleur chauve-souris) comme fixtures —
  pas des exemples inventés. Confirme aussi la négation FR ("non toxique") et EN ("not toxic"),
  et l'absence totale de texte → `incertaine`.
- `identification.service.spec.ts` : test existant sur "Rosa gallica" (mock, "Non toxique...")
  toujours vert, confirme la non-régression du cas simple.
- 88/88 tests unitaires, 31/31 e2e après ce correctif.
- **Vérifié en direct** : les fiches `plants` déjà en base avec l'ancienne classification
  fausse (tomate, mangue) ont été supprimées (aucune capture ne les référençait) pour forcer
  une re-création propre au prochain scan réel ; ré-identifié la fleur chauve-souris déjà
  utilisée en §-1 (témoin) : toujours correctement "Toxique" après le changement, aucune
  régression sur le reste du pipeline (famille, rareté, XP, confiance).

### -2.4 État de complétude

| Fonctionnalité | Back | Front | Notes |
|---|---|---|---|
| Toxicité (badge Scan + fiche plante) | ✅ (corrigé, ancré sur `edible_parts`) | ✅ (déjà correct, aucun changement nécessaire) | Cas nuancés (tomate, mangue) → `incertaine`, jamais un faux "sans danger" ni un faux "toxique" en bloc |

---

## -1. Session du 23/07/2026 — audit "no démo" (identification, pièces, défis quotidiens, et au-delà)

> Nouvelle session. Demande explicite de Djawad : plusieurs fonctionnalités renvoyaient encore
> des résultats de démo/fixes au lieu de fonctionner réellement — identification (résultat
> figé), pièces virtuelles (solde fixe), défis du jour (données codées en dur front). Consigne :
> parcourir TODO.md et le cahier des charges, repérer TOUTE fonctionnalité "démo" restante,
> la brancher sur des données réelles persistées, puis vérifier le flux réel bout-en-bout.
> Deux audits supplémentaires ont été trouvés en creusant (rareté toujours "Commun", filtre
> "Près de moi" non fonctionnel, badge XP erroné sur la fiche plante) et corrigés dans la
> foulée, conformément à la consigne "au-delà" du périmètre initialement cité.

### -1.1 Identification (Scan) — cause du comportement démo et correctifs

**Cause réelle** : `MOCK_PLANTID=true` dans `apps/api/.env` forçait `IdentificationService` à
toujours renvoyer la même réponse Plant.id simulée (`Rosa gallica`, fixe) — code déjà présent
et déjà écrit pour appeler la vraie API (`callPlantIdApi()`), simplement jamais activé par
défaut. En testant la clé `PLANT_ID_API_KEY` configurée avec un **vrai appel HTTP** à Plant.id
(`POST https://api.plant.id/v3/identification`), elle s'est révélée **invalide** :
`{"message":"The specified api key not found"}` (401). Djawad a été prévenu explicitement et a
choisi de fournir une vraie clé (option retenue sur 3 proposées) ; en attendant, l'app doit
échouer avec un message honnête plutôt que de remettre un mock — exactement ce qui est
implémenté maintenant.

**Correctifs appliqués** (`apps/api/src/modules/identification/*`) :
- `MOCK_PLANTID=false` / `FORCE_MOCK=false` dans `.env` (les deux étaient à `true`) : le
  serveur appelle désormais réellement Plant.id (identification ET diagnostic santé, même
  clé). Sans clé valide, échec propre et déjà géré (`InternalServerErrorException("Clé API
  Plant.id invalide ou expirée.")`) plutôt qu'un faux résultat.
- **`POST /identification` n'était protégé par AUCUN guard JWT** malgré ce qu'affirmait
  `API_CONTRACT.md` ("Protégé par JWT... implicite") — bug distinct trouvé en auditant le
  contrôleur, corrigé (`@UseGuards(JwtAuthGuard)` ajouté). Nécessaire pour savoir QUI scanne
  (voir défis quotidiens ci-dessous).
- **Rejet des cas non reconnus / faible confiance** (demandé explicitement) : si
  `result.is_plant.probability < 0.3` (l'image n'est probablement pas une plante) ou si la
  meilleure suggestion a `probability < 0.05`, le back renvoie **404** avec un message clair
  plutôt qu'un résultat peu fiable présenté comme certain.
- **Nouveau champ `confiance`** (0-100, réel, `Math.round(best.probability * 100)`) — avant,
  le front affichait une **valeur de repli fixe (`FALLBACK_CONFIDENCE = 95`)**, jamais la vraie
  probabilité Plant.id. Supprimé côté front (`useIdentify.ts`), remplacé par `data.confiance`.
- **Journalisation réelle de chaque scan** (`identification_logs` : userId, plantId, date) —
  nouvelle table, sert de source de vérité pour le défi "Scanner 3 plantes différentes" (aucun
  autre moyen de savoir combien d'espèces distinctes un utilisateur a scannées aujourd'hui, un
  scan simple sans ajout au Jardin/Herbarium ne laissant sinon aucune trace).
- **Rareté dynamique** (voir -1.2) : l'aperçu `badgeRarete`/`xpGagne` renvoyé ici utilise
  désormais le même calcul réel que la capture, pour que le nombre annoncé au scan corresponde
  à ce qui sera vraiment crédité (voir bug ci-dessous).

**Bug découvert en écrivant les tests** : en implémentant la rareté dynamique, un premier jet
faisait varier `badgeRarete` UNIQUEMENT au moment de `POST /collection` (capture), pas au
moment du scan — un test e2e (`garden-flow.e2e-spec.ts`) a révélé que l'XP *annoncée* au scan
(ex. "+100 XP", rareté "Épique" car aucune capture préalable) ne correspondait plus à l'XP
*réellement créditée* quelques secondes plus tard à la capture (ex. "+50 XP", rareté
redescendue à "Rare" entre-temps) — un chiffre affiché puis contredit, ce qui est exactement le
genre d'incohérence "démo" que cette session visait à éliminer. Corrigé en faisant calculer à
`IdentificationService` le même aperçu de rareté (lecture seule, sans persister) que celui que
`CollectionService.create()` calculera réellement à la capture.

### -1.2 Rareté (`badgeRarete`) toujours "Commun" — bug pré-existant, corrigé

**Cause** : `identification.service.ts` codait en dur `const badgeRarete = 'Commun'` pour
*toute* nouvelle espèce, documenté comme bug connu dans `BACKEND_ISSUES.md` §5 mais jamais
corrigé. Conséquence : `xpGagne` valait **toujours 25**, peu importe la rareté réelle de la
découverte — un chiffre de gamification qui ne reflétait jamais rien de réel.

**Correctif** (`apps/api/src/common/rarity.ts`, nouveau) : la rareté est désormais dérivée du
nombre de fois où l'espèce a déjà été capturée par l'ensemble des utilisateurs (Jardin +
Herbarium confondus) — 0 capture préalable → `Épique` (100 XP), moins de 5 → `Rare` (50 XP),
sinon `Commun` (25 XP). Recalculée à chaque nouvelle capture (`CollectionService.create()`),
donc une espèce redevient progressivement "Commun" à mesure que la communauté la découvre —
comportement réel, dérivé de l'usage effectif de l'app, jamais une valeur figée ou aléatoire.

### -1.3 Pièces virtuelles — cause et correctif

**Cause** : aucune colonne `pieces` n'existait sur `User` ; le solde affiché
(`src/api/mock/store.ts#dailyCoinsBalance = 340`) était une constante fixe, jamais persistée,
jamais modifiée par aucune action réelle.

**Correctif** : colonne réelle `users.pieces` (défaut 0), exposée dans
`GET/PATCH /users/me`, `POST /auth/register`, `POST /auth/login`, `POST /auth/google` (tous
les endpoints qui renvoient un profil utilisateur). Créditée uniquement par le module `quests`
(voir -1.4) — jamais par une valeur arbitraire.

### -1.4 Défis du jour — module `quests` créé de toutes pièces

**Cause** : aucun module `quests` n'existait côté back (`API_CONTRACT.md` §6 marquait "🚧
Backlog intégral" explicitement). Le front affichait 3 défis et un solde de pièces
**entièrement codés en dur** (`src/api/mock/store.ts#dailyQuests`, `#dailyCoinsBalance`),
sans aucun lien avec les actions réelles de l'utilisateur.

**Correctif** — nouveau module `apps/api/src/modules/quests/` :
- Catalogue fixe de **4 défis quotidiens** (cahier des charges §6) : scanner 3 plantes
  différentes, ajouter une plante au Jardin, publier une astuce, recevoir 5 likes.
- **Progression toujours calculée en direct** depuis les vraies tables (`identification_logs`,
  `collection`, `posts`, `likes`) au moment de `GET /quests/daily` — jamais un compteur stocké
  qui pourrait diverger de la réalité :
  - `scan-3` : espèces *distinctes* identifiées aujourd'hui (pas juste le nombre d'appels —
    un test dédié vérifie que scanner deux fois la même espèce ne compte qu'une fois).
  - `add-garden` : ajouts au Jardin (`typeCollection='owned'`) aujourd'hui.
  - `publish-tip` : publications créées aujourd'hui.
  - `get-5-likes` : likes reçus aujourd'hui sur n'importe laquelle des publications.
- Récompense (XP + pièces) créditée **exactement une fois** par défi/jour/utilisateur — table
  `quest_progress`, qui ne stocke qu'un drapeau "déjà crédité" (jamais la progression, toujours
  recalculée depuis les vraies données). Un bug a été détecté puis corrigé pendant les tests
  unitaires : une relecture immédiate après écriture pouvait renvoyer une récompense à 0 même
  juste après l'avoir créditée — corrigé en faisant renvoyer directement à `creditRewardOnce()`
  si la récompense est (déjà ou désormais) créditée, sans relecture séparée.
- 🚧 Les défis "Exploration" (Geo-Tag, ex. "plante rare à plus de 1 km de chez vous") du brief
  initial ne sont **pas** implémentés : ils nécessiteraient une position de référence ("chez
  vous") qu'aucune entité ne stocke — non fait plutôt que simulé avec une fausse distance.

**Front** (`useQuests.ts`) : appelle réellement `GET /quests/daily`. Les libellés restent
traduits localement par id (`quests.scan3`, `quests.addGarden`, `quests.postTip`,
`quests.get5Likes` — 2 clés ajoutées, manquantes en fr/en/es) plutôt que d'afficher le
`libelle` français brut renvoyé par le back (aurait cassé l'anglais/espagnol déjà en place),
avec repli sur ce libelle si un id inconnu apparaissait. Après chaque fetch, `refreshUser()`
(nouveau, `AuthProvider.tsx` + `GET /users/me` via `authApi.ts#fetchProfile`) resynchronise
XP/pièces avec la vraie valeur serveur, au cas où un défi vienne de se compléter.

### -1.5 Audit élargi : deux autres comportements "démo" trouvés et corrigés

- **Filtre "Près de moi" (Communauté) non fonctionnel** : `Post` n'avait aucun champ
  géographique ; `distanceMeters` était **toujours `null`** côté front
  (`adapters.ts#toFeedPost`), donc le filtre "Près de moi" n'affichait jamais rien, quelle que
  soit la position réelle des publications. Corrigé : `Post` hérite désormais du Geo-Tag de la
  collection taguée à la création (`POST /feed/posts`) ; `GET /feed?latitude=&longitude=`
  calcule une vraie distance par haversine pour chaque post ; le front
  (`CommunityScreen.tsx`) demande la position de l'appareil quand l'utilisateur sélectionne ce
  filtre. Au passage, `tagType` (jardin perso vs découverte sauvage sur un post) était **toujours
  forcé à `'owned'`** faute d'info transmise par le back — le back expose maintenant le vrai
  `typeCollection` de la collection taguée, le front l'utilise tel quel.
- **Badge XP erroné sur la fiche plante** (`PlantDetailScreen.tsx`) : affichait un "+X XP"
  calculé depuis une table front **différente et incohérente** des vraies constantes serveur
  (`xpByRarity = {commun:15, rare:45, epique:90}` vs les vraies valeurs serveur 25/50/100) — et
  de toute façon, aucune donnée réelle ne permet de savoir combien d'XP a été gagné pour une
  capture passée (seul le total cumulé `experience` est stocké, pas un historique par capture).
  Supprimé plutôt que corrigé avec un autre chiffre inventé : rien dans le cahier des charges
  n'exige un rappel d'XP permanent sur cette fiche (l'animation "+45 XP" du cahier des charges
  est un événement de capture, sur l'écran Scan, pas un attribut persistant de la fiche).

### -1.6 Tests ajoutés/étoffés

**Backend** — 78/78 unitaires (+16 vs avant cette session), 31/31 e2e (+7) :
- `identification.service.spec.ts` : +5 tests (confiance réelle, journalisation, rejet
  image non-plante, rejet confiance trop faible, aperçu de rareté cohérent avec la capture).
- `collection.service.spec.ts` : tests de rareté réécrits pour la rareté dynamique (capture
  Épique/Rare/Commun selon le nombre de captures préalables, plus un `badgeRarete` figé en dur).
- `quests.service.spec.ts` (nouveau) : 6 tests (catalogue complet, progression partielle,
  plafonnement à l'objectif, crédit XP+pièces à la complétion, non-double-crédit, défi sans
  récompense pièces).
- `test/quests-flow.e2e-spec.ts` (nouveau) : 6 tests bout-en-bout contre un vrai Postgres —
  état initial à 0, non-inflation du comptage sur scans répétés de la même espèce, complétion
  réelle + crédit XP/pièces pour `add-garden`/`publish-tip`, non-double-crédit au rechargement,
  `get-5-likes` avec 5 vrais utilisateurs distincts qui likent.
- `test/feed-flow.e2e-spec.ts` : +1 test (Geo-Tag hérité + distance haversine réelle +
  `typeCollection` réel, avec vérification qu'aucune position fournie → distance `null` plutôt
  qu'inventée).
- `test/garden-flow.e2e-spec.ts` : 3 appels `/identification` corrigés (guard JWT ajouté, il
  leur manquait le token — cassaient sans ça).
- `test/utils/setup-e2e.ts` : force `MOCK_PLANTID`/`FORCE_MOCK=true` **pour la durée des tests
  uniquement**, indépendamment du réglage réel de `.env` (dotenv ne réécrit jamais une
  variable déjà posée dans `process.env`) — les tests restent gratuits et déterministes même
  maintenant que le serveur réel appelle Plant.id pour de vrai.

**Frontend** — 81/81 (+7) :
- `useQuests.test.tsx` (nouveau) : 5 tests (mapping réel, libellés i18n par id, repli sur
  libelle brut pour un id inconnu, solde de pièces = vrai utilisateur authentifié et non une
  constante, rafraîchissement du profil après fetch des défis).
- `adapters.test.ts` : +4 tests (`pieces` mappé/défaut à 0, `distanceMetres` réel transmis,
  `typeCollection` réel utilisé au lieu d'un défaut `owned`).
- `authApi.test.ts` : attentes mises à jour pour inclure `pieces` dans les réponses login/
  register/google.

### -1.7 Vérification fonctionnelle réelle (pas seulement les tests)

Rejoué en direct contre le serveur réellement démarré (pas seulement via les suites Jest),
par appels HTTP réels : `register` → `login` → `POST /collection` (capture d'une espèce déjà
en base, rareté recalculée en direct : `Commun` car déjà capturée ≥5 fois dans cette base de
dev) → XP créditée (25 capture + 20 défi "add-garden" = **45**, confirmé sur `GET /users/me`)
→ `POST /feed/posts` → défi "publish-tip" complet, **10 pièces réellement créditées** (`pieces`
passe de 0 à 10 sur `GET /users/me`) + 25 XP (`experience` 45→70). Chaque nombre affiché a été
vérifié correspondre exactement au calcul attendu, pas juste "une réponse 200".

**Limite honnête** : `POST /identification` contre le vrai Plant.id n'a **pas** pu être
vérifiée en conditions réelles au moment de la rédiger (clé invalide, voir -1.1). **Depuis,
Djawad a fourni une vraie clé Plant.id** (`.env` mis à jour, serveur redémarré) — le flux a pu
être entièrement rejoué avec le vrai service, une vraie photo (`test/test-image.txt`, la
fleur "Tacca chantrieri") et le vrai token JWT :

```
POST /identification (vraie clé, vraie photo) → 201
{
  "nomScientifique": "Tacca chantrieri",  ← espèce réelle, correctement identifiée (confiance 99 %)
  "famille": "Dioscoreaceae",             ← voir bug trouvé et corrigé ci-dessous
  "toxicite": "red",                      ← texte réel Plant.id ("considered toxic...") bien classé RED
  "badgeRarete": "Épique",                ← première capture mondiale de cette espèce dans cette base
  "xpGagne": 100,
  "confiance": 99
}
```

**Bug supplémentaire trouvé en testant la vraie clé (invisible avec le mock)** : `famille`
revenait toujours `null`, y compris avec une vraie réponse Plant.id qui contenait bien
`details.taxonomy.family: "Dioscoreaceae"`. Cause : `callPlantIdApi()` demandait
`details=common_names,toxicity` **sans `taxonomy`** — le mock interne, lui, fournissait
toujours une famille fixe ("Rosaceae"), ce qui masquait complètement ce bug depuis le début.
Directement pertinent pour le cahier des charges §3.2 ("Affichage du nom, de la famille
botanique, et de la toxicité"). Corrigé (`details=common_names,taxonomy,toxicity`), + 1 test
unitaire de régression (79/79 unitaires, 31/31 e2e après ce correctif), + re-vérifié en
direct : `famille` vaut désormais bien `"Dioscoreaceae"` sur une identification fraîche.

Après ce dernier correctif, toute la chaîne "photo réelle → détection réelle → capture →
XP/pièces → défis" est vérifiée réelle de bout en bout, sans plus aucun maillon simulé ni
bloqué.

Comme lors des sessions précédentes, aucun outil d'automatisation de navigateur n'était
disponible/accepté pour cette session : la vérification visuelle du rendu React Native
(animations, mise en page du toast d'erreur de scan, etc.) n'a pas pu être faite — seule la
logique (compilation, types, tests, appels HTTP réels) a été vérifiée.

### -1.8 État de complétude mis à jour (remplace les lignes correspondantes de §7 ci-dessous)

| Fonctionnalité | Back | Front | Notes |
|---|---|---|---|
| Scan / identification | ✅ **vérifié en direct avec la vraie clé** | ✅ | Guard JWT ajouté, `confiance` réelle, rejet image non reconnue/faible confiance, `famille` corrigée (manquait `taxonomy` dans la requête Plant.id), plus de résultat figé |
| XP à la capture | ✅ | ✅ | Rareté dynamique (voir -1.2) — 25/50/100 XP selon rareté réelle, plus jamais figé à 25 |
| Pièces virtuelles | ✅ | ✅ | Colonne réelle `users.pieces`, créditée par le module `quests` |
| Défis du jour | ✅ | ✅ | 4 défis quotidiens, progression et récompenses 100 % réelles (voir -1.4). Défis "Exploration" (géo) non implémentés, honnêtement absents |
| Communauté — "Près de moi" | ✅ | ✅ | Distance réelle (haversine) + `typeCollection` réel, voir -1.5 |
| Fiche plante — badge XP | — | ✅ (supprimé) | Badge faux retiré, aucune donnée réelle équivalente n'existe |

---

> Nouvelle session, même journée. Point de départ : `ApiError: Network Error` en boucle
> dans `apps/mobile/src/api/client.ts` — le front ne joignait pas du tout le back (distinct
> des écarts de contrat déjà traités en §2-4 ci-dessous, qui supposaient une connexion
> fonctionnelle). Tout ce qui suit est nouveau par rapport aux sections 1-7 ; les sections
> 1-7 ont été **re-vérifiées** et restent exactes (tests re-passés, voir §0.3).

### 0.1 Cause réelle de la Network Error

Deux causes cumulées, aucune déjà traitée par la session précédente (qui vérifiait via
`curl`/Jest, jamais depuis un vrai navigateur — donc CORS n'était jamais sollicité) :

1. **CORS absent côté back** : `apps/api/src/main.ts` n'appelait jamais
   `app.enableCors()`. Toute requête `fetch`/`axios` émise depuis un navigateur (cible web
   de `apps/mobile`) était bloquée par le navigateur avant même d'atteindre l'API.
   **Corrigé** : `app.enableCors()` ajouté dans `main.ts`, juste après la création de l'app.
2. **`API_BASE_URL` non adaptée à la plateforme** : `apps/mobile/src/api/config.ts` pointait
   en dur sur `http://localhost:3000`. Sur device physique/émulateur, `localhost` désigne
   l'appareil lui-même, pas la machine de dev. **Corrigé** : `resolveDevApiUrl()` dérive
   désormais l'IP LAN depuis `Constants.expoConfig?.hostUri` (celui que Metro utilise déjà
   pour le hot-reload — fonctionne identiquement device physique/émulateur), avec repli
   `10.0.2.2` pour l'émulateur Android si `hostUri` est indisponible, et `localhost` sur web.
   `EXPO_PUBLIC_API_URL` garde la priorité s'il est défini explicitement.

### 0.2 Backend relancé (environnement propre)

Aucun Postgres ni process API n'étaient actifs en début de session. Remis en place :
- Postgres local (instance utilisateur, hors service système, cluster **persistant** dans
  `~/.local/share/planai-postgres`, port `5433`, socket Unix dans ce même dossier — pas
  `/var/run/postgresql` qui est en écriture root-only sur cette machine). Rôle `postgres` +
  base `planai_db` créés pour correspondre à `apps/api/.env`.
- `apps/api` démarré en réel (`start:dev`, `MOCK_PLANTID=true`/`FORCE_MOCK=true` déjà présents
  dans `.env` — aucun crédit Plant.id consommé).
- Connectivité confirmée à chaque étape : `GET /` → 200, `OPTIONS /auth/login` avec en-tête
  `Origin` → `Access-Control-Allow-Origin` bien renvoyé, `register`→`login` réels → JWT valide.

### 0.3 Re-vérification de tout ce qui précède (sections 1-7)

Tout ce que la session précédente affirmait a été rejoué, pas juste relu :

- **Backend unitaire** : 60/60 ✅ (10 suites — 51 déjà existants + 9 nouveaux, voir §0.4)
- **Backend e2e** : 24/24 ✅ (5 suites, contre le Postgres réel ci-dessus)
- **Frontend** : 72/72 ✅ (12 suites, y compris après le changement de `config.ts`)
- **`tsc --noEmit`** propre des deux côtés (`apps/api`, `apps/mobile`)
- Les 3 flux d'`ARCHITECTURE.md` rejoués en HTTP réel (register/login → scan → ajout
  Herbarium avec geo-tag → XP crédité (0→25) ; ajout Jardin → photo de suivi → diagnostic →
  rappel J+5 ; publication taguée → apparaît dans le feed avec `plante` résolue → like →
  commentaire) — mêmes résultats que documentés en §6, confirmés à nouveau.

### 0.4 Gap comblé : `plants` n'avait aucun test unitaire

`PlantsService` (CRUD référentiel + garde admin) n'avait pas de `.spec.ts`, contrairement
aux 6 autres services listés dans la demande (auth, users, identification, collection,
diagnosis, feed — tous déjà couverts par la session précédente). `quests` et
`notifications` restent sans test unitaire car ces modules n'existent pas encore côté back
(🚧 Backlog, rien à tester). **Ajouté** : `apps/api/src/modules/plants/plants.service.spec.ts`
(9 tests — filtres de recherche, pagination, 404, création avec valeurs par défaut, mise à
jour partielle, refus de suppression si des collections référencent la plante).

### 0.5 Audit TODO.md — tâches front (Djawad)

Inventaire complet : **100 % des tâches attribuées à Djawad sont déjà cochées `[x]`**, et
chacune a une implémentation réelle correspondante dans le code (vérifié, pas seulement
lu — tab bar, scan, badge toxicité, Geo-Tag, +XP flottant, Jardin/Herbarium, diagnostic,
rappels, feed, stories/quêtes mockées avec commentaire explicite, thème clair/sombre
(`ThemeProvider.tsx`), i18n 3 langues (`src/i18n/locales/{fr,en,es}.json`, câblé dans
`AccountScreen.tsx`)). Aucune tâche front à implémenter.

Les tâches non cochées restantes sont **toutes** attribuées à Abdel ou "Ensemble"
(modélisation DB, CI, seed 20 espèces, RGPD formel, build EAS, `quests`, stories, "Près de
moi" géo-réel, partages). Beaucoup sont *en réalité* déjà faites côté code (auth, plants,
identification, collection+Geo-Tag, diagnosis, reminders, feed+likes+commentaires — tous
vérifiés fonctionnels ci-dessus) mais le fichier ne les coche pas. **Je n'ai pas coché ces
cases moi-même** : elles sont attribuées nommément à Abdel dans le document d'équipe, et les
cocher à sa place déborderait du périmètre de cette demande (front + réseau) — je le signale
ici plutôt que de trancher unilatéralement sur un document de coordination partagé.

### 0.6 Limite honnête (inchangée)

Comme en §6 : pas d'automatisation navigateur disponible dans cette session (proposée,
déclinée), donc pas de clic réel dans l'app. Vérification faite à deux niveaux : bundle/
compilation propres, et logique métier/contrat rejouée en HTTP réel de bout en bout — pas le
rendu visuel ni les interactions tactiles.

### 0.7 Serveurs laissés actifs (fin de session)

- Postgres : `pg_ctl -D ~/.local/share/planai-postgres` sur le port `5433` (persistant,
  survit à un redémarrage de session — contrairement à la tentative précédente dans le
  scratchpad). Arrêter avec `pg_ctl -D ~/.local/share/planai-postgres stop`.
- `apps/api` : `http://localhost:3000` (`npm run start:dev -w apps/api`).
- Le serveur Expo de l'utilisateur restait déjà actif sur le port 8081 — non redémarré pour
  ne pas interrompre sa session.

---

## 1. Bundler Expo

**Diagnostic** : l'erreur `Unable to resolve ../../App from node_modules/expo/AppEntry.js`
n'était **pas** un problème de fichier — `apps/mobile/package.json` (`"main":
"expo-router/entry"`), `app.json` (plugin `expo-router`) et le `package.json` racine
étaient déjà corrects. La cause réelle : `expo start` était lancé depuis la **racine du
monorepo** au lieu de `apps/mobile`, ce qui fait retomber Metro sur le point d'entrée Expo
par défaut (hissé à la racine par les workspaces npm) au lieu du vrai entrypoint.

**Corrigé** : serveur relancé depuis `apps/mobile`. Bundle revérifié après *tous* les
changements de ce rapport : `HTTP 200`, `Content-Type: application/javascript`, 0
occurrence d'`AppEntry` dans les ~11 Mo du bundle.

**Prévention** : un hook `post-merge` (`scripts/git-hooks/post-merge`, activé via
`core.hooksPath` + `postinstall`) détecte désormais automatiquement une régression de
`main` ou un `expo start` lancé au mauvais endroit, et purge le cache Metro à chaque merge.

Aucun marqueur de conflit Git non résolu trouvé dans le dépôt (contrairement à un merge
antérieur documenté dans `BACKEND_ISSUES.md` §2, déjà réparé avant cette session).

---

## 2. État réel du contrat d'API (écarts trouvés vs contrat/doc)

Le merge du 19/07/2026 (`80ab575`) a ajouté les modules **`diagnosis`, `plants`,
`reminders`** et complété **`/users/me`**, jusque-là documentés 🚧 *Backlog* dans
`API_CONTRACT.md`/`BACKEND_ISSUES.md` (rédigés le 16-17/07, donc antérieurs). Il n'y avait
pas de "bugs" de divergence contrat/back au sens propre — plutôt une documentation devenue
obsolète après coup. **`API_CONTRACT.md` a été réécrit** pour refléter l'état réel,
chaque endpoint marqué ✅ étant rejoué par un test e2e réel (pas juste lu dans le code).

Bugs déjà corrigés par le merge lui-même (vérifiés, rien à refaire) :
- Compilation cassée (`feed.module.ts`, imports `.ts` explicites)
- Mot de passe jamais vérifié dans `LocalStrategy` (faille d'auth)
- Détection de toxicité : `"Non toxique..."` classé RED à cause de la sous-chaîne `"toxique"`
- `uuid` ESM-only cassant Jest ; pins de version Jest pour le hoisting du monorepo

### Écart front/back non documenté, trouvé en vérifiant réellement (pas juste en lisant le code)

`GET /collection` renvoie en réalité `historiquePhotos` (vérifié par `collection.service.ts`
et un test e2e upload→relecture), mais **le front ne le lisait jamais** —
`adapters.ts#BackendCollectionItem` n'avait pas ce champ, donc `PhotoTimeline` restait
toujours vide même quand des photos existaient réellement en base. **Corrigé** :
`toGardenClone`/`toHerbariumDiscovery` résolvent maintenant les URLs et alimentent
`CollectionItem.historiquePhotos` (date de repli = `dateAjout`, faute de date par photo
côté back — limitation documentée dans le contrat).

---

## 3. Bugs backend corrigés (au-delà de ceux déjà réglés par le merge)

| # | Bug | Fichier | Gravité |
|---|-----|---------|---------|
| 1 | **L'XP n'était jamais créditée à l'utilisateur.** `POST /identification` renvoie `xpGagne`, mais rien ne l'ajoutait à `user.experience` — vérifié en réel : `experience` restait à `0` après un scan + ajout au Jardin. Casse directement l'étape finale du flux A ("Scan → Herbarium → Geo-Tag → **+XP**"). | `collection.service.ts` (`create()`), nouveau helper `common/xp.ts` | 🔴 Fonctionnel |
| 2 | `POST /auth/login` renvoyait `201` au lieu du `200` documenté et convenu dans le contrat (défaut NestJS pour `@Post`). Sans impact front (axios traite tout `2xx` pareil) mais contrat non respecté. | `auth.controller.ts` (`@HttpCode(HttpStatus.OK)` ajouté) | 🟡 Mineur |
| 3 | Tests `user.service.spec.ts` / `user.controller.spec.ts` cassés : repository TypeORM jamais mocké dans le `TestingModule` → `Nest can't resolve dependencies`. | `modules/user/*.spec.ts` | 🟠 Tests |
| 4 | `test/app.e2e-spec.ts` (squelette par défaut) testait `GET /` → *Hello World*, mais `AppController`/`AppService` n'étaient plus déclarés dans `AppModule` → 404 réel. | `app.module.ts` (`AppController`/`AppService` réenregistrés) | 🟡 Mineur |
| 5 | Toute route d'upload (`identification`, `diagnosis`, `collection/photos`) **échouait systématiquement en e2e Jest** (400, jamais en usage réel) : NestJS 11 valide le type de fichier par magic-number via le paquet ESM `file-type`, chargé dynamiquement — ce chargement échoue silencieusement sous Jest (environnement CommonJS) sans `NODE_OPTIONS=--experimental-vm-modules`. Bug d'outillage de test, pas applicatif — mais aurait rendu tout test e2e d'upload invisible/faux-négatif. | `apps/api/package.json` (script `test:e2e`) | 🟠 Tests |

---

## 4. Câblage front → back réel (étape 2)

Hooks basculés de mock à réel (chacun garde un repli mock activable via
`EXPO_PUBLIC_USE_MOCK_API=true`, voir `apps/mobile/src/api/config.ts`) :

| Hook | Avant | Après |
|------|-------|-------|
| `useCheckHealth()` | mock (`diagnosePlant`) | `POST /collection/:id/diagnosis` réel + `adapters.ts#diagnosisFromBackend` (retient la suggestion la plus probable, forme back très différente du mock : liste de suggestions pondérées vs un diagnostic unique) |
| *(nouveau)* `useCreateReminder()` | — | `POST /reminders`, appelé en parallèle de la notification locale déjà existante (le back ne fait aucun push réel — voir §7 du contrat) ; son échec ne bloque jamais la notification locale |
| `useBadges()` | mock (`mockBadges` statique) | `GET /users/me` (`insignes: string[]`) croisé avec le catalogue front via `adapters.ts#badgesFromInsignes` — limite documentée : date d'obtention approximée à "aujourd'hui" faute de date réelle côté back |
| `updateProfile()` | mock | `PATCH /users/me` réel |
| `deleteAccount(password)` | mock, sans mot de passe | `DELETE /users/me` réel, **signature changée** pour exiger le mot de passe (protection back) — `AccountScreen.tsx` a gagné un champ mot de passe inline avant confirmation, remplaçant l'`Alert.alert` seul |

Auth de bout en bout (étape 9) :
- JWT en SecureStore + intercepteur Bearer : déjà en place, vérifié fonctionnel.
- **Ajouté** : `apps/mobile/src/api/client.ts` expose `setUnauthorizedHandler()` ; sur
  toute réponse `401`, `AuthProvider` efface la session et le route guard de `_layout.tsx`
  redirige automatiquement vers `/login` (pas de refresh token côté back — un seul token
  longue durée, documenté — donc pas de tentative de refresh, juste une déconnexion propre).

Cohérence des types (étape 10) : confirmée déjà correcte — `packages/shared` reste l'unique
source des enums front (`Rarete`/`Toxicite`/`TypeCollection`/`EtatSante`), toute traduction
avec les valeurs brutes du back (`green`/`orange`/`red`, `badgeRarete` libre) isolée dans
`apps/mobile/src/api/adapters.ts`. Rien à corriger ici, c'était déjà bien fait.

Restent mockés (légitimement — aucun endpoint back n'existe) : `useQuests()`
(pas de module `quests`), `usePublishStory()` (pas d'entité `Story`), `loginWithGoogle()`
(pas de `/auth/google`), `changePassword()` (pas de `/auth/change-password`), upload photo
dans un post (pas d'endpoint générique).

---

## 5. Tests ajoutés

### Backend (`apps/api`)

**Unitaires — `npm test`** : **51/51 ✅** (9 suites)
- Nouveaux : `auth.service.spec.ts`, `identification.service.spec.ts`,
  `collection.service.spec.ts` (incl. régression du bug XP §3.1),
  `feed.service.spec.ts`, `diagnosis.service.spec.ts`, `reminders.service.spec.ts`
- Réparés + étoffés : `user.service.spec.ts`, `user.controller.spec.ts`

**E2E — `npm run test:e2e`** : **24/24 ✅** (5 suites), contre un vrai Postgres local
- `auth.e2e-spec.ts` — register/login, doublons, 401, guard JWT
- `garden-flow.e2e-spec.ts` — flux A+B complets (identification → collection → photo →
  diagnostic → rappel J+5), incl. régression XP et isolation entre utilisateurs
- `feed-flow.e2e-spec.ts` — flux C complet (post taggé → feed → like toggle → commentaire
  → suppression)
- `user-profile.e2e-spec.ts` — GET/PATCH/DELETE `/users/me`, badges
- `app.e2e-spec.ts` — health-check racine (réparé, voir §3.4)

### Frontend (`apps/mobile`)

**`npm test` — 72/72 ✅** (12 suites)
- Étoffés : `adapters.test.ts` (+`diagnosisFromBackend`, +`badgesFromInsignes`,
  +résolution `historiquePhotos`), `authApi.test.ts` (+`updateProfile`, +`deleteAccount`),
  `useMyGarden.integration.test.tsx` (mis à jour pour le vrai appel diagnostic)
- Nouveau : `useBadges.test.tsx`

Les composants demandés (`ScanResult`, `PlantCard`, `SegmentedControl`) avaient déjà une
couverture existante sous des noms différents : `IdentificationResultCard` (≈ScanResult),
`CloneCard`/`DiscoveryCard` (≈PlantCard), `SegmentedControl` — tous déjà testés avant cette
session, non dupliqués ici pour rester utile plutôt que redondant.

---

## 6. Vérification fonctionnelle (étape 4)

Un Postgres local (instance utilisateur, port 5433, hors service système — même approche
que documentée dans `BACKEND_ISSUES.md`) a été initialisé, `apps/api` démarré en réel
(`nest start`, `MOCK_PLANTID=true` + `FORCE_MOCK=true` pour ne consommer aucun crédit API
Plant.id réel), et `apps/mobile` démarré en web (`expo start --web`, bundle vérifié propre).

Les 3 flux d'`ARCHITECTURE.md` ont été rejoués par de **vrais appels HTTP contre le
serveur réellement démarré** (au-delà des tests Jest) :

- **Flux A — Scan → Herbarium → Geo-Tag → +XP** : ✅ scan → ajout Herbarium avec
  coordonnées → `GET /collection?type=discovered` montre l'item géolocalisé →
  `experience` passe de `0` à `25` (bug §3.1 confirmé corrigé en conditions réelles).
- **Flux B — Jardin → Vérifier la santé → diagnostic → rappel J+5** : ✅ scan → ajout
  Jardin → diagnostic (`estSain`/`suggestions`/`scoreGlobal`) → `etatSante` de la collection
  mis à jour → rappel créé avec `datePlanification` = J+5 → visible via `GET /reminders`.
- **Flux C — Communauté → nouvelle publication taguée** : ✅ post créé avec
  `collectionId` → `plante` bien résolue dans la réponse → visible dans `GET /feed`.

### Limite honnête sur la vérification UI

Aucun outil d'automatisation de navigateur n'était connecté à cette session
(`claude-in-chrome` non disponible) et l'environnement est headless sans caméra/simulateur.
Je n'ai donc **pas** pu cliquer réellement dans l'app (scan caméra, navigation d'onglets,
formulaires). La vérification s'est faite à deux niveaux : (1) le bundle web se compile et
se sert sans erreur avec tous les changements inclus, (2) chaque flux a été rejoué
bout-en-bout au niveau HTTP contre le serveur réel — ce qui couvre toute la logique
métier/contrat, mais pas le rendu ni les interactions React Native elles-mêmes.

### Serveurs laissés actifs

- Postgres : `pg_ctl` sur le port `5433`, data dir dans le scratchpad de session (à
  relancer manuellement dans une future session : `initdb`/`pg_ctl` ne survivent pas au
  nettoyage du scratchpad).
- `apps/api` : `http://localhost:3000` (Swagger sur `/api`).
- `apps/mobile` (web) : `http://localhost:8081`.

---

## 7. État de complétude par fonctionnalité

| Fonctionnalité | Back | Front | Notes |
|---|---|---|---|
| Auth (register/login) | ✅ | ✅ | Pas de refresh token (design assumé, un seul token longue durée) |
| Google login / changement mdp / suppression compte | 🚧 back / ✅ mock front | `/auth/google`, `/auth/change-password` inexistants. Suppression compte, elle, **réelle** (`DELETE /users/me`) |
| Scan / identification | ✅ | ✅ | Mode mock dispo (`MOCK_PLANTID`), pas de vrai score de confiance |
| XP à la capture | ✅ (corrigé cette session) | ✅ | Pas de recalcul de `niveau` server-side (backlog TODO.md phase 4, non traité — hors du bug corrigé ici) |
| Mon Jardin / Herbarium | ✅ | ✅ | Timeline photo maintenant affichée (bug §2 corrigé) |
| Vérifier la santé (diagnostic) | ✅ | ✅ | Câblé cette session |
| Rappels (J+5) | ✅ (persistance) / mock (push) | ✅ | Notification réelle = locale uniquement, back = pas de push serveur |
| Communauté (feed, likes, commentaires) | ✅ partiel | ✅ | Post = texte seul (pas d'endpoint d'upload générique), pas de géo sur les posts |
| Stories | 🚧 | 🚧 mock | Aucune entité back |
| Profil (édition, avatar, badges) | ✅ | ✅ | Câblé cette session ; préférences (thème/langue/notifs) restent mockées, pas de colonne back |
| Défis (quêtes) | 🚧 | 🚧 mock | Aucun module `quests` |
| Notifications push serveur | 🚧 | — | Aucun enregistrement de token côté back |
| Référentiel Plantes (`/plants`) | ✅ | non branché | Lecture publique dispo, pas encore utilisée par un écran front dédié |

---

## Contraintes respectées

Aucun commit ni push git effectué. `apps/api/.env` a été modifié (ajout de
`FORCE_MOCK=true`, en plus de `MOCK_PLANTID=true` déjà présent) pour garantir qu'aucun appel
réel (payant) à l'API Plant.id n'a été déclenché pendant les tests/vérifications — son
contenu (secrets) n'a jamais été affiché dans les réponses de cette session.
