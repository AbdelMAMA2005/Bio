-- Additive migration: no reset or deletion; safe to rerun.
BEGIN;
CREATE OR REPLACE FUNCTION public.nearby_posts(p_latitude double precision, p_longitude double precision)
RETURNS SETOF public.posts
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT p.* FROM public.posts p
  WHERE p_latitude BETWEEN -90 AND 90 AND p_longitude BETWEEN -180 AND 180
    AND p.latitude BETWEEN -90 AND 90 AND p.longitude BETWEEN -180 AND 180
    AND 6371000 * 2 * asin(sqrt(least(1.0::double precision,
      power(sin(radians(p.latitude - p_latitude) / 2), 2)
      + cos(radians(p_latitude)) * cos(radians(p.latitude))
      * power(sin(radians(p.longitude - p_longitude) / 2), 2)))) <= 5000;
$$;
REVOKE ALL ON FUNCTION public.nearby_posts(double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nearby_posts(double precision, double precision) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
