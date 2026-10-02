# Suggestions et problèmes PlantAI

Le formulaire est disponible dans Mon compte > Aide et suggestions. Aucun client
de messagerie n'est ouvert et l'adresse du destinataire ne figure pas dans le
code mobile. Le compte connecté est utilisé pour identifier l'auteur.

Activation effectuée le 1er octobre 2026 sur `fzllbtkjpwhadkdragno` : migration
appliquée, secrets configurés et fonction déployée. Un test complet depuis le
compte propriétaire a été accepté par Resend puis confirmé `delivered`.
Le réessai avec la même référence n'a enregistré qu'un message. La clé n'est
stockée que dans les secrets Supabase. L'expéditeur utilise actuellement
`PlantAI <onboarding@resend.dev>` vers l'adresse du propriétaire du compte Resend.

## Activer l'envoi

1. Appliquer **uniquement** `supabase/migrations/20260930180000_app_feedback.sql`
   dans l'éditeur SQL du projet Supabase existant. Cette migration est additive.
   Ne pas utiliser le script de réinitialisation `schema_supabase.sql`.
2. Configurer les secrets Supabase de la fonction :
   - `RESEND_API_KEY` : clé Resend autorisée à envoyer des e-mails.
   - `FEEDBACK_TO_EMAIL` : `abdelmama2005@gmail.com`.
   - `FEEDBACK_FROM_EMAIL` : une adresse autorisée chez Resend, avec éventuellement
     un nom (`PlantAI <support@votre-domaine>`). Pour tester, Resend permet
     `PlantAI <onboarding@resend.dev>` vers l'adresse du propriétaire du compte Resend.
     Pour ce cas, créer le compte Resend avec l'adresse destinataire ci-dessus.
     Une adresse Gmail personnelle n'est pas un expéditeur Resend vérifié.
3. Déployer depuis la racine du dépôt :
   `npx supabase functions deploy send-feedback --project-ref fzllbtkjpwhadkdragno`.
   Le contrôle JWT peut rester activé avec un JWT compatible ; si le projet utilise
   la validation dans la fonction, conserver la même configuration que les autres
   fonctions. La fonction vérifie toujours la session avec `auth.getUser()`.
4. Tester les deux catégories depuis un compte connecté. Vérifier la réception
   dans Gmail et dans le journal Resend avant les versions Google Play et APK.

Objets fixes : **Suggestion - PlantAI** et **Report - PlantAI**.
Le corps contient le message, le pseudo, l'e-mail de réponse, la date et une
référence unique. `reply_to` permet de répondre directement à l'auteur.

Les messages sont limités à 10–3000 caractères, un nouveau message par minute
et cinq par heure par compte. Une référence stable évite les doublons lors des
réessais pendant la fenêtre d'idempotence de Resend. Les échecs d'envoi restent
en base avec `email_status = pending` ; ils ne sont pas envoyés automatiquement.
L'utilisateur peut réessayer sans perdre son texte tant que le formulaire reste
ouvert. Le statut `sent` indique l'acceptation par Resend, pas une livraison Gmail
confirmée. Les réponses de l'API mobile ne divulguent pas le destinataire.

La clé et les adresses doivent rester dans les secrets Supabase, jamais dans
`EXPO_PUBLIC_*` ni dans un fichier livré avec l'application.

Documentation : https://resend.com/docs/api-reference/emails/send-email
