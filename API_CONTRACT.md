# PlanAI — Contrat d'API (v1)

> Accord front/back : **Djawad** (mobile) et **Abdel** (API) codent chacun contre CE document.
> Toute modification se discute à deux AVANT d'être codée, puis est reflétée ici et dans `packages/shared`.
> Ce contrat couvre les tâches de `TODO.md` (Phases 1 à 4) et suit le découpage en modules NestJS de `ARCHITECTURE.md` : chaque section ci-dessous = un module (`auth`, `users`, `plants`, `identification`, `collection`, `diagnosis`, `feed`, `quests`, `notifications`).

**Base URL** : `https://api.planai.app/v1` (dev : `http://localhost:3000/v1`)
**Auth** : JWT Bearer dans le header `Authorization: Bearer <token>` (sauf endpoints publics marqués ).
**Format** : JSON, `camelCase`. Dates en ISO 8601 UTC (`2026-07-12T14:30:00Z`).
**Erreurs** (toutes routes) :

```json
{ "statusCode": 400, "error": "Bad Request", "message": "Description lisible" }
```

## Enums partagés (packages/shared)

```ts
type Rarete = "commun" | "rare" | "epique";
type Toxicite = "toxique" | "non_toxique" | "incertaine";
type TypeCollection = "owned" | "discovered"; // Jardin | Herbarium
type EtatSante = "sain" | "alerte" | "malade";
```

---

## Correspondance modules / phases (ARCHITECTURE.md & TODO.md)

| Section           | Module NestJS                                     | Phase TODO   | Qui (back / front)                             |
| ----------------- | ------------------------------------------------- | ------------ | ---------------------------------------------- |
| §1 Auth           | `auth`                                            | Phase 1      | Abdel / Djawad                                 |
| §2 Utilisateur    | `users`                                           | Phases 1 & 4 | Ensemble                                       |
| §3 Identification | `identification` (proxy Plant.id / Google Vision) | Phase 1      | Abdel / Djawad                                 |
| §4 Collection     | `collection` (+ `diagnosis` pour le §4.4)         | Phases 1-2   | Abdel / Djawad                                 |
| §5 Communauté     | `feed`                                            | Phase 3      | Abdel / Djawad (« Près de moi » : Ensemble)    |
| §6 Défis          | `quests`                                          | Phase 4      | Abdel / Djawad                                 |
| §7 Notifications  | `notifications`                                   | Phase 2      | Ensemble (back : Abdel / push client : Djawad) |

Le référentiel `plants` (module `plants`, CRUD interne + seed ~20 espèces, Phase 0/1 — Abdel) n'est pas exposé au mobile en v1 : le front reçoit les objets plante via `/identification` et `/collection`.

> **Mapping DB** (ARCHITECTURE.md §3) : la base utilise le snake_case (`nom_scientifique`, `etat_sante`, `historique_photos`, `conseils_entretien`) ; l'API expose ces champs en camelCase comme défini ici. La conversion est à la charge du back.

---

## 1. Auth 🔓

### POST /auth/register

```json
// Body
{ "pseudo": "Djawad", "email": "djawad@planai.app", "password": "********" }
// 201
{ "user": User, "accessToken": "jwt...", "refreshToken": "jwt..." }
```

### POST /auth/login

```json
// Body
{ "email": "djawad@planai.app", "password": "********" }
// 200 → même réponse que register
```

### POST /auth/google

```json
// Body — idToken obtenu côté mobile via expo-auth-session
{ "idToken": "google-id-token" }
// 200 → même réponse que register (compte créé si premier login)
```

### POST /auth/refresh

```json
{ "refreshToken": "jwt..." }  →  { "accessToken": "jwt...", "refreshToken": "jwt..." }
```

### POST /auth/change-password

```json
{ "currentPassword": "...", "newPassword": "..." }  →  204
```

### DELETE /auth/account

Suppression RGPD (purge complète). Body : `{ "password": "..." }` (ou re-auth Google) → `204`

---

## 2. Utilisateur

### GET /users/me

```json
// 200 — objet User
{
  "id": "uuid",
  "pseudo": "Djawad",
  "email": "djawad@planai.app",
  "niveau": 12,
  "titreNiveau": "Explorateur",
  "xp": 2480,
  "xpProchainNiveau": 3000,
  "pieces": 340,
  "stats": { "captures": 87, "especes": 41, "rares": 6 },
  "badges": [
    {
      "id": "premiere-capture",
      "nom": "1ère capture",
      "obtenuLe": "2026-05-02T10:00:00Z"
    }
  ],
  "preferences": {
    "theme": "light",
    "langue": "fr",
    "notifications": true,
    "geoTagParDefaut": false
  }
}
```

### PATCH /users/me

Body partiel : `{ "pseudo"?, "preferences"?: { "theme"?, "langue"?, "notifications"?, "geoTagParDefaut"? } }` → `200` User

---

## 3. Identification (Scan)

### POST /identification

`multipart/form-data` : champ `photo` (jpeg/png) + champs optionnels `latitude`, `longitude`.

```json
// 200
{
  "plante": {
    "id": "uuid",
    "nomCommun": "Orchidée sauvage",
    "nomScientifique": "Orchis mascula",
    "famille": "Orchidaceae",
    "toxicite": "non_toxique",
    "rarete": "rare",
    "conseilsEntretien": {
      "lumiere": "Mi-ombre",
      "sol": "Calcaire, drainé",
      "floraison": "Mai – Juillet",
      "habitat": "Sous-bois clairs"
    },
    "aPropos": "Orchidée terrestre des sous-bois clairs...",
    "imageUrl": "https://..."
  },
  "confiance": 0.94,
  "xpPotentiel": 45
}
```

---

## 4. Collection (Jardin + Herbarium)

### POST /collection

Ajout après identification (ajout contextuel).

```json
// Body
{
  "planteId": "uuid",
  "type": "discovered",              // 'owned' = Mon Jardin, 'discovered' = Herbarium
  "latitude": 49.417, "longitude": 2.826,   // null si Geo-Tag refusé
  "photoUrl": "https://..."          // photo prise au scan
}
// 201
{ "item": CollectionItem, "xpGagne": 45, "nouveauNiveau": null }   // nouveauNiveau: 13 si level-up
```

### GET /collection?type=owned | discovered

```json
// 200 — CollectionItem[]
[
  {
    "id": "uuid",
    "planteId": "uuid",
    "type": "owned",
    "plante": {/* objet plante complet, cf. §3 */},
    "dateAjout": "2026-07-09T09:00:00Z",
    "latitude": null,
    "longitude": null,
    "lieuLabel": "Forêt de Compiègne", // reverse-geocodé par le back, null sinon
    "distanceMetres": 3000, // calculée si lat/lng client fournis en query
    "etatSante": "sain", // owned uniquement
    "prochainArrosage": "2026-07-16T08:00:00Z",
    "historiquePhotos": [
      { "url": "https://...", "date": "2026-07-01T10:00:00Z" }
    ]
  }
]
```

Query optionnelle : `latitude`, `longitude` (position client pour `distanceMetres`), `sort=recent`.

### POST /collection/:id/photos

`multipart/form-data` champ `photo` → `201` `{ "url": "...", "date": "..." }`

### POST /collection/:id/diagnosis

`multipart/form-data` champ `photo` (feuille malade).

```json
// 200
{
  "maladie": "Septoriose",
  "confiance": 0.91,
  "traitement": "Retirez les feuilles atteintes. Appliquez un fongicide bio. Évitez d'arroser le feuillage.",
  "nouvelEtatSante": "malade"
}
```

### POST /collection/:id/reminders

```json
{ "type": "traitement", "dansJours": 5 }  →  201 { "id": "uuid", "date": "2026-07-20T09:00:00Z" }
```

---

## 5. Communauté

### GET /feed?filter=all | near&rayonKm=5&latitude=..&longitude=..

```json
// 200 — Post[]
[
  {
    "id": "uuid",
    "auteur": { "id": "uuid", "pseudo": "Marco_Botanic", "avatarUrl": null },
    "texte": "Trouvée en pleine floraison...",
    "imageUrl": "https://...",
    "planteTaguee": {
      "planteId": "uuid",
      "nomCommun": "Orchidée sauvage",
      "type": "discovered"
    },
    "geoTag": { "latitude": 49.4, "longitude": 2.8, "distanceMetres": 2000 }, // null si non geo-tagué
    "likes": 248,
    "likedByMe": false,
    "commentaires": 31,
    "creeLe": "2026-07-15T08:00:00Z"
  }
]
```

### POST /feed

`multipart/form-data` : `photo`, `texte`, `collectionItemId?` (tag d'une plante) → `201` Post

### POST /feed/:id/like → 200 { "likes": 249, "likedByMe": true } (toggle)

### GET /feed/:id/comments → Comment[] · POST /feed/:id/comments { "texte": "..." } → 201

### GET /stories

```json
[{ "id": "uuid", "auteur": {...}, "mediaUrl": "https://...", "creeLe": "...", "expireLe": "...", "vueParMoi": false }]
```

### POST /stories — `multipart/form-data` champ `media` → `201` Story (expire à +24 h)

---

## 6. Défis (Quests)

### GET /quests/daily

```json
[
  {
    "id": "uuid",
    "libelle": "Scanner 3 plantes différentes",
    "type": "quotidien", // 'quotidien' | 'exploration'
    "progression": 3,
    "objectif": 3,
    "complete": true,
    "recompense": { "xp": 30, "pieces": 0 }
  }
]
```

La progression est mise à jour côté back par les actions (scan, post, capture, likes reçus). Le front ne fait que lire.
Les défis `exploration` (« plante rare à + de 1 km ») nécessitent les coordonnées envoyées lors du `POST /collection` — aucun tracking continu.

### GET /users/me/badges

```json
// 200 — badges exclusifs (Phase 4 : « Botaniste débutant », « Chasseur d'épiques »…)
[
  {
    "id": "chasseur-epiques",
    "nom": "Chasseur d'épiques",
    "description": "Capturer 5 plantes épiques",
    "obtenuLe": "2026-07-01T10:00:00Z"
  }
]
```

(badges non obtenus : `"obtenuLe": null` — permet l'écran badges avec progression)

---

## 7. Notifications (rappels & push)

Les rappels J+5 du diagnostic passent par `POST /collection/:id/reminders` (§4). Pour que le back envoie les push (arrosage, rappels de traitement — TODO Phase 2), le mobile enregistre son token Expo :

### POST /notifications/device

```json
{ "expoPushToken": "ExponentPushToken[...]", "plateforme": "ios" }  →  204
```

### DELETE /notifications/device — à la déconnexion → 204

Rappels d'arrosage : générés par le back depuis `prochainArrosage` (cf. §4) selon la préférence `notifications` de l'utilisateur (§2).

---

## Conventions de branchement côté front

Chaque hook mock actuel correspond à un endpoint :

| Hook front                               | Endpoint                          |
| ---------------------------------------- | --------------------------------- |
| `useAuth()` login/register/google/logout | `POST /auth/*`                    |
| `useIdentify()`                          | `POST /identification`            |
| `useMyGarden()`                          | `GET /collection?type=owned`      |
| `useHerbarium()`                         | `GET /collection?type=discovered` |
| `useAddToCollection()`                   | `POST /collection`                |
| `useDiagnosis()`                         | `POST /collection/:id/diagnosis`  |
| `useFeed(filter)`                        | `GET /feed`                       |
| `usePublishPost()`                       | `POST /feed`                      |
| `usePublishStory()`                      | `POST /stories`                   |
| `useQuests()`                            | `GET /quests/daily`               |
| `useProfile()`                           | `GET /users/me`                   |
| `useBadges()`                            | `GET /users/me/badges`            |
| `useRegisterPush()`                      | `POST /notifications/device`      |

**Règle d'or** : si un champ doit changer, on modifie D'ABORD ce fichier + les types `packages/shared`, ENSUITE le code.
