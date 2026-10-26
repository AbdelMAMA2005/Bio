-- Tests de la migration 20261027090000_durcissement_droits.sql : chaque faille corrigée
-- est rejouée (elle doit échouer) et chaque écriture faite par le mobile doit passer.
-- Tout est annulé à la fin (ROLLBACK). Lancer avec psql -v ON_ERROR_STOP=1.
BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('99999999-0000-4000-8000-000000000001', 'alice@test.dev', '{"nom_utilisateur":"alice_test"}'),
  ('99999999-0000-4000-8000-000000000002', 'bob@test.dev', '{"nom_utilisateur":"bob_test"}');

-- Bob possède une plante qu'Alice ne doit pas pouvoir exposer.
INSERT INTO public.collection (id, user_id, plant_id, type_collection) VALUES
  ('99999999-1111-4000-8000-000000000002', '99999999-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'owned');

-- ---------------------------------------------------------------- Anonyme
SELECT set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claim.role', 'anon', true);
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM 1 FROM public.plants LIMIT 1;
    RAISE EXCEPTION 'ÉCHEC : un visiteur anonyme lit encore les tables';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.get_user_stats('99999999-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'ÉCHEC : un visiteur anonyme appelle encore les fonctions';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- Alice : usage normal
SELECT set_config('request.jwt.claim.sub', '99999999-0000-4000-8000-000000000001', true),
       set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

-- Écritures du mobile (mêmes colonnes que l'app).
INSERT INTO public.collection (id, user_id, plant_id, type_collection, latitude, longitude, prochain_arrosage)
  VALUES ('99999999-1111-4000-8000-000000000001', auth.uid(), '22222222-2222-2222-2222-222222222222', 'owned', 48.8, 2.3, now() + interval '7 days');
UPDATE public.collection SET historique_photos = '[{"path":"x","date":"2026-10-27"}]', prochain_arrosage = now()
  WHERE id = '99999999-1111-4000-8000-000000000001';
INSERT INTO public.posts (id, user_id, plant_collection_id, contenu, url_image, latitude, longitude)
  VALUES ('99999999-2222-4000-8000-000000000001', auth.uid(), '99999999-1111-4000-8000-000000000001', 'Mon caoutchouc', 'a.jpg', 48.8, 2.3);
INSERT INTO public.comments (user_id, post_id, contenu) VALUES (auth.uid(), '99999999-2222-4000-8000-000000000001', 'Joli');
INSERT INTO public.likes (user_id, post_id) VALUES (auth.uid(), '99999999-2222-4000-8000-000000000001');
INSERT INTO public.stories (id, user_id, url_media, media_type) VALUES ('99999999-3333-4000-8000-000000000001', auth.uid(), 's.jpg', 'image');
INSERT INTO public.story_likes (user_id, story_id) VALUES (auth.uid(), '99999999-3333-4000-8000-000000000001');
INSERT INTO public.conversations (id, user1_id, user2_id)
  VALUES ('99999999-4444-4000-8000-000000000001', '99999999-0000-4000-8000-000000000001', '99999999-0000-4000-8000-000000000002');
INSERT INTO public.messages (id, conversation_id, sender_id, contenu, story_id)
  VALUES ('99999999-5555-4000-8000-000000000001', '99999999-4444-4000-8000-000000000001', auth.uid(), 'Salut Bob', NULL);
UPDATE public.conversations SET dernier_message = 'Salut Bob', date_dernier_message = now()
  WHERE id = '99999999-4444-4000-8000-000000000001';
UPDATE public.profiles SET nom_utilisateur = 'alice_2', url_avatar = 'a/b.jpg' WHERE id = auth.uid();
DELETE FROM public.likes WHERE user_id = auth.uid();

-- Attaques.
DO $$ BEGIN
  BEGIN DELETE FROM public.quest_progress WHERE user_id = auth.uid();
    RAISE EXCEPTION 'ÉCHEC : quest_progress encore supprimable (XP infinie)';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.identification_logs (user_id, plant_id) VALUES (auth.uid(), '11111111-1111-1111-1111-111111111111');
    RAISE EXCEPTION 'ÉCHEC : faux scans encore insérables';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.stories (user_id, url_media, date_expiration) VALUES (auth.uid(), 'x.jpg', now() + interval '10 years');
    RAISE EXCEPTION 'ÉCHEC : story éternelle possible';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.posts (user_id, contenu, url_image, created_at) VALUES (auth.uid(), 'x', 'x.jpg', now() + interval '1 year');
    RAISE EXCEPTION 'ÉCHEC : post daté dans le futur possible';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.collection SET etat_sante = 'red' WHERE user_id = auth.uid();
    RAISE EXCEPTION 'ÉCHEC : état de santé encore modifiable par le client';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN DELETE FROM public.conversations WHERE id = '99999999-4444-4000-8000-000000000001';
    RAISE EXCEPTION 'ÉCHEC : conversation encore supprimable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.messages SET contenu = 'falsifié' WHERE id = '99999999-5555-4000-8000-000000000001';
    RAISE EXCEPTION 'ÉCHEC : contenu d''un message encore modifiable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  -- L'expéditeur ne marque pas son propre message comme lu.
  UPDATE public.messages SET lu = TRUE WHERE id = '99999999-5555-4000-8000-000000000001';
  IF FOUND THEN RAISE EXCEPTION 'ÉCHEC : l''expéditeur marque son propre message comme lu'; END IF;
  BEGIN INSERT INTO public.posts (user_id, plant_collection_id, contenu, url_image)
      VALUES (auth.uid(), '99999999-1111-4000-8000-000000000002', 'La plante de Bob', 'b.jpg');
    RAISE EXCEPTION 'ÉCHEC : on peut taguer la plante d''un autre membre';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- Bob : lecture, vue, suppression
SELECT set_config('request.jwt.claim.sub', '99999999-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;

INSERT INTO public.story_views (viewer_id, story_id) VALUES (auth.uid(), '99999999-3333-4000-8000-000000000001')
  ON CONFLICT (viewer_id, story_id) DO NOTHING;

DO $$ BEGIN
  UPDATE public.messages SET lu = TRUE WHERE id = '99999999-5555-4000-8000-000000000001';
  IF NOT FOUND THEN RAISE EXCEPTION 'ÉCHEC : le destinataire doit pouvoir marquer le message comme lu'; END IF;
  IF (SELECT count(*) FROM public.stories) <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC : un membre connecté doit voir les stories actives';
  END IF;
  PERFORM public.delete_my_account();
END $$;
RESET ROLE;

DO $$ BEGIN
  IF (SELECT banned_until FROM auth.users WHERE id = '99999999-0000-4000-8000-000000000002') IS NULL THEN
    RAISE EXCEPTION 'ÉCHEC : un compte supprimé doit être bloqué à la connexion';
  END IF;
END $$;

SELECT 'OK : durcissement_droits' AS resultat;
ROLLBACK;
