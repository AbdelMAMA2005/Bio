-- ============================================================================
-- Profils : e-mail et position de référence privés
--
-- Avant : tout utilisateur connecté pouvait lire l'e-mail et la position de
-- référence de tous les autres (policy SELECT ouverte sur toutes les colonnes).
-- Après : ces colonnes ne sont lisibles que par les fonctions SECURITY DEFINER
-- (console admin) et par service_role.
--
-- ⚠ Rangée hors de supabase/migrations pour que `supabase db push` ne l'applique pas
-- trop tôt. La déplacer dans supabase/migrations UNIQUEMENT quand la version mobile qui
-- ne fait plus `select('*')` sur profiles est publiée : l'ancienne version échouerait
-- au chargement du profil (« permission denied for column email »).
-- ============================================================================

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  id, nom_utilisateur, experience, pieces, est_admin, role, est_suspendu,
  derniere_connexion, niveau, url_avatar, insignes, date_suppression,
  created_at, updated_at
) ON public.profiles TO authenticated;
