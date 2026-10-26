-- Tests de la migration 20261026120000_corrections_bugs.sql.
-- Tout est annulé à la fin (ROLLBACK). Lancer avec psql -v ON_ERROR_STOP=1 :
-- la première assertion qui échoue arrête le script avec « ÉCHEC : ... ».
BEGIN;

-- Deux comptes Google avec le même nom affiché.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('bbbbbbbb-0000-4000-8000-000000000001', 'jean1@test.dev', '{"name":"Jean Dupont"}'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'jean2@test.dev', '{"name":"Jean Dupont"}');

DO $$ BEGIN
  IF (SELECT nom_utilisateur FROM public.profiles WHERE id = 'bbbbbbbb-0000-4000-8000-000000000002') <> 'Jean Dupont 2' THEN
    RAISE EXCEPTION 'ÉCHEC : le second « Jean Dupont » doit recevoir un pseudo unique';
  END IF;
END $$;

-- Membre 1 : ajouts à la collection, post tagué, story, fichier.
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000000001', true),
       set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

INSERT INTO public.collection (id, user_id, plant_id, type_collection) VALUES
  ('cccccccc-0000-4000-8000-000000000001', auth.uid(), '55555555-5555-5555-5555-555555555555', 'owned');
INSERT INTO public.collection (user_id, plant_id, type_collection)
  SELECT auth.uid(), '11111111-1111-1111-1111-111111111111', 'discovered' FROM generate_series(1, 9);
INSERT INTO public.posts (user_id, plant_collection_id, contenu, url_image) VALUES
  (auth.uid(), 'cccccccc-0000-4000-8000-000000000001', 'Mon aloès', 'bbbbbbbb-0000-4000-8000-000000000001/p.jpg');
INSERT INTO public.stories (id, user_id, url_media) VALUES
  ('dddddddd-0000-4000-8000-000000000001', auth.uid(), 'bbbbbbbb-0000-4000-8000-000000000001/s.jpg');
INSERT INTO storage.objects (bucket_id, name) VALUES ('posts', 'bbbbbbbb-0000-4000-8000-000000000001/p.jpg');

DO $$ BEGIN
  -- Aloès « Rare » = 50 XP, 9 Monstera « Commun » = 225 XP : 275 XP, niveau 2.
  IF (SELECT experience FROM public.profiles WHERE id = auth.uid()) <> 275
     OR (SELECT niveau FROM public.profiles WHERE id = auth.uid()) <> 2 THEN
    RAISE EXCEPTION 'ÉCHEC : l''ajout à la collection doit créditer l''XP et recalculer le niveau';
  END IF;
END $$;

-- Membre 2 : vue de story, plante taguée, fichiers d'autrui, auto-crédit.
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;

INSERT INTO public.story_views (viewer_id, story_id) VALUES (auth.uid(), 'dddddddd-0000-4000-8000-000000000001');

DO $$ BEGIN
  IF (SELECT count(*) FROM public.story_views) <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC : un spectateur doit relire sa propre vue';
  END IF;
  IF (SELECT count(*) FROM public.collection) <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC : seule la plante taguée dans un post doit être lisible';
  END IF;
  DELETE FROM storage.objects WHERE name LIKE 'bbbbbbbb-0000-4000-8000-000000000001/%';
  IF FOUND THEN
    RAISE EXCEPTION 'ÉCHEC : un membre ne doit pas supprimer les fichiers d''un autre';
  END IF;
  BEGIN
    UPDATE public.profiles SET experience = 99999 WHERE id = auth.uid();
    RAISE EXCEPTION 'ÉCHEC : un membre ne doit pas modifier son XP';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- Membre 1 supprime son propre fichier.
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;

DO $$ BEGIN
  DELETE FROM storage.objects WHERE name = 'bbbbbbbb-0000-4000-8000-000000000001/p.jpg';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ÉCHEC : un membre doit pouvoir supprimer ses fichiers';
  END IF;
END $$;

RESET ROLE;
SELECT 'OK : corrections_bugs' AS resultat;
ROLLBACK;
