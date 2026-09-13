# Se connecter à la console admin PlanAI (en local)

Ce guide explique comment démarrer le backend et la console admin sur ta machine, puis
t'y connecter.

## 1. Démarrer le backend (apps/api)

Deux options, selon ce que tu as déjà en place :

**Avec Docker (recommandé si tu as déjà le `docker-compose.yml` du projet) :**

```bash
docker compose up -d
```

**Sans Docker, directement avec Node :**

```bash
cd apps/api
npm install          # première fois seulement
npm run start:dev
```

L'API tourne alors sur `http://localhost:3000`. Vérifie qu'elle répond :

```bash
curl http://localhost:3000
```

## 2. Démarrer la console admin (apps/admin)

Dans un autre terminal :

```bash
cd apps/admin
npm install          # première fois seulement
npm run dev
```

La console est alors accessible sur **http://localhost:5174**.

Par défaut, elle pointe vers `http://localhost:3000` pour l'API. Si ton backend tourne
ailleurs, copie `.env.example` en `.env` dans `apps/admin/` et adapte `VITE_API_URL`.

## 3. Créer ton compte et obtenir l'accès admin

La console réutilise exactement le même système de comptes que l'app mobile — il n'y a
pas de compte admin par défaut (aucun mot de passe connu codé en dur, par sécurité).

1. **Inscris-toi normalement**, soit depuis l'app mobile, soit via :
   ```bash
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"ton-email@exemple.com","motDePasse":"ton-mot-de-passe","nomUtilisateur":"tonpseudo"}'
   ```

2. **Promeus ce compte au rôle admin** :
   ```bash
   cd apps/api
   npm run create-admin --workspace=api -- ton-email@exemple.com
   ```
   Tu devrais voir : `✅ ton-email@exemple.com est maintenant administrateur`.

   (Il existe aussi le rôle intermédiaire `moderateur`, avec des droits plus limités
   — pour l'instant seul `create-admin.ts` promeut au rôle `admin` complet ; un
   changement de rôle vers `moderateur` se fait ensuite directement depuis la console,
   page Utilisateurs, une fois qu'un premier admin existe.)

## 4. Se connecter

Ouvre **http://localhost:5174** dans ton navigateur, et connecte-toi avec l'email et le
mot de passe utilisés à l'étape 3.

Tu arrives sur le tableau de bord, avec accès aux 7 écrans : Tableau de bord,
Utilisateurs, Référentiel plantes, Modération, Défis, Paramètres, et la navigation
partagée (barre latérale + barre supérieure).

## En cas de souci

- **"Ce compte n'a pas accès à la console admin"** à la connexion → le compte existe
  mais n'a pas (encore) le rôle `admin`/`moderateur` — reprends l'étape 3.2.
- **La console ne charge aucune donnée** → vérifie que l'API tourne bien sur le port
  attendu (`curl http://localhost:3000`) et que `VITE_API_URL` dans `apps/admin/.env`
  (si tu en as créé un) pointe au bon endroit.
- Plus de détails techniques (endpoints, modèle de rôles, limites connues) dans
  `API_CONTRACT.md` (section 10) et `rapport.md` (section 12).
