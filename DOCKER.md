# PlanAI — Environnement de développement avec Docker

Objectif : qu'Abdel et Djawad aient **exactement** le même environnement de
dev pour PostgreSQL et `apps/api` (même version de Postgres, mêmes variables
d'environnement, même schéma/seed), sans installation manuelle qui diverge
d'une machine à l'autre.

**`apps/mobile` (Expo) ne tourne jamais en conteneur** — il a besoin d'accéder
directement aux appareils/émulateurs de la machine hôte. Seuls PostgreSQL et
`apps/api` sont conteneurisés.

Référencé depuis [ARCHITECTURE.md](./ARCHITECTURE.md) §8.

---

## 1. Prérequis

Ce qui **reste hors Docker**, à installer une fois sur chaque machine :

- **Docker** (voir §1.1/§1.2 ci-dessous).
- **Node.js** (v20+, testé avec v22) + npm, pour lancer `apps/mobile` (Expo)
  sur l'hôte.
- **Le SDK Android / Android Studio + adb**, si vous testez sur émulateur ou
  téléphone Android — voir `README.md` (racine) pour l'installation d'adb.
  Docker ne remplace pas ça : Expo et l'émulateur/téléphone tournent sur
  l'hôte, pas dans un conteneur.
- **Expo Go** ou un dev client buildé (voir `README.md`), sur le
  téléphone/l'émulateur.

### 1.1. Linux

```bash
sudo apt install docker.io docker-compose-plugin   # Debian/Ubuntu/Kali
sudo usermod -aG docker $USER   # pour lancer docker sans sudo — se reconnecter après
docker compose version          # vérifie l'installation
```

### 1.2. Windows

1. Installer **Docker Desktop** (https://www.docker.com/products/docker-desktop/),
   backend **WSL2** (proposé par défaut à l'installation).
2. Lancer Docker Desktop, attendre qu'il indique "Engine running".
3. Vérifier dans PowerShell :
   ```powershell
   docker compose version
   ```

---

## 2. Premier démarrage

Depuis la racine du monorepo :

```bash
# 1. Copier le fichier d'environnement (valeurs par défaut = ça marche direct,
#    aucun secret réel dedans)
cp .env.example .env          # Windows PowerShell : copy .env.example .env

# 2. Construire les images et démarrer db + api + adminer
npm run docker:up             # = docker compose up -d --build la 1ère fois est
                               #   implicite : compose build si l'image n'existe pas
```

Ce que ça fait :

- **db** : PostgreSQL 16, données persistées dans le volume nommé
  `planai_db_data`, healthcheck `pg_isready`.
- **api** : build de `apps/api/Dockerfile` (stage `dev`), attend que `db` soit
  `healthy`, puis **synchronise le schéma et seed le référentiel plantes
  automatiquement** (`npm run seed`, idempotent) avant de démarrer le serveur
  en hot-reload (`npm run start:dev`).
- **adminer** : interface web d'inspection de la base sur
  http://localhost:8080 (serveur `db`, utilisateur/mot de passe = `DB_USERNAME`
  / `DB_PASSWORD` du `.env`, base = `DB_DATABASE`).

Vérifier que tout tourne :

```bash
npm run docker:logs
# Ctrl+C pour quitter le suivi des logs (ne stoppe pas les conteneurs)
```

Vous devez voir Postgres passer en `healthy`, puis l'API logger le seed
(`✅ Les plantes sont déjà seedées.` ou `✅ N plantes seedées avec succès.`)
et enfin `Nest application successfully started`. Tester :

```bash
curl http://localhost:3000/api        # Swagger JSON
```

> Le port API (3000) et le port Postgres exposé sur l'hôte (5433 par défaut)
> sont configurables via `PORT` / `DB_PORT` dans `.env`.

---

## 3. Migrations et seed

Ce projet n'a **pas** de fichiers de migration TypeORM classiques : le schéma
est créé/mis à jour automatiquement via `synchronize: true`
(`apps/api/src/config/typeorm.config.ts`) — pratique en dev, jamais à activer
en prod telle quelle. Deux scripts existent quand même pour scénariser ça
explicitement (déjà exécutés automatiquement au démarrage du conteneur `api`,
voir §2 — utile surtout pour rejouer un seed après un `docker:reset` partiel
ou en CI) :

```bash
npm run docker:migrate   # synchronise le schéma (crée les tables si besoin)
npm run docker:seed      # seed le référentiel plantes (idempotent, sans doublon)
```

---

## 4. Lancer le front (Expo, sur l'hôte)

`apps/mobile` tourne toujours en dehors de Docker :

```bash
cd apps/mobile
npx expo start
```

Le front détecte automatiquement l'IP du PC pour joindre l'API
(`apps/mobile/src/api/config.ts`, via Metro) — **rien à changer** si le
téléphone/émulateur est sur le même réseau WiFi que le PC (voir
`demarrage.md`). L'API tourne dans Docker mais son port est publié sur l'hôte
(`localhost:3000` et l'IP LAN du PC), donc ça fonctionne exactement comme sans
Docker.

### 4.1. Cas USB / adb (Android)

Si vous branchez le téléphone en USB (pas de WiFi partagé, ou réseau qui
bloque l'IP LAN) :

```bash
adb reverse tcp:3000 tcp:3000
```

Ça redirige `localhost:3000` **du téléphone** vers `localhost:3000` **du PC**
(donc vers l'API dans Docker, dont le port est publié sur l'hôte). Il faut
alors forcer l'URL de l'API dans `apps/mobile/.env` :

```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

(redémarrer `npx expo start` après modification du `.env`). Pour l'émulateur
Android (pas un téléphone physique), `10.0.2.2:3000` fonctionne déjà sans rien
faire (fallback déjà géré par `config.ts`).

---

## 5. Repartir de zéro

```bash
npm run docker:reset
```

Équivalent à `docker compose down -v && docker compose up -d` : supprime le
volume de données Postgres (`planai_db_data`) et recrée tout — le conteneur
`api` resynchronise le schéma et reseed automatiquement au redémarrage (§2).

Pour tout arrêter sans supprimer les données :

```bash
npm run docker:down
```

Pour reconstruire l'image `api` après une modification de
`apps/api/Dockerfile` ou `apps/api/package.json` :

```bash
docker compose up -d --build
```

---

## 6. Deux `.env` distincts — lequel utiliser ?

- **`.env` (racine, ce guide)** : lu par `docker-compose.yml` (services `db`
  et `api`). C'est celui à utiliser pour tout ce qui passe par Docker.
- **`apps/api/.env` (existant, gitignoré)** : utilisé uniquement si vous
  lancez `apps/api` **directement sur l'hôte**, sans Docker (`cd apps/api &&
  npm run start:dev`) — workflow toujours possible, inchangé, voir
  `README.md`. Il n'est jamais lu par les conteneurs Docker.

Les deux fichiers ne se synchronisent pas automatiquement : si vous changez
`PLANT_ID_API_KEY` ou `JWT_SECRET` dans l'un, pensez à l'autre si vous
alternez entre les deux workflows.

---

## 7. Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| `password authentication failed` / `client password must be a string` | `.env` absent ou `DB_PASSWORD` vide | Vérifier que `.env` existe à la racine (`cp .env.example .env`) et que `DB_PASSWORD` n'est pas vide |
| `api` redémarre en boucle, logs `ECONNREFUSED` vers `db` | L'API a démarré avant que Postgres soit prêt | Normal une fois (retry), mais si ça persiste : `docker compose ps` → vérifier que `db` est `healthy`, sinon `npm run docker:logs` pour voir l'erreur Postgres |
| Port déjà utilisé (`5433` ou `3000`) | Un autre service occupe déjà ce port sur l'hôte | Changer `DB_PORT` / `PORT` dans `.env`, puis `docker compose up -d` |
| Hot-reload ne se déclenche pas après modif d'un fichier (surtout Windows) | Les événements de fichiers d'un volume monté ne remontent pas toujours au conteneur sur certains montages Windows/Docker Desktop | Sauvegarder à nouveau, ou en dernier recours ajouter `"watchOptions": {"watchFile": "dynamicPriorityPolling"}` dans `apps/api/tsconfig.json` et reconstruire (`docker compose up -d --build`) |
| Le front (Expo) ne joint pas l'API | API pas démarrée, mauvais réseau, ou cas USB/adb sans reverse | Vérifier `npm run docker:logs`, puis §4/§4.1 ci-dessus |
| Je veux repartir d'une base totalement vide | — | `npm run docker:reset` (§5) |
