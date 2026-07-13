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
│   │   ├── users/              # profil, niveau, XP, badges, pièces
│   │   ├── plants/             # référentiel espèces (nom, famille, toxicité, rareté, conseils JSON)
│   │   ├── collection/         # Jardin / Herbarium
│   │   │                       #   type: 'owned' | 'discovered'  ← champ clé
│   │   │                       #   latitude/longitude si Geo-Tag accepté
│   │   │                       #   etat_sante: 'sain'|'alerte'|'malade' (clones)
│   │   │                       #   historique_photos (JSON array)
│   │   ├── identification/     # proxy vers Plant.id / Google Vision
│   │   ├── diagnosis/          # détection maladies (CNN PlantVillage)
│   │   ├── feed/               # publications, likes, commentaires, stories
│   │   │                       #   + endpoint "près de moi" (rayon 5/10 km)
│   │   ├── quests/             # défis quotidiens + exploration, récompenses
│   │   └── notifications/      # rappels push (arrosage, traitements)
│   ├── common/                 # guards, pipes, interceptors, filters
│   ├── config/                 # env, base de données
│   └── main.ts
├── prisma/ (ou typeorm)        # schéma + migrations
│   └── schema.prisma
├── test/
└── package.json
```

**Règles back :**

- Un module = controller + service + entities + DTOs. Pas de logique dans les controllers.
- Chaque module est autonome → migration future vers microservices (Auth, IA, Feed, Notifications) sans refonte.
- Les DTOs sont validés (`class-validator`) et leurs types exportés vers `packages/shared`.

### Modèle de données (rappel du cahier des charges §4.2)

| Table        | Champs clés                                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `users`      | id, pseudo, email, niveau, xp, badges                                                                                                    |
| `plants`     | id, nom_scientifique, nom_commun, famille, toxicite (bool), rarete (enum), conseils_entretien (json)                                     |
| `collection` | id_utilisateur, id_plante, date_ajout, **type ('owned'/'discovered')**, latitude, longitude, historique_photos (json), etat_sante (enum) |
| `posts`      | id, id_utilisateur, id_plante_taguee?, contenu_texte, image_url, likes, commentaires                                                     |

---

## 4. Conventions Git

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

## 5. Mise en place — pas à pas

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

## 6. Priorités MVP (cahier des charges §7)

1. **Scan** : identification IA + toxicité + ajout contextuel Jardin/Herbarium.
2. **Mon Jardin** : split Quotidien/Herbarium, indicateurs de santé.
3. **Auth + XP** : comptes, gain d'XP à la capture.
4. Feed communauté, puis "Près de moi", puis défis.
