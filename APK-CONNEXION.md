# Vérification de la connexion Android

Depuis la racine de ce dossier, utiliser `npm run mobile:build:apk`.
Cette commande utilise `apps/mobile/eas.json` et le projet Android natif,
dont l'identifiant est `com.planai`. EAS utilise le dossier `android` lorsqu'il
est présent ; la configuration Expo est alignée avec cette même valeur.

Pour Google, vérifier dans Google Cloud le client OAuth Android correspondant
au package de l'APK réellement installé et à l'empreinte SHA-1 de sa signature.
Le client OAuth Web dans `apps/mobile/eas.json` doit aussi être autorisé par
le fournisseur Google de Supabase. Ces réglages distants ne sont pas validés
par une compilation TypeScript.

Supabase exige actuellement la confirmation par email : après inscription,
ouvrir le mail de confirmation avant de se connecter.

Les écrans de connexion et d'inscription affichent désormais le message et
le code renvoyés en cas d'échec, y compris les erreurs de lecture du profil.
Un nouveau build doit être installé pour bénéficier des corrections.
