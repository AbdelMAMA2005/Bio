# PlanAI — Architecture & Conventions

> Guide de mise en place du dépôt Git, de la structure du projet et des conventions d'équipe.
> Stack actuelle : **React Native (Expo)** + **Supabase** (Auth, PostgreSQL, Storage, RLS, Edge Functions).

---

## 1. Organisation des dépôts

Monorepo npm (workspaces). Il n'y a pas de serveur applicatif : le mobile et la console admin parlent directement à Supabase.

```
planai/
├── apps/
│   ├── mobile/          # Application React Native (Expo)
│   └── admin/           # Console admin web (React + Vite, branchée sur Supabase)
├── packages/
│   └── shared/          # Types TS partagés
├── supabase/
│   ├── functions/       # Edge Functions (identify-plant, diagnose-health, send-feedback, admin-status)
│   ├── migrations/      # Migrations SQL appliquées en production, dans l'ordre
│   ├── migrations_a_venir/  # À appliquer seulement après la sortie de la nouvelle version mobile
│   └── tests/           # Tests SQL (droits, RPC, triggers)
├── package.json
├── README.md
├── schema_supabase.sql  # Schéma de base (⚠ réinitialise tout : jamais sur la prod)
└── .env.example
```

**Pourquoi cette structure ?**

- Le mobile accède directement à Supabase via le SDK JS.
- La base de données, l'authentification, les buckets Storage et les règles RLS sont centralisées dans Supabase.
- La logique sensible (XP, badges, défis, signalements, administration) vit dans la base : triggers et RPC `SECURITY DEFINER`, jamais dans le client.

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

## 3bis. Console admin : `apps/admin` (React + Vite) sur Supabase

Espace web séparé de l'app mobile, pour piloter l'application (utilisateurs, référentiel
plantes, modération, défis, paramètres). Depuis octobre 2026, la console parle directement
au même projet Supabase que le mobile.

```
apps/admin/src/
├── api/
│   ├── client.ts     # client Supabase, ApiError (codes Postgres -> 403/404/409), rpc()
│   └── hooks/        # useStats, useUsers, usePlants, useModeration, useQuests, useSettings
├── auth/             # AuthProvider : Supabase Auth + vérification du rôle par admin_me()
├── components/, pages/, theme/
supabase/
├── migrations/20261015090000_admin_console.sql        # rôles, RPC admin_*, policies, audit
├── migrations_a_venir/20261015090100_profiles_private_columns.sql  # e-mail privé (après la sortie mobile)
├── functions/admin-status/                             # présence des clés de service
└── tests/admin_console.sql                             # tests SQL (droits + chaque action)
```

**Rôles** : `profiles.role` (`membre | moderateur | admin`) ; `est_admin` historique reste
synchronisé. `is_staff()` et `is_admin()` (SQL) servent aux policies et aux RPC.

**Sécurité** : toutes les actions sensibles passent par des RPC `SECURITY DEFINER`
(`admin_users`, `admin_set_user_role`, `admin_set_user_suspended`, `admin_delete_user`,
`admin_plants`, `admin_quests`, `admin_moderation`, `admin_moderation_resolve`,
`admin_stats`, `admin_me`) qui vérifient le rôle côté base. La clé publique utilisée par
la console ne donne donc aucun droit à elle seule. Les écritures simples (espèces, défis,
fonctionnalités) passent par la table, autorisées par policy. Chaque action est inscrite
dans `admin_audit_logs` (par la RPC ou par trigger), journal en lecture seule.

**Suspension et suppression** : elles posent aussi `auth.users.banned_until`, pour que la
personne ne puisse plus se connecter depuis le mobile.

| Action | Admin | Modérateur |
| --- | --- | --- |
| Voir tableau de bord, utilisateurs, espèces, défis, signalements | oui | oui |
| Suspendre / réactiver un membre | oui | oui (pas un membre de l'équipe) |
| Changer un rôle, supprimer un compte (RGPD) | oui | non |
| Créer / modifier / supprimer une espèce | oui | non |
| Créer un défi / activer ou modifier un défi | oui / oui | non / oui |
| Fonctionnalités, clés de service, journal d'audit | oui | non |

---

## 4. Modèle de données

La source de vérité est `schema_supabase.sql` (schéma de base) complété par
`supabase/migrations/*.sql`, appliquées dans l'ordre. Les colonnes sont en `snake_case`
(`nom_utilisateur`, `date_ajout`, `etat_sante`…) ; `apps/mobile/src/api/adapters.ts`
les convertit vers les types de `packages/shared` utilisés par les écrans.

| Domaine | Tables | À retenir |
| --- | --- | --- |
| Comptes | `profiles` (étend `auth.users`) | Créé par trigger à l'inscription, pseudo unique garanti. Un membre ne modifie que `nom_utilisateur` et `url_avatar` ; XP, pièces, rôle et niveau sont écrits par la base. `experience` = XP cumulée, `niveau` recalculé par trigger (n → n+1 coûte n × 250 XP). |
| Plantes | `plants`, `collection`, `collection_xp_credits` | `plants` est alimentée par identify-plant. `collection.type_collection` : `owned` (Mon Jardin) ou `discovered` (Herbarium). L'XP d'une espèce n'est créditée qu'une fois par type. |
| Communauté | `posts`, `comments`, `likes`, `stories`, `story_views`, `story_likes` | Stories visibles 24 h. Une plante taguée dans un post devient lisible par les membres. |
| Messagerie | `conversations`, `messages` | Une conversation par paire (`user1_id < user2_id`). Seul le destinataire marque un message comme lu. |
| Jeu | `quests`, `quest_progress` | Progression et récompenses calculées par la RPC `get_daily_quests()` selon `quests.critere`. Badges : RPC `get_my_badges()`. |
| Modération | `reports`, `admin_audit_logs`, `feature_flags` | Signalement via la RPC `report_content()` uniquement. |
| Divers | `reminders`, `device_tokens`, `identification_logs`, `app_feedback` | `identification_logs` n'est écrit que par identify-plant. |

Buckets Storage : `avatars`, `posts`, `stories` (publics en lecture) et `collections`
(privé, URL signées). Chacun n'écrit et ne supprime que dans son dossier `<user_id>/`.

---

## 5. Enums réutilisables

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
npm create vite@latest apps/admin -- --template react-ts

# 3. Workspaces (package.json racine)
#    { "private": true, "workspaces": ["apps/*", "packages/*"] }

# 4. Premier commit
git add . && git commit -m "chore: bootstrap monorepo expo + vite"

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

## 8. Base de données et Edge Functions

- **Migrations** : chaque changement de schéma est un nouveau fichier daté dans
  `supabase/migrations/`, rejouable et sans perte de données. Le projet de production n'a
  pas d'historique de migrations (`supabase_migrations.schema_migrations` absente) :
  `supabase db push` les rejouerait toutes. Les appliquer une par une depuis le SQL Editor.
  Ne jamais lancer `schema_supabase.sql` sur la prod.
- **Appliquées en production** : toutes celles de `supabase/migrations/` au 27/10/2026,
  sauf `20261014120000_private_collections_bucket` (après la sortie de la nouvelle version
  mobile, comme `supabase/migrations_a_venir/`).
- **Tests SQL** : `supabase/tests/*.sql` s'exécutent avec `psql -v ON_ERROR_STOP=1` sur une
  base de test (schéma + migrations appliqués) et annulent tout à la fin (`ROLLBACK`).
- **Edge Functions** : `npx supabase functions deploy <nom> --project-ref <ref>`. Toujours
  partir du code du dépôt, jamais d'une modification faite dans l'éditeur en ligne.
- **Contrôle de la prod** : `scripts/verifier_prod.sh` vérifie, avec la seule clé publique,
  que les données privées ne sont pas lisibles et que les fonctions répondent.

---

## 9. Priorités MVP (cahier des charges §7)

1. **Scan** : identification IA + toxicité + ajout contextuel Jardin/Herbarium.
2. **Mon Jardin** : split Quotidien/Herbarium, indicateurs de santé.
3. **Auth + XP** : comptes, gain d'XP à la capture.
4. Feed communauté, puis "Près de moi", puis défis.

---

## ✅ Ce que Djawad doit retenir

- Les écrans utilisent les types de `packages/shared` (ex: `pseudo`, `dateAjout`, `etatSante`) ; la conversion depuis les colonnes Supabase est faite dans `adapters.ts`.
- Les **types d'énumération** sont les mêmes qu'il devra afficher (ex: `toxicite: 'green'` → afficher "Non toxique" ; `type: 'owned'` → afficher dans "Mon Jardin").
- Les relations principales :  
  - Une `Collection` appartient à un `User` et à une `Plant`.  
  - Un `Post` appartient à un `User` et peut taguer une `Collection`.  
  - Les `Like` et `Comment` sont rattachés à un `Post`.

