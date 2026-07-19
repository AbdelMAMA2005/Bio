# PlanAI — Contrat d'API (v1 — état réel du backend, 17/07/2026)

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
| §1 Auth           | `auth` (+ `user`, doublon partiel — voir §1)       | ✅ partiel | Abdel / Djawad                             |
| §2 Utilisateur    | —                                                  | 🚧     | Ensemble                                       |
| §3 Identification | `identification` (proxy Plant.id, mode mock dispo) | ✅ partiel | Abdel / Djawad                             |
| §4 Collection     | `collection`                                       | ✅ partiel | Abdel / Djawad                             |
| §5 Communauté     | `feed`                                             | ✅ partiel | Abdel / Djawad                             |
| §6 Défis          | `quests`                                           | 🚧     | Abdel / Djawad                                 |
| §7 Notifications  | `notifications`                                    | 🚧     | Ensemble (back : Abdel / push client : Djawad) |

Le référentiel `plants` (CRUD interne + seed) n'a pas de module dédié exposé au mobile ; les
plantes sont créées à la volée par `identification` et lues via `collection`/`feed`.

---

## 1. Auth 🔓

### ✅ POST /auth/register

```json
// Body
{ "email": "djawad@planai.app", "nomUtilisateur": "Djawad", "motDePasse": "********" }
// 201 — PAS de token (contrairement à ce qu'on avait envisagé)
{ "id": "uuid", "email": "djawad@planai.app", "nomUtilisateur": "Djawad", "experience": 0, "niveau": 1, "insignes": [] }
```

Le front enchaîne un `POST /auth/login` juste après pour obtenir un token et connecter
l'utilisateur immédiatement (voir `apps/mobile/src/features/auth/authApi.ts`).

### ✅ POST /auth/login

```json
// Body
{ "email": "djawad@planai.app", "motDePasse": "********" }
// 200
{ "accessToken": "jwt...", "user": { "id": "uuid", "email": "...", "nomUtilisateur": "...", "experience": 0, "niveau": 1, "insignes": [] } }
```

⚠️ Champ `motDePasse`, pas `password`. Pas de `refreshToken` dans la réponse.

### 🚧 POST /auth/google, POST /auth/refresh, POST /auth/change-password, DELETE /auth/account

Aucun de ces 4 endpoints n'existe. Forme prévue si/quand ils sont codés :

```json
// POST /auth/google — body: { "idToken": "google-id-token" } → même réponse que /auth/login
// POST /auth/refresh — body: { "refreshToken": "jwt..." } → { "accessToken", "refreshToken" }
// POST /auth/change-password — body: { "currentPassword", "newPassword" } → 204
// DELETE /auth/account — body: { "password" } → 204 (soft delete, dateSuppression déjà en base)
```

### Point d'attention : `UserController` (`/user/register`, `/user/email`)

Un second contrôleur existe (`apps/api/src/modules/user/user.controller.ts`), avec
`POST /user/register` et `GET /user/email?email=...`, séparé de `AuthController`. Le front
**n'utilise que `/auth/*`**. À vous deux de décider si `UserController` doit disparaître ou
devenir la vraie base de la §2 (profil) ci-dessous.

---

## 2. Utilisateur — 🚧 Backlog (aucun endpoint `/users/me`)

Pas de `GET /users/me`, `PATCH /users/me`, ni `GET /users/me/badges`. Le profil (édition du
pseudo, préférences thème/langue/notifications/geo-tag, changement de mot de passe,
suppression de compte, badges) reste **entièrement mocké côté front**
(`apps/mobile/src/features/auth/mockAuthApi.ts`, `src/api/mock/badges.ts`).

Forme envisagée quand ces routes existeront (reprise du brief initial, à confirmer à deux) :

```json
// GET /users/me → 200
{
  "id": "uuid", "pseudo": "Djawad", "email": "djawad@planai.app",
  "niveau": 12, "xp": 2480,
  "preferences": { "theme": "light", "langue": "fr", "notifications": true, "geoTagParDefaut": false }
}
// PATCH /users/me — body partiel { "pseudo"?, "preferences"?: {...} } → 200 (même forme)
// GET /users/me/badges → 200 — [{ "id", "nom", "description", "obtenuLe": "date ISO | null" }]
```

---

## 3. Identification (Scan)

### ✅ POST /identification

`multipart/form-data`, champ **`image`** (pas `photo`), jpeg/png/webp, 5 Mo max. Pas de
`latitude`/`longitude` en entrée. Protégé par JWT (`JwtAuthGuard` implicite via le module).

```json
// 201
{
  "plantId": "uuid",
  "nomScientifique": "Rosa gallica",
  "nomCommun": "Rose de France",
  "famille": "Rosaceae",
  "toxicite": "red",              // ToxicityLevel — voir §"Enums" plus haut
  "badgeRarete": "Commun",        // toujours "Commun" en pratique, voir BACKEND_ISSUES.md §5
  "conseilsEntretien": null,      // toujours null en pratique, voir BACKEND_ISSUES.md §5
  "urlImage": null,               // toujours null en pratique
  "xpGagne": 25                   // toujours 25 tant que badgeRarete est figé à "Commun"
}
```

Pas de champ `confiance`/`confidence` — le front affiche une valeur de repli (voir
`apps/mobile/src/api/hooks/useIdentify.ts`). `MOCK_PLANTID=true` (variable d'env) bascule sur
une réponse Plant.id simulée sans consommer de crédits API pendant le dev.

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
    "badgeRarete": "Commun",
    "toxicite": "green",
    "etatSante": "red",
    "dateAjout": "2026-07-09T09:00:00.000Z",
    "urlImage": null,
    "latitude": 45.75,
    "longitude": 4.85
  }
]
```

Pas de `lieuLabel` (reverse-geocoding), pas de `distanceMetres`, pas de `prochainArrosage`,
pas de `historiquePhotos` dans cette réponse (même si les photos existent bien en base, voir
plus bas) — le front n'a donc rien à afficher pour le lieu nommé, le prochain arrosage, ou la
timeline photo tant que ces champs ne sont pas ajoutés à `GetCollectionResponseDto`. Pas de
paramètre `sort`.

### ✅ POST /collection/:id/photos

`multipart/form-data`, champ **`image`**. Stocke le fichier sous
`apps/api/uploads/collections/:id/<uuid>.<ext>` et sert `/uploads/...` en statique.

```json
// 201
{ "historiquePhotos": ["/uploads/collections/<id>/<uuid>.jpg"] }
```

⚠️ Fonctionne (upload + stockage réels, vérifié), mais comme `GET /collection` ne renvoie
jamais `historiquePhotos`, le front ne peut pas réafficher l'historique après coup — seul
l'upload marche de bout en bout.

### 🚧 POST /collection/:id/diagnosis, POST /collection/:id/reminders

Aucun des deux n'existe (pas de module `diagnosis` ni `notifications` dans `AppModule`).
"Vérifier la santé" et "Programmer un rappel" restent mockés côté front
(`apps/mobile/src/api/mock/diagnosis.ts`, `scheduleReminderNotification.ts`). Forme
envisagée si codés un jour, reprise du brief initial :

```json
// POST /collection/:id/diagnosis — multipart, champ "photo" → 200
{ "maladie": "Septoriose", "confiance": 0.91, "traitement": "...", "nouvelEtatSante": "red" }
// POST /collection/:id/reminders — body { "type": "traitement", "dansJours": 5 } → 201
{ "id": "uuid", "date": "2026-07-22T09:00:00Z" }
```

---

## 5. Communauté

### ✅ GET /feed

Pas de `?filter=`/`rayonKm`/`latitude`/`longitude` — retourne tout, paginé.

```json
// 200 — enveloppe paginée, PAS un tableau nu
{
  "items": [
    {
      "id": "uuid",
      "idUtilisateur": "uuid",
      "contenuTexte": "Trouvée en pleine floraison...",
      "imageUrl": "/uploads/collections/.../photo.jpg",
      "dateCreation": "2026-07-15T08:00:00.000Z",
      "auteur": { "id": "uuid", "nomUtilisateur": "Marco_Botanic", "urlAvatar": null },
      "plante": { "id": "uuid", "nomScientifique": "...", "nomCommun": "...", "badgeRarete": "Commun", "urlImage": null },
      "likesCount": 248,
      "commentairesCount": 31,
      "estLikedParUtilisateur": false
    }
  ],
  "total": 1
}
```

`plante` absent si aucune collection taguée. Aucun champ géo sur `Post` → pas de "Près de
moi" possible avec de vraies données (le filtre existe côté UI mais ne matchera jamais rien
de réel tant que l'entité `Post` n'a pas de `latitude`/`longitude`).

### ✅ POST /feed/posts *(pas `POST /feed`)*

```json
// Body — JSON, PAS multipart : imageUrl doit déjà être une URL hébergée ailleurs
{ "contenuTexte": "...", "collectionId": "uuid | undefined", "imageUrl": "... | undefined" }
// 201 → même forme qu'un item de GET /feed
```

Il n'existe **aucun endpoint d'upload générique** pour le feed (seul
`/collection/:id/photos` upload un fichier, et il est scopé à une collection). Le front ne
peut donc publier que du texte pour l'instant — la photo prise dans le composeur n'est pas
envoyée.

### ✅ POST /feed/posts/:id/like *(pas `POST /feed/:id/like`)*

```json
// 200 (toggle)
{ "liked": true, "likesCount": 249 }
```

### ✅ POST /feed/posts/:id/comments · GET /feed/posts/:id/comments

Forme cohérente avec `CreateCommentResponseDto` (non branché côté front pour l'instant, pas
d'UI de commentaires construite).

### ✅ DELETE /feed/posts/:id

Supprime, seulement si l'appelant est l'auteur.

### 🚧 GET /stories, POST /stories

Aucune entité `Story`, aucun endpoint. Stories entièrement mockées côté front
(`apps/mobile/src/api/mock/store.ts` — `stories`, `addStory`).

---

## 6. Défis (Quests) — 🚧 Backlog intégral

Pas de module `quests`. `apps/mobile` affiche "Défis du jour" et le solde de pièces
entièrement en mock (`src/api/mock/store.ts` — `dailyQuests`, `dailyCoinsBalance`). Forme
envisagée, reprise du brief initial :

```json
// GET /quests/daily → 200
[{ "id": "uuid", "libelle": "Scanner 3 plantes différentes", "type": "quotidien", "progression": 3, "objectif": 3, "complete": true, "recompense": { "xp": 30, "pieces": 0 } }]
```

---

## 7. Notifications (rappels & push) — 🚧 Backlog intégral

Pas de module `notifications`. Le front programme déjà de vraies notifications **locales**
(`expo-notifications`, appareil uniquement, pas de serveur impliqué) pour le rappel J+5 du
diagnostic mocké. Aucun push serveur, aucun enregistrement de token Expo côté back pour
l'instant.

```json
// POST /notifications/device — body { "expoPushToken": "ExponentPushToken[...]", "plateforme": "ios" } → 204
// DELETE /notifications/device → 204
```

---

## Conventions de branchement côté front (état réel)

| Hook front                | Endpoint réellement appelé                    | Statut |
| -------------------------- | ---------------------------------------------- | ------ |
| `login()` / `register()`  | `POST /auth/login` / `POST /auth/register`+login | ✅ |
| `loginWithGoogle()`       | — (mock, pas de `/auth/google`)                | 🚧 |
| `changePassword()`, `updateProfile()`, `deleteAccount()` | — (mock, pas de `/users/me`/`/auth/*`) | 🚧 |
| `useIdentify()`           | `POST /identification`                         | ✅ |
| `useMyGarden()`           | `GET /collection?type=owned`                   | ✅ |
| `useHerbarium()`          | `GET /collection?type=discovered`              | ✅ |
| `useAddToCollection()`    | `POST /collection`                             | ✅ |
| `useAddTrackingPhoto()`   | `POST /collection/:id/photos`                  | ✅ (upload OK, relecture impossible — voir §4) |
| `useCheckHealth()`        | — (mock, pas de `/collection/:id/diagnosis`)   | 🚧 |
| `usePlantDetail()`        | dérivé de `useMyGarden`/`useHerbarium` (pas d'endpoint dédié) | ✅ |
| `useFeed()`               | `GET /feed`                                    | ✅ |
| `usePublishPost()`        | `POST /feed/posts` (texte seul, pas de photo)  | ✅ partiel |
| `useToggleLike()`         | `POST /feed/posts/:id/like`                    | ✅ |
| `usePublishStory()`       | — (mock, pas de `/stories`)                    | 🚧 |
| `useQuests()`              | — (mock, pas de `/quests/daily`)               | 🚧 |
| `useBadges()`              | — (mock, pas de `/users/me/badges`)            | 🚧 |
| `useRegisterPush()`       | — (n'existe pas encore côté front non plus)    | 🚧 |

**Règle d'or** : si un champ back doit changer, on modifie D'ABORD ce fichier, ENSUITE le
code — et si le champ diverge de `packages/shared`, on passe par
`apps/mobile/src/api/adapters.ts` plutôt que de propager la valeur brute dans le reste du
front.
