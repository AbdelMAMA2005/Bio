# Intégration front ↔ backend — bilan pour Abdel (16/07/2026)

> Rédigé par Djawad (assisté) en branchant `apps/mobile` sur le vrai backend après le merge
> `backend` → `master`. Aucun fichier sous `apps/api/src/**` n'a été modifié dans son
> contenu — seulement lu, testé via curl/Jest, et le front adapté pour absorber ce qui suit.
> Tout ce qui est listé plus bas est vérifié empiriquement (serveur lancé en local + appels
> réels), pas juste lu dans le code.

**Sommaire** : [1. Ce qui a été fait côté front](#1-ce-qui-a-été-fait-côté-front) ·
[2. Le merge était cassé](#2-le-merge-lui-même-était-cassé-déjà-corrigé-rien-à-faire-de-ton-côté) ·
[3. Bug bloquant (compilation)](#3-🔴-bug-bloquant--le-back-ne-compile-pas-nest-build--nest-start) ·
[4. Bug de sécurité](#4-🔴-bug-de-sécurité--le-mot-de-passe-nest-jamais-vérifié-dans-localstrategy) ·
[5. Bug toxicité](#5-🟠-bug-fonctionnel--la-détection-de-toxicité-ne-gère-pas-la-négation) ·
[6. Backlog fonctionnel](#6-🟡-backlog-fonctionnel-non-couvert-par-le-back-le-front-sest-adapté) ·
[7. Dépendances/outillage](#7-🟢-dépendancesoutillage-déjà-corrigé-de-mon-côté-pour-information) ·
[8. Bugs dans tes tests](#8-bugs-dans-tes-propres-tests-appsapi-une-fois-linfra-jest-réparée)

---

## 1. Ce qui a été fait côté front

### Réparation du repo (préalable, sinon rien ne démarrait)

- Le commit de merge contenait des marqueurs de conflit Git non résolus dans les fichiers
  de config racine (`npm install` était cassé pour tout le monde) — corrigé.
- Ton code backend, qui avait atterri à la racine du repo (`/src`, `/test`) au lieu de
  `apps/api/`, a été déplacé **à l'identique** vers son emplacement prévu par
  `ARCHITECTURE.md`. Détails en [§2](#2-le-merge-lui-même-était-cassé-déjà-corrigé-rien-à-faire-de-ton-côté).

### Endpoints réellement branchés (données réelles, plus de mock)

| Fonctionnalité front | Endpoint(s) utilisés |
| --- | --- |
| Inscription / connexion | `POST /auth/register` puis `POST /auth/login` (register n'a pas de token, voir §6) |
| Scan / identification | `POST /identification` (multipart) |
| Mon Jardin (liste) | `GET /collection?type=owned` |
| Mon Herbarium (liste) | `GET /collection?type=discovered` |
| Ajout au Jardin/Herbarium après un scan | `POST /collection` |
| Photo de suivi | `POST /collection/:id/photos` |
| Fil d'actualité | `GET /feed` |
| Créer une publication (texte) | `POST /feed/posts` |
| Like / unlike | `POST /feed/posts/:id/like` |

### Ajout : géolocalisation réelle pour le Geo-Tag

Le popup "Partager la position ?" était purement cosmétique jusqu'ici (aucune coordonnée
n'était jamais capturée). `expo-location` a été ajouté : à l'acceptation, le front demande
la permission et récupère la position réelle de l'appareil, envoyée à `POST /collection`.

### Nouveaux fichiers front à connaître

- `apps/mobile/src/api/client.ts` — client HTTP (axios), injection automatique du token JWT,
  normalisation des erreurs.
- `apps/mobile/src/api/config.ts` — URL de base (`EXPO_PUBLIC_API_URL`, défaut
  `http://localhost:3000` — **pas** de préfixe `/v1`, voir §6).
- `apps/mobile/src/api/adapters.ts` — **le fichier le plus important pour toi** : toutes les
  divergences entre ce que renvoie réellement ton API et le contrat convenu (§6) sont
  isolées ici, avec un commentaire à chaque endroit. Le reste du front ne voit que les
  types "propres" de `packages/shared`.
- `apps/mobile/src/features/auth/authApi.ts` — login/register réels.

### Ce qui reste mocké côté front (faute d'endpoint backend)

Quests (Défis du jour), Badges, Notifications push (device token), Stories, diagnostic
maladie IA, rappels programmés, et le profil complet (préférences, changement de mot de
passe, suppression de compte, Google login). Chaque endroit du code concerné a un
commentaire du style `// Pas d'endpoint ... côté back — reste mocké (BACKEND_ISSUES.md §X)`.

### Tests ajoutés

- Tests unitaires purs pour `adapters.ts` (mapping toxicité/rareté/santé, sérialisation des
  conseils d'entretien, résolution des URLs d'images) — `src/api/__tests__/adapters.test.ts`.
- Tests unitaires pour `authApi.ts` (login, et le chaînage register→login) —
  `src/features/auth/__tests__/authApi.test.ts`.
- Tests d'intégration hook + client HTTP mocké (succès, erreur réseau, invalidation de
  cache après mutation) — `src/api/hooks/__tests__/useMyGarden.integration.test.tsx`.

`tsc` : 0 erreur · `jest` (mobile) : 61/61 · `expo lint` : 0 erreur · bundle iOS et Android
vérifiés propres (`expo export -c`).

---

## 2. Le merge lui-même était cassé (déjà corrigé, rien à faire de ton côté)

Le commit `cc11ba0` (merge `master`+`backend`) a été commité **avec les marqueurs de conflit
Git non résolus**, encore présents dans `package.json`, `package-lock.json`, `tsconfig.json`
et `.gitignore` à la racine — `npm install` ne fonctionnait plus du tout, pour personne.

En creusant : ta branche `backend` était un projet NestJS **autonome**, avec son code à la
racine (`/src`, `/test`, son propre `package.json` avec toutes les deps NestJS/TypeORM/JWT)
au lieu d'être dans `apps/api/` comme prévu par `ARCHITECTURE.md`. C'est ce qui a provoqué
la collision : ton `package.json` (manifeste d'appli) et celui du monorepo (manifeste de
workspaces) essayaient d'occuper le même fichier.

**Corrigé** : ton code a été déplacé tel quel (aucune ligne modifiée) de `/src` et `/test`
vers `apps/api/src` et `apps/api/test` (qui contenaient encore le squelette Nest par défaut
d'avant ton travail). Tes dépendances ont été fusionnées dans `apps/api/package.json`. Le
`package.json`/`tsconfig.json` racine sont restés le manifeste minimal du monorepo. À noter
pour la prochaine fois : `app.module.ts` avait toi-même mis `// apps/api/src/app.module.ts`
en commentaire en haut du fichier — tu savais où ça devait vivre, ça a juste manqué à l'appel
au moment du merge/PR.

---

## 3. 🔴 Bug bloquant : le back ne compile pas (`nest build` / `nest start`)

**Fichier** : `apps/api/src/modules/feed/feed.module.ts`, lignes 8-9

```ts
import { FeedController } from './feed.controller.ts';   // ❌
import { FeedService } from './feed.service.ts';          // ❌
```

L'extension `.ts` explicite dans l'import fait échouer la compilation (`TS5097: An import
path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled` —
et cette option n'est utilisable qu'avec `noEmit`, ce que `nest build` ne fait pas). Aucun
autre module du projet n'a ce problème.

**Fix** (2 lignes, aucun autre fichier concerné) :

```ts
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
```

Je l'ai corrigé **localement et temporairement** pour pouvoir tester le reste, puis **annulé**
avant de terminer — je n'ai pas voulu toucher à un fichier backend sans ton accord explicite
sur le contenu. À toi de committer ce fix (ou dis-moi si tu préfères que je fasse la PR).

---

## 4. 🔴 Bug de sécurité : le mot de passe n'est jamais vérifié dans `LocalStrategy`

**Fichier** : `apps/api/src/common/strategies/local.strategy.ts`

```ts
async validate(email: string, password: string): Promise<any> {
  const user = await this.authService['userRepo'].findOne({ where: { email } });
  if (!user) {
    throw new UnauthorizedException('Identifiants invalides.');
  }
  return user;   // ⚠️ le password reçu en paramètre n'est jamais comparé
}
```

`LocalAuthGuard` (sur `POST /auth/login`) authentifie donc **n'importe quel mot de passe**
tant que l'email existe. Ce n'est **pas exploitable aujourd'hui** uniquement parce que
`AuthService.login()` refait un `argon2.verify()` indépendant juste après (testé : un
mauvais mot de passe est bien rejeté avec 401 en pratique). Mais c'est fragile : le
commentaire du contrôleur dit littéralement *"Le LocalAuthGuard a déjà validé
l'utilisateur"* — si ce code est un jour simplifié pour faire confiance à `req.user` sans
repasser par le service, ça devient un bypass d'authentification complet.

**Fix recommandé** :

```ts
async validate(email: string, password: string): Promise<any> {
  const user = await this.authService['userRepo'].findOne({ where: { email } });
  if (!user || !(await argon2.verify(user.motDePasseHache, password))) {
    throw new UnauthorizedException('Identifiants invalides.');
  }
  return user;
}
```

---

## 5. 🟠 Bug fonctionnel : la détection de toxicité ne gère pas la négation

**Fichier** : `apps/api/src/modules/identification/identification.service.ts`,
`processPlantIdResponse()`

```ts
if (lower.includes('toxic') || lower.includes('toxique') || ...) {
  toxicite = ToxicityLevel.RED;
}
```

`"Non toxique pour les humains et les animaux domestiques."` contient la sous-chaîne
`"toxique"` → classée **RED (toxique)** au lieu de GREEN. Reproduit en réel : scanner en
mode `MOCK_PLANTID=true` (suggestion "Rosa gallica", dont le texte dit explicitement "Non
toxique...") renvoie `"toxicite": "red"`.

**Fix suggéré** : tester d'abord les tournures négatives (`"non toxique"`, `"non-toxic"`,
`"not toxic"`) et retourner GREEN immédiatement dans ce cas, avant de chercher les mots-clés
positifs.

---

## 6. 🟡 Backlog fonctionnel non couvert par le back (le front s'est adapté)

`API_CONTRACT.md` a été réécrit le 17/07/2026 pour décrire **ce que le back fait
réellement** (vérifié par appels HTTP réels), plus une spec aspirationnelle qui ne
correspondait à rien. Il n'y a donc plus d'« écart contrat/réalité » à proprement parler —
tout ce qui suit est simplement **pas encore construit côté back**, et déjà marqué 🚧
*Backlog* dans le contrat, section par section. J'ai isolé tout ce qui touche au *format*
des réponses existantes (enums, champs toujours `null`/figés) dans un seul fichier front
(`apps/mobile/src/api/adapters.ts`), pour que le reste du code mobile continue à utiliser
les types "propres" de `packages/shared`.

| Sujet | État réel du back | Détail dans `API_CONTRACT.md` |
| --- | --- | --- |
| Préfixe API | Aucun (`/auth`, `/collection`, ... — pas de `/v1`) | En-tête du contrat |
| Toxicité / état de santé | `ToxicityLevel`/`HealthStatus = 'green'\|'orange'\|'red'` — traduits côté front vers `Toxicite`/`EtatSante` (FR) uniquement dans `adapters.ts` | §"Enums" |
| Rareté | `badgeRarete: string\|null`, **toujours `"Commun"`** (hardcodé, `identification.service.ts`) → `xpGagne` toujours 25 | §"Enums", §3 |
| `conseilsEntretien` | `{arrosage?, lumiere?, temperature?, rempotage?}`, **toujours `null`** en pratique | §3 |
| `POST /auth/register` | Renvoie juste l'objet `user`, sans token — le front enchaîne un `login()` immédiatement après pour compenser | §1 |
| Refresh token, `/auth/google`, `/auth/change-password`, `DELETE /auth/account` | 🚧 Backlog — un seul token longue durée pour l'instant | §1 |
| `GET/PATCH /users/me`, `GET /users/me/badges` | 🚧 Backlog (il y a un `UserController` séparé avec `POST /user/register` + `GET /user/email`, apparemment un doublon de `/auth/register` non branché sur le flux réel) | §1 (encart), §2 |
| `POST /identification` | Pas de champ `confiance`/confidence | §3 |
| `GET /collection` | N'inclut pas `historiquePhotos`, `prochainArrosage`, `lieuLabel` — `POST /collection/:id/photos` fonctionne et stocke bien le fichier, mais la liste ne les renvoie jamais ensuite | §4 |
| `POST/GET /collection/:id/diagnosis`, `/reminders` | 🚧 Backlog (pas de module `diagnosis`/`notifications` du tout) | §4 |
| Créer un post | C'est `POST /feed/posts`, pas `POST /feed` | §5 |
| `GET /feed` | Renvoie `{items, total}`, pas `Post[]` nu | §5 |
| Publier une photo dans le feed | `POST /feed/posts` attend `imageUrl` (une URL déjà hébergée) en JSON — pas d'endpoint d'upload générique pour le feed, donc le front ne peut publier que du texte pour l'instant | §5 |
| Geo-tag sur les posts | Aucun champ géo sur l'entité `Post` — "Près de moi" n'a aucune donnée réelle à filtrer | §5 |
| `/stories` | 🚧 Backlog, aucune entité Story | §5 |
| `quests`, `notifications` (device), badges | 🚧 Backlog, modules inexistants | §6, §7, §2 |

---

## 7. 🟢 Dépendances/outillage (déjà corrigé de mon côté, pour information)

- **`uuid@^14.0.1` est ESM-only** (`"type": "module"`, pas de condition `require` dans
  `exports`). Ça ne plantait pas au lancement de `nest start` uniquement parce que Node 22
  sait faire un `require(esm)` synchrone en interne — mais ça cassait Jest (chargeur CJS
  sandboxé) et casserait probablement en prod sur un Node plus ancien. Rétrogradé vers
  `uuid@^11.1.1` (API identique, CJS+ESM natif). `@types/uuid` supprimé au passage (uuid a
  ses propres types depuis la v9, le paquet séparé faisait doublon).
- **Tests `apps/api` cassés à 100%** (`this._moduleMocker.clearMocksOnScope is not a
  function`) : conflit de hoisting npm entre Jest 30 (`apps/api`) et Jest 29 (`apps/mobile`,
  via `jest-expo`) qui coexistent dans le même monorepo — `jest-config` résout
  `testEnvironment: "node"` dynamiquement par nom de paquet et tombait sur la mauvaise
  version hoistée. Réglé en épinglant explicitement les paquets internes de Jest des deux
  côtés (`apps/api/package.json` et `apps/mobile/package.json`). Rien à faire de ton côté,
  mais si tu vois `clearMocksOnScope is not a function` un jour après un `npm install`,
  c'est ce problème qui revient (généralement un `rm -rf node_modules && npm install` propre
  suffit à le refixer une fois les pins en place).
- `.env.example` (racine) documente `DATABASE_URL`, mais `src/config/typeorm.config.ts` lit
  en réalité `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` séparément —
  `DATABASE_URL` n'est lu nulle part. Il manque aussi `JWT_SECRET`, `MOCK_PLANTID`,
  `PLANT_ID_API_URL`, `PORT` dans l'exemple.

---

## 8. Bugs dans tes propres tests (`apps/api`), une fois l'infra Jest réparée

- `src/modules/user/user.service.spec.ts` et `user.controller.spec.ts` : le
  `TestingModule` ne fournit jamais le repository TypeORM (`@InjectRepository(User)`) dont
  `UserService` a besoin → `Nest can't resolve dependencies... UserRepository`. Il manque un
  provider mocké, ex. `{ provide: getRepositoryToken(User), useValue: mockRepo }`.
- `test/app.e2e-spec.ts` (le squelette par défaut, jamais mis à jour) : attend `GET /` → 200
  "Hello World!", mais `app.module.ts` ne déclare plus `AppController`/`AppService` du tout
  (remplacés par tes modules métier) → la vraie racine renvoie 404 maintenant. Soit tu
  restaures un contrôleur racine minimal, soit ce test est à supprimer/mettre à jour.

---

## Comment j'ai vérifié tout ça

Un Postgres local (instance utilisateur, hors du service système) + `nest start:dev` en
mode `MOCK_PLANTID=true`, puis des appels réels : register → login → scan (identification)
→ ajout en collection → liste collection → création de post → feed → like. Chaque point
ci-dessus est une observation directe (réponse JSON ou message d'erreur réel), pas une
supposition à la lecture du code.
