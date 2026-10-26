-- Tests de la migration 20261026150000_badges_defis_signalements.sql.
-- Tout est annulé à la fin (ROLLBACK). Lancer avec psql -v ON_ERROR_STOP=1 :
-- la première assertion qui échoue arrête le script avec « ÉCHEC : ... ».
BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('eeeeeeee-0000-4000-8000-000000000001', 'auteur@test.dev', '{"nom_utilisateur":"auteur_test"}'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'lecteur@test.dev', '{"nom_utilisateur":"lecteur_test"}');

-- Un défi créé depuis la console, sur un identifiant inconnu du code.
INSERT INTO public.quests (id, libelle, objectif, recompense_xp, critere)
  VALUES ('herbier-2', 'Ajouter 2 plantes à l''Herbarium', 2, 40, 'herbier');

SELECT set_config('request.jwt.claim.sub', 'eeeeeeee-0000-4000-8000-000000000001', true),
       set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

-- XP : la même espèce ajoutée, supprimée puis rajoutée ne rapporte qu'une fois.
INSERT INTO public.collection (id, user_id, plant_id, type_collection) VALUES
  ('ffffffff-0000-4000-8000-000000000001', auth.uid(), '11111111-1111-1111-1111-111111111111', 'discovered');
DELETE FROM public.collection WHERE id = 'ffffffff-0000-4000-8000-000000000001';
INSERT INTO public.collection (user_id, plant_id, type_collection) VALUES
  (auth.uid(), '11111111-1111-1111-1111-111111111111', 'discovered'),
  (auth.uid(), '22222222-2222-2222-2222-222222222222', 'discovered'),
  (auth.uid(), '33333333-3333-3333-3333-333333333333', 'owned');
INSERT INTO public.identification_logs (user_id, plant_id, score_confiance) VALUES
  (auth.uid(), '11111111-1111-1111-1111-111111111111', 90);
INSERT INTO public.posts (id, user_id, contenu, url_image) VALUES
  ('ffffffff-0000-4000-8000-000000000002', auth.uid(), 'Belle fougère', 'x.jpg');

DO $$
DECLARE
  v_quests jsonb;
  v_badges jsonb;
BEGIN
  -- 3 espèces Commun (25 XP chacune) ; le rajout du Monstera ne compte pas.
  IF (SELECT experience FROM public.profiles WHERE id = auth.uid()) <> 75 THEN
    RAISE EXCEPTION 'ÉCHEC : une espèce ne doit rapporter de l''XP qu''une fois (XP = %)',
      (SELECT experience FROM public.profiles WHERE id = auth.uid());
  END IF;

  v_quests := public.get_daily_quests();
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_quests) q
                 WHERE q->>'id' = 'herbier-2' AND (q->>'complete')::boolean) THEN
    RAISE EXCEPTION 'ÉCHEC : un défi créé dans la console doit progresser selon son critère';
  END IF;
  -- 75 + 40 (herbier-2) + 30 (scan-3 non atteint : 0) + 20 (add-garden) + 25 (publish-tip)
  IF (SELECT experience FROM public.profiles WHERE id = auth.uid()) <> 160 THEN
    RAISE EXCEPTION 'ÉCHEC : récompenses des défis (XP = %)',
      (SELECT experience FROM public.profiles WHERE id = auth.uid());
  END IF;

  v_badges := public.get_my_badges();
  IF (SELECT array_agg(b->>'id' ORDER BY b->>'id') FROM jsonb_array_elements(v_badges) b)
     <> ARRAY['botaniste-debutant', 'premiere-capture'] THEN
    RAISE EXCEPTION 'ÉCHEC : badges obtenus inattendus : %', v_badges;
  END IF;
  IF (SELECT insignes FROM public.profiles WHERE id = auth.uid()) <> '["botaniste-debutant", "premiere-capture"]'::jsonb
     AND (SELECT insignes FROM public.profiles WHERE id = auth.uid()) <> '["premiere-capture", "botaniste-debutant"]'::jsonb THEN
    RAISE EXCEPTION 'ÉCHEC : les badges doivent être recopiés dans profiles.insignes';
  END IF;

  BEGIN
    PERFORM public.report_content('post', 'ffffffff-0000-4000-8000-000000000002', 'Spam');
    RAISE EXCEPTION 'ÉCHEC : on ne doit pas signaler son propre contenu';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- Un autre membre signale le post (deux fois : un seul signalement enregistré).
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'eeeeeeee-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;

SELECT public.report_content('post', 'ffffffff-0000-4000-8000-000000000002', 'Spam');
SELECT public.report_content('post', 'ffffffff-0000-4000-8000-000000000002', 'Inapproprié');

DO $$ BEGIN
  BEGIN
    INSERT INTO public.reports (reporter_id, target_type, target_id, auteur_cible, motif, extrait)
      VALUES (auth.uid(), 'post', gen_random_uuid(), 'faux', 'faux', 'faux');
    RAISE EXCEPTION 'ÉCHEC : l''insertion directe d''un signalement doit être refusée';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.reports) <> 1
     OR (SELECT auteur_cible FROM public.reports) <> 'auteur_test'
     OR (SELECT extrait FROM public.reports) <> 'Belle fougère' THEN
    RAISE EXCEPTION 'ÉCHEC : le signalement doit être unique et rempli côté serveur';
  END IF;
END $$;

SELECT 'OK : badges_defis_signalements' AS resultat;
ROLLBACK;
