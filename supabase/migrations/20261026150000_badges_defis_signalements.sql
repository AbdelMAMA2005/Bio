-- ============================================================================
-- Badges, défis personnalisés, XP non farmable, signalements
--
-- 1. Défis : colonne `critere` (ce que le défi compte). Avant, seuls les 5 identifiants
--    codés en dur progressaient : un défi créé depuis la console restait bloqué à 0.
-- 2. XP : une espèce ne rapporte de l'XP qu'une fois par type de collection. Avant, on
--    pouvait supprimer puis rajouter la même plante en boucle.
-- 3. Badges : get_my_badges() calcule les badges à partir des vraies données, avec leur
--    vraie date d'obtention. Avant, rien n'écrivait jamais profiles.insignes.
-- 4. Signalements : report_content() remplit l'auteur et l'extrait côté serveur (le client
--    ne peut pas les falsifier) et ignore un second signalement du même contenu.
--
-- Additive et rejouable : aucune donnée supprimée.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Défis : critère de progression
-- ---------------------------------------------------------------------------
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS critere TEXT;
UPDATE public.quests SET critere = CASE id
    WHEN 'scan-3' THEN 'scans'
    WHEN 'add-garden' THEN 'jardin'
    WHEN 'publish-tip' THEN 'publications'
    WHEN 'get-5-likes' THEN 'likes'
    WHEN 'explore-rare' THEN 'exploration'
    ELSE 'scans' END
  WHERE critere IS NULL;
ALTER TABLE public.quests ALTER COLUMN critere SET DEFAULT 'scans';
ALTER TABLE public.quests ALTER COLUMN critere SET NOT NULL;
ALTER TABLE public.quests DROP CONSTRAINT IF EXISTS chk_quests_critere;
ALTER TABLE public.quests ADD CONSTRAINT chk_quests_critere
  CHECK (critere IN ('scans', 'jardin', 'herbier', 'publications', 'likes', 'exploration'));

CREATE OR REPLACE FUNCTION public.get_daily_quests()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  v_today DATE := CURRENT_DATE;
  v_start_day TIMESTAMPTZ := date_trunc('day', NOW() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
  v_end_day TIMESTAMPTZ := v_start_day + INTERVAL '1 day';
  v_user_lat DOUBLE PRECISION;
  v_user_lon DOUBLE PRECISION;
  v_counts JSONB;
  v_result JSONB := '[]'::jsonb;
  v_quest RECORD;
  v_prog INTEGER;
  v_done BOOLEAN;
  v_credited BOOLEAN;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;

  SELECT latitude_reference, longitude_reference INTO v_user_lat, v_user_lon FROM profiles WHERE id = uid;

  v_counts := jsonb_build_object(
    -- Espèces distinctes scannées aujourd'hui
    'scans', (SELECT count(DISTINCT plant_id) FROM identification_logs
              WHERE user_id = uid AND plant_id IS NOT NULL AND created_at >= v_start_day AND created_at < v_end_day),
    'jardin', (SELECT count(*) FROM collection
               WHERE user_id = uid AND type_collection = 'owned' AND date_ajout >= v_start_day AND date_ajout < v_end_day),
    'herbier', (SELECT count(*) FROM collection
                WHERE user_id = uid AND type_collection = 'discovered' AND date_ajout >= v_start_day AND date_ajout < v_end_day),
    'publications', (SELECT count(*) FROM posts
                     WHERE user_id = uid AND created_at >= v_start_day AND created_at < v_end_day),
    -- Likes reçus aujourd'hui sur ses publications
    'likes', (SELECT count(l.id) FROM likes l JOIN posts p ON p.id = l.post_id
              WHERE p.user_id = uid AND l.created_at >= v_start_day AND l.created_at < v_end_day),
    -- Espèce Rare ou Épique découverte à plus de 1 km de sa position de référence
    'exploration', CASE WHEN v_user_lat IS NULL OR v_user_lon IS NULL THEN 0 ELSE (
      SELECT count(*) FROM collection c JOIN plants p ON p.id = c.plant_id
      WHERE c.user_id = uid AND c.type_collection = 'discovered'
        AND c.date_ajout >= v_start_day AND c.date_ajout < v_end_day
        AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
        AND p.badge_rarete IN ('Rare', 'Épique')
        AND haversine_meters(v_user_lat, v_user_lon, c.latitude, c.longitude) >= 1000) END
  );

  FOR v_quest IN SELECT * FROM quests WHERE actif = TRUE ORDER BY id LOOP
    v_prog := LEAST(COALESCE((v_counts->>v_quest.critere)::int, 0), v_quest.objectif);
    v_done := v_prog >= v_quest.objectif;

    SELECT recompense_attribuee INTO v_credited
      FROM quest_progress WHERE user_id = uid AND quest_id = v_quest.id AND date = v_today;
    v_credited := COALESCE(v_credited, FALSE);

    IF v_done AND NOT v_credited THEN
      UPDATE profiles
        SET experience = experience + v_quest.recompense_xp,
            pieces = pieces + v_quest.recompense_pieces
        WHERE id = uid;
      INSERT INTO quest_progress (user_id, quest_id, date, recompense_attribuee)
        VALUES (uid, v_quest.id, v_today, TRUE)
        ON CONFLICT (user_id, quest_id, date) DO UPDATE SET recompense_attribuee = TRUE;
      v_credited := TRUE;
    END IF;

    v_result := v_result || jsonb_build_object(
      'id', v_quest.id,
      'libelle', v_quest.libelle,
      'type', COALESCE(v_quest.type::text, 'quotidien'),
      'progression', v_prog,
      'objectif', v_quest.objectif,
      'complete', v_done,
      'recompense', jsonb_build_object(
        'xp', CASE WHEN v_credited THEN v_quest.recompense_xp ELSE 0 END,
        'pieces', CASE WHEN v_credited THEN v_quest.recompense_pieces ELSE 0 END)
    );
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_quests()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actifs int;
BEGIN
  PERFORM public.admin_require(FALSE);
  SELECT count(*) INTO v_actifs FROM public.profiles WHERE date_suppression IS NULL AND NOT est_suspendu;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', q.id,
      'libelle', q.libelle,
      'type', q.type,
      'critere', q.critere,
      'objectif', q.objectif,
      'recompenseXp', q.recompense_xp,
      'recompensePieces', q.recompense_pieces,
      'actif', q.actif,
      'tauxCompletion', CASE WHEN v_actifs = 0 THEN 0 ELSE round(100.0 * (
        SELECT count(*) FROM public.quest_progress qp
        WHERE qp.quest_id = q.id AND qp.date = CURRENT_DATE AND qp.recompense_attribuee
      ) / v_actifs)::int END
    ) ORDER BY lower(q.libelle))
    FROM public.quests q), '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. XP : une fois par espèce et par type de collection
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collection_xp_credits (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  type_collection public.plant_type NOT NULL,
  xp INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, plant_id, type_collection)
);
ALTER TABLE public.collection_xp_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.collection_xp_credits FROM anon, authenticated;
GRANT SELECT ON public.collection_xp_credits TO authenticated;
DROP POLICY IF EXISTS "Lecture de ses credits XP" ON public.collection_xp_credits;
CREATE POLICY "Lecture de ses credits XP" ON public.collection_xp_credits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Les plantes déjà en collection ont été créditées (ou auraient dû l'être) : pas de second crédit.
INSERT INTO public.collection_xp_credits (user_id, plant_id, type_collection, xp, created_at)
  SELECT c.user_id, c.plant_id, c.type_collection, public.calculate_xp_for_rarity(p.badge_rarete), min(c.date_ajout)
  FROM public.collection c JOIN public.plants p ON p.id = c.plant_id
  GROUP BY c.user_id, c.plant_id, c.type_collection, p.badge_rarete
  ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.credit_collection_xp()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_xp INTEGER;
BEGIN
  v_xp := public.calculate_xp_for_rarity((SELECT p.badge_rarete FROM public.plants p WHERE p.id = NEW.plant_id));
  INSERT INTO public.collection_xp_credits (user_id, plant_id, type_collection, xp)
    VALUES (NEW.user_id, NEW.plant_id, NEW.type_collection, v_xp)
    ON CONFLICT DO NOTHING;
  IF FOUND THEN
    UPDATE public.profiles SET experience = experience + v_xp WHERE id = NEW.user_id;
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Badges
-- ---------------------------------------------------------------------------
-- Renvoie [{ id, obtenuLe }] pour les badges obtenus, et recopie la liste dans
-- profiles.insignes (affichée sur le profil public).
CREATE OR REPLACE FUNCTION public.get_my_badges()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  v_badges JSONB;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;

  WITH obtenus(id, obtenu_le) AS (
    -- Première plante identifiée
    SELECT 'botaniste-debutant', (SELECT min(created_at) FROM identification_logs WHERE user_id = uid AND reussi)
    UNION ALL
    -- Première plante ajoutée au Jardin
    SELECT 'premiere-capture', (SELECT min(date_ajout) FROM collection WHERE user_id = uid AND type_collection = 'owned')
    UNION ALL
    -- 10 espèces différentes dans l'Herbarium : date de la 10e
    SELECT 'explorateur', (SELECT d FROM (
        SELECT min(date_ajout) AS d FROM collection
        WHERE user_id = uid AND type_collection = 'discovered' GROUP BY plant_id
        ORDER BY d OFFSET 9 LIMIT 1) s)
    UNION ALL
    -- 5 plantes épiques : date de la 5e
    SELECT 'chasseur-epiques', (SELECT c.date_ajout FROM collection c JOIN plants p ON p.id = c.plant_id
        WHERE c.user_id = uid AND p.badge_rarete = 'Épique'
        ORDER BY c.date_ajout OFFSET 4 LIMIT 1)
    UNION ALL
    -- 3 plantes du Jardin saines depuis au moins 30 jours (pas d'historique de santé :
    -- on prend l'état actuel et la date d'ajout)
    SELECT 'pouce-vert', (SELECT d + interval '30 days' FROM (
        SELECT date_ajout AS d FROM collection
        WHERE user_id = uid AND type_collection = 'owned' AND etat_sante = 'green'
          AND date_ajout <= now() - interval '30 days'
        ORDER BY date_ajout OFFSET 2 LIMIT 1) s)
    UNION ALL
    -- 10 publications : date de la 10e
    SELECT 'social', (SELECT created_at FROM posts WHERE user_id = uid ORDER BY created_at OFFSET 9 LIMIT 1)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'obtenuLe', obtenu_le) ORDER BY obtenu_le), '[]'::jsonb)
    INTO v_badges FROM obtenus WHERE obtenu_le IS NOT NULL;

  UPDATE profiles SET insignes = (SELECT COALESCE(jsonb_agg(b->'id'), '[]'::jsonb) FROM jsonb_array_elements(v_badges) b)
    WHERE id = uid AND insignes IS DISTINCT FROM
      (SELECT COALESCE(jsonb_agg(b->'id'), '[]'::jsonb) FROM jsonb_array_elements(v_badges) b);

  RETURN v_badges;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_badges() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_badges() TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Signalements
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_reporter_target
  ON public.reports (reporter_id, target_type, target_id);

CREATE OR REPLACE FUNCTION public.report_content(p_target_type public.report_target_type, p_target_id UUID, p_motif TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  v_author UUID;
  v_extrait TEXT;
  v_motif TEXT := left(btrim(COALESCE(p_motif, '')), 200);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;
  IF v_motif = '' THEN
    RAISE EXCEPTION 'Motif requis' USING ERRCODE = '22023';
  END IF;

  IF p_target_type = 'post' THEN
    SELECT user_id, contenu INTO v_author, v_extrait FROM posts WHERE id = p_target_id;
  ELSIF p_target_type = 'comment' THEN
    SELECT user_id, contenu INTO v_author, v_extrait FROM comments WHERE id = p_target_id;
  ELSE
    SELECT user_id, 'Story' INTO v_author, v_extrait FROM stories WHERE id = p_target_id AND date_expiration > now();
  END IF;
  IF v_author IS NULL THEN
    RAISE EXCEPTION 'Contenu introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF v_author = uid THEN
    RAISE EXCEPTION 'Impossible de signaler son propre contenu' USING ERRCODE = '42501';
  END IF;

  INSERT INTO reports (reporter_id, target_type, target_id, auteur_cible, motif, extrait)
    VALUES (uid, p_target_type, p_target_id,
            (SELECT nom_utilisateur FROM profiles WHERE id = v_author),
            v_motif, left(COALESCE(v_extrait, ''), 280))
    ON CONFLICT (reporter_id, target_type, target_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.report_content(public.report_target_type, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_content(public.report_target_type, UUID, TEXT) TO authenticated;

-- L'insertion directe permettait d'inventer l'auteur et l'extrait : tout passe par report_content().
DROP POLICY IF EXISTS "Creation de signalements" ON public.reports;
REVOKE INSERT ON public.reports FROM authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
