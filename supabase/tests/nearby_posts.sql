-- Tests roll back all fixtures. Lancer avec psql -v ON_ERROR_STOP=1.
BEGIN;
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('77777777-0000-4000-8000-000000000001', 'nearby@test.dev', '{"nom_utilisateur":"nearby_test"}');
INSERT INTO public.posts (id, user_id, contenu, url_image, latitude, longitude)
SELECT ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  '77777777-0000-4000-8000-000000000001'::uuid, 'nearby migration test', 'test.jpg',
  CASE WHEN n = 18 THEN 48.8566 ELSE 0 END,
  CASE WHEN n = 18 THEN 2.3522 ELSE 0 END
FROM generate_series(1, 18) n;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.nearby_posts(48.8566, 2.3522)
      WHERE contenu = 'nearby migration test') <> 1 THEN
    RAISE EXCEPTION 'Nearby filtering failed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.nearby_posts(91, 2)) THEN
    RAISE EXCEPTION 'Invalid coordinates were accepted';
  END IF;
  IF has_function_privilege('anon', 'public.nearby_posts(double precision,double precision)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous access must be disabled';
  END IF;
END $$;
RESET ROLE;
SELECT 'OK : nearby_posts' AS resultat;
ROLLBACK;
