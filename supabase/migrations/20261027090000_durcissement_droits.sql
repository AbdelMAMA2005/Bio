-- ============================================================================
-- Durcissement des droits (audit de sécurité du 2026-10-27)
--
-- Le schéma de base donnait à tout membre connecté INSERT/UPDATE/DELETE sur toutes les
-- colonnes de ses lignes, et aux visiteurs anonymes SELECT sur toutes les tables.
-- Failles corrigées :
--   1. XP infinie : supprimer sa ligne quest_progress du jour puis rappeler
--      get_daily_quests() recréditait la récompense ; insérer de faux scans dans
--      identification_logs validait le défi « scan-3 » et le badge débutant.
--   2. Messagerie : un participant pouvait réécrire le contenu des messages de l'autre
--      (policy UPDATE sur toutes les colonnes) et supprimer toute la conversation.
--   3. Champs serveur falsifiables à l'insertion : date_expiration d'une story (story
--      éternelle), created_at d'un post (épinglé en tête du fil), lu d'un message.
--   4. Un post pouvait taguer la plante d'un autre membre, ce qui la rendait lisible.
--   5. Visiteurs anonymes : lecture des stories actives et de toutes les tables
--      publiques, exécution des fonctions (dont get_user_stats).
--   6. Un compte supprimé par son propriétaire pouvait encore se reconnecter.
--
-- Colonnes accordées = celles écrites par le mobile (V1.0.0 publiée et version actuelle)
-- et par la console admin, plus `id` (un UUID choisi par le client est sans risque). Additive et rejouable.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Visiteurs anonymes : aucune donnée, aucune fonction
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
-- Les fonctions internes restent fermées aux membres (la ligne précédente les rouvrait).
REVOKE EXECUTE ON FUNCTION public.admin_log(text, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_audit_trigger() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_require(boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_current_role() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_like_pattern(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_collection_xp() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_level() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DROP POLICY IF EXISTS "Stories actives lisibles" ON public.stories;
CREATE POLICY "Stories actives lisibles" ON public.stories
  FOR SELECT TO authenticated USING (date_expiration > now());

-- ---------------------------------------------------------------------------
-- 2. Tables écrites uniquement par la base ou les Edge Functions
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.identification_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.quest_progress FROM authenticated;

-- ---------------------------------------------------------------------------
-- 3. Colonnes modifiables par un membre
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE ON public.collection FROM authenticated;
GRANT INSERT (id, user_id, plant_id, type_collection, latitude, longitude, prochain_arrosage) ON public.collection TO authenticated;
GRANT UPDATE (historique_photos, prochain_arrosage) ON public.collection TO authenticated;

REVOKE INSERT, UPDATE ON public.posts FROM authenticated;
GRANT INSERT (id, user_id, plant_collection_id, contenu, url_image, latitude, longitude) ON public.posts TO authenticated;

REVOKE INSERT, UPDATE ON public.comments FROM authenticated;
GRANT INSERT (id, user_id, post_id, contenu) ON public.comments TO authenticated;

REVOKE INSERT, UPDATE ON public.likes FROM authenticated;
GRANT INSERT (user_id, post_id) ON public.likes TO authenticated;

REVOKE INSERT, UPDATE ON public.stories FROM authenticated;
GRANT INSERT (id, user_id, url_media, media_type) ON public.stories TO authenticated;

REVOKE INSERT, UPDATE ON public.story_views FROM authenticated;
GRANT INSERT (viewer_id, story_id) ON public.story_views TO authenticated;

REVOKE INSERT, UPDATE ON public.story_likes FROM authenticated;
GRANT INSERT (user_id, story_id) ON public.story_likes TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.conversations FROM authenticated;
GRANT INSERT (id, user1_id, user2_id) ON public.conversations TO authenticated;
GRANT UPDATE (dernier_message, date_dernier_message) ON public.conversations TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.messages FROM authenticated;
GRANT INSERT (id, conversation_id, sender_id, contenu, story_id) ON public.messages TO authenticated;
GRANT UPDATE (lu) ON public.messages TO authenticated;

-- Seul le destinataire marque un message comme lu.
DROP POLICY IF EXISTS "Marquage de ses messages comme lus" ON public.messages;
CREATE POLICY "Marquage de ses messages comme lus" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid() AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
  )
  WITH CHECK (sender_id <> auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Publications : on ne tague que ses propres plantes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Gestion de ses propres publications" ON public.posts;
CREATE POLICY "Suppression de ses propres publications" ON public.posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Creation de ses propres publications" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND (
      plant_collection_id IS NULL
      OR EXISTS (SELECT 1 FROM public.collection c WHERE c.id = plant_collection_id AND c.user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 5. Suppression de compte : plus de reconnexion possible
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_suffix TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;
  v_suffix := substring(v_uid::text FROM 1 FOR 8);
  UPDATE public.profiles
    SET email = 'deleted-' || v_suffix || '@planai.invalid',
        nom_utilisateur = 'Utilisateur supprimé ' || v_suffix,
        url_avatar = NULL,
        est_suspendu = TRUE,
        date_suppression = now()
    WHERE id = v_uid;
  UPDATE auth.users SET banned_until = timestamptz '2999-01-01' WHERE id = v_uid;
  DELETE FROM public.device_tokens WHERE user_id = v_uid;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
