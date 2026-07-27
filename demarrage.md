# PlanAI — Démarrage de l'app sur le téléphone en WiFi

> Prérequis : le téléphone et l'ordinateur doivent être sur le **même réseau WiFi**
> (ou le même hotspot). L'app **Expo Go** doit être installée sur le téléphone
> (App Store / Google Play).

---

## 1. Démarrer le backend (`apps/api`)

```bash
cd apps/api
npm run start:dev
```

- Écoute sur `0.0.0.0:3000` (toutes les interfaces réseau) — donc déjà joignable
  depuis le téléphone via l'IP locale du PC.
- Nécessite Postgres lancé (`DB_HOST=localhost`, `DB_PORT=5433` — voir `apps/api/.env`).
- Laisser ce terminal ouvert (`--watch` recharge automatiquement à chaque modif).

## 2. Démarrer le bundler mobile (`apps/mobile`)

```bash
cd apps/mobile
npx expo start
```

- Par défaut, Expo démarre en **mode LAN** (pas besoin de `--tunnel`) : un QR code
  s'affiche dans le terminal.
- Le front détecte **automatiquement** l'IP du PC pour joindre le backend
  (`apps/mobile/src/api/config.ts`, via `hostUri` de Metro) — aucune variable
  d'environnement à changer pour du WiFi normal.

## 3. Connecter le téléphone (sans adb)

- **Android** : ouvrir Expo Go → "Scan QR code" → scanner le QR affiché dans le terminal.
- **iOS** : ouvrir l'app Appareil photo → viser le QR → toucher la notification Expo Go.
- **Si le scan ne marche pas** (QR illisible, terminal distant...) : dans Expo Go,
  choisir "Enter URL manually" et saisir :

  ```
  exp://<IP_DU_PC>:8081
  ```

  Trouver l'IP du PC avec :

  ```bash
  hostname -I
  ```

---

## 4. Variante : adb par WiFi (débogage sans fil)

Utile pour piloter/contrôler l'appareil depuis le terminal (captures d'écran,
taps automatisés) sans câble USB. **Le réseau de l'app passe quand même par le
WiFi direct (§1-3 ci-dessus)** — pas par `adb reverse`, qui s'est montré
instable en pratique sur certains appareils (tunnels perdus silencieusement en
cours de session).

### 4.1. Activer le débogage sans fil (une fois)

Sur le téléphone : **Paramètres → Options pour développeurs → Débogage sans
fil** → activer le bascule. (Si "Options pour développeurs" n'existe pas,
Paramètres → À propos du téléphone → taper 7 fois sur "Numéro de build".)

### 4.2. Appairer le PC et le téléphone (une seule fois par PC)

Sur le téléphone, dans l'écran "Débogage sans fil" : **"Coupler l'appareil avec
un code d'appairage"** → affiche une IP:port ET un code à 6 chiffres.

```bash
adb pair <ip_affichee>:<port_affiche>
# adb demande le code à 6 chiffres → le saisir
```

### 4.3. Se connecter (à chaque session)

Retourner sur l'écran principal **"Débogage sans fil"** (pas l'écran
d'appairage) : il affiche une IP:port **différente** de celle du couplage, qui
**change à chaque reconnexion réseau** — toujours relire cette valeur avant de
lancer la commande :

```bash
adb connect <ip_affichee>:<port_affiche>
adb devices -l   # doit afficher l'appareil avec le statut "device"
```

### 4.4. Lancer l'app sur le téléphone

Le bundler (§2) et le backend (§1) doivent déjà tourner. Trouver l'IP LAN du PC :

```bash
hostname -I
```

Puis, avec le téléphone connecté en adb :

```bash
adb shell am start -a android.intent.action.VIEW -d "exp://<IP_DU_PC>:8081"
```

Ouvre directement Expo Go sur PlanAI, connecté au bundler via le WiFi (pas via
adb) — évite les soucis de tunnel.

### 4.5. Contrôler l'appareil depuis le terminal (optionnel)

```bash
# Capture d'écran
adb exec-out screencap -p > screen.png

# Tap à une coordonnée (x y en pixels de l'écran physique)
adb shell input tap <x> <y>

# Saisie de texte dans un champ déjà focus
adb shell input text "du texte"

# Bouton retour / accueil
adb shell input keyevent KEYCODE_BACK
adb shell input keyevent KEYCODE_HOME
```

### 4.6. Dépannage adb

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| `adb connect` → "Connection refused" | Le port affiché a déjà changé | Retourner sur l'écran "Débogage sans fil" du téléphone et relire l'IP:port **juste avant** la commande |
| Appareil listé mais l'app ne charge rien | Réseau différent entre PC et téléphone | Vérifier que les deux sont bien sur le même WiFi/hotspot |
| Ça marchait puis plus rien après une coupure WiFi | La reconnexion a changé le port de débogage sans fil | Refaire `adb connect` avec la nouvelle IP:port (§4.3) — pas besoin de réappairer |

---

## 5. Dépannage général

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| L'app ne charge pas / reste sur l'écran Expo | Téléphone pas sur le même réseau WiFi | Vérifier le WiFi des deux appareils |
| "Network Error" une fois l'app ouverte | Backend (`apps/api`) pas démarré ou Postgres coupé | Vérifier `npm run start:dev` sans erreur, `pg_isready` |
| QR scanné mais rien ne se passe | Pare-feu du PC bloque le port 8081 (Metro) ou 3000 (API) | Autoriser ces ports en entrant sur le réseau local |
| Ça marchait puis plus rien après un changement d'IP (ex: changement de WiFi) | Le cache Metro garde l'ancienne IP | Relancer `npx expo start -c` (vide le cache) |

## 6. Tout arrêter

`Ctrl+C` dans chacun des deux terminaux (`apps/api` et `apps/mobile`). Pour
adb : `adb disconnect` (pas obligatoire).
