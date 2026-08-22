# PlanAI — Contrat d'API (v1 — état réel du backend, mis à jour le 24/07/2026)

> **Mise à jour du 24/07/2026 (ter)** : stories réécrites pour un comportement identique aux
> statuts WhatsApp (demande de Djawad) — plusieurs médias d'un même auteur regroupés en UNE
> bulle (`GET /stories` renvoie désormais des `StoryGroupDto`, plus des entités `Story` à
> plat), vues persistées et idempotentes (`POST /stories/:mediaId/view`), liste "vu par"
> réservée à l'auteur (`GET /stories/:mediaId/viewers`). Voir §5 pour la forme complète et
> `rapport.md` pour la vérification bout-en-bout avec de vraies données. Vidéo délibérément
> hors scope cette passe (voir §5).
>
> **Mise à jour du 23/07/2026** : audit "no démo" — plusieurs fonctionnalités renvoyaient un
> résultat fixe/mocké au lieu de données réelles (voir `rapport.md` §0 pour le détail complet
> de chaque cause + correctif). Résumé : module `quests` créé (4 défis quotidiens, progression
> réelle), `users.pieces` (pièces virtuelles) ajouté et crédité réellement, `badgeRarete`
> n'est plus figé à `"Commun"` (rareté dynamique selon les captures réelles), `POST
> /identification` protégé par JWT + renvoie un vrai score de confiance + rejette les images
> non reconnues/peu fiables, `GET /feed` calcule une vraie distance ("Près de moi" ne renvoyait
> jamais rien de réel avant), `MOCK_PLANTID`/`FORCE_MOCK` désactivés par défaut.
>
> **Mise à jour du 21/07/2026** : le merge du 19/07/2026 (`80ab575`) a ajouté les modules
> `diagnosis`, `plants`, `reminders` et complété `/users/me`, jusque-là marqués 🚧 Backlog
> ci-dessous. Ce document a été relu et corrigé en conséquence — chaque endpoint listé ✅
> a été rejoué par un test e2e réel (`apps/api/test/*.e2e-spec.ts`, supertest + Postgres),
> pas seulement lu dans le code.

> Accord front/back : **Djawad** (mobile) et **Abdel** (API) codent chacun contre CE document.
> Toute modification se discute à deux AVANT d'être codée, puis est reflétée ici et dans `packages/shared`.
>
> **Ce document décrit ce que `apps/api` fait réellement aujourd'hui**, vérifié par des
> appels HTTP réels (pas juste une lecture du code). Les endpoints/champs qui n'existent pas
> encore sont marqués 🚧 **Backlog** avec la forme qu'ils auront une fois codés — ils ne sont
> plus présentés comme déjà disponibles. Voir `BACKEND_ISSUES.md` pour les bugs (par
> opposition aux fonctionnalités simplement pas encore faites) trouvés en connectant le front
> dessus, avec leurs correctifs proposés.

**Base URL** : `http://localhost:3000` (dev). Pas de préfixe `/v1` pour l'instant — à ajouter
plus tard via `app.setGlobalPrefix('v1')` dans `main.ts` si on veut vraiment le respecter (URL
de prod `https://api.planai.app` pas encore définie/déployée).
**Auth** : JWT Bearer dans le header `Authorization: Bearer <token>` (sauf `POST /auth/register`
et `POST /auth/login`, publics). Un seul token, longue durée — pas de refresh token (🚧 Backlog).
**Format** : JSON, `camelCase`. Dates en ISO 8601 UTC.
**Erreurs** (toutes routes, format NestJS standard — vérifié) :

```json
{ "statusCode": 401, "error": "Unauthorized", "message": "Email ou mot de passe incorrect." }
```

## Enums réellement utilisés par le back

Le back **n'importe pas** `packages/shared` : il définit ses propres enums dans
`apps/api/src/entities/enums/*.enum.ts`, hérités du schéma initial de `ARCHITECTURE.md`
plutôt que des noms français décidés plus tard côté front. Ce sont ceux-ci qui circulent
réellement sur le réseau :

```ts
// apps/api/src/entities/enums/*.enum.ts
enum ToxicityLevel { GREEN = 'green', ORANGE = 'orange', RED = 'red' }
enum HealthStatus  { GOOD = 'green', WARNING = 'orange', DANGER = 'red' }
enum PlantType     { OWNED = 'owned', DISCOVERED = 'discovered' }
// La "rareté" n'est PAS un enum côté back : `badgeRarete` est une string libre
// (`string | null`), et vaut toujours "Commun" en pratique — voir BACKEND_ISSUES.md §5.
```

**Côté front**, `packages/shared` garde ses propres types internes, pensés pour l'UI
(`Toxicite = 'toxique'|'non_toxique'|'incertaine'`, `EtatSante = 'sain'|'alerte'|'malade'`,
`Rarete = 'commun'|'rare'|'epique'`) — ce sont eux qui pilotent les couleurs/icônes/labels
i18n déjà construits. La traduction entre les deux mondes se fait **à un seul endroit** :
`apps/mobile/src/api/adapters.ts` (fonctions `toxiciteFromBackend`, `etatSanteFromBackend`,
`rareteFromBadge`). Aucun autre fichier front ne connaît les valeurs `green`/`orange`/`red`.
Si un jour le back migre vers les enums `packages/shared`, seul ce fichier change.

---

## Légende

- ✅ **Implémenté et vérifié** (appelé en réel depuis le front, `apps/mobile`)
- 🚧 **Backlog** — n'existe pas encore côté back ; le front reste sur des données mockées
  pour cette fonctionnalité (voir le hook correspondant dans le tableau final)

---

## Correspondance modules / phases (ARCHITECTURE.md & TODO.md)

| Section           | Module NestJS (réel)                              | Statut | Qui (back / front)                             |
| ----------------- | --------------------------------------------------| ------ | ----------------------------------------------- |
| §1 Auth           | `auth`                                             | ✅ partiel | Abdel / Djawad                             |
| §2 Utilisateur    | `user` (`GET/PATCH/DELETE /users/me`, avatar, badges) | ✅ partiel | Abdel / Djawad                          |
| §3 Identification | `identification` (proxy Plant.id, mode mock dispo) | ✅ partiel | Abdel / Djawad                             |
| §4 Collection     | `collection` + `diagnosis` (`POST /collection/:id/diagnosis`) | ✅ partiel | Abdel / Djawad                 |
| §5 Communauté     | `feed` + `stories`                                 | ✅     | Abdel / Djawad                                 |
| §6 Défis          | `quests` (4 défis quotidiens, progression réelle)  | ✅ partiel | Abdel / Djawad                             |
| §7 Rappels        | `reminders` (CRUD réel, pas de push serveur)       | ✅ partiel | Abdel / Djawad                             |
| §8 Plantes        | `plants` (lecture publique, écriture admin)        | ✅     | Abdel                                          |

Le référentiel `plants` a désormais son propre module exposé (`GET /plants`,
`GET /plants/:id`, publics) ; les plantes continuent d'être créées à la volée par
`identification`, mais peuvent aussi être consultées directement via ce module.

---

## 1. Auth 🔓

### ✅ POST /auth/register

```json
// Body
{ "email": "djawad@planai.app", "username": "Djawad", "motDePasse": "********" }
// 201 — PAS de token (contrairement à ce qu'on avait envisagé)
{ "id": "uuid", "email": "djawad@planai.app", "username": "Djawad", "experience": 0, "niveau": 1, "insignes": [] }
```

Le front enchaîne un `POST /auth/login` juste après pour obtenir un token et connecter
l'utilisateur immédiatement (voir `apps/mobile/src/features/auth/authApi.ts`).

### ✅ POST /auth/login

```json
// Body
{ "email": "djawad@planai.app", "motDePasse": "********" }
// 200
{ "accessToken": "jwt...", "user": { "id": "uuid", "email": "...", "username": "...", "experience": 0, "niveau": 1, "insignes": [] } }
```

⚠️ Champ `motDePasse`, pas `password`. Pas de `refreshToken` dans la réponse.

### ✅ POST /auth/google

```json
// Body
{ "idToken": "google-id-token..." }
// 200 — même forme que POST /auth/login
{ "accessToken": "jwt...", "user": { "id": "uuid", "email": "...", "username": "...", "experience": 0, "niveau": 1, "insignes": [], "pieces": 0 } }
```

Vérifie le `idToken` avec `google-auth-library` (`OAuth2Client.verifyIdToken`, audience =
`GOOGLE_CLIENT_ID` côté `.env` back — **doit être le Client ID OAuth "Application Web"**, le
même que `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` côté front, y compris pour un idToken obtenu sur
iOS/Android : l'audience d'un idToken Google Sign-In est toujours celle du client Web). 401 si
le token est invalide/expiré, si `GOOGLE_CLIENT_ID` n'est pas configuré côté serveur, ou si
l'email du compte Google n'est pas vérifié. Si aucun compte n'existe encore pour cet email, il
est créé à la volée (pseudo dérivé du prénom/nom Google, dédupliqué si collision ; mot de passe
= hash aléatoire jamais communiqué, ce compte ne peut se connecter que via Google tant qu'aucun
mot de passe n'est défini par ailleurs). Un compte email/mot de passe existant avec le même
email se connecte aussi via ce flux (fusion par email, pas de champ `googleId` dédié).

⚠️ Le SDK natif (`@react-native-google-signin/google-signin`, côté `apps/mobile`) ne fonctionne
**pas dans Expo Go** — nécessite un build de développement (EAS ou `expo run:android`/`run:ios`,
voir `rapport.md`). Le bouton "Continuer avec Google" se désactive proprement dans Expo Go
(`googleAuth.native.ts` détecte `Constants.executionEnvironment === ExecutionEnvironment.
StoreClient` et n'appelle jamais le module natif dans ce cas — un `require()` direct y ferait
planter tout l'écran de connexion, non rattrapable par un `try/catch` classique).

### 🚧 POST /auth/refresh, POST /auth/change-password, DELETE /auth/account

Aucun de ces 3 endpoints n'existe. Forme prévue si/quand ils sont codés :

```json
// POST /auth/refresh — body: { "refreshToken": "jwt..." } → { "accessToken", "refreshToken" }
// POST /auth/change-password — body: { "currentPassword", "newPassword" } → 204
// DELETE /auth/account — body: { "password" } → 204 (soft delete, dateSuppression déjà en base)
```

Note : la suppression de compte existe déjà, mais via `DELETE /users/me` (§2 ci-dessous), pas
`DELETE /auth/account`.

### Point d'attention : `UserController` (`/user/register`, `/user/email`)

Un second contrôleur existe (`apps/api/src/modules/user/user.controller.ts`), avec
`POST /user/register` et `GET /user/email?email=...`, séparé de `AuthController`. Le front
**n'utilise que `/auth/*`**. À vous deux de décider si `UserController` doit disparaître ou
devenir la vraie base de la §2 (profil) ci-dessous.

---

## 2. Utilisateur

### ✅ GET /users/me

```json
// 200
{
  "id": "uuid", "email": "djawad@planai.app", "username": "Djawad",
  "experience": 2480, "niveau": 12, "insignes": ["botaniste-debutant"], "pieces": 340, "urlAvatar": null
}
```

⚠️ **Mise à jour du 23/07/2026** : `pieces` (pièces virtuelles, TODO.md phase 4) est un vrai
champ persisté (`users.pieces`, colonne réelle), crédité par le module `quests` — voir §6.
Ce n'était jusqu'ici qu'un solde fixe codé en dur côté front
(`src/api/mock/store.ts#dailyCoinsBalance`), remplacé par cette vraie donnée.

Pas de `preferences` (thème/langue/notifications/geo-tag) : ces réglages restent
**entièrement mockés côté front** (`apps/mobile/src/features/account/usePreferences.ts`),
faute de colonne dédiée côté back. `insignes` est juste un tableau d'identifiants de badges
(strings), sans nom/description/date d'obtention — voir §"Conventions de branchement" pour
la façon dont le front reconstitue l'affichage complet.

### ✅ PATCH /users/me

```json
// Body partiel — { "email"?, "username"?, "urlAvatar"? } → 409 si email/pseudo déjà pris
// 200 — même forme que GET /users/me
```

Pas de champ `preferences` ici non plus, et pas de changement de mot de passe (voir
`POST /auth/change-password`, toujours 🚧 Backlog).

### ✅ POST /users/me/avatar

`multipart/form-data`, champ `image`. Stocke le fichier sous `apps/api/uploads/avatars/` et
renvoie le profil à jour (`urlAvatar` pointant vers `/uploads/avatars/...`).

### ✅ POST /users/me/badges

```json
// Body { "badge": "botaniste-debutant" } → 201, ajoute l'id au tableau insignes (idempotent)
```

Pas de `GET /users/me/badges` dédié : la liste des badges obtenus se lit dans `insignes`
via `GET /users/me`.

### ✅ DELETE /users/me

```json
// Body { "motDePasse": "..." } → 401 si incorrect, sinon 200 { "success": true, "message": "..." }
```

Soft delete (`dateSuppression`) — vérifié : un login après suppression renvoie bien 401.

---

## 3. Identification (Scan)

### ✅ POST /identification

`multipart/form-data`, champ **`image`** (pas `photo`), jpeg/png/webp, 5 Mo max. Pas de
`latitude`/`longitude` en entrée. **Protégé par JWT** (`@UseGuards(JwtAuthGuard)` réellement
posé sur le contrôleur depuis le 23/07/2026 — ne l'était pas avant, malgré ce que disait déjà
cette ligne : corrigé car sans `userId` connu, impossible de journaliser qui identifie quoi
pour le défi quotidien "Scanner 3 plantes", voir §6).

```json
// 201
{
  "plantId": "uuid",
  "nomScientifique": "Rosa gallica",
  "nomCommun": "Rose de France",
  "famille": "Rosaceae",
  "toxicite": "red",              // ToxicityLevel — voir §"Enums" plus haut
  "badgeRarete": "Rare",          // dynamique, voir ci-dessous — plus jamais figé à "Commun"
  "conseilsEntretien": null,      // toujours null en pratique, voir BACKEND_ISSUES.md §5
  "urlImage": null,               // toujours null en pratique
  "xpGagne": 50,                  // dépend de badgeRarete — 25 (Commun) / 50 (Rare) / 100 (Épique)
  "confiance": 92                 // score réel Plant.id (0-100), voir ci-dessous
}
```

⚠️ **Mise à jour du 23/07/2026** (corrige BACKEND_ISSUES.md §5, résout un comportement "démo"
signalé par Djawad) :
- `badgeRarete` n'est plus jamais figé à `"Commun"` : il est recalculé à chaque identification
  et à chaque capture (`POST /collection`) selon le nombre de fois où l'espèce a déjà été
  capturée par la communauté (0 capture préalable → `Épique`, < 5 → `Rare`, sinon `Commun` —
  voir `apps/api/src/common/rarity.ts`). `xpGagne` en découle directement
  (`calculateXpForRarity`, `apps/api/src/common/xp.ts` : 25/50/100). La valeur renvoyée ici est
  un **aperçu** basé sur les captures existantes au moment du scan ; `POST /collection`
  recalcule la même formule au moment de la capture réelle et crédite l'XP correspondante —
  les deux coïncident sauf capture concurrente entre les deux appels (cas rare).
- Nouveau champ **`confiance`** (0-100) : probabilité réelle renvoyée par Plant.id pour la
  meilleure suggestion. En dessous de 5 %, ou si Plant.id indique une probabilité < 30 % que
  l'image contienne une plante (`result.is_plant.probability`), le back renvoie **404** plutôt
  qu'un résultat peu fiable ("Aucune plante détectée..." / "...pas identifiée avec suffisamment
  de certitude...") — le front affiche alors un message explicite au lieu de rester silencieux.
- Chaque identification réussie est journalisée (`identification_logs` : userId, plantId,
  date) — sert uniquement au défi quotidien "Scanner 3 plantes" (§6), pas exposé via l'API.

⚠️ **Mise à jour du 23/07/2026 (bis)** — `toxicite` était calculée en cherchant des mots-clés
("toxic"/"toxique") dans le texte libre `details.toxicity` de Plant.id : dès que ce mot
apparaissait n'importe où (même à propos d'une seule partie de la plante), toute l'espèce
était classée `red`. Vérifié en conditions réelles : la **tomate** et la **mangue** — deux
fruits comestibles très communs — étaient toutes deux classées `red` à cause de ça. Corrigé
(`apps/api/src/common/toxicity-classifier.ts`) en s'appuyant d'abord sur `edible_parts`
(détail structuré Plant.id listant les parties réellement comestibles, jusqu'ici jamais
demandé) : espèce sans texte de toxicité → `orange` (incertaine, jamais une fausse assurance
`green`) ; texte qui mentionne un risque réel MAIS au moins une partie comestible listée
(tomate, mangue) → `orange` ; aucune partie comestible + risque mentionné → `red` ; texte
rassurant ou négation explicite → `green`.

`MOCK_PLANTID=true` (variable d'env) bascule sur une réponse Plant.id simulée sans consommer
de crédits API pendant le dev — **désactivé par défaut désormais** (`MOCK_PLANTID=false` dans
`apps/api/.env`), l'objectif étant un fonctionnement réel. Nécessite une vraie
`PLANT_ID_API_KEY` (https://web.plant.id) ; sans clé valide, l'endpoint échoue avec un message
clair ("Clé API Plant.id invalide ou expirée") plutôt que de renvoyer un résultat fictif.

✅ **Vérifié en conditions réelles le 23/07/2026** avec une vraie clé et une vraie photo :
espèce correctement identifiée (confiance 99 %), rareté "Épique" (première capture mondiale de
l'espèce dans cette base), XP et pièces réellement crédités. Deux bugs supplémentaires ont été
trouvés à cette occasion (tous deux masqués par le mock, qui fournissait toujours une famille
et une toxicité fixes) :
- La requête ne demandait pas `taxonomy` à Plant.id, donc `famille` restait toujours `null`
  même avec une vraie réponse qui la contenait.
- `toxicite` était mal classée pour les espèces partiellement toxiques (tomate, mangue) —
  voir la mise à jour ci-dessus.

`details=` final : `common_names,taxonomy,toxicity,edible_parts`.

---

## 4. Collection (Jardin + Herbarium)

### ✅ POST /collection

```json
// Body
{ "plantId": "uuid", "type": "owned", "latitude": 49.417, "longitude": 2.826 }
// latitude/longitude optionnels (omis si Geo-Tag refusé)
// 201
{ "id": "uuid", "idUtilisateur": "uuid", "idPlante": "uuid", "type": "owned", "etatSante": "green", "dateAjout": "...", "latitude": null, "longitude": null }
```

### ✅ GET /collection?type=owned|discovered

```json
// 200 — tableau à plat, PAS de champ `plante` imbriqué (les infos plante sont aplaties)
[
  {
    "id": "uuid",
    "idPlante": "uuid",
    "nomScientifique": "Lavandula angustifolia",
    "nomCommun": "Lavande vraie",
    "famille": "Lamiaceae",
    "badgeRarete": "Commun",
    "toxicite": "green",
    "etatSante": "red",
    "dateAjout": "2026-07-09T09:00:00.000Z",
    "urlImage": "https://plant-id.../lavande.jpg",
    "aPropos": "Description réelle de l'espèce (Plant.id), null si jamais renseignée pour cette plante.",
    "conseilsEntretien": { "lumiere": "...", "sol": "...", "arrosage": "...", "multiplication": "..." },
    "latitude": 45.75,
    "longitude": 4.85,
    "historiquePhotos": [],
    "dernierDiagnostic": {
      "maladieNom": "Septoriose",
      "scoreGlobal": 91,
      "traitement": { "biologique": "...", "chimique": "...", "prevention": "..." },
      "description": "...",
      "estSain": false,
      "dateDiagnostic": "2026-07-24T10:42:17.304Z"
    }
  }
]
```

⚠️ **Ajout du 24/07/2026** : `dernierDiagnostic` (`null` si la plante n'a jamais été
diagnostiquée) — dernier résultat de `POST /collection/:id/diagnosis`, **réécrit à chaque
appel** (jamais un historique multi-entrées). Alimente le bouton "Voir le diagnostic" côté
front (Mon Quotidien) : n'affiche ce bouton que si `etatSante === 'red'` ET ce champ
non-null ; s'il redevient sain (`etatSante: 'green'`), le champ est réécrit avec
`estSain: true`/`maladieNom: null` plutôt que supprimé — le bouton se masque côté front sans
perdre la donnée en base. Voir `ARCHITECTURE.md` pour la forme complète, `rapport.md` pour le
détail de la fonctionnalité.

⚠️ **Mise à jour du 23/07/2026 (ter)** : `famille` manquait de ce DTO (`GetCollectionResponseDto`)
alors que le référentiel `plants` l'a bien en base et que `POST /identification` le renvoie déjà
— la fiche plante affichait donc "Famille : " vide pour toute plante consultée depuis Mon
Jardin/Herbarium. Corrigé (`collection.service.ts`, les 3 méthodes qui aplatissent `plante`).
`aPropos`/`conseilsEntretien`/`urlImage` sont bien dans ce DTO depuis la session précédente (pas
un nouveau champ), mais restent `null` pour toute plante capturée **avant** l'ajout de cette
fonctionnalité — voir `rapport.md` pour la limite du backfill paresseux (seulement au prochain
scan de cette espèce, jamais rétroactif sans nouvel appel Plant.id).

Pas de `lieuLabel` (reverse-geocoding), pas de `distanceMetres`, pas de `prochainArrosage` —
le front n'a donc rien à afficher pour le lieu nommé ou le prochain arrosage. Pas de
paramètre `sort`.

⚠️ **Correction du 21/07/2026** : contrairement à ce que disait cette section jusqu'ici,
`historiquePhotos` **est bien inclus** dans cette réponse (`collection.service.ts`,
`GetCollectionResponseDto`) — vérifié par un test e2e qui uploade une photo puis relit la
liste. Le front ne l'affichait pas car `apps/mobile/src/api/adapters.ts` ne mappait pas ce
champ ; corrigé (`toGardenClone`/`toHerbariumDiscovery` résolvent maintenant les URLs et
alimentent `PhotoTimeline`, avec `dateAjout` de la collection en repli faute de date par
photo côté back).

### ✅ POST /collection/:id/photos

`multipart/form-data`, champ **`image`**. Stocke le fichier sous
`apps/api/uploads/collections/:id/<uuid>.<ext>` et sert `/uploads/...` en statique.

```json
// 201
{ "historiquePhotos": ["/uploads/collections/<id>/<uuid>.jpg"] }
```

`GET /collection` renvoie bien `historiquePhotos` (voir §4 ci-dessus, `aPropos`/etc.) — le
front peut réafficher l'historique après coup.

⚠️ **Mise à jour du 24/07/2026** : le fichier était bien accepté (201) mais **jamais
réellement récupérable ensuite** — `GET /uploads/collections/:id/<uuid>.<ext>` renvoyait 404
malgré le 201, parce que le fichier était écrit un niveau de dossier trop profond
(`apps/api/dist/uploads/...` au lieu de `apps/api/uploads/...`, bug de calcul de chemin relatif
à `__dirname`, présent aussi sur l'avatar et la photo de diagnostic ci-dessous). Corrigé
(`collection.service.ts`, `diagnosis.service.ts`, `user.controller.ts`) et **vérifié par un
vrai `GET` HTTP sur le fichier renvoyé** (`diff` octet pour octet, pas seulement la forme de
l'URL) — voir `rapport.md` §-4.4. C'est désormais la vraie photo prise par l'utilisateur au
scan qui est uploadée ici en priorité (`ScanScreen.tsx`, juste après `POST /collection`), pour
qu'elle reste affichée telle quelle plutôt que l'image générique de l'espèce (`urlImage`).

### ✅ POST /collection/:id/diagnosis

`multipart/form-data`, champ **`image`** — en pratique, désormais **toujours envoyée** par le
front (`useCheckHealth()` ouvre l'appareil photo avant d'appeler cet endpoint, voir
`rapport.md` §-4.2). Reste optionnelle côté back : si absente, réutilise la dernière photo de
`historiquePhotos` (400 si aucune photo n'existe — c'était systématiquement le cas pour une
plante tout juste ajoutée au Jardin avant le correctif front du 24/07/2026, d'où "Vérifier la
santé" qui semblait ne rien faire). Protégé JWT + vérifie que la collection appartient à
l'appelant (404 sinon). Met à jour `etatSante` de la collection **et** `dernierDiagnostic`
(maladie, confiance, traitement, date — voir §4 ci-dessus et `ARCHITECTURE.md`), pour que le
front puisse rouvrir ce diagnostic plus tard sans relancer d'analyse (bouton "Voir le
diagnostic", ajouté le 24/07/2026).

```json
// 201
{
  "estSain": false,
  "probabiliteSante": 0.3,
  "suggestions": [
    { "id": "...", "nom": "Septoriose", "probabilite": 0.91, "estNuisible": true,
      "traitement": { "biologique": "...", "chimique": "...", "prevention": "..." },
      "description": "..." }
  ],
  "scoreGlobal": 91
}
```

⚠️ Forme différente de ce qu'annonçait la version précédente de ce contrat
(`{maladie, confiance, traitement, nouvelEtatSante}`) : c'est une **liste de suggestions**
pondérées, pas un diagnostic unique. `FORCE_MOCK=true` (voir `.env`) bascule sur un tirage
aléatoire (70% de chances d'être sain) sans appeler l'API Plant.id Health réelle (payante) —
**désactivé par défaut désormais** (`FORCE_MOCK=false`, mise à jour du 23/07/2026) : le tirage
aléatoire était lui aussi un comportement "démo" repéré lors de l'audit, `useMock` ne vaut
maintenant `true` que si `PLANT_ID_API_KEY` est réellement absente (repli honnête, pas un choix
délibéré de simuler). Le front (`adapters.ts#diagnosisFromBackend`) retient la suggestion la
plus probable pour rester compatible avec l'affichage actuel (un seul diagnostic).

⚠️ **Mise à jour du 24/07/2026** : l'appel réel à Plant.id Health échouait **systématiquement**
(500) — `health`/`details`/`language` étaient envoyés dans le corps JSON au lieu de la query
string (comme `POST /identification`, déjà correct). Corrigé
(`?health=all&details=...&language=fr` en query, `{images, similar_images}` en corps) et
vérifié avec une vraie clé. Au passage : `traitement.{biologique,chimique,prevention}` — Plant.id
renvoie en réalité des **tableaux** de conseils, joints en texte côté back (`joinTreatment()`),
jamais une catégorie vide inventée.

---

## 5. Communauté

### ✅ GET /feed?page=&limit=&latitude=&longitude=&filter=&radiusMetres=

```json
// 200 — enveloppe paginée, PAS un tableau nu
{
  "items": [
    {
      "id": "uuid",
      "idUtilisateur": "uuid",
      "contenuTexte": "Trouvée en pleine floraison...",
      "imageUrl": "/uploads/posts/.../photo.jpg",
      "dateCreation": "2026-07-15T08:00:00.000Z",
      "auteur": { "id": "uuid", "username": "Marco_Botanic", "urlAvatar": null },
      "plante": { "id": "uuid", "nomScientifique": "...", "nomCommun": "...", "badgeRarete": "Commun", "urlImage": null },
      "typeCollection": "discovered",
      "likesCount": 248,
      "commentairesCount": 31,
      "estLikedParUtilisateur": false,
      "distanceMetres": 2340
    }
  ],
  "total": 1
}
```

`plante` absent si aucune collection taguée.

- `Post` a `latitude`/`longitude` (nullable), **hérités automatiquement de la collection
  taguée** au moment de `POST /feed/posts` (si cette collection a un Geo-Tag — sinon restent
  `null`, honnêtement, pas de valeur inventée).
- `latitude`/`longitude` en **query params** de `GET /feed` (position actuelle de l'appelant,
  optionnels) : si fournis, chaque post reçoit un `distanceMetres` réel (formule de
  haversine, `FeedService.haversineMeters`).
- Nouveau champ **`typeCollection`** (`owned`/`discovered`) : type réel de la collection taguée.

⚠️ **Mise à jour du 24/07/2026** (filtre "Près de moi" déplacé côté serveur, vérifié
end-to-end avec des données géolocalisées réelles — voir rapport.md) :
- `filter=near` (optionnel, `all` par défaut) : quand fourni **avec** `latitude`/`longitude`,
  le filtrage par rayon est fait **en SQL** (`acos`/`cos`/`sin`/`radians` Postgres natifs, pas
  de PostGIS), pas côté client — seuls les posts géolocalisés dans le rayon sont renvoyés par
  le back, pas seulement les premiers de la page. Sans position fournie, `filter=near` renvoie
  une liste vide plutôt qu'un filtrage incohérent.
- `radiusMetres` (optionnel, défaut `5000`) : rayon de recherche en mètres, actif uniquement
  avec `filter=near` + position.

### ✅ POST /feed/posts *(pas `POST /feed`)*

```
// multipart/form-data
contenuTexte: string
collectionId?: uuid
image?: file (jpg/jpeg/png/webp, 5 Mo max)
imageUrl?: string   // repli JSON : utilisé seulement si aucun fichier `image` n'est fourni
// 201 → même forme qu'un item de GET /feed
```

⚠️ **Mise à jour du 24/07/2026** : `POST /feed/posts` accepte désormais un vrai fichier
multipart (`image`), écrit sur disque dans `uploads/posts/` — la photo prise dans le
composeur est réellement envoyée et persistée (vérifié : fichier sur disque + servi via
`/uploads/posts/...` + visible dans `GET /feed`). `imageUrl` (JSON, ancien comportement) reste
accepté en repli pour compatibilité descendante, mais n'est plus le chemin utilisé par le front.

### ✅ POST /feed/posts/:id/like *(pas `POST /feed/:id/like`)*

```json
// 200 (toggle)
{ "liked": true, "likesCount": 249 }
```

### ✅ POST /feed/posts/:id/comments · GET /feed/posts/:id/comments

Forme cohérente avec `CreateCommentResponseDto`. Branché côté front depuis le 24/07/2026 via
`CommentsSheet.tsx` (bottom sheet ouvert depuis le compteur de commentaires d'un post).

### ✅ DELETE /feed/posts/:id

Supprime, seulement si l'appelant est l'auteur.

### ✅ GET /stories · POST /stories · POST /stories/:mediaId/view · GET /stories/:mediaId/viewers

**Mise à jour du 24/07/2026 (bis)** : réécrit pour un comportement **identique aux statuts
WhatsApp** (demande explicite de Djawad), en remplacement de la version initiale ci-dessus
(une bulle par média). Nouvelle entité `StoryView` (`storyId` + `viewerId`, unique), colonne
`mediaType` ajoutée sur `Story`. Module `apps/api/src/modules/stories`, logique dans
`StoriesService` (`getGroupedStories`, `createStoryMedia`, `recordView`, `getViewers`).

**Chaque média garde sa propre entité et sa propre expiration `+24h` indépendante** (comme
WhatsApp : les statuts d'un même jour n'expirent pas tous à la même seconde) — le
**regroupement en bulles par auteur se fait à la lecture** (`GET /stories`), pas via une table
de groupe dédiée.

```json
// GET /stories → 200 — bulles groupées par auteur, médias actifs uniquement
// (dateExpiration > maintenant). Tri : bulles avec au moins un média non vu par l'appelant
// d'abord (activité la plus récente en tête), puis les bulles entièrement vues.
[
  {
    "idUtilisateur": "uuid",
    "username": "Djawad",
    "urlAvatar": null,
    "estMoi": false,             // true si l'appelant est l'auteur ("Ta story")
    "entierementVue": false,     // true seulement si TOUS les médias ont été vus par l'appelant
    "medias": [
      {
        "id": "uuid",
        "urlMedia": "/uploads/stories/....jpg",
        "mediaType": "image",    // "video" existe dans le modèle mais jamais renvoyé en pratique — voir note ci-dessous
        "dateCreation": "2026-07-24T12:48:49.263Z",
        "dateExpiration": "2026-07-25T12:48:49.262Z",
        "vuParMoi": false,       // toujours true pour ses propres médias (estMoi)
        "vuesCount": 0           // nombre de vues distinctes, tous appelants confondus
      }
    ]
  }
]
```

```
// POST /stories — multipart/form-data, champ `image`
image: file (jpg/jpeg/png/webp, 5 Mo max — vidéo explicitement rejetée, voir note ci-dessous)
// 201 → CreateStoryResponseDto (forme "à plat", pas un StoryGroupDto) :
{ "id", "idUtilisateur", "username", "urlAvatar", "urlMedia", "mediaType", "dateCreation", "dateExpiration" }
```

S'empile dans la bulle existante de l'auteur pour la journée (comportement "ajouter un
média" façon statut WhatsApp) plutôt que de créer une bulle séparée — vérifié en réel :
publier 2 médias à la suite renvoie bien 1 seule entrée dans `GET /stories` avec
`medias.length === 2`.

```
// POST /stories/:mediaId/view — 204, aucun corps
```

Enregistre une vue idempotente (`storyId`+`viewerId` unique en base) : un second appel du même
viewer sur le même média ne duplique jamais la vue ni le `vuesCount`. **Aucun effet si
l'appelant est l'auteur du média** (comportement WhatsApp : on ne "voit" jamais son propre
statut — vérifié : 204 renvoyé, mais l'auteur n'apparaît jamais dans `GET
/stories/:mediaId/viewers`).

```
// GET /stories/:mediaId/viewers → 200 — réservé à l'auteur du média, 403 sinon
[
  { "idUtilisateur": "uuid", "username": "...", "urlAvatar": null, "dateVue": "2026-07-24T15:52:23.681Z" }
]
```

Triés vue la plus récente en premier. Comportement WhatsApp : privé, jamais consultable par
quelqu'un d'autre que l'auteur (vérifié : 403 `Forbidden` pour tout autre appelant).

Une story expirée (`dateExpiration <= maintenant`) n'est jamais renvoyée par `GET /stories`,
même comme média isolé dans une bulle par ailleurs active (vérifié : forcer l'expiration d'un
média en base le fait disparaître de la bulle au prochain `GET /stories`, sans affecter les
autres médias actifs de la même bulle) — pas de purge en base pour l'instant (les lignes
expirées restent en base mais invisibles), pas de suppression manuelle par l'auteur.

⚠️ **Portée vidéo (décision du 24/07/2026)** : le modèle de données supporte `mediaType:
'video'` (colonne enum, détection par `mimetype` côté service), mais **`POST /stories` rejette
aujourd'hui tout fichier vidéo** — le `FileTypeValidator` du contrôleur n'autorise que
`jpg/jpeg/png/webp` (vérifié : upload d'un `.mp4` → 400 `Validation failed`). Décision
délibérée plutôt qu'un oubli : activer la vidéo demande une lib de lecture native côté mobile
(aucune installée, `expo-video`/`expo-av` absents de `package.json`) qui n'a pas pu être
testée sur device dans cette session — voir `rapport.md` pour le détail. La branche vidéo du
service (`StoriesService#createStoryMedia`) reste du code mort tant que le contrôleur bloque
ces fichiers ; elle est conservée pour ne pas devoir retoucher le modèle de données le jour où
la vidéo sera activée.

---

## 6. Défis (Quests)

### ✅ GET /quests/daily

**Implémenté le 23/07/2026** (corrige un comportement "démo" signalé par Djawad : jusqu'ici
`apps/mobile` affichait "Défis du jour" et le solde de pièces entièrement en mock,
`src/api/mock/store.ts` — `dailyQuests`, `dailyCoinsBalance`).

```json
// GET /quests/daily → 200 — tableau nu (pas d'enveloppe {items,total})
[
  { "id": "scan-3", "libelle": "Scanner 3 plantes différentes", "type": "quotidien", "progression": 1, "objectif": 3, "complete": false, "recompense": { "xp": 0, "pieces": 0 } },
  { "id": "add-garden", "libelle": "Ajouter une nouvelle plante à son Jardin", "type": "quotidien", "progression": 1, "objectif": 1, "complete": true, "recompense": { "xp": 20, "pieces": 0 } },
  { "id": "publish-tip", "libelle": "Publier une photo avec un conseil d'entretien", "type": "quotidien", "progression": 0, "objectif": 1, "complete": false, "recompense": { "xp": 0, "pieces": 0 } },
  { "id": "get-5-likes", "libelle": "Recevoir 5 likes sur une publication", "type": "quotidien", "progression": 0, "objectif": 5, "complete": false, "recompense": { "xp": 0, "pieces": 0 } }
]
```

Catalogue fixe de 4 défis quotidiens (`apps/api/src/modules/quests/quest-catalog.ts`), mais
**progression toujours calculée en direct** depuis les vraies tables métier — jamais un
compteur stocké qui pourrait diverger de la réalité :

| Défi | Progression réelle (aujourd'hui, UTC) |
| --- | --- |
| `scan-3` | Espèces **distinctes** identifiées (`identification_logs`, journalisé par `POST /identification`) |
| `add-garden` | Ajouts au Jardin (`collection.typeCollection = 'owned'`, `dateAjout`) |
| `publish-tip` | Publications créées (`posts.dateCreation`) |
| `get-5-likes` | Likes reçus sur n'importe laquelle de ses publications (`likes.dateCreation`, jointure sur `posts.userId`) |

`recompense.xp`/`recompense.pieces` ne sont non-nuls que si le défi vient d'être complété (ou
l'était déjà) **et** que la récompense a été créditée — créditée exactement une fois par
défi/jour/utilisateur (table `quest_progress`, qui ne stocke qu'un drapeau
"déjà crédité", jamais la progression elle-même). Recharger `GET /quests/daily` plusieurs fois
ne crédite jamais deux fois. `pieces` créditées sont réellement persistées sur
`users.pieces` (voir §2) ; XP sur `users.experience` (comme pour une capture, §3/§4).

🚧 Les défis "Exploration" (Geo-Tag, ex. "Trouvez une plante rare à plus de 1 km de chez
vous") du brief initial ne sont pas implémentés : ils nécessiteraient une position de
référence ("chez vous") qu'aucune entité ne stocke actuellement — non fait plutôt que simulé.

---

## 7. Rappels

Module `reminders` : CRUD réel, mais **aucun push serveur** — `estNotifie` n'est qu'un
drapeau posé côté base, jamais un vrai envoi. Le rappel J+5 fonctionne de bout en bout
grâce à une notification **locale** (`expo-notifications`, appareil uniquement,
`scheduleReminderNotification.ts`) programmée en parallèle de cet appel ; si l'appel back
échoue, la notification locale reste programmée (le back sert à la persistance/consultation,
pas à l'alerte elle-même).

### ✅ POST /reminders

```json
// Body { "collectionId": "uuid", "typeRappel": "traitement", "datePlanification": "2026-07-22T09:00:00Z" }
// 201
{ "id": "uuid", "userId": "uuid", "collectionId": "uuid", "typeRappel": "traitement", "datePlanification": "...", "estNotifie": false }
```

404 si la collection n'appartient pas à l'appelant.

### ✅ GET /reminders?page=&limit=&estNotifie=true|false

```json
// 200 — enveloppe paginée
{ "items": [ /* ReminderResponseDto */ ], "total": 1 }
```

### ✅ PATCH /reminders/:id · DELETE /reminders/:id · POST /reminders/:id/notify

`PATCH` met à jour `typeRappel`/`datePlanification`. `POST .../notify` marque `estNotifie:
true` (ne déclenche aucun envoi réel). Tous protégés JWT + scopés à l'utilisateur (404
sinon).

---

## 8. Plantes

Module `plants`, lecture publique (pas de JWT), écriture réservée aux comptes admin
(`estAdmin`, `AdminGuard`).

### ✅ GET /plants?page=&limit=&nom=&famille=&toxicite=

Liste paginée du référentiel. Utile pour un futur écran "détail plante" indépendant d'une
collection, non encore branché côté front (`usePlantDetail()` continue de dériver la donnée
depuis `useMyGarden`/`useHerbarium`, voir tableau ci-dessous).

### ✅ GET /plants/:id

```json
// 200
{ "id": "uuid", "nomScientifique": "...", "nomCommun": "...", "famille": "...", "toxicite": "green", "urlImage": null, "badgeRarete": "Commun", "conseilsEntretien": null }
```

### ✅ POST /plants · PATCH /plants/:id · DELETE /plants/:id — admin uniquement

401/403 pour tout compte non admin. Pas d'écran d'administration côté mobile — ces routes
existent pour un futur back-office, hors périmètre app.

---

## 9. Notifications (push serveur) — 🚧 Backlog intégral

Distinct des rappels ci-dessus (§7, qui existent et fonctionnent côté persistance) : ceci
concerne l'enregistrement d'un token Expo Push pour permettre au **serveur** d'envoyer des
notifications. Pas de module `notifications`, aucun enregistrement de token côté back.

```json
// POST /notifications/device — body { "expoPushToken": "ExponentPushToken[...]", "plateforme": "ios" } → 204
// DELETE /notifications/device → 204
```

---

## Conventions de branchement côté front (état réel)

| Hook front                | Endpoint réellement appelé                    | Statut |
| -------------------------- | ---------------------------------------------- | ------ |
| `login()` / `register()`  | `POST /auth/login` / `POST /auth/register`+login | ✅ |
| `loginWithGoogle()`       | `POST /auth/google` (nécessite un build de dev, indisponible dans Expo Go) | ✅ |
| `changePassword()`        | — (mock, pas de `POST /auth/change-password`)  | 🚧 |
| `updateProfile()`         | `PATCH /users/me`                              | ✅ |
| `deleteAccount(password)` | `DELETE /users/me` (re-saisie du mot de passe) | ✅ |
| `useIdentify()`           | `POST /identification` (confiance réelle, plus de valeur de repli) | ✅ |
| `useMyGarden()`           | `GET /collection?type=owned`                   | ✅ |
| `useHerbarium()`          | `GET /collection?type=discovered`              | ✅ |
| `useAddToCollection()`    | `POST /collection`                             | ✅ |
| `useAddTrackingPhoto()`   | `POST /collection/:id/photos`                  | ✅ |
| `useCheckHealth()`        | `POST /collection/:id/diagnosis`               | ✅ |
| `useCreateReminder()`     | `POST /reminders` (+ notification locale, voir §7) | ✅ |
| `usePlantDetail()`        | dérivé de `useMyGarden`/`useHerbarium` (pas d'endpoint dédié) | ✅ |
| `useFeed()`               | `GET /feed` (+ `filter=near`/`radiusMetres`, filtrage réel côté serveur) | ✅ |
| `usePublishPost()`        | `POST /feed/posts` (multipart, vraie photo)    | ✅ |
| `useToggleLike()`         | `POST /feed/posts/:id/like`                    | ✅ |
| `useStories()`            | `GET /stories` (bulles groupées par auteur, comportement statuts WhatsApp) | ✅ |
| `usePublishStoryMedia()`  | `POST /stories` (multipart, vraie photo — vidéo non branchée, voir §5) | ✅ |
| `useRecordStoryView()`    | `POST /stories/:mediaId/view`                  | ✅ |
| `useStoryViewers()`       | `GET /stories/:mediaId/viewers` (liste "vu par", réservée à l'auteur) | ✅ |
| `useComments()`           | `GET /feed/posts/:id/comments`                 | ✅ |
| `useAddComment()`         | `POST /feed/posts/:id/comments`                | ✅ |
| `useQuests()`              | `GET /quests/daily` (4 défis quotidiens réels)  | ✅ |
| `useBadges()`              | `GET /users/me` (`insignes`, croisé avec un catalogue front) | ✅ |
| `useRegisterPush()`       | — (n'existe pas encore côté front non plus)    | 🚧 |

`useCheckHealth()`, `useCreateReminder()`, `updateProfile()`, `deleteAccount()` et
`useBadges()` gardent un repli mock activable via `EXPO_PUBLIC_USE_MOCK_API=true` (voir
`apps/mobile/src/api/config.ts`) si le back est indisponible en dev.

**Règle d'or** : si un champ back doit changer, on modifie D'ABORD ce fichier, ENSUITE le
code — et si le champ diverge de `packages/shared`, on passe par
`apps/mobile/src/api/adapters.ts` plutôt que de propager la valeur brute dans le reste du
front.
