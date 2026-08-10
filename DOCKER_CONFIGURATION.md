# Docker sur PlanAI — le guide pour Abdel (tout est expliqué, rien n'est supposé connu)

Ce guide explique, étape par étape et avec des mots simples, comment installer
Docker sur ta machine et comment l'utiliser pour PlanAI. Tu n'as besoin
d'aucune connaissance préalable de Docker pour le suivre : chaque commande est
expliquée avant d'être utilisée.

But de ce document : que toi (Abdel) et Djawad ayez **exactement** la même
base de données PostgreSQL et le même serveur `apps/api`, sans que chacun
installe des choses différentes sur sa machine (versions différentes,
mots de passe différents, ports différents...). C'est ça, le problème que
Docker résout.

---

## Partie 0 — C'est quoi Docker, et pourquoi on s'embête avec ça ?

### Le problème sans Docker

Aujourd'hui, toi et Djawad, vous installez PostgreSQL "à la main" chacun sur
votre ordinateur. Résultat :

- Djawad a peut-être PostgreSQL version 14, toi version 16.
- Le mot de passe de la base n'est pas le même chez les deux.
- Le port utilisé n'est pas le même.
- Résultat : des bugs du genre "chez moi ça marche, chez toi ça marche pas",
  et personne ne sait pourquoi, parce que vous n'avez pas vraiment la même
  chose sur vos machines.

### L'idée de Docker

Imagine une **boîte fermée et scellée** qui contient déjà tout ce qu'il faut :
le bon PostgreSQL, la bonne version, déjà configuré avec le bon mot de passe.
Cette boîte, on l'appelle un **conteneur**. Que tu ouvres cette boîte sur ton
PC ou que Djawad l'ouvre sur le sien, **il y a exactement la même chose
dedans**. Ni toi ni Djawad n'installez PostgreSQL "à la main" : vous demandez
juste à Docker d'ouvrir la boîte, et elle est identique pour les deux.

C'est tout le principe : au lieu d'installer des logiciels un par un sur votre
machine (et de risquer d'installer des versions différentes), vous utilisez
des boîtes toutes faites et identiques.

### Le vocabulaire (à lire une fois, tu peux y revenir plus tard)

| Mot | Explication simple |
| --- | --- |
| **Image** | La "recette" de la boîte : la liste de tout ce qu'il faut mettre dedans (quel PostgreSQL, quelle configuration...). Une image ne "tourne" pas, elle est juste stockée sur le disque, prête à être utilisée. |
| **Conteneur** | La boîte une fois "ouverte" et allumée à partir d'une image. C'est le programme qui tourne réellement (ex : PostgreSQL qui écoute les connexions). |
| **Volume** | Un espace de stockage qui survit même si on éteint/supprime le conteneur. Sans ça, à chaque fois qu'on éteindrait la boîte PostgreSQL, on perdrait toutes les données de la base ! Le volume, c'est comme un tiroir externe qu'on branche à la boîte : la boîte peut être jetée et refaite, le tiroir reste. |
| **Port** | Le "numéro de porte" par lequel on parle à ce qui tourne dans le conteneur depuis l'extérieur (ta machine). Ex : PostgreSQL écoute sur le port 5432 à l'intérieur de sa boîte ; on choisit par quel port de TA machine on y accède depuis dehors. |
| **Docker Compose** | Un chef d'orchestre : au lieu de démarrer chaque boîte une par une à la main, on écrit une seule fois dans un fichier (`docker-compose.yml`) "je veux ces 3 boîtes, avec ces réglages, qui se parlent entre elles" — et une seule commande démarre tout. |
| **Dockerfile** | La recette écrite pour **construire** une image nous-mêmes (ici, l'image de notre API NestJS). PostgreSQL, lui, a déjà une image toute faite fournie par ses créateurs, on n'a pas besoin d'écrire sa recette. |

---

## Partie 1 — Installer Docker sur ta machine

Choisis la section qui correspond à ton système. Si tu ne sais pas si tu es
sur Linux ou Windows... tu es sur Windows si tu as une barre des tâches en
bas avec un logo Windows, et sur Linux (Kali, Ubuntu, Debian...) si tu as
lancé ton terminal avec des commandes `apt`.

### 1.A — Tu es sur Linux (Debian / Ubuntu / Kali)

Ouvre un terminal. On va installer 2 choses : Docker lui-même (`docker.io`)
et l'outil qui lit les fichiers `docker-compose.yml` (`docker-compose`).

```bash
sudo apt update
sudo apt install docker.io docker-compose
```

**Ce que fait chaque mot de cette commande :**
- `sudo` : "fais ça avec les droits d'administrateur" (indispensable pour
  installer un logiciel).
- `apt install` : "installe ce logiciel".
- `docker.io` : le moteur Docker (ce qui fait tourner les conteneurs).
- `docker-compose` : l'outil "chef d'orchestre" expliqué plus haut.

Le terminal va te demander ton mot de passe (celui de ta session Linux, pas
un mot de passe du projet). Tape-le (rien ne s'affiche à l'écran pendant que
tu tapes, c'est normal) et appuie sur Entrée.

**Étape importante : autoriser ton utilisateur à utiliser Docker sans `sudo`.**
Par défaut, seul l'administrateur peut utiliser Docker. On va ajouter ton
utilisateur au groupe "docker" pour ne pas avoir à taper `sudo` à chaque
commande Docker :

```bash
sudo usermod -aG docker $USER
```

`usermod -aG docker $USER` veut dire : "ajoute (`-a`) mon utilisateur actuel
(`$USER`) au groupe (`-G`) qui s'appelle `docker`".

**Ensuite, ferme complètement ton terminal et rouvre-en un nouveau** (ou
déconnecte-toi/reconnecte-toi de ta session). C'est indispensable : Linux ne
prend en compte ton nouveau groupe qu'à la prochaine ouverture de session/
terminal, pas dans le terminal déjà ouvert.

Si après avoir rouvert un terminal tu as encore une erreur de type
"permission denied" en utilisant Docker, tu peux vérifier que tu es bien
dans le groupe avec :

```bash
groups
```

Tu dois voir le mot `docker` dans la liste affichée. Si tu ne le vois pas,
recommence l'étape `sudo usermod -aG docker $USER` puis reconnecte-toi
vraiment (ferme la session, pas juste le terminal).

### 1.B — Tu es sur Windows

1. Télécharge **Docker Desktop** ici :
   https://www.docker.com/products/docker-desktop/
2. Lance l'installateur téléchargé. Pendant l'installation, une case
   "Use WSL 2 instead of Hyper-V" (ou similaire) est proposée — **laisse-la
   cochée**, c'est le mode recommandé et le plus simple.
3. Windows va peut-être te demander de redémarrer l'ordinateur. Fais-le si
   c'est demandé.
4. Une fois redémarré, Docker Desktop devrait se lancer automatiquement
   (sinon, cherche "Docker Desktop" dans le menu Démarrer et lance-le).
5. Attends en bas à gauche de la fenêtre Docker Desktop que ça affiche
   **"Engine running"** (avec une icône verte). Ça veut dire que Docker est
   prêt. Ça peut prendre 1 à 2 minutes la première fois.
6. Ouvre **PowerShell** (clique sur le menu Démarrer, tape "PowerShell",
   appuie sur Entrée) pour la suite du guide — c'est l'équivalent du terminal
   sous Windows.

---

## Partie 2 — Vérifier que Docker est bien installé

Que tu sois sur Linux ou Windows, tape ces deux commandes (dans ton terminal
Linux, ou PowerShell sous Windows) :

```bash
docker --version
docker compose version
```

**Ce que tu dois voir :** deux lignes avec un numéro de version (par exemple
`Docker version 28.5.2...` et `Docker Compose version 2.40.3...`). Peu
importe le numéro exact, tant que ça affiche quelque chose et pas une erreur
du genre "commande introuvable".

Si tu vois une erreur, relis la Partie 1 : soit Docker n'est pas installé
correctement, soit (sur Linux) tu n'as pas rouvert de terminal après le
`usermod`.

Teste aussi que Docker peut vraiment démarrer quelque chose :

```bash
docker run hello-world
```

Ça télécharge une toute petite image de test et l'exécute. Si tu vois un
message qui commence par "Hello from Docker!", tout fonctionne. Ce test ne
sert à rien pour PlanAI, c'est juste pour vérifier l'installation.

---

## Partie 3 — Récupérer le projet et le configurer

### 3.1. Récupérer le code

Si ce n'est pas déjà fait, récupère le projet PlanAI comme d'habitude (clone
git). Place-toi ensuite avec ton terminal **à la racine du projet** (le
dossier qui contient les dossiers `apps`, `packages`, et le fichier
`package.json`).

### 3.2. Créer ton fichier `.env`

Le projet contient un fichier `.env.example` : c'est un **modèle**, avec des
valeurs qui fonctionnent déjà, mais aucun vrai secret dedans (jamais de vrai
mot de passe ou vraie clé API dans ce fichier, exprès, pour qu'on puisse le
partager sur Git sans risque).

Tu dois le copier pour créer ton propre fichier `.env`, que Docker va lire :

**Sur Linux/Mac :**
```bash
cp .env.example .env
```

**Sur Windows (PowerShell) :**
```powershell
copy .env.example .env
```

`cp` (ou `copy`) veut juste dire "copie ce fichier vers ce nouveau nom".
Après ça, tu as un nouveau fichier `.env` à la racine du projet, avec dedans
les mêmes valeurs que `.env.example`.

**Tu n'as rien d'autre à modifier pour démarrer** : toutes les valeurs par
défaut dans `.env.example` fonctionnent immédiatement avec Docker. Si un jour
tu veux comprendre ce que fait chaque ligne, ouvre `.env.example` : chaque
variable est commentée juste au-dessus pour expliquer à quoi elle sert.

> **Important — ne confonds pas deux fichiers `.env` différents :**
> - Le `.env` **à la racine du projet** (celui que tu viens de créer) est lu
>   par Docker.
> - Le fichier `apps/api/.env` (qui existe déjà, séparément) sert seulement
>   si un jour tu lances `apps/api` directement sur ta machine **sans**
>   Docker. Pour tout ce guide, tu n'as besoin que du `.env` de la racine.

---

## Partie 4 — Démarrer PlanAI avec Docker

Toujours à la racine du projet, tape :

```bash
npm run docker:up
```

**Ce qui se passe concrètement (dans l'ordre), et pourquoi ça peut prendre du
temps la première fois :**

1. Docker regarde s'il a déjà l'image de PostgreSQL et l'image d'Adminer sur
   ton disque. La première fois, non : il va les **télécharger** depuis
   Internet (tu verras plein de lignes de téléchargement défiler, c'est
   normal, ça peut prendre quelques minutes selon ta connexion).
2. Docker **construit** l'image de notre API (`apps/api`) à partir de la
   recette dans `apps/api/Dockerfile` : il installe Node.js, puis toutes les
   dépendances du projet (`npm ci`). Ça aussi, ça prend un peu de temps la
   première fois (1 à 2 minutes), mais les fois suivantes ce sera beaucoup
   plus rapide (Docker garde en mémoire ce qu'il a déjà fait).
3. Docker démarre 3 conteneurs :
   - **db** : la base PostgreSQL.
   - **api** : notre serveur NestJS. Il attend automatiquement que **db**
     soit prête à répondre avant de démarrer (sinon il plante en essayant de
     se connecter trop tôt).
   - **adminer** : une petite interface web pour regarder le contenu de la
     base de données facilement (comme un "PhpMyAdmin" mais pour Postgres).
4. Une fois l'API démarrée, elle remplit automatiquement la base avec la
   liste des plantes de référence (le "seed") — c'est fait pour toi, tu n'as
   rien à taper en plus.
5. La commande te rend la main (elle affiche `-d`, qui veut dire "en arrière
   plan" : les conteneurs continuent de tourner même après que la commande
   soit terminée, un peu comme allumer une lampe et fermer la porte).

---

## Partie 5 — Vérifier que ça marche vraiment

### 5.1. Voir ce qui se passe dans les conteneurs (les logs)

```bash
npm run docker:logs
```

Ça affiche en direct tout ce que racontent les 3 conteneurs. Cherche ces
lignes qui prouvent que tout va bien :

- `Container planai-db Healthy` (ou dans les logs de l'API, la connexion à la
  base réussit sans erreur de mot de passe).
- `✅ 20 plantes seedées avec succès.` (ou `Les plantes sont déjà seedées.`
  si tu relances une deuxième fois — c'est normal, ça évite les doublons).
- `Nest application successfully started` : l'API est prête à répondre.

Pour arrêter d'afficher les logs (ça ne coupe **pas** les conteneurs, juste
l'affichage) : appuie sur `Ctrl+C`.

### 5.2. Tester l'API directement

Ouvre un navigateur et va sur :

```
http://localhost:3000/api
```

Tu dois voir une page Swagger (documentation interactive de l'API) — si ça
s'affiche, l'API tourne et répond.

Tu peux aussi tester dans le terminal :

```bash
curl http://localhost:3000/plants
```

Tu dois voir du texte au format JSON avec une liste de plantes dedans (Aloe
vera, etc.). Si tu vois ça, la base de données ET l'API fonctionnent
ensemble.

### 5.3. Regarder la base de données avec Adminer

Va sur :

```
http://localhost:8080
```

Un formulaire de connexion s'affiche. Remplis-le avec les valeurs de ton
fichier `.env` (les valeurs par défaut si tu n'as rien changé) :

| Champ Adminer | Valeur (par défaut dans `.env.example`) |
| --- | --- |
| Système | PostgreSQL |
| Serveur | `db` (déjà pré-rempli normalement) |
| Utilisateur | `postgres` (= `DB_USERNAME` du `.env`) |
| Mot de passe | `postgres` (= `DB_PASSWORD` du `.env`) |
| Base de données | `planai_db` (= `DB_DATABASE` du `.env`) |

Une fois connecté, tu peux cliquer sur la table `plants` par exemple, et voir
les lignes qui ont été insérées par le seed automatique.

---

## Partie 6 — Les commandes du quotidien

Toutes ces commandes se tapent **à la racine du projet**.

| Commande | Ce qu'elle fait, en une phrase toute simple |
| --- | --- |
| `npm run docker:up` | Allume les 3 conteneurs (db, api, adminer). À taper le matin quand tu commences à coder. |
| `npm run docker:down` | Éteint les 3 conteneurs, **sans** supprimer les données de la base (elles restent dans le volume, prêtes pour la prochaine fois). À taper le soir. |
| `npm run docker:logs` | Affiche en direct ce qui se passe dans les conteneurs. `Ctrl+C` pour arrêter de regarder (ça n'éteint rien). |
| `npm run docker:reset` | Supprime **complètement** la base de données et la recrée toute neuve (avec le seed relancé automatiquement). À utiliser si ta base est "cassée" ou pleine de données de test que tu veux effacer. |
| `npm run docker:migrate` | Force la mise à jour du schéma de la base (création des tables si elles n'existent pas). Fait automatiquement à chaque démarrage, cette commande sert surtout si tu veux le refaire sans redémarrer. |
| `npm run docker:seed` | Relance le remplissage du référentiel de plantes. Sans danger de le relancer plusieurs fois : si les plantes sont déjà là, il ne fait rien (pas de doublons). |

**Astuce :** tu peux avoir Docker allumé (`docker:up`) toute la journée
pendant que tu codes sur `apps/api` : le code est branché en direct dans le
conteneur (on appelle ça le "hot-reload"), donc à chaque fois que tu
sauvegardes un fichier dans `apps/api/src`, le serveur redémarre tout seul
automatiquement en 1-2 secondes pour prendre en compte ton changement. Tu
n'as jamais besoin de taper `docker:down` puis `docker:up` juste parce que tu
as modifié du code.

---

## Partie 7 — Et le front (Expo) dans tout ça ?

**Important : `apps/mobile` (l'application Expo) ne tourne JAMAIS dans
Docker.** On la lance toujours directement sur ta machine, normalement,
comme avant :

```bash
cd apps/mobile
npx expo start
```

**Pourquoi on ne met pas Expo dans une boîte Docker aussi ?** Parce qu'Expo a
besoin d'accéder directement aux appareils connectés à TA machine (ton
téléphone en USB, ou l'émulateur Android installé sur ton PC). Une boîte
Docker est "isolée" de ta machine exprès (c'est tout l'intérêt !), donc elle
ne peut pas facilement voir ton téléphone branché. Ce n'est pas un oubli,
c'est un choix : Docker est fait pour la base de données et l'API, pas pour
le front mobile.

Le front va appeler l'API qui, elle, tourne dans Docker — mais comme le port
`3000` de l'API est "publié" vers ta machine (voir `docker-compose.yml`), pour
le front c'est exactement comme si l'API tournait normalement sans Docker :
rien à changer de ce côté-là, `apps/mobile/src/api/config.ts` trouve l'API
tout seul si ton téléphone est sur le même réseau WiFi que ton PC.

### 7.1. Cas particulier : téléphone Android branché en USB

Si tu branches ton téléphone Android en USB (au lieu du WiFi), il faut créer
un "tunnel" entre le téléphone et ton PC pour que le téléphone puisse
atteindre l'API qui tourne sur le PC (dans Docker). C'est à ça que sert
`adb` :

```bash
adb reverse tcp:3000 tcp:3000
```

**Explication mot par mot :** `adb reverse` crée un tunnel dans le sens
"téléphone vers PC". `tcp:3000 tcp:3000` veut dire : "quand une app sur le
téléphone essaie de joindre `localhost:3000` (le port 3000 du téléphone
lui-même), redirige ça vers le port 3000 de mon PC" — c'est justement le port
sur lequel l'API tourne dans Docker.

Une fois cette commande tapée, ajoute cette ligne dans le fichier
`apps/mobile/.env` (crée le fichier s'il n'existe pas) :

```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Puis redémarre `npx expo start` pour qu'Expo prenne en compte ce changement.

(Si tu utilises un **émulateur** Android plutôt qu'un vrai téléphone, tu n'as
rien à faire : ça fonctionne déjà tout seul.)

---

## Partie 8 — Recommencer complètement à zéro

Si un jour tu veux tout effacer et repartir sur une base neuve (par exemple
après avoir mis n'importe quoi dans la base de données pour tester), une
seule commande suffit :

```bash
npm run docker:reset
```

Elle fait deux choses l'une après l'autre :
1. Éteint les conteneurs **et supprime le volume** qui contient les données
   de la base (donc toutes les données actuelles disparaissent, c'est fait
   exprès).
2. Rallume tout : une base toute neuve est créée, et le seed des plantes se
   relance automatiquement.

Après ça, tu es exactement dans le même état qu'au tout premier
`npm run docker:up`.

---

## Partie 9 — Problèmes fréquents et comment les résoudre

| Ce que tu vois | Pourquoi ça arrive | Comment le résoudre |
| --- | --- | --- |
| `permission denied` en tapant une commande `docker` (Linux) | Ton compte n'est pas (encore) reconnu dans le groupe `docker` | Refais `sudo usermod -aG docker $USER`, puis **ferme et rouvre vraiment ton terminal/ta session** (voir Partie 1.A) |
| `docker: command not found` | Docker n'est pas installé, ou pas dans le `PATH` | Refais l'installation (Partie 1), vérifie avec `docker --version` |
| Erreur de mot de passe / connexion à la base qui échoue | Le fichier `.env` n'existe pas à la racine, ou est vide | Vérifie qu'un fichier `.env` existe bien à la racine (`cp .env.example .env` si besoin) |
| "Port already in use" / port déjà utilisé (3000, 5433 ou 8080) | Un autre programme sur ta machine utilise déjà ce port (par exemple un PostgreSQL déjà installé à la main) | Change la valeur de `PORT`, `DB_PORT` ou `ADMINER_PORT` dans ton `.env`, puis relance `npm run docker:up` |
| Rien ne se passe / erreur bizarre après avoir modifié `docker-compose.yml` ou le `Dockerfile` | Docker garde en cache l'ancienne version de l'image | Relance avec `docker compose up -d --build` (le `--build` force à reconstruire) |
| Le front (Expo) n'arrive pas à joindre l'API | L'API n'est pas démarrée, ou cas USB/adb sans `adb reverse` | Vérifie `npm run docker:logs`, relis la Partie 7 |
| Je ne sais plus dans quel état est tout ça | — | `docker compose ps` affiche l'état de chaque conteneur (`Up`, `healthy`, etc.) |

Si tu es bloqué sur quelque chose qui n'est pas dans ce tableau, regarde
aussi `DOCKER.md` (guide un peu plus technique) ou demande à Djawad — il a
lui-même testé toutes les étapes de ce guide avant de te l'envoyer.

---

## Récapitulatif express (une fois Docker installé)

```bash
# Une seule fois
cp .env.example .env

# À chaque fois que tu veux coder
npm run docker:up
cd apps/mobile && npx expo start   # dans un autre terminal

# En fin de journée (optionnel, pas obligatoire)
npm run docker:down
```

C'est tout ce dont tu as besoin pour travailler sur PlanAI avec exactement le
même environnement que Djawad.
