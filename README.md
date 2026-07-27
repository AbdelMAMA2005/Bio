# PlanAI

## Démarrer l'app sur son téléphone (USB / adb)

> Pour une connexion en WiFi sans câble (Expo Go, sans adb), voir `demarrage.md` à la
> racine. Ce qui suit couvre le lancement en USB via adb, sur Linux comme sur Windows.

### 0. Prérequis

- **Un dev client déjà installé sur le téléphone** : l'app **Expo Go** seule ne suffit
  pas — le projet utilise des modules natifs (Google Sign-In, caméra, etc.) qui exigent
  un build de développement, buildé une fois via EAS (`npx eas-cli build --profile
  development --platform android`, puis installer l'APK généré) ou en local
  (`cd apps/mobile && npx expo run:android`, téléphone branché).
- **Postgres lancé** et `apps/api/.env` configuré (`DB_HOST`, `DB_PORT`, etc.).
- **Débogage USB activé** sur le téléphone : Paramètres → Options pour développeurs →
  Débogage USB (si "Options pour développeurs" n'existe pas, Paramètres → À propos du
  téléphone → taper 7 fois sur "Numéro de build").

### 1. Installer adb

**Linux :**
```bash
sudo apt install android-sdk-platform-tools   # Debian/Ubuntu/Kali
adb version                                   # vérifie l'installation
```
(Si le paquet n'est pas disponible, télécharger "SDK Platform-Tools for Linux" depuis
https://developer.android.com/tools/releases/platform-tools et ajouter le dossier extrait
au `PATH`.)

**Windows :**
1. Télécharger "SDK Platform-Tools for Windows" depuis
   https://developer.android.com/tools/releases/platform-tools
2. Extraire le zip (ex. `C:\platform-tools`)
3. Ajouter ce dossier au `PATH` (Panneau de configuration → Variables d'environnement
   système)
4. Ouvrir un **nouveau** terminal (PowerShell ou cmd) et vérifier avec `adb version`

(Alternative avec un gestionnaire de paquets : `choco install adb` ou `scoop install
adb`.) Si le téléphone n'apparaît toujours pas à l'étape suivante, il manque
probablement le pilote USB du fabricant — installer le pilote OEM correspondant au
modèle du téléphone.

### 2. Connecter le téléphone

- Brancher le téléphone en USB
- Accepter la popup **"Autoriser le débogage USB ?"** qui s'affiche sur le téléphone
  (cocher "Toujours autoriser depuis cet ordinateur" pour ne pas la revoir)
- Vérifier :
  ```bash
  adb devices
  ```
  Le téléphone doit apparaître avec le statut `device` (pas `unauthorized` ni `offline`
  — si `unauthorized`, re-regarder l'écran du téléphone et accepter la popup ; si
  `offline`, débrancher puis rebrancher le câble).

### 3. Démarrer le backend (`apps/api`) et le front (`apps/mobile`)

Deux terminaux séparés, à laisser ouverts tous les deux :

```bash
# Terminal 1 — backend (apps/api)
cd apps/api
npm run start:dev
```

```bash
# Terminal 2 — bundler mobile (apps/mobile), --dev-client car Expo Go seul ne suffit pas
cd apps/mobile
npx expo start --dev-client
```

### 4. Lancer l'app sur le téléphone

Dans le terminal Metro (terminal 2), appuyer sur **`a`** : Expo détecte le téléphone
branché en USB, fait automatiquement le port-forward nécessaire et ouvre l'app dessus.

Si ça ne suffit pas (ou pour relancer l'app sans repasser par le terminal Metro), dans
un 3ᵉ terminal :
```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
adb shell am start -a android.intent.action.VIEW -d "mobile://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

⚠️ Si **Expo Go** est aussi installé sur le téléphone, la commande ci-dessus peut
l'ouvrir par erreur à sa place (les deux apps gèrent des schémas d'URL proches) : soit
désinstaller Expo Go, soit cibler explicitement le dev client avec
`-p app.planai.mobile` (package Android du projet, voir `apps/mobile/app.json`).

### 5. Tout arrêter

`Ctrl+C` dans les deux terminaux (`apps/api` et `apps/mobile`). Pas besoin de
`adb disconnect`.

### Dépannage

Pour les cas non couverts ici (changement d'IP, cache Metro, pare-feu, "Network Error",
débogage sans fil...), voir la section **"5. Dépannage général"** de `demarrage.md`.

---

## Présentation

Une app qui utilise une carte en mode Pokémon Go pour identifier les différentes espèces de plantes autour de toi. Elle te propose de les « capturer » et te donne des points d'XP à chaque capture, en fonction de la rareté de la plante.

## Fonctionnalités Principales

- **Identification en temps réel** : Reconnaissance des plantes via la caméra
- **Détection de toxicité** : Système de détection des caractéristiques toxiques ou non d'une plante
- **Conseils d'entretien** : Recommandations pour chaque plante identifiée
- **Système de points** : Gagnez de l'XP avec chaque capture selon la rareté

## Interface & Design

L'interface serait en mode « snap » avec trois onglets principaux :

### 1. Caméra (Centre)
- Intègre le système de détection de la toxicité
- Suggère des plantes à découvrir ou à ajouter à ta collection

### 2. Carte (Gauche)
- Localise les plantes autour de toi
- Défis automatiques (quêtes quotidiennes)

### 3. Communauté
- Espace de communication entre passionnés
- Partage de séries et stories sur les plantes
- Échange d'expériences et de connaissances

## Vision & Objectifs

Assurer la scalabilité de l'app en en faisant une véritable organisation, avec un écosystème autour de :
- **Découverte** des espèces végétales
- **Protection** et conservation
- **Partage** des connaissances sur les plantes
