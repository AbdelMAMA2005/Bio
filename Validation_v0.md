# Rapport de Validation (V0)

Ce document regroupe les fonctionnalités à réaliser et les décisions à confirmer avant implémentation.

## 📋 Fonctionnalités à réaliser

### 1. Modifier et supprimer ses propres posts

- [x] Permettre à un utilisateur de modifier ses propres posts.
- [x] Permettre à un utilisateur de supprimer ses propres posts.
- [x] Interdire la modification ou la suppression des posts appartenant à un autre utilisateur.

### 2. Username lors d'une première connexion Google

- [x] Lors de la première connexion avec Google, ne pas utiliser automatiquement l'adresse email comme username affiché.
- [x] Demander à l'utilisateur de choisir un username.
- [x] Vérifier que le username choisi est disponible.
- [x] Proposer une ou plusieurs suggestions si le username est déjà pris.
- [x] Informer clairement l'utilisateur que le username sera définitif et ne pourra plus être modifié après validation.
- [x] Afficher cette étape uniquement lorsqu'un compte Google n'a pas encore de username défini.

### 3. Revoir le profil et l'écran « My Account »

- [x] Supprimer le bouton « Edit » général de l'écran « My Account ».
- [x] Afficher le `fullName` renseigné par l'utilisateur à la place du username dans l'en-tête du profil.
- [x] Conserver le username comme identifiant technique et unique du compte.
- [x] Afficher l'adresse email en lecture seule dans les informations du compte.
- [x] Afficher le username séparément du `fullName`, même lorsque l'ancien compte utilisait l'email comme username.
- [ ] Ajouter plus tard une édition dédiée de l'adresse email.
- [ ] Prévoir ultérieurement l'envoi d'un email de confirmation lors d'un changement d'adresse email.

> **Hors périmètre pour le moment :** le système de confirmation des nouvelles adresses email sera réalisé dans une prochaine étape.
### 4. Followers, cercles et visibilité des statuts

- [x] Permettre aux utilisateurs de suivre d'autres utilisateurs (API backend existante).
- [ ] Permettre à chaque utilisateur de choisir qui peut voir ses statuts/stories.
- [ ] Enregistrer en base de données le niveau de relation ou le cercle associé à chaque follower.
- [ ] Prévoir au moins trois niveaux de cercle : cercle 1, cercle 2 et cercle 3.
- [ ] Appliquer les règles de visibilité selon le cercle choisi par l'auteur du statut.
- [ ] Permettre de mettre un cœur sur les statuts visibles, quel que soit le cercle de l'utilisateur.
- [ ] Autoriser les commentaires uniquement lorsque le niveau de cercle le permet.
- [ ] Définir précisément les droits de visibilité et de commentaire de chaque cercle avant implémentation.
**Règles métier explicites pour les cercles :**
- Hiérarchie : Cercle 1 (Amis proches), Cercle 2 (Connaissances), Cercle 3 (Public / Tous les followers).
- Visibilité : Un statut publié pour le "Cercle 2" est visible par le Cercle 1 et 2.
- Commentaires : Autorisés uniquement pour le Cercle 1 et le Cercle 2 (Cercle 3 = lecture + like uniquement).
### 5. Messages et notifications dans Community

- [x] Ajouter une icône Messages en haut de l'écran « Community ».
- [x] Ajouter une icône Notifications en haut de l'écran « Community ».
- [x] Permettre aux utilisateurs d'envoyer et de recevoir des messages privés (API backend existante).
- [x] Afficher les notifications liées aux follows, messages, commentaires et réactions (API backend existante).
- [x] Afficher un indicateur lorsqu'il existe des messages ou notifications non lus.
- [ ] Respecter les règles de confidentialité et de visibilité définies pour les followers et les cercles.

> **État au 22/08/2026 :** les boutons Messages et Notifications de Community sont actifs et
> ouvrent leurs écrans respectifs. Les cercles et leur confidentialité restent à implémenter.

### 6. Profil social et photo de profil

- [x] Afficher le username dans le profil, même lorsqu'il est différent de l'adresse email.
- [x] Permettre de choisir ou remplacer la photo de profil depuis « My Account ».
- [x] Afficher le nombre d'abonnements et le nombre de followers sur le profil.
- [x] Récupérer et afficher les compteurs depuis les endpoints followers existants.
- [x] Ajouter la navigation vers la liste complète des followers et des abonnements.
- [ ] Ajouter la gestion visuelle des cercles 1, 2 et 3 sur le profil et les statuts.

## ✅ Déjà corrigé

- [x] **Identifiant Unique (@username)** : Le username est désormais unique, immuable après création, et vérifié en direct sur le formulaire d'inscription.
- [x] **Auth - Mot de passe oublié** : Implémenté avec génération de token sécurisé, sauvegarde en base de données avec date d'expiration, endpoint de réinitialisation et envoi via Resend. Un domaine vérifié est nécessaire pour envoyer à des adresses externes en production.
- [x] **Auth - Google Sign-in** : Intégration backend et bouton frontend réalisés, avec écran de choix obligatoire du username lors de la première connexion si nécessaire.
- [x] **Auth - Google - Nom complet** : Le `fullName` est construit avec le prénom et le nom Google séparés par un espace.
- [x] **Community - Publication** : Une publication avec photo peut être envoyée sans légende obligatoire.
- [x] **Community - Messages et notifications** : Les icônes du header sont désormais
	interactives et ouvrent les listes alimentées par les endpoints existants.
- [x] **Formulaire d'inscription UI** : Refonte en 2 étapes (multi-step) avec gestion clavier (`KeyboardAvoidingView`), suppression du champ de confirmation, règles de mot de passe affinées et icône œil.
- [x] **UI - Écran d'accueil** : Les textes sont coupés (ex: "Grow your san" sans la suite, ou le "s" dans "scan your plants" est coupé). *Corrigé en ajoutant `width: '100%'` et `flexWrap: 'wrap'` aux textes. Le problème du bouton "next" qui affichait "nex" a aussi été corrigé en ajoutant `textAlign: 'center'` et un `paddingHorizontal: 4` au texte du GradientButton.*
- [x] **Auth - Messages d'erreur** : Le message d'erreur d'inscription ("fill all correctly") manque de précision. *Corrigé : le front-end affiche désormais l'erreur exacte renvoyée par le backend (email existant ou username pris). De plus, le backend suggère maintenant un nouveau username s'il est déjà pris.*
- [x] **Backend - Swagger** : Les exemples dans le Swagger ne sont pas bien renseignés. *Corrigé : Les DTOs d'inscription, de login, d'identification et de leurs réponses ont été mis à jour avec les exemples explicites demandés via `@ApiProperty()`, et le plugin CLI Swagger a été activé.*
- [x] **Community - Édition de publication (bug critique)** : L'ancien `Alert.prompt` (iOS uniquement, mauvaise UX, sort du thème) a été remplacé par un vrai `PostEditModal` cross-platform — bottom sheet animée avec TextInput préchargé, intégré au thème de l'app. Le menu contextuel (PostCard) et les textes de confirmation de suppression ont aussi été internationalisés (fr/en/es).
- [x] **Community - Icônes Messages & Notifications** : Ajout des icônes Messages (chat_bubble) et Notifications dans le header de l'écran Community, avec badges rouges affichant le nombre de non-lus. Hooks `useUnreadMessagesCount` et `useUnreadNotificationsCount` avec polling automatique toutes les 30s.
- [x] **Profil social - Navigation followers/following** : Les compteurs abonnements/followers dans AccountScreen sont maintenant cliquables et naviguent vers un nouvel écran `FollowersListScreen` (route `/followers`) avec onglets Followers/Abonnements, liste des utilisateurs, et textes internationalisés (fr/en/es).

