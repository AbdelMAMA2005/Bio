# PlanAI — Démarrage de l'app sur le téléphone

> Le développement mobile ne dépend plus d'un backend local. La connexion se fait directement vers Supabase.

---

## 1. Configurer Supabase

Renseigner les variables dans [apps/mobile/.env](apps/mobile/.env) :

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google-client-id>
```

Une fois la base créée, exécuter le schéma [schema_supabase.sql](schema_supabase.sql) dans l'éditeur SQL de Supabase.

## 2. Démarrer le bundler mobile

```bash
cd apps/mobile
npx expo start
```

- Expo démarre en mode LAN ou Metro standard.
- L'application utilise le SDK Supabase pour l'authentification et les données.
- Aucun backend NestJS n'est requis pour le flux mobile standard.

## 3. Connecter le téléphone

- Android : scanner le QR code affiché par Expo.
- iOS : ouvrir l'appareil photo sur le QR code affiché.
- En dev client natif : `npx expo run:android` puis lancer l'app installée.

## 4. Dépannage général

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| L'app ne se connecte pas à Supabase | Variables manquantes | Vérifier [apps/mobile/.env](apps/mobile/.env) |
| Auth Google impossible | Client ID incorrect | Vérifier `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| Erreur de session | Project Supabase non initialisé | Exécuter le schéma SQL dans Supabase |
| Cache Expo obsolète | Ancien build Metro | Relancer `npx expo start -c` |

## 5. Tout arrêter

`Ctrl+C` dans le terminal Expo. Aucune étape de backend locale n'est nécessaire.
