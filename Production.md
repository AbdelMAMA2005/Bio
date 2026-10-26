# Mise en production de PlanAI

Ce guide décrit la mise en production de l'application mobile Expo avec :

- **Supabase** pour PostgreSQL, Auth, Storage, RLS et les fonctions Edge ;
- **Expo EAS** pour construire l'application Android ;
- **Google Play Console** pour distribuer l'AAB.

Il n'y a pas de serveur applicatif à déployer : le mobile et la console admin parlent directement à Supabase.

## État actuel

Les vérifications locales suivantes passent :

```powershell
cd apps/mobile
npx tsc --noEmit
npm test -- --runInBand --watch=false
```

Résultat vérifié : **50 tests passés** et aucune erreur TypeScript.

Le `projectId` EAS de référence est celui de `apps/mobile/app.config.ts` (`c2e1fbf6-4c75-478e-85ed-781d6cbb1509`, owner `adamskader`). C'est le seul fichier de config Expo : il n'y a plus de `app.json`/`eas.json`/`android/` à la racine — toujours lancer `eas build` depuis `apps/mobile`.

## 1. Créer le projet Supabase de production

1. Ouvrir [supabase.com](https://supabase.com) et créer un projet **Production**.
2. Choisir une région proche des utilisateurs.
3. Conserver le mot de passe PostgreSQL dans un gestionnaire de secrets.
4. Dans **Project Settings > API**, relever `Project URL` et `anon public key`.
5. Ne jamais mettre `service_role key` dans l'application mobile.

## 2. Créer la base et la sécurité Supabase

Dans **SQL Editor**, exécuter entièrement [schema_supabase.sql](schema_supabase.sql).

Puis vérifier :

- les tables sont présentes ;
- RLS est activé sur toutes les tables applicatives ;
- le trigger de création de `profiles` existe ;
- les fonctions `get_daily_quests`, `compute_rarity`, `get_user_stats` et `delete_my_account` existent si elles sont utilisées par le mobile ;
- aucun compte ou secret de production n'est copié depuis l'environnement local.

Tester RLS avec deux utilisateurs différents : A ne doit pas lire ou modifier la collection et le profil de B, tandis que les profils et posts publics doivent rester accessibles selon les policies prévues.

## 3. Configurer Storage

Dans **Storage**, créer ou vérifier ces buckets :

| Bucket | Visibilité | Usage |
| --- | --- | --- |
| `avatars` | public | Photos de profil |
| `collections` | privé | Photos de suivi des plantes |
| `posts` | public | Images des publications |
| `stories` | public | Médias temporaires |

Ajouter les policies Storage correspondantes : un utilisateur ne doit pouvoir écrire que dans son propre chemin, par exemple `user_id/fichier.jpg`.

## 4. Configurer Auth

Dans **Authentication > Providers** :

1. activer Email ;
2. configurer les URLs de confirmation et de redirection de production ;
3. activer Google uniquement après avoir configuré les identifiants OAuth réels ;
4. vérifier qu'aucune URL locale n'est utilisée en production.

Le mobile utilise `supabase.auth` avec `AsyncStorage`. Les tokens Supabase ne doivent pas être copiés manuellement dans une variable publique.

## 5. Déployer les Edge Functions

Les appels Plant.id ne doivent pas être faits directement depuis le mobile : la clé API serait exposée. Déployer les fonctions de [supabase/functions](supabase/functions) :

```powershell
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase functions deploy identify-plant
npx supabase functions deploy diagnose-health
npx supabase secrets set PLANT_ID_API_KEY=<clé-plant-id>
```

Ne jamais mettre `PLANT_ID_API_KEY` dans `apps/mobile/.env` ni dans une variable `EXPO_PUBLIC_*`. Tester chaque fonction avec un utilisateur authentifié avant la build mobile.

## 6. Configurer les variables mobiles

Pour un test local contrôlé, `apps/mobile/.env` doit contenir les valeurs du projet de production :

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google-web-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<google-ios-client-id>
```

Ne jamais committer ce fichier. Pour EAS, enregistrer les variables dans l'environnement `production` :

```powershell
cd apps/mobile
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<project-ref>.supabase.co --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon-public-key> --visibility sensitive
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <google-web-client-id> --visibility plaintext
```

La clé `anon` peut être distribuée dans l'application ; la protection réelle repose sur Auth et RLS. La clé `service_role` reste strictement côté serveur.

## 7. Rattacher le projet Expo au bon compte

Le compte actuellement connecté est `adamskader`, mais le `projectId` existant n'est pas lisible par ce compte.

### Option recommandée : créer ou associer un projet Expo

Depuis `apps/mobile`, utiliser le compte qui doit posséder l'application :

```powershell
cd apps/mobile
npx eas-cli@latest logout
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest init
```

Accepter la création ou l'association proposée. Vérifier ensuite :

```powershell
npx expo config --type public
npx eas-cli@latest project:info
```

La configuration doit afficher `name: PlanAI`, `slug: mobile`, `android.package: com.planai` et un `projectId` accessible au compte connecté.

### Option alternative : récupérer l'accès au projet existant

Le propriétaire du projet Expo doit ajouter le compte de publication comme membre ou transférer le projet. Ne pas remplacer manuellement le `projectId` par une valeur inconnue.

## 8. Vérifier l'identité Android

Le package Android de production est `com.planai`. Il doit être identique dans `apps/mobile/app.config.ts`, Google Play Console et la configuration Google OAuth si Google Sign-In est utilisé.

Une fois l'application publiée, ne jamais changer ce package. EAS gère l'incrémentation du code de version via `autoIncrement`.

## 9. Contrôles avant build

Depuis la racine :

```powershell
npm install
npm run mobile:typecheck
```

Depuis `apps/mobile` :

```powershell
npm test -- --runInBand --watch=false
npx expo config --type public
npx eas-cli@latest build:configure
```

Corriger toute erreur avant la build et vérifier que les variables EAS de l'environnement `production` existent.

## 10. Construire l'application Android

Pour une validation interne :

```powershell
cd apps/mobile
npx eas-cli@latest build --platform android --profile preview
```

Installer l'APK généré et vérifier l'authentification, les lectures et écritures Supabase, les uploads, le scan via Edge Function, les règles RLS entre deux comptes et Google Sign-In si activé.

Pour le Play Store :

```powershell
cd apps/mobile
npx eas-cli@latest build --platform android --profile production
```

Cette commande produit un **AAB**, le format attendu par Google Play.

## 11. Publier d'abord en test fermé

Dans Google Play Console :

1. créer l'application avec le package `com.planai` ;
2. compléter la fiche, l'icône, les captures et la politique de confidentialité ;
3. créer une piste **Test fermé** ;
4. téléverser l'AAB produit par EAS ;
5. ajouter les comptes testeurs ;
6. installer depuis le lien Play Store ;
7. refaire les tests fonctionnels et vérifier les logs Supabase.

Ne passer en production publique qu'après validation du test fermé.

## 12. Soumettre la production

Depuis `apps/mobile` :

```powershell
npx eas-cli@latest submit --platform android --profile production
```

Ou téléverser manuellement l'AAB dans la piste de production Google Play. Vérifier avant envoi la version, le code de version, la politique de confidentialité, les déclarations caméra/localisation/photos/notifications, la suppression de compte et l'adresse de support.

## 13. Après publication

- surveiller les erreurs Supabase et les Edge Functions ;
- activer les alertes de quota Supabase ;
- sauvegarder le schéma SQL et les migrations ;
- conserver les identifiants EAS et la clé de signature dans un gestionnaire de secrets ;
- ne jamais réinitialiser Supabase Production sans sauvegarde ;
- tester chaque mise à jour avec `preview`, puis en test fermé.

## Commandes utiles

```powershell
# Depuis la racine
npm run mobile:typecheck

# Depuis apps/mobile
npx expo config --type public
npx eas-cli@latest whoami
npx eas-cli@latest project:info
npx eas-cli@latest build:list
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android --profile production
```

## Conclusion

Le code mobile est prêt selon les contrôles automatisés locaux. La mise en production n'est pas encore terminée tant que le projet EAS n'est pas accessible au bon compte et que Supabase Production, les policies RLS, les secrets Edge Functions et le test fermé Play Store ne sont pas validés.
