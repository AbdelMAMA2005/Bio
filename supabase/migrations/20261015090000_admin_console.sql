-- ============================================================================
-- Console d'administration sur Supabase (remplace le module admin de apps/api)
--
-- 1. Sécurité : un utilisateur ne peut plus modifier son rôle, son statut admin,
--    sa suspension, son XP ou ses pièces (avant : la policy UPDATE de profiles
--    autorisait toutes les colonnes de sa propre ligne).
-- 2. Rôles : fonctions is_staff() / is_admin() utilisées par les policies et les RPC.
-- 3. RPC admin_* (SECURITY DEFINER) : vérifient le rôle de l'appelant puis
--    journalisent l'action dans admin_audit_logs.
-- 4. Écritures directes (plants, quests, feature_flags) autorisées par policy et
--    journalisées par trigger.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profils : droits par colonne
-- ---------------------------------------------------------------------------
-- Le mobile ne modifie que nom_utilisateur et url_avatar ; l'XP et les pièces sont
-- attribués par des fonctions SECURITY DEFINER (get_daily_quests) ou par les Edge
-- Functions (service_role), qui ne sont pas concernées par ces droits.
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT INSERT (id, email, nom_utilisateur, url_avatar) ON public.profiles TO authenticated;
GRANT UPDATE (nom_utilisateur, url_avatar) ON public.profiles TO authenticated;

-- Les profils ne sont lus qu'une fois connecté : rien à exposer aux visiteurs anonymes.
REVOKE SELECT ON public.profiles FROM anon;

-- ---------------------------------------------------------------------------
-- 2. Rôles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_current_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN p.est_admin OR p.role = 'admin' THEN 'admin'::public.user_role ELSE p.role END
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.date_suppression IS NULL AND NOT p.est_suspendu
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.admin_current_role() IN ('admin', 'moderateur'), FALSE)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.admin_current_role() = 'admin', FALSE)
$$;

CREATE OR REPLACE FUNCTION public.admin_require(p_admin_only boolean DEFAULT FALSE)
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (CASE WHEN p_admin_only THEN public.is_admin() ELSE public.is_staff() END) THEN
    RAISE EXCEPTION 'Accès réservé à l''administration.' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Journal d'audit
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_log(p_action text, p_cible text, p_details jsonb DEFAULT NULL)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.admin_audit_logs (admin_id, admin_pseudo, action, cible, details)
  SELECT p.id, p.nom_utilisateur, p_action, p_cible, p_details
  FROM public.profiles p WHERE p.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.admin_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb;
  o jsonb;
  v_action text;
  v_cible text;
BEGIN
  -- Écritures faites par les Edge Functions (service_role) ou le SQL Editor : pas d'auteur.
  IF auth.uid() IS NULL OR NOT public.is_staff() THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); ELSE r := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' THEN o := to_jsonb(OLD); END IF;

  IF TG_TABLE_NAME = 'plants' THEN
    v_action := CASE TG_OP WHEN 'INSERT' THEN 'Espèce ajoutée' WHEN 'UPDATE' THEN 'Espèce modifiée' ELSE 'Espèce supprimée' END;
    v_cible := r->>'nom_commun';
  ELSIF TG_TABLE_NAME = 'quests' THEN
    IF TG_OP = 'UPDATE' AND (o - 'actif') = (r - 'actif') THEN
      v_action := CASE WHEN (r->>'actif')::boolean THEN 'Défi activé' ELSE 'Défi désactivé' END;
    ELSE
      v_action := CASE TG_OP WHEN 'INSERT' THEN 'Défi créé' WHEN 'UPDATE' THEN 'Défi modifié' ELSE 'Défi supprimé' END;
    END IF;
    v_cible := r->>'libelle';
  ELSIF TG_TABLE_NAME = 'feature_flags' THEN
    v_action := CASE WHEN (r->>'active')::boolean THEN 'Fonctionnalité activée' ELSE 'Fonctionnalité désactivée' END;
    v_cible := COALESCE(r->>'libelle', r->>'cle');
  ELSE
    v_action := TG_TABLE_NAME || ' ' || lower(TG_OP);
  END IF;

  PERFORM public.admin_log(v_action, v_cible, NULL);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_plants_admin_audit ON public.plants;
CREATE TRIGGER trigger_plants_admin_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.plants
  FOR EACH ROW EXECUTE FUNCTION public.admin_audit_trigger();

DROP TRIGGER IF EXISTS trigger_quests_admin_audit ON public.quests;
CREATE TRIGGER trigger_quests_admin_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.quests
  FOR EACH ROW EXECUTE FUNCTION public.admin_audit_trigger();

DROP TRIGGER IF EXISTS trigger_feature_flags_admin_audit ON public.feature_flags;
CREATE TRIGGER trigger_feature_flags_admin_audit
  AFTER UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.admin_audit_trigger();

-- ---------------------------------------------------------------------------
-- 4. Policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Gestion catalogue par admin" ON public.plants;
CREATE POLICY "Gestion catalogue par admin" ON public.plants
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Creation des defis par admin" ON public.quests;
CREATE POLICY "Creation des defis par admin" ON public.quests
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Modification des defis par l'equipe" ON public.quests;
CREATE POLICY "Modification des defis par l'equipe" ON public.quests
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Modification des fonctionnalites par admin" ON public.feature_flags;
CREATE POLICY "Modification des fonctionnalites par admin" ON public.feature_flags
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Consultation signalements par moderateur/admin" ON public.reports;
CREATE POLICY "Consultation signalements par moderateur/admin" ON public.reports
  FOR SELECT TO authenticated USING (public.is_staff());

-- Le journal est en lecture seule, même pour un admin : il n'est écrit que par admin_log().
DROP POLICY IF EXISTS "Audit logs reserves aux admins" ON public.admin_audit_logs;
CREATE POLICY "Audit logs reserves aux admins" ON public.admin_audit_logs
  FOR SELECT TO authenticated USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Fonctionnalités : libellé affiché dans la console
-- ---------------------------------------------------------------------------
ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS libelle TEXT;
UPDATE public.feature_flags SET libelle = CASE cle
    WHEN 'stories' THEN 'Stories 24 h'
    WHEN 'feed_geo' THEN 'Fil géolocalisé'
    WHEN 'health_diagnosis' THEN 'Diagnostic santé'
    WHEN 'reminders_push' THEN 'Rappels d''arrosage'
    ELSE cle END
  WHERE libelle IS NULL;

-- ---------------------------------------------------------------------------
-- 6. RPC de la console
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_me()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.admin_require(FALSE);
  RETURN (
    SELECT jsonb_build_object('id', p.id, 'nomUtilisateur', p.nom_utilisateur, 'email', p.email,
                              'role', public.admin_current_role())
    FROM public.profiles p WHERE p.id = auth.uid()
  );
END;
$$;

-- Échappe % et _ pour une recherche LIKE « contient ».
CREATE OR REPLACE FUNCTION public.admin_like_pattern(p_q text)
RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN NULLIF(btrim(p_q), '') IS NULL THEN NULL
    ELSE '%' || replace(replace(replace(lower(btrim(p_q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' END
$$;

CREATE OR REPLACE FUNCTION public.admin_users(p_page int DEFAULT 1, p_limit int DEFAULT 20,
                                              p_q text DEFAULT NULL, p_filtre text DEFAULT 'tous')
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset int := (GREATEST(COALESCE(p_page, 1), 1) - 1) * LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_pattern text := public.admin_like_pattern(p_q);
  v_seuil timestamptz := now() - interval '30 days';
  v_total int;
  v_items jsonb;
BEGIN
  PERFORM public.admin_require(FALSE);

  WITH base AS (
    SELECT p.*, GREATEST(p.derniere_connexion, u.last_sign_in_at) AS vu_le
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.date_suppression IS NULL
      AND (v_pattern IS NULL OR lower(p.nom_utilisateur) LIKE v_pattern OR lower(p.email) LIKE v_pattern)
  ), filtered AS (
    SELECT * FROM base b
    WHERE CASE COALESCE(p_filtre, 'tous')
      WHEN 'admins' THEN b.est_admin OR b.role IN ('admin', 'moderateur')
      WHEN 'suspendus' THEN b.est_suspendu
      WHEN 'inactifs' THEN NOT b.est_suspendu AND (b.vu_le IS NULL OR b.vu_le < v_seuil)
      ELSE TRUE END
  ), page AS (
    SELECT * FROM filtered ORDER BY lower(nom_utilisateur) LIMIT v_limit OFFSET v_offset
  )
  SELECT
    (SELECT count(*) FROM filtered),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', f.id,
        'nomUtilisateur', f.nom_utilisateur,
        'email', f.email,
        'urlAvatar', f.url_avatar,
        'role', CASE WHEN f.est_admin THEN 'admin'::public.user_role ELSE f.role END,
        'niveau', f.niveau,
        'experience', f.experience,
        'capturesCount', (SELECT count(*) FROM public.collection c WHERE c.user_id = f.id),
        'statut', CASE WHEN f.est_suspendu THEN 'suspendu'
                       WHEN f.vu_le IS NULL OR f.vu_le < v_seuil THEN 'inactif'
                       ELSE 'actif' END
      ) ORDER BY lower(f.nom_utilisateur))
      FROM page f), '[]'::jsonb)
  INTO v_total, v_items;

  RETURN jsonb_build_object('items', v_items, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role public.user_role)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nom text;
BEGIN
  PERFORM public.admin_require(TRUE);
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Impossible de modifier son propre rôle.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET role = p_role, est_admin = (p_role = 'admin')
    WHERE id = p_user_id AND date_suppression IS NULL
    RETURNING nom_utilisateur INTO v_nom;
  IF v_nom IS NULL THEN
    RAISE EXCEPTION 'Utilisateur introuvable.' USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.admin_log('Rôle modifié', v_nom, jsonb_build_object('role', p_role));
END;
$$;

-- La suspension bloque aussi la connexion (auth.users.banned_until) : sans ça, le
-- mobile, qui parle directement à Supabase, ignorerait est_suspendu.
CREATE OR REPLACE FUNCTION public.admin_set_user_suspended(p_user_id uuid, p_suspendu boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cible public.profiles%ROWTYPE;
BEGIN
  PERFORM public.admin_require(FALSE);
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Impossible de suspendre son propre compte.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_cible FROM public.profiles WHERE id = p_user_id AND date_suppression IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur introuvable.' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.is_admin() AND (v_cible.est_admin OR v_cible.role IN ('admin', 'moderateur')) THEN
    RAISE EXCEPTION 'Seul un administrateur peut suspendre un membre de l''équipe.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles SET est_suspendu = p_suspendu WHERE id = p_user_id;
  UPDATE auth.users SET banned_until = CASE WHEN p_suspendu THEN timestamptz '2999-01-01' ELSE NULL END
    WHERE id = p_user_id;
  PERFORM public.admin_log(CASE WHEN p_suspendu THEN 'Compte suspendu' ELSE 'Compte réactivé' END,
                           v_cible.nom_utilisateur, NULL);
END;
$$;

-- Suppression RGPD : même anonymisation que delete_my_account(), plus un blocage de connexion.
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cible public.profiles%ROWTYPE;
  v_suffix text := substring(p_user_id::text FROM 1 FOR 8);
BEGIN
  PERFORM public.admin_require(TRUE);
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Impossible de supprimer son propre compte depuis la console.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_cible FROM public.profiles WHERE id = p_user_id AND date_suppression IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur introuvable.' USING ERRCODE = 'P0002';
  END IF;
  IF v_cible.est_admin OR v_cible.role = 'admin' THEN
    RAISE EXCEPTION 'Impossible de supprimer un autre administrateur depuis la console.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
    SET email = 'deleted-' || v_suffix || '@planai.invalid',
        nom_utilisateur = 'Utilisateur supprimé ' || v_suffix,
        url_avatar = NULL,
        est_suspendu = TRUE,
        date_suppression = now()
    WHERE id = p_user_id;
  UPDATE auth.users SET banned_until = timestamptz '2999-01-01' WHERE id = p_user_id;
  PERFORM public.admin_log('Compte supprimé (RGPD)', v_cible.nom_utilisateur, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_plants(p_page int DEFAULT 1, p_limit int DEFAULT 20, p_q text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset int := (GREATEST(COALESCE(p_page, 1), 1) - 1) * LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_pattern text := public.admin_like_pattern(p_q);
  v_total int;
  v_items jsonb;
BEGIN
  PERFORM public.admin_require(FALSE);

  WITH filtered AS (
    SELECT * FROM public.plants p
    WHERE v_pattern IS NULL
       OR lower(p.nom_commun) LIKE v_pattern
       OR lower(p.nom_scientifique) LIKE v_pattern
       OR lower(COALESCE(p.famille, '')) LIKE v_pattern
  ), page AS (
    SELECT * FROM filtered ORDER BY lower(nom_commun) LIMIT v_limit OFFSET v_offset
  )
  SELECT
    (SELECT count(*) FROM filtered),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'nomScientifique', p.nom_scientifique,
        'nomCommun', p.nom_commun,
        'famille', p.famille,
        'toxicite', p.toxicite,
        'badgeRarete', p.badge_rarete,
        'urlImage', p.url_image,
        'aPropos', p.a_propos,
        'conseilsEntretien', p.conseils_entretien,
        'capturesCount', (SELECT count(*) FROM public.collection c WHERE c.plant_id = p.id)
      ) ORDER BY lower(p.nom_commun))
      FROM page p), '[]'::jsonb)
  INTO v_total, v_items;

  RETURN jsonb_build_object('items', v_items, 'total', v_total);
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

CREATE OR REPLACE FUNCTION public.admin_moderation(p_page int DEFAULT 1, p_limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset int := (GREATEST(COALESCE(p_page, 1), 1) - 1) * LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_total int;
  v_items jsonb;
BEGIN
  PERFORM public.admin_require(FALSE);

  -- Un groupe = un contenu signalé (type + id) ; on affiche le signalement le plus récent.
  WITH groups AS (
    SELECT DISTINCT ON (r.target_type, r.target_id) r.*,
           count(*) OVER (PARTITION BY r.target_type, r.target_id) AS n
    FROM public.reports r
    WHERE r.statut = 'ouvert'
    ORDER BY r.target_type, r.target_id, r.created_at DESC
  ), page AS (
    SELECT * FROM groups ORDER BY created_at DESC LIMIT v_limit OFFSET v_offset
  )
  SELECT
    (SELECT count(*) FROM groups),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', g.id,
        'targetType', g.target_type,
        'targetId', g.target_id,
        'auteurCible', g.auteur_cible,
        'motif', g.motif,
        'extrait', g.extrait,
        'signalementsCount', g.n,
        'statut', g.statut,
        'dateCreation', g.created_at
      ) ORDER BY g.created_at DESC)
      FROM page g), '[]'::jsonb)
  INTO v_total, v_items;

  RETURN jsonb_build_object('items', v_items, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_moderation_resolve(p_report_id uuid, p_supprimer boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_report public.reports%ROWTYPE;
BEGIN
  PERFORM public.admin_require(FALSE);
  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signalement introuvable.' USING ERRCODE = 'P0002';
  END IF;

  IF p_supprimer THEN
    CASE v_report.target_type
      WHEN 'post' THEN DELETE FROM public.posts WHERE id = v_report.target_id;
      WHEN 'story' THEN DELETE FROM public.stories WHERE id = v_report.target_id;
      WHEN 'comment' THEN DELETE FROM public.comments WHERE id = v_report.target_id;
    END CASE;
  END IF;

  UPDATE public.reports
    SET statut = CASE WHEN p_supprimer THEN 'supprime'::public.report_statut ELSE 'ignore'::public.report_statut END
    WHERE target_type = v_report.target_type AND target_id = v_report.target_id AND statut = 'ouvert';

  PERFORM public.admin_log(
    CASE WHEN p_supprimer THEN 'Contenu supprimé' ELSE 'Signalement ignoré' END,
    v_report.auteur_cible,
    jsonb_build_object('type', v_report.target_type, 'id', v_report.target_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tz constant text := 'Europe/Paris';
  v_today timestamptz := date_trunc('day', now() AT TIME ZONE v_tz) AT TIME ZONE v_tz;
  v_month timestamptz := date_trunc('month', now() AT TIME ZONE v_tz) AT TIME ZONE v_tz;
  v_actifs int;
  v_actifs_7j int;
  v_ident_7j int;
  v_ident_prec int;
  v_especes int;
  v_especes_mois int;
  v_ouverts int;
  v_reports_auj int;
  v_reports_hier int;
  v_chart jsonb;
  v_raretes jsonb;
  v_a_valider int;
  v_douteuses int;
BEGIN
  PERFORM public.admin_require(FALSE);

  SELECT count(*),
         count(*) FILTER (WHERE GREATEST(p.derniere_connexion, u.last_sign_in_at) >= v_today - interval '7 days')
    INTO v_actifs, v_actifs_7j
    FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.date_suppression IS NULL AND NOT p.est_suspendu;

  SELECT count(*) FILTER (WHERE created_at >= v_today - interval '7 days'),
         count(*) FILTER (WHERE created_at >= v_today - interval '14 days' AND created_at < v_today - interval '7 days'),
         count(*) FILTER (WHERE created_at >= v_today - interval '7 days' AND score_confiance < 50)
    INTO v_ident_7j, v_ident_prec, v_douteuses
    FROM public.identification_logs;

  SELECT count(*), count(*) FILTER (WHERE created_at >= v_month),
         count(*) FILTER (WHERE a_propos IS NULL OR conseils_entretien IS NULL)
    INTO v_especes, v_especes_mois, v_a_valider
    FROM public.plants;

  SELECT count(*) FILTER (WHERE statut = 'ouvert'),
         count(*) FILTER (WHERE created_at >= v_today),
         count(*) FILTER (WHERE created_at >= v_today - interval '1 day' AND created_at < v_today)
    INTO v_ouverts, v_reports_auj, v_reports_hier
    FROM public.reports;

  SELECT jsonb_agg(jsonb_build_object(
           'jour', to_char(d AT TIME ZONE v_tz, 'YYYY-MM-DD'),
           'valeur', (SELECT count(*) FROM public.identification_logs l
                      WHERE l.created_at >= d AND l.created_at < d + interval '1 day'))
         ORDER BY d)
    INTO v_chart
    FROM generate_series(v_today - interval '6 days', v_today, interval '1 day') AS d;

  WITH counts AS (
    SELECT COALESCE(p.badge_rarete, 'Commun') AS rarete, count(*) AS n
    FROM public.collection c JOIN public.plants p ON p.id = c.plant_id
    GROUP BY 1
  ), total AS (
    SELECT sum(n) AS t FROM counts
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'rarete', c.rarete, 'count', c.n,
           'pct', round(100.0 * c.n / NULLIF(total.t, 0))::int) ORDER BY c.n DESC), '[]'::jsonb)
    INTO v_raretes FROM counts c CROSS JOIN total;

  RETURN jsonb_build_object(
    'kpi', jsonb_build_object(
      'utilisateursActifs', v_actifs,
      'utilisateursActifsTrendPct', CASE WHEN v_actifs = 0 THEN 0 ELSE round(100.0 * v_actifs_7j / v_actifs, 1) END,
      'identifications7j', v_ident_7j,
      'identificationsTrendPct', CASE WHEN v_ident_prec = 0 THEN CASE WHEN v_ident_7j > 0 THEN 100 ELSE 0 END
                                      ELSE round(100.0 * (v_ident_7j - v_ident_prec) / v_ident_prec, 1) END,
      'especesReferencees', v_especes,
      'especesTrendCount', v_especes_mois,
      'signalements', v_ouverts,
      'signalementsTrendCount', v_reports_auj - v_reports_hier),
    'chart7j', COALESCE(v_chart, '[]'::jsonb),
    'raretes', v_raretes,
    'aTraiter', jsonb_build_object(
      'publicationsSignalees', v_ouverts,
      'especesAValider', v_a_valider,
      'identificationsDouteuses', v_douteuses),
    'services', '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Droits d'exécution
-- ---------------------------------------------------------------------------
-- Fonctions internes : jamais appelables depuis l'API.
REVOKE ALL ON FUNCTION public.admin_log(text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_audit_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_require(boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_current_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_like_pattern(text) FROM PUBLIC, anon, authenticated;

-- Utilisées dans les policies : nécessaires pour les utilisateurs connectés.
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- RPC de la console : chacune vérifie le rôle elle-même.
DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.admin_me()',
    'public.admin_users(int, int, text, text)',
    'public.admin_set_user_role(uuid, public.user_role)',
    'public.admin_set_user_suspended(uuid, boolean)',
    'public.admin_delete_user(uuid)',
    'public.admin_plants(int, int, text)',
    'public.admin_quests()',
    'public.admin_moderation(int, int)',
    'public.admin_moderation_resolve(uuid, boolean)',
    'public.admin_stats()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;
