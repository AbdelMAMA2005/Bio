-- ============================================================================
-- Édition de ses publications (reprise de la fonctionnalité de master sur Supabase)
--
-- Un membre peut modifier la légende de ses propres posts, et rien d'autre : l'image,
-- la plante taguée, la position et la date restent figées (droits par colonne).
-- `modifie_le` est posé par trigger, pour afficher « modifié » sans que le client
-- puisse le falsifier. Additive et rejouable.
-- ============================================================================

BEGIN;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS modifie_le TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.mark_post_edited()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.contenu IS DISTINCT FROM OLD.contenu THEN
    NEW.modifie_le := now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_post_edited() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_posts_mark_edited ON public.posts;
CREATE TRIGGER trigger_posts_mark_edited
  BEFORE UPDATE OF contenu ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.mark_post_edited();

GRANT UPDATE (contenu) ON public.posts TO authenticated;

DROP POLICY IF EXISTS "Modification de ses propres publications" ON public.posts;
CREATE POLICY "Modification de ses propres publications" ON public.posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND char_length(btrim(contenu)) BETWEEN 1 AND 2000);

NOTIFY pgrst, 'reload schema';
COMMIT;
