# Rapport d'analyse PlanAI — 14/10/2026

Branche analysée : `supabase` (dernier commit `87406eb`, « Version Android V1.0.0 - prête pour la production », par richardfaihoun123-ux).
Rien n'a été modifié dans le code : ce rapport ne fait que constater.

## ⚠️ Constats en ligne (Google Cloud + Supabase, vérifiés le 14/10/2026 en lecture seule)

1. **Le projet Supabase de l'app, « plantai » (`fzllbtkjpwhadkdragno`), est EN PAUSE** (pause automatique du plan gratuit). Tant qu'il est en pause, **rien ne marche en prod** : connexion, feed, scan, etc. Il peut être relancé depuis le dashboard jusqu'au 17/11/2027. Pour éviter de nouvelles pauses, il faut un usage régulier ou passer en Pro.
2. **`qajabrygfkxeslujzmmt` n'est PAS la base PlanAI** : elle contient seulement `document_chunks` et `style_profiles`, et le provider Google y est désactivé. Il ne faut donc **pas** y faire pointer l'app.
3. **Google Cloud `plantai-505720`** (n° de projet `433759550825`) : le client Web « PlantAPI » est bien celui qu'utilise l'app.
   Il existe 3 clients Android, tous en package `com.planai` :
   - « PlantAI Android » : SHA-1 `5E:8F:16:06:…:F6:25`. C'est la clé **debug publique** du template React Native.
   - « Android client 2 » : SHA-1 `0D:23:1C:1B:8C:64:C5:2F:61:D5:39:69:B2:9C:DD:F7:29:50:02:8C`.
   - « Android client 3 » : SHA-1 `D3:89:67:60:50:71:56:3C:21:3D:2F:BF:E4:03:A5:CA:0D:FD:32:A8`. Dernière utilisation le 6 octobre.
   **Il manque très probablement la SHA-1 de la clé de signature Play** (Play Console → Intégrité de l'app), si l'APK testé vient du Play Store. Je n'ai pas eu accès à la Play Console.
4. **Écran de consentement OAuth en mode « Test »**, avec **1 seul utilisateur test**. Seuls les comptes listés comme testeurs peuvent se connecter avec Google. Pour ouvrir à tous, il faut compléter la page *Branding* (logo, lien de politique de confidentialité, domaines autorisés), puis cliquer sur « Publier l'application ».
5. Le schéma iOS (`238967658546-…`) ne correspond à **aucun** client de `plantai-505720`. Il faut créer un client iOS dans ce projet le jour où vous ferez la version iOS.

---

## 0. Ce qui a changé depuis ta console admin

Ton ami a migré le mobile de l'API NestJS (`apps/api`) vers **Supabase** (Auth, Postgres, Storage, Edge Functions).
L'identification passe désormais par **Pl@ntNet + Gemini** ; Plant.id est mis en sommeil (`supabase/functions/_shared/plant-id-dormant.ts`).

**Ce qui va bien :**
- Le mobile compile (`tsc` OK) et ses **77 tests passent** (15 suites).
- `apps/admin` et `apps/api` compilent.
- Le schéma `schema_supabase.sql` et les migrations définissent bien toutes les tables, RPC et buckets appelés par le mobile.

---

## 1. Bloquant : connexion Google (`DEVELOPER_ERROR (10)`)

Cette erreur est levée **par Google, avant Supabase**. Elle signifie que le trio *package Android + SHA-1 de la signature + client OAuth Web* ne correspond pas à ce qui est déclaré dans Google Cloud.
J'ai trouvé plusieurs incohérences dans le dépôt qui l'expliquent très probablement.

### 1.1 Trois identifiants de package Android différents
| Fichier | Valeur |
|---|---|
| `apps/mobile/app.config.ts:34` (utilisé par EAS) | `com.planai` |
| `android/app/build.gradle:93` (projet natif à la racine) | `com.planai` |
| `app.json` à la racine | `com.adamskader.planai` (en plus, cette clé est mal placée, hors de `"expo"`) |
| `Production.md:138` | `app.planai.mobile` |

Le client OAuth **Android** de Google Cloud doit porter **exactement** le package de l'APK installé.
Il faut en choisir un seul (a priori `com.planai`) et supprimer les autres.

### 1.2 Les clients OAuth semblent venir de deux projets Google différents
- Client **Web** utilisé par l'app (`apps/mobile/eas.json`) : `433759550825-…`, donc le projet n° **433759550825**.
- Schéma iOS (`apps/mobile/app.config.ts`, plugin google-signin) : `238967658546-…`, donc le projet n° **238967658546**.

Ton projet Google Cloud est `plantai-505720`.
Le client Web **et** le client Android doivent appartenir **au même projet Google**, sinon on obtient `DEVELOPER_ERROR`.
À vérifier dans la console : *Paramètres du projet → Numéro du projet*. Ce numéro doit être `433759550825`.

### 1.3 Quelle SHA-1 enregistrer ? Ça dépend de la provenance de l'APK
| Provenance de l'APK testé | SHA-1 à déclarer dans le client OAuth Android |
|---|---|
| Build local Gradle depuis `android/` (racine) | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`. C'est la clé **debug** commitée dans `android/app/debug.keystore` : la variante *release* est signée avec elle aussi. |
| Build EAS (`npm run mobile:build:apk`) | La SHA-1 affichée par `cd apps/mobile && npx eas-cli credentials` (keystore géré par EAS). |
| Installé depuis le Play Store | La SHA-1 de la **clé de signature d'application** (Play Console → Intégrité de l'app). Ce n'est **pas** la clé d'importation. |

Google Cloud accepte **plusieurs** clients Android (un par SHA-1) : il faut en créer un pour chaque provenance utilisée.

### 1.4 Le dossier `android/` est à la racine, pas dans `apps/mobile/`
`APK-CONNEXION.md` dit qu'« EAS utilise le dossier `android` lorsqu'il est présent ».
Mais EAS cherche ce dossier dans `apps/mobile/android`, qui n'existe pas. EAS **ignore** donc `android/` à la racine et regénère le projet natif depuis `app.config.ts`.
Les deux chemins de build ne produisent donc pas la même app, ni la même signature.
De plus, ce projet natif à la racine est incomplet : son manifeste n'a ni permission caméra ni permission de localisation, et le `app_name` vaut « planai ».

### 1.5 Trois `projectId` EAS différents
- `apps/mobile/app.config.ts` : `c2e1fbf6-…` (owner `adamskader`)
- `app.json` à la racine : `cc040a2f-…`
- `Production.md` : `cb285673-…`

Selon le dossier d'où on lance `eas build`, on n'utilise pas le même projet Expo, donc **pas le même keystore**, donc pas la même SHA-1.
Ça peut expliquer pourquoi ton ami « a vérifié plusieurs fois » sans trouver le problème.

---

## 2. Bloquant : l'app ne pointe pas vers ta base Supabase

Tu m'as indiqué la base `qajabrygfkxeslujzmmt`.
Or `apps/mobile/eas.json` (profils development, preview **et** production) pointe vers **`fzllbtkjpwhadkdragno`**. `supabase/functions/send-feedback/README.md` mentionne aussi ce projet `fzllbt…`.

Conséquences :
- Les comptes, les données et le provider Google configurés sur `qajabryg…` ne sont pas ceux utilisés par l'app, ou l'inverse.
- Le provider Google de Supabase (*Auth → Providers → Google → Authorized Client IDs*) doit contenir le client Web `433759550825-…`, **sur le projet réellement utilisé par l'app**.
- La clé anon (`sb_publishable_…`) doit correspondre au même projet.

Il faut clarifier avec ton ami **quel projet Supabase est la prod**, puis aligner `eas.json`. Les Edge Functions, les secrets `PLANTNET_API_KEY` et `GEMINI_API_KEY` et le schéma doivent être déployés sur ce même projet.

---

## 3. Problèmes importants (non bloquants)

1. **La console admin (`apps/admin`) est déconnectée de la prod.** Elle parle à l'API NestJS (`VITE_API_URL`, par défaut `localhost:3000`), alors que les données réelles sont maintenant dans Supabase. `Production.md` qualifie `apps/api` d'« archive legacy ». La console doit être rebranchée sur Supabase (client `supabase-js` + rôle admin via RLS/RPC), sinon elle n'affiche rien de réel.
2. **Release signée avec la clé debug** (`android/app/build.gradle:111-116`). Il ne faut jamais publier sur le Play Store avec cette clé, qui est publique (dans le dépôt).
3. **Bucket `collections`** : `Production.md` le décrit comme **privé**, mais `schema_supabase.sql:856` le crée **public**. Les photos de suivi des plantes de chaque utilisateur sont donc lisibles par n'importe qui qui connaît l'URL.
4. **Inscription par e-mail** : Supabase exige une confirmation par mail (`APK-CONNEXION.md`). Sans SMTP configuré, l'envoi est limité à quelques mails par heure. À vérifier : *Auth → SMTP* sur le projet de prod.
5. **Bundle iOS incohérent** : `com.planai` (`app.json` racine) contre `app.planai.mobile` (`app.config.ts`).
6. **Edge Functions** écrites en une seule ligne minifiée (`identify-plant`, `diagnose-health`) : difficiles à relire et à déboguer. `diagnose-health` fait `JSON.parse` sur la réponse Gemini sans garde : si la réponse n'est pas du JSON, on obtient une erreur 500 générique.
7. **Environnement local** : `NODE_TLS_REJECT_UNAUTHORIZED=0` est défini dans ton shell, ce qui désactive la vérification TLS de tous les outils Node. À retirer de ton `~/.zshrc` ou équivalent, sauf raison précise.

---

## 4. Fichiers inutiles (candidats à la suppression, à valider)

**Artefacts de build commités (à supprimer et ignorer) :**
- `apps/mobile/.expo-production-check/` : 38 fichiers, 10 Mo, bundle Hermes compilé.
- `apps/api/dist_root_owned_1789205269/` : build résiduel non suivi, 1,4 Mo.
- `phone-screen.png` (racine) : capture d'écran.

**Configs en double ou contradictoires :**
- `app.json` (racine) : en conflit avec `apps/mobile/app.config.ts`.
- `eas.json` (racine) : doublon de `apps/mobile/eas.json`.
- `android/` (racine) : projet natif ignoré par EAS et signé debug (voir 1.4). À supprimer si vous buildez via EAS, à déplacer dans `apps/mobile/` sinon.

**Code mort côté mobile :**
- `supabase/functions/_shared/plant-id-dormant.ts` : importé par aucune fonction, gardé volontairement par ton ami « pour une réactivation future ».
- `apps/mobile/scripts/reset-project.js` : script du template Expo.
- `apps/mobile/src/api/authToken.ts` : il référence `src/api/client.ts`, qui a été supprimé ; à confirmer.

**Backend legacy (à décider ensemble) :**
- `apps/api` (NestJS), `nest-cli.json`, `docker-compose.yml`, `.dockerignore`, `DOCKER.md`, `DOCKER_CONFIGURATION.md`, `railway.json`, `BACKEND_ISSUES.md`. Ils ne servent plus au mobile. Mais `apps/admin` en dépend tant qu'elle n'est pas migrée vers Supabase.

**Docs obsolètes ou redondantes :**
- `rapport.md` (219 Ko, ancien rapport), `implementation.md`, `production env changed .md` (nom avec espaces), `avenir.md`, `connectAdmin.md`, `APK-CONNEXION.md`, `demarrage.md`, `ADMIN.md` (non suivi, c'est le prompt de la console admin).
- `API_CONTRACT.md` et `ARCHITECTURE.md` : à mettre à jour plutôt qu'à supprimer.

---

## 5. Plan de correction proposé (rien n'est lancé sans ton accord)

1. Choisir le projet Supabase de prod et aligner `apps/mobile/eas.json`.
2. Unifier le package (`com.planai`) et le `projectId` EAS, puis supprimer `app.json`, `eas.json` et `android/` à la racine.
3. Côté Google Cloud (`plantai-505720`) : vérifier le numéro de projet, puis créer un client Android `com.planai` pour **chaque** SHA-1 (EAS et Play). Ajouter le client Web dans Supabase.
4. Passer le bucket `collections` en privé, avec des URL signées côté mobile.
5. Supprimer les fichiers inutiles validés.
6. (Plus gros chantier) Migrer `apps/admin` vers Supabase, puis archiver `apps/api`.

---

## 6. Ajout du 15/10/2026 : faille de sécurité sur les profils (corrigée dans le dépôt)

En migrant la console admin vers Supabase, j'ai trouvé deux problèmes dans `schema_supabase.sql` :

1. **Escalade de privilèges.** La policy « Modification de son propre profil » autorise un utilisateur à modifier **toutes** les colonnes de sa ligne `profiles`. Un simple membre peut donc se donner `role = 'admin'` / `est_admin = true`, ou s'attribuer des pièces et de l'XP, en une requête. C'est vérifié par un test SQL qui échoue sur le schéma actuel.
2. **E-mails exposés.** Tout utilisateur connecté (et même un visiteur anonyme) peut lire l'e-mail de tous les profils.

Corrections :
- `supabase/migrations/20261015090000_admin_console.sql` : droits par colonne (seuls `nom_utilisateur` et `url_avatar` restent modifiables), lecture des profils fermée aux anonymes, plus toute la console admin (RPC `admin_*`, policies, journal d'audit). Compatible avec l'app déjà publiée.
- `supabase/migrations_a_venir/20261015090100_profiles_private_columns.sql` : rend l'e-mail illisible depuis l'app. À appliquer seulement après la sortie de la nouvelle version mobile, qui ne lit plus cette colonne.
- Tests : `supabase/tests/admin_console.sql` (droits et chaque action de la console).
