-- Tests roll back all fixtures. Requires at least one existing profile.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
    RAISE EXCEPTION 'An existing profile is required for this test';
  END IF;
END $$;
INSERT INTO public.posts (id, user_id, contenu, url_image, latitude, longitude)
SELECT ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  (SELECT id FROM public.profiles LIMIT 1), 'nearby migration test', 'test.jpg',
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
ROLLBACK;
