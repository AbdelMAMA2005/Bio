# PlanAI — Architecture & Conventions

> Guide de mise en place du dépôt Git, de la structure front/back et des conventions d'équipe.
> Stack : **React Native (Expo)** + **NestJS** + **PostgreSQL** (cf. cahier des charges §4).

---


## 1. Organisation des dépôts

Pour démarrer à deux, un **monorepo** est le plus simple : un seul dépôt, une seule CI, des types partagés entre le front et le back.

```
planai/
├── apps/
│   ├── mobile/          # Application React Native (Expo)
│   ├── api/             # Back-end NestJS
│   └── admin/           # Console admin web (React + Vite + TS), voir §3bis
├── packages/
│   └── shared/          # Types TS partagés (Plante, User, DTOs, enums rareté/santé, Admin*)
├── .github/
│   └── workflows/       # CI : lint + tests sur chaque PR
├── package.json         # Workspaces (npm ou pnpm)
├── .gitignore
└── README.md
```

**Pourquoi un monorepo ?**

- Un seul `git clone` pour tout le projet.
- Les types partagés (`packages/shared`) évitent que le front et le back divergent.
- Migration facile vers des dépôts séparés (ou microservices) plus tard.

---

## 2. Front — `apps/mobile` (React Native / Expo)

```
apps/mobile/
├── src/
│   ├── app/                    # Écrans — routing par fichiers (expo-router)
│   │   ├── (tabs)/
│   │   │   ├── jardin/         # Onglet Mon Jardin
│   │   │   │   ├── index.tsx       # Sous-vue Mon Quotidien (clones)
│   │   │   │   └── herbarium.tsx   # Sous-vue Mon Herbarium (découvertes)
│   │   │   ├── scan.tsx        # Onglet Scan (caméra plein écran)
│   │   │   └── communaute.tsx  # Onglet Communauté (feed + stories)
│   │   ├── plante/[id].tsx     # Fiche plante (toxicité, entretien)
│   │   ├── profil/[id].tsx     # Profil public d'un autre utilisateur
│   │   ├── messages/           # Messagerie privée (index = liste, [userId] = conversation)
│   │   └── _layout.tsx         # Tab bar (3 onglets, bouton Scan central)
│   ├── components/             # UI réutilisable
│   │   ├── PlantCard.tsx
│   │   ├── RarityBadge.tsx     # Commun / Rare / Épique
│   │   ├── HealthDot.tsx       # vert / orange / rouge
│   │   ├── XPToast.tsx         # animation "+45 XP"
│   │   ├── Avatar.tsx          # Composant Avatar unique (vraie photo ou initiales, jamais "@") — toute l'app l'utilise
│   │   └── SegmentedControl.tsx
│   ├── features/               # Logique métier par domaine
│   │   ├── scan/               # identification, toxicité, ajout contextuel
│   │   ├── jardin/             # clones, rappels, diagnostic maladie
│   │   ├── herbarium/          # découvertes, geo-tag
│   │   ├── feed/               # posts, likes, commentaires, stories, filtre "près de moi"
│   │   ├── profile/            # Profil public (en-tête + grille des publications)
│   │   ├── messages/           # Liste des conversations + écran de conversation
│   │   └── quests/             # défis quotidiens, XP, pièces
│   ├── api/                    # Client HTTP (axios + react-query)
│   │   ├── client.ts
│   │   └── hooks/              # useIdentify(), useMyGarden(), useFeed()…
│   ├── theme/                  # Design tokens (repris de la maquette)
│   │   ├── colors.ts           # palettes dark + light
│   │   └── typography.ts       # Outfit / Space Grotesk
│   └── utils/
├── assets/                     # icônes, splash, polices
├── app.json                    # config Expo
└── package.json
```

**Règles front :**

- Un écran = un fichier dans `app/`, la logique va dans `features/`, jamais dans l'écran.
- Les couleurs et polices viennent **uniquement** de `theme/` (support dark/light comme la maquette).
- État serveur : react-query. État local UI : useState/Zustand. Pas de Redux au démarrage.

---

## 3. Back — `apps/api` (NestJS, modules par domaine)

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/               # JWT, inscription, connexion
│   │   ├── users/              # profil, niveau, XP, insignes
│   │   ├── plants/             # référentiel espèces (nomScientifique, nomCommun, famille, toxicite, conseilsEntretien, badgeRarete)
│   │   ├── collection/         # Jardin / Herbarium
│   │   │                       #   type: 'owned' | 'discovered'  ← champ clé
│   │   │                       #   latitude/longitude si Geo-Tag accepté
│   │   │                       #   etatSante: 'green'|'orange'|'red' (clones)
│   │   │                       #   historiquePhotos (JSON array)
│   │   ├── identification/     # proxy vers Plant.id / Google Vision
│   │   ├── diagnosis/          # détection maladies (CNN PlantVillage)
│   │   ├── feed/               # publications, likes, commentaires
│   │   │                       #   + filtre "près de moi" (rayon réel en SQL, radiusMetres)
│   │   ├── stories/             # stories éphémères 24h (entité Story dédiée) + likes (StoryLike)
│   │   ├── messages/            # messagerie privée (réponses aux stories + messages directs)
│   │   ├── quests/             # défis quotidiens + exploration, récompenses
│   │   ├── notifications/      # rappels push (arrosage, traitements)
│   │   └── admin/               # console admin : RoleGuard, stats, users, plants, modération,
│   │                             #   quests (CRUD), feature flags, journal d'audit — voir §3bis
│   ├── common/                 # guards, pipes, interceptors, filters
│   ├── config/                 # env, base de données
│   └── main.ts
├── src/entities/               # 📌 Toutes les entités TypeORM
│   ├── enums/
│   │   ├── toxicity-level.enum.ts
│   │   ├── plant-type.enum.ts
│   │   ├── health-status.enum.ts
│   │   └── story-media-type.enum.ts
│   ├── user.entity.ts
│   ├── plant.entity.ts
│   ├── collection.entity.ts
│   ├── posts.entity.ts
│   ├── like.entity.ts
│   ├── comment.entity.ts
│   ├── story.entity.ts        # un média = une ligne, regroupées en bulles à la lecture
│   ├── story-view.entity.ts   # vues "vu par" (storyId + viewerId, unique)
│   ├── story-like.entity.ts   # likes sur un média de story (storyId + userId, unique)
│   ├── conversation.entity.ts # paire d'utilisateurs (user1Id/user2Id normalisés), 1 ligne/paire
│   ├── message.entity.ts      # message privé, storyId optionnel (réponse à un statut)
│   ├── reminder.entity.ts
│   ├── report.entity.ts       # signalement (post/story/comment) — file de modération admin
│   ├── quest.entity.ts        # défi éditable admin (remplace QUEST_CATALOG en dur)
│   ├── feature-flag.entity.ts # bascule fonctionnelle à chaud, éditable admin
│   └── admin-audit-log.entity.ts # journal d'audit des actions d'administration
├── test/
└── package.json
```

**Règles back :**

- Un module = controller + service + entities + DTOs. Pas de logique dans les controllers.
- Chaque module est autonome → migration future vers microservices (Auth, IA, Feed, Notifications) sans refonte.
- Les DTOs sont validés (`class-validator`) et leurs types exportés vers `packages/shared`.

---

## 3bis. Console admin — `apps/admin` (React + Vite) + module `admin` (`apps/api`)

Espace web séparé de l'app mobile, pour piloter l'application (utilisateurs, référentiel
plantes, modération, défis, paramètres). Détail complet des endpoints dans
`API_CONTRACT.md` §10 ; ce qui suit résume les décisions structurantes.

```
apps/admin/
├── src/
│   ├── main.tsx / App.tsx      # bootstrap, React Router
│   ├── theme/                  # design system (variables CSS clair/sombre, repris de
│   │                             #   maquette/PlanAI-admin-maquette.html), ThemeProvider
│   ├── api/
│   │   ├── client.ts           # axios + intercepteur JWT (Bearer + refresh, même schéma
│   │   │                       #   que apps/mobile/src/api/client.ts)
│   │   └── hooks/               # useStats(), useUsers(), usePlants(), useModeration()…
│   ├── components/              # Sidebar, Topbar, Table, Badge, Switch, ProtectedRoute…
│   └── pages/                   # LoginPage, DashboardPage, UsersPage, PlantsPage,
│                                 #   ModerationPage, QuestsPage, SettingsPage (7 écrans)
└── package.json                # scripts dev/build/preview (Vite)
```

**Rôles** : `User.role` (`'membre' | 'moderateur' | 'admin'`, nouveau champ — voir §4),
distinct du booléen `estAdmin` historique (gardé, synchronisé automatiquement quand
`role` passe à/depuis `'admin'`, pour ne jamais casser l'`AdminGuard` déjà en place sur
`/plants`). Un `RoleGuard` + décorateur `@Roles(...)` protège individuellement chaque route
`/admin/*` — `AdminModule` est autonome (réutilise `PlantsModule`/`UserModule` existants
pour ne jamais dupliquer leur logique métier) et n'est monté nulle part côté mobile.

**Pas de 2e système d'auth** : la console se connecte via le `POST /auth/login` déjà
existant : c'est le `RoleGuard` sur les routes `/admin/*`, pas un mécanisme de connexion
séparé, qui empêche un `'membre'` d'atteindre la console (`GET /admin/me` sert de
vérification de session au chargement).

---

## 4. Modèle de données (Mise à jour finale)

Voici la structure exacte des entités utilisées par le back-end NestJS. **Les noms ci-dessous sont ceux que Djawad recevra dans les réponses JSON des API** (tout est en **camelCase français**).  
Les noms de tables PostgreSQL sont en anglais (`users`, `plants`, `collection`, `posts`, `likes`, `comments`, `reminders`) mais les attributs en JSON sont en camelCase français.

---

### Table `users`
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `email` | `string` | Adresse email (unique) |
| `motDePasseHache` | `string` | Mot de passe hashé (argon2) |
| `nomUtilisateur` | `string` | Pseudo (unique) |
| `experience` | `number` | Points d'expérience cumulés |
| `niveau` | `number` | Niveau actuel (calculé) |
| `urlAvatar` | `string \| null` | URL de l'avatar |
| `insignes` | `string[]` (JSONB) | Liste des badges débloqués |
| `dateSuppression` | `Date \| null` | Date de suppression logique (soft delete) |
| `latitudeReference` / `longitudeReference` | `number \| null` | Point "chez vous" pour le défi Exploration (ajouté 10/09/2026) — figé sur la 1ère capture géo-taguée, voir API_CONTRACT.md §6 |
| `role` | `'membre' \| 'moderateur' \| 'admin'` | Ajouté 13/09/2026 (console admin) — distinct de `estAdmin` (gardé, synchronisé automatiquement) |
| `estAdmin` | `boolean` | Historique — `true` ssi `role === 'admin'` (voir `AdminGuard`, `/plants`) |
| `estSuspendu` | `boolean` | Ajouté 13/09/2026 — bloque la connexion et invalide les sessions déjà ouvertes (voir API_CONTRACT.md §10) |
| `derniereConnexion` | `Date \| null` | Ajouté 13/09/2026 — horodaté à chaque login (mot de passe ou Google) ; sert au statut Actif/Inactif de la console admin |

---

### Table `plants` (référentiel des espèces)
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `nomScientifique` | `string` | Nom latin / scientifique |
| `nomCommun` | `string` | Nom vernaculaire (affiché) |
| `famille` | `string \| null` | Famille botanique |
| `toxicite` | `'green' \| 'orange' \| 'red'` | Niveau de toxicité (enum) |
| `conseilsEntretien` | `{ arrosage?, lumiere?, temperature?, rempotage? }` | Conseils en JSON |
| `urlImage` | `string \| null` | URL d'illustration |
| `badgeRarete` | `string \| null` | Ex: "Commun", "Rare", "Épique" |
| `dateCreation` | `Date` | Ajouté 13/09/2026 — alimente la tendance "espèces référencées" du tableau de bord admin |

---

### Table `collection` (Jardin / Herbarium)
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `idUtilisateur` | `string` (UUID) | Clé étrangère → `users.id` |
| `idPlante` | `string` (UUID) | Clé étrangère → `plants.id` |
| `type` | `'owned' \| 'discovered'` | *owned* = Mon Jardin ; *discovered* = Herbarium |
| `etatSante` | `'green' \| 'orange' \| 'red'` | Indicateur de santé |
| `historiquePhotos` | `string[]` (JSONB) | URLs des photos de suivi |
| `dernierDiagnostic` | `DernierDiagnostic \| null` (JSONB) | Dernier diagnostic de santé (voir ci-dessous), réécrit à chaque `POST /collection/:id/diagnosis` — pas un historique multi-entrées |
| `dateAjout` | `Date` | Date d'ajout à la collection |
| `latitude` | `number \| null` | Geo-tag (optionnel) |
| `longitude` | `number \| null` | Geo-tag (optionnel) |

**`DernierDiagnostic`** (ajouté le 24/07/2026, voir `rapport.md`) :
```typescript
{
  maladieNom: string | null;      // null si la plante était saine à ce diagnostic
  scoreGlobal: number;            // confiance 0-100 (même valeur que scoreGlobal du diagnostic)
  traitement: { biologique?: string; chimique?: string; prevention?: string } | null;
  description: string | null;
  estSain: boolean;
  dateDiagnostic: string;         // ISO 8601
}
```
Alimente le bouton "Voir le diagnostic" (Mon Quotidien) : visible uniquement si `etatSante
=== 'malade'` ET ce champ non-null — permet de rouvrir le dernier diagnostic sans relancer
d'analyse. Se masque automatiquement si une vérification ultérieure déclare la plante saine
(le champ est réécrit, pas supprimé : voir API_CONTRACT.md §4).

---

### Table `posts` (Feed communautaire)
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `idUtilisateur` | `string` (UUID) | Clé étrangère → `users.id` |
| `idCollection` | `string \| null` (UUID) | Optionnel → `collection.id` (plante taguée) |
| `contenuTexte` | `string` | Texte de la publication |
| `urlImage` | `string \| null` | Image associée (vrai fichier uploadé dans `uploads/posts/`, ou repli `imageUrl` JSON) |
| `latitude` / `longitude` | `number \| null` | Héritées de la collection taguée si elle a un Geo-Tag, sinon `null` — servent au filtre "Près de moi" (`GET /feed?filter=near`, distance haversine calculée en SQL) |
| `dateCreation` | `Date` | Horodatage |

---

### Table `stories` (statuts éphémères 24h, comportement WhatsApp)

Une ligne = **un média**, pas une bulle. Plusieurs médias actifs du même `userId` se
regroupent en une seule bulle **à la lecture** (`StoriesService#getGroupedStories`), chacun
gardant sa propre expiration `+24h` indépendante — pas de table de groupe dédiée.

| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique du média |
| `idUtilisateur` | `string` (UUID) | Clé étrangère → `users.id` |
| `urlMedia` | `string` | Vrai fichier uploadé dans `uploads/stories/` |
| `mediaType` | `'image' \| 'video'` | Détecté depuis le `mimetype` du fichier reçu ; `POST /stories` n'accepte en pratique que des images (voir `API_CONTRACT.md` §5) — la vidéo reste au niveau du modèle sans être atteignable |
| `dateCreation` | `Date` | Horodatage |
| `dateExpiration` | `Date` | `dateCreation + 24h`, fixée à la création — `GET /stories` ne renvoie jamais un média expiré, même isolément au sein d'une bulle par ailleurs active |

### Table `story_views` (vues "vu par", comportement WhatsApp)

| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `storyId` | `string` (UUID) | Clé étrangère → `stories.id` (le média vu) |
| `viewerId` | `string` (UUID) | Clé étrangère → `users.id` (qui a vu) |
| `dateVue` | `Date` | Horodatage de la vue |

Contrainte unique `(storyId, viewerId)` : une seule vue par personne et par média
(`POST /stories/:mediaId/view` est idempotent). L'auteur d'un média ne génère jamais de vue
sur son propre contenu. `GET /stories/:mediaId/viewers` (réservé à l'auteur, 403 sinon) lit
cette table pour la liste "vu par" ; `vuesCount`/`vuParMoi` dans `GET /stories` en dérivent
aussi (compte réel, jamais un chiffre affiché sans ligne correspondante en base).

### Table `story_likes` (likes sur un statut, comportement Instagram)

| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `storyId` | `string` (UUID) | Clé étrangère → `stories.id` (le média liké) |
| `userId` | `string` (UUID) | Clé étrangère → `users.id` |
| `dateCreation` | `Date` | Horodatage |

Contrainte unique `(storyId, userId)`, même pattern que `likes` sur les publications.
`POST /stories/:mediaId/like` (toggle) lit/écrit cette table ; `likesCount`/`aimeParMoi` dans
`GET /stories` en dérivent. Contrairement à `story_views`, l'auteur peut liker son propre
média (pas de garde-fou côté service).

---

### Table `conversations` (messagerie privée)

| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `user1Id` | `string` (UUID) | Clé étrangère → `users.id`, le plus petit des deux ids (ordre lexicographique) |
| `user2Id` | `string` (UUID) | Clé étrangère → `users.id`, le plus grand des deux ids |
| `dateCreation` | `Date` | Horodatage |
| `dateDernierMessage` | `Date` | Mis à jour à chaque nouveau message — sert au tri de la liste des conversations |

Contrainte unique `(user1Id, user2Id)` : **une seule ligne possible par paire d'utilisateurs**,
quel que soit qui a engagé la conversation en premier — `MessagesService#getOrCreateConversation`
normalise systématiquement l'ordre avant toute lecture/écriture.

### Table `messages`

| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `conversationId` | `string` (UUID) | Clé étrangère → `conversations.id` |
| `senderId` | `string` (UUID) | Clé étrangère → `users.id` (auteur du message) |
| `contenu` | `string` | Texte du message |
| `storyId` | `string \| null` (UUID) | Clé étrangère → `stories.id`, renseigné quand le message est une réponse à un statut (`onDelete: 'SET NULL'` — un média disparu ne fait jamais disparaître le message, seulement son aperçu cité) |
| `lu` | `boolean` | Marqué `true` quand le destinataire ouvre la conversation (`GET /messages/with/:userId`) |
| `dateEnvoi` | `Date` | Horodatage |

**Jamais de commentaire public pour une réponse à un statut/story** : `StoryViewer.tsx` envoie
sa réponse via `POST /messages/with/:authorId` (avec `storyId`), pas via
`POST /feed/posts/:id/comments` — les deux mécanismes (commentaires publics sur un post,
messages privés en réponse à un statut) restent strictement séparés, comme sur
WhatsApp/Instagram.

---

### Table `likes`
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `idPost` | `string` (UUID) | Clé étrangère → `posts.id` |
| `idUtilisateur` | `string` (UUID) | Clé étrangère → `users.id` |
| `dateCreation` | `Date` | Horodatage |

---

### Table `comments`
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `idPost` | `string` (UUID) | Clé étrangère → `posts.id` |
| `idUtilisateur` | `string` (UUID) | Clé étrangère → `users.id` |
| `contenu` | `string` | Texte du commentaire |
| `dateCreation` | `Date` | Horodatage |

---

### Table `reminders` (Rappels intelligents)
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `idUtilisateur` | `string` (UUID) | Clé étrangère → `users.id` |
| `idCollection` | `string` (UUID) | Clé étrangère → `collection.id` |
| `typeRappel` | `string` | Ex: "arrosage", "rempotage" |
| `datePlanification` | `Date` | Date programmée |
| `estNotifie` | `boolean` | Flag d'envoi |

---

### Table `reports` (signalements — ajouté 13/09/2026, console admin)
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `reporterId` | `string` (UUID) | Clé étrangère → `users.id` |
| `targetType` | `'post' \| 'story' \| 'comment'` | Type de contenu signalé |
| `targetId` | `string` (UUID) | Id du contenu signalé (dans sa propre table) |
| `auteurCible` / `motif` / `extrait` | `string` | Instantané au moment du signalement (survit à la suppression du contenu original hors modération) |
| `statut` | `'ouvert' \| 'ignore' \| 'supprime'` | Traité par `POST /admin/moderation/:id/ignore` ou `DELETE /admin/moderation/:id` |
| `dateCreation` / `dateTraitement` | `Date` / `Date \| null` | Horodatages |

Plusieurs signalements peuvent viser le même `(targetType, targetId)` — la console les
groupe en une seule carte (voir API_CONTRACT.md §10).

### Table `quests` (défis éditables — ajouté 13/09/2026, console admin)
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` | Slug stable (ex: `"scan-3"`) — référencé en dur dans `QuestsService#computeRealProgressions` |
| `libelle` / `type` / `objectif` / `recompenseXp` / `recompensePieces` | — | Éditables depuis la console |
| `actif` | `boolean` | `false` = retiré de `GET /quests/daily` côté mobile |

Remplace `QUEST_CATALOG` (constante figée dans le code) comme source des définitions — la
PROGRESSION reste calculée en direct depuis les tables métier, jamais stockée ici.

### Table `feature_flags` (ajouté 13/09/2026, console admin)
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `cle` | `string` | Clé stable (ex: `"geotag"`) |
| `libelle` / `description` | `string` | Affichage console |
| `actif` | `boolean` | Basculable à chaud — voir API_CONTRACT.md §10 pour l'état réel du câblage |

### Table `admin_audit_logs` (ajouté 13/09/2026, console admin)
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `adminId` / `adminPseudo` | `string` | Auteur de l'action (pseudo en instantané, lisible même si le compte est supprimé depuis) |
| `action` / `cible` | `string` / `string \| null` | Texte libre lisible par un humain |
| `dateCreation` | `Date` | Horodatage |

---

## 5. Enums réutilisables (côté front comme back)

Ces énumérations sont partagées via `packages/shared` pour éviter les doublons.

```typescript
// ToxicityLevel
GREEN = 'green'
ORANGE = 'orange'
RED = 'red'

// PlantType
OWNED = 'owned'        // Mon Jardin
DISCOVERED = 'discovered' // Herbarium

// HealthStatus
GOOD = 'green'
WARNING = 'orange'
DANGER = 'red'
```

---

## 6. Conventions Git

### Branches

```
main        ← toujours stable, déployable
└── dev     ← intégration continue
    ├── feat/scan-toxicite
    ├── feat/herbarium-grid
    ├── fix/feed-filtre-5km
    └── chore/ci-setup
```

- Personne ne pousse directement sur `main` ni `dev` : tout passe par **Pull Request**.
- PR relue par l'autre membre du binôme avant merge.
- Branches courtes (< 1 semaine), une fonctionnalité = une branche.

### Commits — Conventional Commits

```
feat(scan): ajout du badge de toxicité après identification
fix(feed): correction du filtre "près de moi" à 5 km
chore(ci): ajout du lint sur les PR
docs(readme): instructions d'installation
refactor(collection): extraction du service Geo-Tag
```

Format : `type(scope): description` — types : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.

### Versions

- **SemVer** : `v0.1.0` (MVP scan), `v0.2.0` (jardin split), etc.
- Un tag Git à chaque jalon : `git tag v0.1.0 && git push --tags`.

### .gitignore (minimum)

```
node_modules/
.expo/
dist/
.env
*.local
```

⚠️ **Jamais de secrets commités** (clés API Plant.id, DB…) : utiliser `.env` + fournir un `.env.example` documenté.

---

## 7. Mise en place — pas à pas

```bash
# 1. Initialiser le dépôt
mkdir planai && cd planai
git init && git branch -M main

# 2. Créer les apps
npx create-expo-app apps/mobile
npx @nestjs/cli new apps/api

# 3. Workspaces (package.json racine)
#    { "private": true, "workspaces": ["apps/*", "packages/*"] }

# 4. Premier commit
git add . && git commit -m "chore: bootstrap monorepo expo + nestjs"

# 5. Pousser sur GitHub
git remote add origin git@github.com:<votre-org>/planai.git
git push -u origin main

# 6. Créer la branche d'intégration
git checkout -b dev && git push -u origin dev
```

**Sur GitHub ensuite :**

1. Settings → Branches → protéger `main` et `dev` (PR obligatoire).
2. Ajouter une CI minimale (`.github/workflows/ci.yml`) : `lint` + `test` sur chaque PR.

---

## 8. Environnement de développement avec Docker

PostgreSQL + `apps/api` tournent en conteneurs Docker pour qu'Abdel et Djawad
aient exactement le même environnement (même version de Postgres, mêmes
variables d'environnement, pas d'installation manuelle divergente).
`apps/mobile` (Expo) tourne **toujours sur l'hôte**, jamais en conteneur, pour
garder l'accès aux appareils/émulateurs.

Fichiers concernés : `docker-compose.yml` et `.dockerignore` (racine),
`apps/api/Dockerfile`, `.env.example` (racine, à copier en `.env`).

Le guide pas-à pas complet (Windows + Linux : prérequis, premier démarrage,
migrations/seed, connexion du front via adb, remise à zéro, ce qui reste hors
Docker) est dans **[DOCKER.md](./DOCKER.md)**. Pour une explication encore
plus détaillée, pensée pour quelqu'un qui n'a jamais utilisé Docker (chaque
commande et chaque mot de vocabulaire expliqués), voir
**[DOCKER_CONFIGURATION.md](./DOCKER_CONFIGURATION.md)**.

Résumé express (Linux/macOS, une fois Docker installé) :

```bash
cp .env.example .env
npm run docker:up       # docker compose up -d : db + api + adminer
npm run docker:logs     # vérifier que l'API a bien démarré (Ctrl+C pour quitter les logs)
cd apps/mobile && npx expo start   # Expo reste sur l'hôte, voir demarrage.md / README.md
```

---

## 9. Priorités MVP (cahier des charges §7)

1. **Scan** : identification IA + toxicité + ajout contextuel Jardin/Herbarium.
2. **Mon Jardin** : split Quotidien/Herbarium, indicateurs de santé.
3. **Auth + XP** : comptes, gain d'XP à la capture.
4. Feed communauté, puis "Près de moi", puis défis.

---

## ✅ Ce que Djawad doit retenir

- Les **noms des propriétés** à utiliser dans `react-query` et dans les écrans sont ceux du tableau **Modèle de données** (ex: `nomUtilisateur`, `dateAjout`, `etatSante`, `contenuTexte`).
- Les **types d'énumération** sont les mêmes qu'il devra afficher (ex: `toxicite: 'green'` → afficher "Non toxique" ; `type: 'owned'` → afficher dans "Mon Jardin").
- Les relations principales :  
  - Une `Collection` appartient à un `User` et à une `Plant`.  
  - Un `Post` appartient à un `User` et peut taguer une `Collection`.  
  - Les `Like` et `Comment` sont rattachés à un `Post`.

