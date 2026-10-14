-- Tests de la console admin (migration 20261015090000 ; la vérification des e-mails privés
-- ne s'active que si supabase/migrations_a_venir/20261015090100 a été appliquée).
-- Tout est annulé à la fin (ROLLBACK). Lancer avec psql -v ON_ERROR_STOP=1 :
-- la première assertion qui échoue arrête le script avec « ÉCHEC : ... ».
BEGIN;

-- Fixtures : un admin, un modérateur, deux membres.
INSERT INTO auth.users (id, email, raw_user_meta_data, last_sign_in_at) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'admin@test.dev', '{"nom_utilisateur":"admin_test"}', now()),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'modo@test.dev', '{"nom_utilisateur":"modo_test"}', now()),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'membre@test.dev', '{"nom_utilisateur":"membre_test"}', now()),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'autre@test.dev', '{"nom_utilisateur":"autre_test"}', NULL);
UPDATE public.profiles SET role = 'admin', est_admin = TRUE WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
UPDATE public.profiles SET role = 'moderateur' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000002';

INSERT INTO public.collection (user_id, plant_id) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111');
INSERT INTO public.posts (id, user_id, contenu, url_image) VALUES
  ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'post signalé', 'x.jpg');
INSERT INTO public.reports (reporter_id, target_type, target_id, auteur_cible, motif, extrait, created_at) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000004', 'post', 'bbbbbbbb-0000-4000-8000-000000000001', 'membre_test', 'Spam', 'post signalé', now() - interval '1 hour'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'post', 'bbbbbbbb-0000-4000-8000-000000000001', 'membre_test', 'Hors sujet', 'post signalé', now());
INSERT INTO public.identification_logs (user_id, plant_id, score_confiance) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 92),
  ('aaaaaaaa-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 30);

-- ---------------------------------------------------------------- Membre
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000003', true);

DO $$ BEGIN
  BEGIN
    UPDATE public.profiles SET est_admin = TRUE, role = 'admin' WHERE id = auth.uid();
    RAISE EXCEPTION 'ÉCHEC : un membre a pu se donner le rôle admin';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET pieces = 99999 WHERE id = auth.uid();
    RAISE EXCEPTION 'ÉCHEC : un membre a pu modifier ses pièces';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.profiles SET nom_utilisateur = 'membre_renomme' WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'ÉCHEC : un membre ne peut plus changer son pseudo'; END IF;
  BEGIN
    PERFORM public.admin_me();
    RAISE EXCEPTION 'ÉCHEC : admin_me() accessible à un membre';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.admin_users();
    RAISE EXCEPTION 'ÉCHEC : admin_users() accessible à un membre';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.plants (nom_scientifique, nom_commun) VALUES ('Test', 'Test');
    RAISE EXCEPTION 'ÉCHEC : un membre a pu ajouter une espèce';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.quests SET actif = FALSE;
  IF FOUND THEN RAISE EXCEPTION 'ÉCHEC : un membre a pu modifier un défi'; END IF;
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'email', 'SELECT') THEN
    BEGIN
      PERFORM email FROM public.profiles LIMIT 1;
      RAISE EXCEPTION 'ÉCHEC : un membre peut lire les e-mails des profils';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END IF;
  PERFORM nom_utilisateur, url_avatar, niveau FROM public.profiles LIMIT 1;
  IF EXISTS (SELECT 1 FROM public.admin_audit_logs) THEN
    RAISE EXCEPTION 'ÉCHEC : un membre voit le journal d''audit';
  END IF;
END $$;

-- ---------------------------------------------------------------- Modérateur
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', true);
DO $$ DECLARE v jsonb; BEGIN
  v := public.admin_me();
  IF v->>'role' <> 'moderateur' THEN RAISE EXCEPTION 'ÉCHEC : admin_me() modérateur = %', v; END IF;
  BEGIN
    PERFORM public.admin_set_user_role('aaaaaaaa-0000-4000-8000-000000000003', 'admin');
    RAISE EXCEPTION 'ÉCHEC : un modérateur a pu changer un rôle';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.admin_set_user_suspended('aaaaaaaa-0000-4000-8000-000000000001', TRUE);
    RAISE EXCEPTION 'ÉCHEC : un modérateur a pu suspendre un admin';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM public.admin_set_user_suspended('aaaaaaaa-0000-4000-8000-000000000004', TRUE);
  BEGIN
    PERFORM public.admin_delete_user('aaaaaaaa-0000-4000-8000-000000000004');
    RAISE EXCEPTION 'ÉCHEC : un modérateur a pu supprimer un compte';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF EXISTS (SELECT 1 FROM public.admin_audit_logs) THEN
    RAISE EXCEPTION 'ÉCHEC : un modérateur voit le journal d''audit';
  END IF;
END $$;

-- ---------------------------------------------------------------- Admin
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
DO $$ DECLARE v jsonb; BEGIN
  v := public.admin_me();
  IF v->>'role' <> 'admin' OR v->>'email' <> 'admin@test.dev' THEN RAISE EXCEPTION 'ÉCHEC : admin_me() = %', v; END IF;

  v := public.admin_users(1, 20, NULL, 'tous');
  IF (v->>'total')::int <> 4 THEN RAISE EXCEPTION 'ÉCHEC : admin_users total = %', v->>'total'; END IF;
  v := public.admin_users(1, 20, NULL, 'admins');
  IF (v->>'total')::int <> 2 THEN RAISE EXCEPTION 'ÉCHEC : filtre admins = %', v->>'total'; END IF;
  v := public.admin_users(1, 20, NULL, 'suspendus');
  IF (v->>'total')::int <> 1 OR v->'items'->0->>'statut' <> 'suspendu' THEN RAISE EXCEPTION 'ÉCHEC : filtre suspendus = %', v; END IF;
  v := public.admin_users(1, 20, 'MEMBRE@test', 'tous');
  IF (v->>'total')::int <> 1 OR (v->'items'->0->>'capturesCount')::int <> 1 THEN RAISE EXCEPTION 'ÉCHEC : recherche e-mail = %', v; END IF;
  v := public.admin_users(1, 20, '%', 'tous');
  IF (v->>'total')::int <> 0 THEN RAISE EXCEPTION 'ÉCHEC : « %% » doit être cherché littéralement'; END IF;

  PERFORM public.admin_set_user_role('aaaaaaaa-0000-4000-8000-000000000003', 'moderateur');
  IF (SELECT role FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000003') <> 'moderateur' THEN
    RAISE EXCEPTION 'ÉCHEC : le rôle n''a pas été changé';
  END IF;
  BEGIN
    PERFORM public.admin_set_user_role(auth.uid(), 'membre');
    RAISE EXCEPTION 'ÉCHEC : un admin a pu changer son propre rôle';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  PERFORM public.admin_set_user_suspended('aaaaaaaa-0000-4000-8000-000000000004', FALSE);
  PERFORM public.admin_delete_user('aaaaaaaa-0000-4000-8000-000000000004');

  INSERT INTO public.plants (nom_scientifique, nom_commun, famille) VALUES ('Ficus lyrata', 'Figuier lyre', 'Moraceae');
  UPDATE public.quests SET actif = FALSE WHERE id = 'scan-3';
  UPDATE public.feature_flags SET active = FALSE WHERE cle = 'stories';

  v := public.admin_plants(1, 20, 'figuier');
  IF (v->>'total')::int <> 1 THEN RAISE EXCEPTION 'ÉCHEC : admin_plants recherche = %', v; END IF;
  v := public.admin_quests();
  IF jsonb_array_length(v) <> 5 THEN RAISE EXCEPTION 'ÉCHEC : admin_quests = %', v; END IF;

  v := public.admin_moderation(1, 20);
  IF (v->>'total')::int <> 1 OR (v->'items'->0->>'signalementsCount')::int <> 2
     OR v->'items'->0->>'motif' <> 'Hors sujet' THEN
    RAISE EXCEPTION 'ÉCHEC : admin_moderation = %', v;
  END IF;
  PERFORM public.admin_moderation_resolve((v->'items'->0->>'id')::uuid, TRUE);
  IF EXISTS (SELECT 1 FROM public.posts WHERE id = 'bbbbbbbb-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'ÉCHEC : le contenu signalé n''a pas été supprimé';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reports WHERE statut = 'ouvert') THEN
    RAISE EXCEPTION 'ÉCHEC : des signalements sont restés ouverts';
  END IF;

  v := public.admin_stats();
  IF (v->'kpi'->>'identifications7j')::int <> 2 OR (v->'aTraiter'->>'identificationsDouteuses')::int <> 1
     OR jsonb_array_length(v->'chart7j') <> 7 OR (v->'kpi'->>'utilisateursActifs')::int <> 3 THEN
    RAISE EXCEPTION 'ÉCHEC : admin_stats = %', v;
  END IF;

  DELETE FROM public.admin_audit_logs;
  IF FOUND THEN RAISE EXCEPTION 'ÉCHEC : le journal d''audit a pu être effacé'; END IF;
END $$;

RESET ROLE;
DO $$ DECLARE v_actions text[]; BEGIN
  SELECT array_agg(action ORDER BY created_at, action) INTO v_actions FROM public.admin_audit_logs;
  IF NOT v_actions @> ARRAY['Compte suspendu', 'Compte réactivé', 'Rôle modifié', 'Compte supprimé (RGPD)',
                            'Espèce ajoutée', 'Défi désactivé', 'Fonctionnalité désactivée', 'Contenu supprimé'] THEN
    RAISE EXCEPTION 'ÉCHEC : journal d''audit incomplet : %', v_actions;
  END IF;
  IF (SELECT banned_until FROM auth.users WHERE id = 'aaaaaaaa-0000-4000-8000-000000000004') IS NULL THEN
    RAISE EXCEPTION 'ÉCHEC : le compte supprimé peut encore se connecter';
  END IF;
  IF (SELECT nom_utilisateur FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000004') NOT LIKE 'Utilisateur supprimé%' THEN
    RAISE EXCEPTION 'ÉCHEC : le compte supprimé n''est pas anonymisé';
  END IF;
  IF has_table_privilege('anon', 'public.profiles', 'SELECT') THEN
    RAISE EXCEPTION 'ÉCHEC : les visiteurs anonymes peuvent lire les profils';
  END IF;
  IF has_function_privilege('authenticated', 'public.admin_log(text,text,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'ÉCHEC : admin_log() est appelable depuis l''API';
  END IF;
  RAISE NOTICE 'Tous les tests de la console admin passent.';
END $$;

ROLLBACK;
