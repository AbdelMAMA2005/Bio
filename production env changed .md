Searched for "EXPO_PUBLIC_API_URL"
Viewed config.ts:1-52

## 🎯 Qu’est‑ce qui fait que votre appli **utilise le mock** ?

Dans **`src/api/config.ts`** vous avez deux « switch » :

```ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || resolveDevApiUrl();
export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';
```

| Variable | Valeur par défaut | Ce qu’elle contrôle |
|----------|-------------------|---------------------|
| `EXPO_PUBLIC_API_URL` | `resolveDevApiUrl()` → auto‑détection du LAN (`http://<your‑pc‑ip>:3000`) | L’URL du **backend réel** (ex. : `https://api.monsite.com`). |
| `EXPO_PUBLIC_USE_MOCK_API` | `false` (si non défini) | Si `true` → les appels qui ne sont pas encore implémentés côté serveur sont **mockés**. |

> **En mode développement** votre projet charge `resolveDevApiUrl()`.  
> **En production** (EAS build, CI, etc.) vous devez **injecter** `EXPO_PUBLIC_API_URL` (et éventuellement forcer `USE_MOCK_API=false`) pour que le code pointe vers le vrai serveur.

---

## 🛠️ Où mettre / modifier ces variables ?

### 1️⃣ Fichier `.env` local (développement)

1. À la racine du projet (c’est‑à‑dire `c:/WorkSpace/Bio/`) créez ou éditez le fichier **`.env`** (ou `.env.development` si vous utilisez des variantes).  
2. Ajoutez :

```dotenv
# Exemple de backend de dev qui tourne sur votre PC
EXPO_PUBLIC_API_URL=http://192.168.1.27:3000   # <‑ remplacez par l’IP LAN de votre machine
EXPO_PUBLIC_USE_MOCK_API=false                # désactive le mock pendant que le serveur tourne
```

> **Pourquoi le préfixe `EXPO_PUBLIC_` ?**  
> Expo ne charge que les variables qui commencent par ce préfixe, et elles sont accessibles via `process.env` dans le code JavaScript/TypeScript.

### 2️⃣ Variables d’environnement dans **EAS Build** (production)

Lorsque vous créez une build avec **EAS**, les variables d’environnement sont définies dans le tableau **`eas.json`** ou via le tableau de bord **Expo > Project Settings > Environment Variables**.

#### a. `eas.json` (profil production)

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "production": {
      "developmentClient": false,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.monsite.com",
        "EXPO_PUBLIC_USE_MOCK_API": "false"
      }
    }
  }
}
```

> En ajoutant `env` au profil, EAS injecte ces valeurs au moment du build.  

#### b. Dashboard (alternative)

1. Ouvrez le **Dashboard Expo** → *Your project* → **Project Settings** → **Environment Variables**.  
2. Créez deux variables :

| Name                     | Value                     | Scope |
|--------------------------|---------------------------|-------|
| `EXPO_PUBLIC_API_URL`    | `https://api.monsite.com` | Production (ou « All » si vous voulez l’utiliser partout) |
| `EXPO_PUBLIC_USE_MOCK_API` | `false`                  | Production |

### 3️⃣ `.env` de **test** / **staging** (optionnel)

Vous pouvez créer d’autres fichiers comme `.env.staging` et les sélectionner via le champ `envFile` dans **`app.config.ts`** :

```ts
// app.config.ts
import 'dotenv/config'; // charge .env par défaut

export default ({ config }: ConfigContext) => ({
  ...config,
  extra: {
    // toute donnée supplémentaire que vous voulez exposer
  },
});
```

Ensuite, lancez :

```bash
EXPO_PUBLIC_API_URL=https://staging.api.monsite.com EXPO_PUBLIC_USE_MOCK_API=false npx expo start -c
```

---

## 🔄 Comment changer d’API **sans tout casser** ?

1. **Ne touchez pas au code** – tout ce qui dépend de l’URL est déjà abstrait via `API_BASE_URL`.  
2. **Mettez à jour la variable** :
   - En local : éditez votre `.env`.
   - En production : changez la valeur dans `eas.json` ou le Dashboard.
3. **Redémarrez Metro** (ou reconstruisez la build) :

```bash
# en local après modification d’un .env
npx expo start -c        # le -c vide le cache Metro
```

   - Pour une build production, relancez :

```bash
eas build -p android --profile production   # ou la même commande pour iOS
```

4. **Vérifiez** :
   - Ouvrez l’appli, inspectez (avec React DevTools ou la console) la valeur de `API_BASE_URL`.  
   - Vous pouvez ajouter un petit `console.log(API_BASE_URL);` dans `src/api/config.ts` (temporaire) pour confirmer que la bonne URL est lue.

---

## 📦 Exemple complet : passer du mock à l’API réelle en dev

```bash
# 1️⃣ Créez/éditez .env à la racine du repo
echo "EXPO_PUBLIC_API_URL=http://192.168.1.27:3000" >> .env
echo "EXPO_PUBLIC_USE_MOCK_API=false" >> .env

# 2️⃣ Redémarrez Metro
npx expo start -c
```

Après le redémarrage, les appels `fetch(`${API_BASE_URL}/auth/login`)` iront directement vers votre serveur local (ou vers l’URL distante que vous avez mis dans `EXPO_PUBLIC_API_URL`).

---

## 🛡️ Conseils pour éviter les régressions

| Action | Pourquoi |
|--------|----------|
| **Conserver `EXPO_PUBLIC_USE_MOCK_API` à `false` en prod** | Vous ne voulez jamais exposer du mock en production. |
| **Versionner le `.env.example`** | Partagez‑le avec votre équipe (`EXPO_PUBLIC_API_URL=`, `EXPO_PUBLIC_USE_MOCK_API=`) sans y mettre les valeurs sensibles. |
| **Ajouter un test simple** | Dans votre suite de tests (ex. : `jest`), ajoutez : <br>`expect(API_BASE_URL).not.toContain('localhost')` pour la configuration de production. |
| **Documenter les valeurs attendues** | Dans le README, indiquez la forme de l’URL et que le préfixe `EXPO_PUBLIC_` est obligatoire. |

---

## 📌 Résumé des étapes à suivre

1. **Locaux** : ajoutez/editez `.env` → `EXPO_PUBLIC_API_URL` + `EXPO_PUBLIC_USE_MOCK_API=false` → `npx expo start -c`.  
2. **Production** : définissez les mêmes variables dans le **profil `production` de `eas.json`** ou via le **Dashboard** → lancez `eas build`.  
3. **Vérifiez** : console‑log ou inspectez `API_BASE_URL` dans l’app.  
4. **Répétez** pour chaque environnement (staging, QA, prod) en créant le fichier `.env.<env>` ou en ajoutant des blocs `env` dans `eas.json`.

---

**Vous avez maintenant tout le nécessaire :** vous pouvez changer d’API en modifiant simplement une variable d’environnement, sans toucher au code applicatif, et sans risquer de casser quoi que ce soit. 🎉