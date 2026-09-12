Je suis Djawad, sur PlanAI : monorepo npm workspaces (apps/mobile Expo + expo-router, apps/api NestJS, packages/shared), docs racine API_CONTRACT.md, ARCHITECTURE.md, TODO.md. Le build EAS dépasse 100 Mo, l'app est lourde. Objectif : une application LÉGÈRE, RAPIDE, FLUIDE et SÉCURISÉE, prête pour la production, puis un nouveau build EAS.

=== 1. NETTOYAGE DU DÉPÔT ET DU BUNDLE ===
- Supprime le dossier "Cahier de charge/" du dépôt (il ne contient que des PDF de spécifications, inutiles à l'exécution) ; si son contenu doit être conservé, déplace-le hors du répertoire buildé et ajoute-le au .gitignore et au .easignore.
- Crée/complète .easignore pour exclure du build tout ce qui n'est pas nécessaire à l'app : documentation, PDF, maquettes HTML, captures, tests, scripts, apps/api, packages non utilisés par le mobile.
- Traque ce qui gonfle le bundle : lance une analyse de taille (npx expo export puis inspection, ou source-map-explorer / react-native-bundle-visualizer) et montre-moi le top des plus gros modules.

=== 2. RÉDUCTION DU POIDS DE L'APP ===
- Audite les dépendances d'apps/mobile : supprime les paquets inutilisés (npx depcheck), remplace les librairies trop lourdes par des équivalents légers, dédoublonne les versions multiples.
- Optimise les assets : compresse les images (PNG/JPEG -> WebP quand possible), supprime les assets non référencés, réduis les polices aux graisses réellement utilisées (Outfit et Space Grotesk : ne charge que les poids employés), n'embarque pas d'icônes ou de packs non utilisés.
- Active les optimisations de build : Hermes, ProGuard/R8 et resource shrinking en release Android, split par ABI ou App Bundle (AAB) pour ne livrer que l'architecture du device, suppression des sourcemaps du bundle de production.
- Vérifie qu'aucun outil de développement (expo-dev-client, dev menu, logs verbeux, mocks, fixtures) n'est embarqué dans le build de production.

=== 3. PERFORMANCE ET FLUIDITÉ ===
- Listes : FlatList/FlashList correctement configurées (keyExtractor stable, getItemLayout ou estimatedItemSize, pagination/infinite scroll sur le feed et l'herbarium, pas de rendu de toute la collection d'un coup).
- Images : mise en cache et chargement progressif (expo-image), tailles adaptées (pas d'image pleine résolution dans une vignette), placeholders.
- Rendus : élimine les re-rendus inutiles (memo/useMemo/useCallback là où c'est pertinent, sélecteurs react-query ciblés, pas d'objet/style recréé à chaque render), animations exclusivement sur Reanimated (UI thread), pas de setState dans des boucles d'animation.
- Réseau : cache et staleTime react-query cohérents, déduplication des requêtes, images et médias servis compressés, requêtes parallélisées, aucune requête en cascade évitable.
- Démarrage : réduis le temps de lancement (splash animé qui ne bloque pas, chargement paresseux des écrans lourds, polices préchargées efficacement).
- Mesure avant/après : temps de démarrage à froid, poids du bundle JS, taille de l'APK/AAB, fluidité du scroll du feed. Donne-moi les chiffres.

=== 4. SÉCURITÉ ===
- Secrets : aucun secret, clé API, client secret ou credential en dur dans le code ni dans le dépôt ; tout via variables d'environnement (EXPO_PUBLIC_* uniquement pour ce qui est réellement public) et EAS secrets pour le build. Vérifie l'historique du repo pour des secrets exposés et signale-les.
- Auth : JWT stocké en SecureStore (jamais AsyncStorage), refresh token géré, expiration et déconnexion propres, route guard robuste, aucune donnée sensible dans les logs.
- Transport : HTTPS obligatoire en production (bloque le HTTP en clair), certificats validés, CORS correctement restreint côté apps/api.
- Back-end (apps/api) : validation stricte des entrées (class-validator, whitelist + forbidNonWhitelisted), rate limiting sur auth et endpoints coûteux (identification, upload), helmet, protection contre l'injection SQL (paramétrage TypeORM), contrôle d'autorisation sur chaque ressource (un utilisateur ne peut lire/modifier que ses données), limitation de taille et validation du type réel des fichiers uploadés.
- Permissions mobiles : caméra, galerie, localisation et notifications demandées au moment utile, avec justification, et gestion du refus.
- Dépendances : npm audit (front et back), corrige les vulnérabilités critiques et hautes.
- Confidentialité : suppression de compte réellement effective (purge RGPD), Geo-Tag strictement optionnel et jamais partagé sans consentement.

=== 5. QUALITÉ ET NON-RÉGRESSION ===
- TypeScript strict sans erreur, lint propre.
- Lance les tests unitaires et d'intégration (back Jest + e2e supertest, front jest-expo) et corrige jusqu'au 100 % vert.
- Vérifie qu'aucune optimisation n'a cassé les fonctionnalités : rejoue les user flows d'ARCHITECTURE.md (Scan -> Herbarium -> Geo-Tag -> XP ; Jardin -> diagnostic -> rappel ; Communauté -> publication, likes, stories, messages) et les tâches de TODO.md.

=== 6. REBUILD EAS ===
- Vérifie/complète eas.json : profils development, preview et production distincts, avec en production : AAB pour Android, Hermes, minification et shrinking activés, sourcemaps non embarqués, variables d'environnement via EAS secrets.
- Aligne app.json/app.config (version, versionCode/buildNumber, icônes et splash optimisés, plugins strictement nécessaires).
- Relance le build : eas build --platform android --profile production (et iOS si configuré). Donne-moi la taille finale de l'artefact et la comparaison avec les 100+ Mo initiaux.
- À la fin du build, affiche-moi EXPLICITEMENT le lien de téléchargement de l'artefact (URL du build sur expo.dev et lien direct de l'APK/AAB) ; si besoin, récupère-le avec eas build:list. Génère aussi un profil "preview" produisant un APK installable directement sur téléphone (plus pratique à tester qu'un AAB) et donne-moi son lien également.

=== 7. RAPPORT ===
- Mets à jour rapport.md à la racine : ce qui a été supprimé du dépôt et du build, les dépendances retirées, les optimisations d'assets et de bundle, les gains mesurés (poids avant/après, temps de démarrage), les failles de sécurité corrigées, les tests et leurs résultats, et les points restants avant publication sur les stores.

Tu peux modifier apps/api. CONTRAINTE ABSOLUE : n'effectue AUCUN git commit ni git push, ne configure aucun user.name/user.email git, ne crée aucun co-author - je ne veux AUCUNE trace de Claude comme contributeur dans le dépôt GitHub. Fais uniquement des modifications de fichiers.
```
