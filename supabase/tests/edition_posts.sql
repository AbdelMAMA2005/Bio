-- Tests de la migration 20261027120000_edition_posts.sql.
-- Tout est annulé à la fin (ROLLBACK). Lancer avec psql -v ON_ERROR_STOP=1.
BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('88888888-0000-4000-8000-000000000001', 'autrice@test.dev', '{"nom_utilisateur":"autrice_test"}'),
  ('88888888-0000-4000-8000-000000000002', 'voisin@test.dev', '{"nom_utilisateur":"voisin_test"}');
INSERT INTO public.posts (id, user_id, contenu, url_image) VALUES
  ('88888888-1111-4000-8000-000000000001', '88888888-0000-4000-8000-000000000001', 'Ancienne légende', 'p.jpg');

-- L'autrice modifie sa légende.
SELECT set_config('request.jwt.claim.sub', '88888888-0000-4000-8000-000000000001', true),
       set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$ BEGIN
  UPDATE public.posts SET contenu = 'Nouvelle légende' WHERE id = '88888888-1111-4000-8000-000000000001';
  IF NOT FOUND OR (SELECT modifie_le FROM public.posts WHERE id = '88888888-1111-4000-8000-000000000001') IS NULL THEN
    RAISE EXCEPTION 'ÉCHEC : l''autrice doit pouvoir modifier sa légende, datée par la base';
  END IF;
  BEGIN UPDATE public.posts SET url_image = 'autre.jpg' WHERE id = '88888888-1111-4000-8000-000000000001';
    RAISE EXCEPTION 'ÉCHEC : seule la légende doit être modifiable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.posts SET modifie_le = NULL WHERE id = '88888888-1111-4000-8000-000000000001';
    RAISE EXCEPTION 'ÉCHEC : la date de modification ne doit pas être falsifiable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.posts SET contenu = '   ' WHERE id = '88888888-1111-4000-8000-000000000001';
    RAISE EXCEPTION 'ÉCHEC : une légende vide doit être refusée';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
END $$;
RESET ROLE;

-- Un autre membre ne touche pas au post.
SELECT set_config('request.jwt.claim.sub', '88888888-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  UPDATE public.posts SET contenu = 'Piraté' WHERE id = '88888888-1111-4000-8000-000000000001';
  IF FOUND THEN RAISE EXCEPTION 'ÉCHEC : un membre modifie le post d''un autre'; END IF;
END $$;
RESET ROLE;

SELECT 'OK : edition_posts' AS resultat;
ROLLBACK;
