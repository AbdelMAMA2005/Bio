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
│   └── api/             # Back-end NestJS
├── packages/
│   └── shared/          # Types TS partagés (Plante, User, DTOs, enums rareté/santé)
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
│   │   └── _layout.tsx         # Tab bar (3 onglets, bouton Scan central)
│   ├── components/             # UI réutilisable
│   │   ├── PlantCard.tsx
│   │   ├── RarityBadge.tsx     # Commun / Rare / Épique
│   │   ├── HealthDot.tsx       # vert / orange / rouge
│   │   ├── XPToast.tsx         # animation "+45 XP"
│   │   └── SegmentedControl.tsx
│   ├── features/               # Logique métier par domaine
│   │   ├── scan/               # identification, toxicité, ajout contextuel
│   │   ├── jardin/             # clones, rappels, diagnostic maladie
│   │   ├── herbarium/          # découvertes, geo-tag
│   │   ├── feed/               # posts, likes, filtre "près de moi"
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
│   │   ├── feed/               # publications, likes, commentaires, stories
│   │   │                       #   + endpoint "près de moi" (rayon 5/10 km)
│   │   ├── quests/             # défis quotidiens + exploration, récompenses
│   │   └── notifications/      # rappels push (arrosage, traitements)
│   ├── common/                 # guards, pipes, interceptors, filters
│   ├── config/                 # env, base de données
│   └── main.ts
├── src/entities/               # 📌 Toutes les entités TypeORM
│   ├── enums/
│   │   ├── toxicity-level.enum.ts
│   │   ├── plant-type.enum.ts
│   │   └── health-status.enum.ts
│   ├── user.entity.ts
│   ├── plant.entity.ts
│   ├── collection.entity.ts
│   ├── posts.entity.ts
│   ├── like.entity.ts
│   ├── comment.entity.ts
│   └── reminder.entity.ts
├── test/
└── package.json
```

**Règles back :**

- Un module = controller + service + entities + DTOs. Pas de logique dans les controllers.
- Chaque module est autonome → migration future vers microservices (Auth, IA, Feed, Notifications) sans refonte.
- Les DTOs sont validés (`class-validator`) et leurs types exportés vers `packages/shared`.

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
| `dateAjout` | `Date` | Date d'ajout à la collection |
| `latitude` | `number \| null` | Geo-tag (optionnel) |
| `longitude` | `number \| null` | Geo-tag (optionnel) |

---

### Table `posts` (Feed communautaire)
| Propriété (JSON) | Type TypeScript | Description |
| :--- | :--- | :--- |
| `id` | `string` (UUID) | Identifiant unique |
| `idUtilisateur` | `string` (UUID) | Clé étrangère → `users.id` |
| `idCollection` | `string \| null` (UUID) | Optionnel → `collection.id` (plante taguée) |
| `contenuTexte` | `string` | Texte de la publication |
| `urlImage` | `string \| null` | Image associée |
| `dateCreation` | `Date` | Horodatage |

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

## 8. Priorités MVP (cahier des charges §7)

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

