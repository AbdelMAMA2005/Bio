# PlanAI

## Démarrer l'app sur son téléphone

> Le mobile et la console admin sont branchés directement sur Supabase : aucun serveur à lancer en local.

### 0. Prérequis

- Un projet Supabase créé et ses clés récupérées.
- Les variables `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` renseignées dans [apps/mobile/.env](apps/mobile/.env).
- Le client Google OAuth configuré si vous utilisez la connexion Google.
- Un build de développement Expo installé sur le téléphone si vous lancez le dev client natif.

### 1. Démarrer le front mobile

```bash
cd apps/mobile
npx expo start
```

Pour un lancement Android via dev client / USB :

```bash
cd apps/mobile
npx expo run:android
```

### 2. Vérifier la configuration Supabase

Le client est initialisé dans [apps/mobile/src/lib/supabase.ts](apps/mobile/src/lib/supabase.ts). Il utilise `AsyncStorage` pour la persistance de session et `EXPO_PUBLIC_SUPABASE_*` pour se connecter au projet.

### 3. Dépannage

Pour les cas de réseau, de cache Metro ou de configuration OAuth, voir [demarrage.md](demarrage.md).

---

## Tests et contrôles

```bash
npm test                # tout : mobile, admin, Edge Functions et SQL
npm run test:mobile     # Jest (apps/mobile)
npm run test:admin      # Vitest (apps/admin)
npm run test:functions  # tests unitaires des Edge Functions
npm run test:sql        # droits, RPC et triggers sur un PostgreSQL jetable (Docker requis)
npm run verifier:prod   # sécurité de la prod vue de l'extérieur (clé publique seulement)
```

Le test d'intégration réel de la console admin (`apps/admin/src/integration.smoke.test.tsx`)
s'active en renseignant `VITE_SMOKE_ADMIN_EMAIL` et `VITE_SMOKE_ADMIN_PASSWORD` (compte de
test ayant le rôle admin) dans `apps/admin/.env`.

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
