# PlanAI — Suivi des tâches (TODO)

> Cochez `[x]` chaque tâche terminée. Une tâche = idéalement une branche + une PR.
> Priorités MVP : Phase 1 → 2 → 3. Les phases 4+ viennent après validation du MVP.

---

## Phase 0 — Mise en place du projet

### Cadrage commun (Semaine 1 — doc de répartition)

- [x] Choix définitif du stack : Firebase (MVP rapide) vs NestJS (scalabilité) — **Ensemble**
- [ ] Choix des API IA (Plant.id / Google Vision) : comparatif coût / précision / quotas — **Ensemble**
- [x] Wireframes des 3 onglets (Figma) — **Djawad**
- [ ] Modélisation de la base de données (schéma PostgreSQL) — **Abdel**
- [ ] Contrat d'API partagé (format des endpoints défini avant de coder) — **Ensemble**

### Dépôt & outillage

- [x] Créer le dépôt GitHub `planai` (monorepo) — **Ensemble**
- [x] Initialiser les workspaces (`apps/*`, `packages/*`) — **Djawad**
- [x] Bootstrap `apps/mobile` (create-expo-app) — **Djawad**
- [x] Migrer la logique applicative vers Supabase — **Abdel / Djawad**
- [x] Créer `packages/shared` (types communs) — **Abdel**
- [x] `.gitignore` + `.env.example` (config Supabase) — **Djawad**
- [ ] Protéger les branches `main` et `dev` (PR obligatoire) — **Ensemble**
- [ ] CI GitHub Actions : lint + tests sur chaque PR — **Abdel**
- [x] README : instructions d'installation et de lancement — **Djawad**

> NOTE : le backend legacy `apps/api` est conservé uniquement comme archive de référence. Les tâches backend historiques sont désormais considérées comme migrées vers Supabase.

### Base de données

- [ ] Installer PostgreSQL (local ou Supabase/Neon) — **Abdel**
- [ ] Schéma Prisma/TypeORM : `users`, `plants`, `collection`, `posts` — **Abdel**
- [ ] Champ clé `collection.type` : `'owned'` (Jardin) / `'discovered'` (Herbarium) — **Abdel**
- [ ] Champs Geo-Tag : `latitude`, `longitude` (nullables) — **Abdel**
- [ ] Champs clones : `etat_sante` (enum), `historique_photos` (json) — **Abdel**
- [ ] Première migration + seed du référentiel plantes (~20 espèces de test) — **Abdel**

---

## Phase 1 — MVP : Scan & Identification 🎯

### Back-end

- [ ] Module `auth` : inscription, connexion, JWT — **Abdel**
- [ ] Module `users` : profil, niveau, XP — **Ensemble** (modèle : Abdel / écran : Djawad)
- [ ] Module `plants` : CRUD référentiel (nom, famille, toxicité, rareté, conseils JSON) — **Abdel**
- [ ] Module `identification` : endpoint POST photo → proxy Plant.id / Google Vision — **Abdel**
- [ ] Retour d'identification : espèce + famille + toxicité + rareté + XP — **Abdel**
- [ ] Module `collection` : ajout d'une plante (type owned/discovered) — **Abdel**
- [ ] Enregistrement optionnel des coordonnées GPS (Geo-Tag) — **Abdel**
- [ ] Attribution d'XP à la capture selon la rareté — **Abdel**

### Front mobile

- [x] Tab bar 3 onglets : Mon Jardin / **Scan** (central) / Communauté — **Djawad**
- [x] Écran Scan : caméra plein écran + cadre de visée (style Snap) — **Djawad**
- [x] Appel API identification + affichage résultat (nom, famille, rareté) — **Djawad**
- [x] Badge toxicité : rouge « Toxique » / vert « Non toxique » / orange « Incertaine » — **Djawad**
- [x] Ajout contextuel : boutons « Mon Jardin » et « Mon Herbarium » — **Djawad**
- [x] Pop-up Geo-Tag : « Partager la localisation ? » (accepter / refuser) — **Djawad**
- [x] Animation « +45 XP » qui flotte et disparaît — **Djawad**
- [x] Écrans auth : inscription / connexion — **Djawad**

---

## Phase 2 — Mon Jardin (split Quotidien / Herbarium)

### Back-end

- [ ] Endpoint liste Jardin (type=owned) et Herbarium (type=discovered) — **Abdel**
- [ ] Module `diagnosis` : photo feuille → diagnostic maladie (CNN PlantVillage ou API) — **Abdel**
- [ ] Mise à jour `etat_sante` après diagnostic — **Abdel**
- [ ] Ajout de photos de suivi (`historique_photos`) — **Abdel**
- [ ] Module `notifications` : rappels programmés (arrosage, traitement J+5) — **Ensemble** (back : Abdel / push client : Djawad)

### Front mobile

- [x] Sous-onglets segmentés : « Mon Quotidien » / « Mon Herbarium » — **Djawad**
- [x] **Quotidien** : cartes clones avec indicateur santé (vert/orange/rouge) — **Djawad**
- [x] Fiche d'entretien dynamique : arrosage, lumière, température, rempotage — **Djawad**
- [x] Bouton « Photo de suivi » (upload + timeline d'évolution) — **Djawad**
- [x] Bouton « Vérifier la santé » → diagnostic IA + traitement recommandé — **Djawad**
- [x] Bouton « Programmer un rappel » (notification push) — **Djawad**
- [x] Bandeau rappels du jour (« 2 arrosages prévus aujourd'hui ») — **Djawad**
- [x] **Herbarium** : grille compacte type collection de cartes — **Djawad**
- [x] Badge rareté (Commun / Rare / Épique) sur chaque carte — **Djawad**
- [x] Geo-tag affiché : lieu de capture ou distance (« à 3 km ») — **Djawad**
- [x] Date de capture (« il y a 3 jours ») — **Djawad**
- [x] Fiche plante consultable (sans actions d'entretien) — **Djawad**

---

## Phase 3 — Communauté

### Back-end

- [ ] Module `feed` : CRUD publications (texte + image + plante taguée optionnelle) — **Abdel**
- [ ] Likes, commentaires, partages — **Abdel**
- [ ] Stories éphémères (24 h) — **Abdel**
- [ ] Endpoint « Près de moi » : posts geo-tagués dans un rayon 5/10 km — **Ensemble** (requête géo : Abdel / filtre UI : Djawad)

### Front mobile

- [x] Fil d'actualité : cartes publication (auteur, photo, tag plante, interactions) — **Djawad**
- [x] Création de publication : photo + texte + tag d'une plante de sa collection — **Djawad**
- [x] Stories : bulles en haut du feed + création — **Djawad**
- [x] Filtre segmenté « Tout le fil » / « Près de moi · 5 km » — **Djawad**
- [x] Encart « Découverte à X km de toi » sous les posts geo-tagués — **Djawad**

---

## Phase 4 — Gamification

### Back-end

- [ ] Module `quests` : défis quotidiens (scanner 3 plantes, publier un conseil, 5 likes…) — **Abdel**
- [x] Défis « Exploration » avec Geo-Tag (plante rare à + de 1 km…) — **Abdel** (implémenté 10/09/2026, voir API_CONTRACT.md §6)
- [ ] Récompenses : XP, pièces virtuelles, badges exclusifs — **Abdel**
- [ ] Calcul de niveau (paliers d'XP) — **Abdel**

### Front mobile

- [x] Carte « Défis du jour » avec progression et récompenses — **Djawad**
- [x] Solde de pièces virtuelles — **Djawad**
- [x] Écran badges (« Botaniste débutant », « Chasseur d'épiques »…) — **Djawad**
- [x] Feedback haptique (vibration) pour les découvertes rares — **Djawad**

---

## Phase 5 — Finitions & Qualité

- [x] Thème sombre / clair complet (bascule + respect du système) — **Djawad**
- [x] Transitions fluides entre onglets — **Djawad**
- [x] États vides (jardin vide, herbarium vide, feed vide) — **Djawad**
- [x] États de chargement + gestion des erreurs réseau — **Djawad**
- [ ] Tests unitaires back (services identification, collection, quests) — **Abdel** (revue croisée : Djawad)
- [x] Tests front (composants critiques : ScanResult, PlantCard) — **Djawad** (revue croisée : Abdel)
- [x] Icône d'app + splash screen — **Djawad**
- [x] Onboarding première ouverture (3 écrans max) — **Djawad**
- [ ] RGPD : consentement localisation + suppression de compte — **Abdel**
- [ ] Build EAS + publication TestFlight / Play Console (beta) — **Abdel**

---

## Répartition (à remplir)

| Tâche / Domaine                        | Qui ?  |
| -------------------------------------- | ------ |
| Front — Scan & Jardin                  | Djawad |
| Front — Communauté & Gamification      | Djawad |
| Back — Auth, Users, Collection         | Abdel  |
| Back — Identification & Diagnosis (IA) | Abdel  |
| Back — Feed & Quests                   | Abdel  |
| DB & CI/CD                             | Abdel  |

---

## Méthode de travail (doc de répartition)

- **Point hebdomadaire** : avancement + déblocage des dépendances front/back.
- **Contrat d'API partagé** : format des endpoints défini ensemble avant de coder.
- **Environnement de test commun** : back de dev partagé (ou mocké) pour que Djawad avance sans attendre chaque endpoint.
- **Revue de code croisée** : chacun relit les PR de l'autre avant fusion.
- **Priorité au MVP** : Scan + Mon Jardin d'abord ; Communauté/Gamification reportables.

## Planning suggéré

| Période      | Objectif                               |
| ------------ | -------------------------------------- |
| Semaine 1    | Cadrage, wireframes, modèle de données |
| Semaines 2-3 | Scan + identification IA               |
| Semaines 4-5 | Mon Jardin (Quotidien + Herbarium)     |
| Semaine 6    | Authentification & profils             |
| Semaines 7-8 | Communauté (feed, « Près de moi »)     |
| Semaine 9    | Gamification                           |
| Semaine 10   | Tests, corrections, déploiement (beta) |
