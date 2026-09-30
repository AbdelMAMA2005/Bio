# Migration NestJS → Supabase — Plan d'implémentation

Suppression complète du backend NestJS (`apps/api`) et migration de l'intégralité de la base de données, de l'authentification, du stockage de fichiers et de la logique applicative vers **Supabase** (PostgreSQL + Auth + Storage + RLS).

---

## User Review Required

> [!IMPORTANT]
> **Projet Supabase requis** : Avant de commencer l'exécution, vous devez créer un projet Supabase (gratuit) sur [supabase.com](https://supabase.com) et fournir les deux variables `SUPABASE_URL` et `SUPABASE_ANON_KEY` qui seront injectées dans `apps/mobile/.env`.

> [!WARNING]
> **Breaking change — Authentification** : L'authentification migre de JWT NestJS/argon2 vers Supabase Auth. Les utilisateurs existants devront recréer un compte (pas de migration de hashes argon2 vers Supabase bcrypt). Si vous avez des utilisateurs en production, une stratégie de migration de comptes devra être planifiée séparément.

> [!WARNING]
> **Console admin (`apps/admin`)** : Ce plan ne couvre **pas** la migration de la console admin. L'admin continue de fonctionner uniquement si le backend NestJS reste en place pour elle, OU elle devra être migrée séparément (avec Supabase Edge Functions ou un appel direct au SDK JS admin). La priorité ici est le **mobile**.

> [!CAUTION]
> **Suppression du backend** : Le code sous `apps/api/` ne sera pas supprimé physiquement dans cette phase, mais il ne sera plus nécessaire pour le fonctionnement de l'app mobile. Docker et les scripts liés au backend seront désactivés/nettoyés.

---

## Open Questions

> [!IMPORTANT]
> 1. **Google Sign-In** : Supabase supporte nativement Google OAuth. Voulez-vous migrer le flux Google Sign-In vers `supabase.auth.signInWithIdToken()` (recommandé, natif Supabase) ?
> 2. **Plant.id API** : Actuellement, le backend NestJS proxie les appels Plant.id (identification + diagnostic santé). Avec la suppression du backend, deux options :
>    - **(A)** Appeler Plant.id **directement depuis le mobile** (expose la clé API dans le bundle — risque de reverse engineering)
>    - **(B) (Recommandé)** Créer une **Supabase Edge Function** (`identify-plant`, `diagnose-health`) qui proxie Plant.id côté serveur, protégeant la clé API
> 3. **Rareté dynamique** : La logique de calcul de rareté (`computeRarityFromPriorCaptures`) utilise un comptage global sur la table `collection`. On peut soit la reproduire via une **database function** PostgreSQL côté Supabase, soit la déplacer côté client (moins fiable). Recommandation : **database function**.
> 4. **Quêtes quotidiennes** : La progression des quêtes est calculée dynamiquement par le backend à partir de requêtes SQL complexes (scans du jour, ajouts jardins, likes reçus…). On peut reproduire cela via une **database function** `get_daily_quests(user_id)` ou via des requêtes Supabase directes côté client. Recommandation : **database function**.

---

## Proposed Changes

L'implémentation est divisée en 3 grands blocs alignés sur les tâches demandées.

---

### 1. Schema SQL Supabase (`schema_supabase.sql`)

#### [NEW] [schema_supabase.sql](file:///c:/WorkSpace/Bio%20-%20Copy/schema_supabase.sql)

Fichier SQL complet à exécuter dans l'éditeur SQL Supabase. Contenu :

**Extensions & Types ENUM :**
- `uuid-ossp` (activé par défaut sur Supabase)
- Types ENUM PostgreSQL : `toxicity_level` (`green`, `orange`, `red`), `health_status` (`green`, `orange`, `red`), `plant_type` (`owned`, `discovered`), `story_media_type` (`image`, `video`), `user_role` (`membre`, `moderateur`, `admin`), `report_target_type` (`post`, `story`, `comment`), `report_statut` (`ouvert`, `ignore`, `supprime`), `quest_type` (`quotidien`, `exploration`)

**Tables (20 tables, mappées 1:1 depuis les entités TypeORM) :**

| Table | Description | Liaison auth.users |
|-------|-------------|--------------------|
| `profiles` | Profils utilisateurs (étend `auth.users`) | `id` = `auth.users.id` |
| `plants` | Référentiel espèces | — |
| `collection` | Jardin / Herbarium | `user_id` → `profiles.id` |
| `posts` | Publications communautaires | `user_id` → `profiles.id` |
| `comments` | Commentaires sur posts | `user_id` → `profiles.id` |
| `likes` | Likes sur posts | `user_id` → `profiles.id` |
| `stories` | Médias éphémères 24h | `user_id` → `profiles.id` |
| `story_views` | Vues sur stories | `viewer_id` → `profiles.id` |
| `story_likes` | Likes sur stories | `user_id` → `profiles.id` |
| `conversations` | Paires d'utilisateurs | `user1_id`, `user2_id` → `profiles.id` |
| `messages` | Messages privés | `sender_id` → `profiles.id` |
| `refresh_tokens` | *(supprimée — Supabase gère les tokens)* | — |
| `reminders` | Rappels d'arrosage | `user_id` → `profiles.id` |
| `identification_logs` | Journal des scans | `user_id` → `profiles.id` |
| `quests` | Définitions des défis | — |
| `quest_progress` | Progression par jour | `user_id` → `profiles.id` |
| `reports` | Signalements modération | `reporter_id` → `profiles.id` |
| `feature_flags` | Bascules fonctionnelles | — |
| `device_tokens` | Tokens push Expo | `user_id` → `profiles.id` |
| `admin_audit_logs` | Journal admin | `admin_id` → `profiles.id` |

**Row Level Security (RLS) — Politiques strictes sur CHAQUE table :**

- **`profiles`** : `SELECT` public (profils publics), `UPDATE` seulement `auth.uid() = id`
- **`collection`** : CRUD restreint à `auth.uid() = user_id`
- **`posts`** : `SELECT` pour tous les authentifiés, `INSERT/UPDATE/DELETE` seulement `auth.uid() = user_id`
- **`comments`** : `SELECT` pour tous les authentifiés, `INSERT` pour authentifiés, `DELETE` si auteur du commentaire OU auteur du post
- **`likes`** : `SELECT` pour tous, `INSERT/DELETE` si `auth.uid() = user_id`
- **`stories`** : `SELECT` pour tous (non expirées), `INSERT/DELETE` si `auth.uid() = user_id`
- **`story_views`** : `INSERT` pour authentifiés, `SELECT` restreint à l'auteur du média
- **`story_likes`** : `SELECT` pour tous, `INSERT/DELETE` si `auth.uid() = user_id`
- **`conversations`** : `SELECT/INSERT` seulement si `auth.uid()` ∈ {`user1_id`, `user2_id`}
- **`messages`** : `SELECT` si membre de la conversation, `INSERT` si `auth.uid() = sender_id`
- **`reminders`** : CRUD restreint à `auth.uid() = user_id`
- **`plants`** : `SELECT` public, `INSERT/UPDATE/DELETE` admin uniquement
- **`quests`** : `SELECT` pour tous les authentifiés
- **`quest_progress`** : CRUD restreint à `auth.uid() = user_id`
- **`identification_logs`** : `INSERT/SELECT` restreint à `auth.uid() = user_id`
- **`reports`** : `INSERT` pour authentifiés, `SELECT` admin uniquement
- **`feature_flags`** : `SELECT` pour tous, `UPDATE` admin uniquement
- **`device_tokens`** : CRUD restreint à `auth.uid() = user_id`
- **`admin_audit_logs`** : `INSERT/SELECT` admin uniquement

**Triggers :**
- `updated_at` auto-update sur toutes les tables ayant un champ `updated_at`
- Trigger `on_auth_user_created` pour créer automatiquement un `profiles` row quand un utilisateur s'inscrit via Supabase Auth
- Trigger pour normaliser `user1_id < user2_id` dans `conversations`

**Fonctions PostgreSQL :**
- `compute_rarity(plant_id)` : calcule la rareté dynamique
- `calculate_xp_for_rarity(badge)` : retourne XP selon rareté
- `haversine_meters(lat1, lon1, lat2, lon2)` : distance géographique
- `get_daily_quests(uid)` : progression quotidienne complète

**Storage Buckets (Supabase Storage) :**
- `avatars` — photos de profil (public read, write par propriétaire)
- `collections` — photos de suivi (private, read/write par propriétaire)
- `posts` — images des publications (public read, write par auteur)
- `stories` — médias de stories (public read, write par auteur)

---

### 2. Client Supabase Mobile

#### [NEW] [supabase.ts](file:///c:/WorkSpace/Bio%20-%20Copy/apps/mobile/src/lib/supabase.ts)

Initialisation du client Supabase avec `AsyncStorage` pour la persistance de session React Native :

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // pas de deeplink auth pour l'instant
  },
});
```

**Dépendances à ajouter à `apps/mobile/package.json` :**
- `@supabase/supabase-js` (^2.x)
- `@react-native-async-storage/async-storage` (déjà présent ✅)
- `react-native-url-polyfill` (nouveau)

---

### 3. Refactoring du code mobile

> [!NOTE]
> **Règle stricte** : Les signatures des fonctions/hooks exportés restent identiques. Seule l'implémentation interne change (Axios → Supabase SDK). Les types de retour restent les mêmes (`GardenClone`, `HerbariumDiscovery`, `FeedPost`, etc.).

---

#### [MODIFY] [.env](file:///c:/WorkSpace/Bio%20-%20Copy/apps/mobile/.env)
- Supprimer `EXPO_PUBLIC_API_URL`
- Ajouter `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Conserver `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- Supprimer `EXPO_PUBLIC_USE_MOCK_API`

#### [DELETE] [config.ts](file:///c:/WorkSpace/Bio%20-%20Copy/apps/mobile/src/api/config.ts)
Plus nécessaire (résolution d'URL backend NestJS).

#### [DELETE] [client.ts](file:///c:/WorkSpace/Bio%20-%20Copy/apps/mobile/src/api/client.ts)
Client Axios + intercepteurs JWT → remplacé par le client Supabase.

#### [DELETE] [authToken.ts](file:///c:/WorkSpace/Bio%20-%20Copy/apps/mobile/src/api/authToken.ts)
Supabase gère les tokens en interne via `AsyncStorage`.

#### [MODIFY] [adapters.ts](file:///c:/WorkSpace/Bio%20-%20Copy/apps/mobile/src/api/adapters.ts)
- Les fonctions de mapping restent (les données Supabase gardent le même schéma)
- `resolveUploadUrl` → pointera vers Supabase Storage public URLs au lieu de `/uploads/...`
- Suppression de l'import `API_BASE_URL`

#### [MODIFY] [authStorage.ts](file:///c:/WorkSpace/Bio%20-%20Copy/apps/mobile/src/features/auth/authStorage.ts)
- Simplification : Supabase persiste la session automatiquement via `AsyncStorage`
- `readSession` / `writeSession` / `clearSession` → délèguent à `supabase.auth.getSession()` / `supabase.auth.signOut()`

#### [MODIFY] [authApi.ts](file:///c:/WorkSpace/Bio%20-%20Copy/apps/mobile/src/features/auth/authApi.ts)
| Ancienne fonction | Nouvelle implémentation |
|---|---|
| `login(email, password)` | `supabase.auth.signInWithPassword({email, password})` |
| `register(pseudo, email, password)` | `supabase.auth.signUp({email, password, options: {data: {nom_utilisateur: pseudo}}})` + insert `profiles` |
| `loginWithGoogle(idToken)` | `supabase.auth.signInWithIdToken({provider:'google', token: idToken})` |
| `refreshAccessToken(refreshToken)` | Supprimée (Supabase auto-refresh) |
| `logout(refreshToken)` | `supabase.auth.signOut()` |
| `fetchProfile()` | `supabase.from('profiles').select('*').eq('id', userId).single()` |
| `updateProfile(patch)` | `supabase.from('profiles').update({...}).eq('id', userId)` |
| `uploadAvatar(imageUri)` | `supabase.storage.from('avatars').upload(...)` + `getPublicUrl()` + update `profiles.url_avatar` |
| `deleteAccount(password)` | `supabase.rpc('delete_my_account', {password})` (DB function) |

#### [MODIFY] [AuthProvider.tsx](file:///c:/WorkSpace/Bio%20-%20Copy/apps/mobile/src/features/auth/AuthProvider.tsx)
- Supprimer `setAuthToken`, `setRefreshToken`, `setRefreshHandler`, `setUnauthorizedHandler`
- Utiliser `supabase.auth.onAuthStateChange()` pour réagir aux changements de session
- Le `user` est mappé depuis `supabase.auth.getUser()` + données `profiles`
- Plus besoin de stocker/restaurer manuellement le token : Supabase le fait

#### [MODIFY] Tous les hooks `src/api/hooks/*` :

| Hook | Ancienne implémentation | Nouvelle implémentation |
|------|------------------------|------------------------|
| `useMyGarden` | `apiClient.get('/collection?type=owned')` | `supabase.from('collection').select('*, plants(*)').eq('user_id', uid).eq('type_collection', 'owned')` |
| `useHerbarium` | `apiClient.get('/collection?type=discovered')` | `supabase.from('collection').select('*, plants(*)').eq('user_id', uid).eq('type_collection', 'discovered')` |
| `useFeed` | `apiClient.get('/feed')` | `supabase.from('posts').select('*, auteur:profiles(*), plante:collection(*, plants(*)), likes(*), comments(count)')` |
| `useIdentify` | `apiClient.post('/identification', formData)` | Appel à **Supabase Edge Function** `identify-plant` |
| `useQuests` | `apiClient.get('/quests/daily')` | `supabase.rpc('get_daily_quests', {uid: userId})` |
| `useMessages` | `apiClient.get('/messages/...')` | `supabase.from('messages').select(...)` + `supabase.from('conversations').select(...)` |
| `useReminders` | `apiClient.get('/reminders')` | `supabase.from('reminders').select('*').eq('user_id', uid)` |
| `useBadges` | `apiClient.get('/users/me')` → `insignes` | `supabase.from('profiles').select('insignes').eq('id', uid)` |
| `useNotifications` | `apiClient.post('/notifications/device')` | `supabase.from('device_tokens').upsert(...)` |
| `usePlantDetail` | Dérivé des hooks garden/herbarium | Inchangé (pas d'appel API direct) |
| `usePublicProfile` | `apiClient.get('/users/:id/public-profile')` | `supabase.from('profiles').select('*').eq('id', userId)` + `supabase.rpc('get_user_stats', {uid})` |

#### [MODIFY] Stories (dans `useFeed.ts`) :
| Opération | Nouvelle implémentation |
|-----------|------------------------|
| `GET /stories` | `supabase.from('stories').select('*, story_views(*), story_likes(*), profiles(*)').gt('date_expiration', 'now()')` + groupement côté client |
| `POST /stories` | `supabase.storage.from('stories').upload(...)` + `supabase.from('stories').insert(...)` |
| `POST /stories/:id/view` | `supabase.from('story_views').upsert(...)` |
| `POST /stories/:id/like` | `supabase.from('story_likes').upsert(...)`/`.delete(...)` |

#### [MODIFY] Upload d'images (dans tous les hooks concernés) :
| Upload actuel | Nouvel upload Supabase Storage |
|---|---|
| `FormData` + `apiClient.post(url, formData)` | `supabase.storage.from(bucket).upload(path, file, {contentType})` |
| URL retournée : `/uploads/...` | URL retournée : `supabase.storage.from(bucket).getPublicUrl(path)` |

**Buckets touchés :** `avatars`, `collections`, `posts`, `stories`

---

### 4. Nettoyage des fichiers et documentation

#### [MODIFY] [.env.example](file:///c:/WorkSpace/Bio%20-%20Copy/.env.example)
- Supprimer les variables NestJS (`DB_HOST`, `DB_PORT`, `JWT_SECRET`, `PLANT_ID_API_KEY`, etc.)
- Ajouter `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`

#### [MODIFY] [README.md](file:///c:/WorkSpace/Bio%20-%20Copy/README.md)
- Mettre à jour les instructions de démarrage : plus de `apps/api`, plus de Docker pour le dev
- Documenter la configuration Supabase

#### [MODIFY] [ARCHITECTURE.md](file:///c:/WorkSpace/Bio%20-%20Copy/ARCHITECTURE.md)
- Mettre à jour la section backend : NestJS → Supabase
- Supprimer les références au monorepo `apps/api`
- Documenter la nouvelle architecture (client Supabase direct)

#### [MODIFY] [demarrage.md](file:///c:/WorkSpace/Bio%20-%20Copy/demarrage.md)
- Simplifier : plus besoin de lancer un backend séparément
- Seul `npx expo start` est nécessaire

#### [MODIFY] [TODO.md](file:///c:/WorkSpace/Bio%20-%20Copy/TODO.md)
- Marquer les tâches backend comme "Migrées vers Supabase"

#### [MODIFY] [API_CONTRACT.md](file:///c:/WorkSpace/Bio%20-%20Copy/API_CONTRACT.md)
- Ajouter un encart "Migration Supabase" en en-tête
- Documenter les nouvelles conventions (Supabase SDK au lieu d'endpoints REST)

#### Fichiers NestJS à ne plus utiliser (non supprimés, archivés) :
- `apps/api/` — tout le dossier
- `docker-compose.yml`, `Dockerfile`, `.dockerignore`
- `nest-cli.json`
- Scripts Docker dans `package.json` racine

---

## Verification Plan

### Automated Tests
```bash
cd apps/mobile && npx tsc --noEmit   # Vérifier le typage TypeScript
cd apps/mobile && npm test            # Exécuter les tests Jest existants
```

### Manual Verification
1. **Auth** : Inscription → Connexion → Déconnexion → Reconnexion (email + Google)
2. **Scan** : Prise de photo → Identification → Ajout au Jardin/Herbarium
3. **Collection** : Liste Mon Jardin, Liste Herbarium, Photo de suivi, Diagnostic santé
4. **Feed** : Créer un post (texte + image), Liker, Commenter, Filtre "Près de moi"
5. **Stories** : Créer une story, Voir, Liker, Répondre en message privé
6. **Messages** : Liste des conversations, Envoi de message, Lecture = marqué lu
7. **Profil** : Modifier pseudo, Changer avatar, Voir profil public
8. **Quêtes** : Voir la progression des défis du jour
9. **RLS** : Vérifier qu'un utilisateur ne peut pas accéder aux données d'un autre (tester via Supabase Dashboard > SQL Editor)
