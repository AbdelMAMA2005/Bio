-- ============================================================================
-- Corrections de bugs constatés dans l'application (audit du 2026-10-26)
--
-- 1. Stories : un spectateur ne pouvait pas relire ses propres vues, donc toutes les
--    stories restaient « non vues » (anneau jamais grisé).
-- 2. Fil : la plante taguée sur le post d'un autre membre n'apparaissait jamais, car
--    la collection est privée et l'embed renvoyait null.
-- 3. Inscription : deux comptes Google avec le même nom (« Jean Dupont ») faisaient
--    échouer la seconde inscription (nom_utilisateur est UNIQUE).
-- 4. XP : l'ajout d'une plante affichait « +25 XP » sans rien créditer, et le niveau
--    stocké n'était jamais recalculé.
-- 5. Storage : aucune policy DELETE, donc les images des posts et stories supprimés
--    restaient publiques.
-- 6. Rattrapage des données existantes (niveau, première échéance d'arrosage).
--
-- Additive et rejouable : aucune donnée supprimée.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Stories : chacun relit les vues qu'il a lui-même enregistrées
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Spectateur consulte ses propres vues" ON public.story_views;
CREATE POLICY "Spectateur consulte ses propres vues" ON public.story_views
  FOR SELECT TO authenticated USING (auth.uid() = viewer_id);

-- ---------------------------------------------------------------------------
-- 2. Fil : une plante taguée dans une publication est lisible par les membres
-- ---------------------------------------------------------------------------
-- La position est déjà recopiée sur le post ; les photos de suivi restent protégées par
-- la policy du bucket privé « collections » (dossier du propriétaire uniquement).
DROP POLICY IF EXISTS "Plante taguee dans une publication" ON public.collection;
CREATE POLICY "Plante taguee dans une publication" ON public.collection
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.plant_collection_id = collection.id)
  );

-- ---------------------------------------------------------------------------
-- 3. Inscription : pseudo unique garanti
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base TEXT;
  v_username TEXT;
  v_try INTEGER := 0;
BEGIN
  v_base := left(btrim(COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'nom_utilisateur'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'pseudo'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
    'User_' || substring(NEW.id::text FROM 1 FOR 6)
  )), 20);
  v_username := v_base;
  -- Suffixe numérique tant que le pseudo est pris (« Jean Dupont 2 », « Jean Dupont 3 »…).
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE nom_utilisateur = v_username) LOOP
    v_try := v_try + 1;
    v_username := v_base || ' ' || (v_try + 1);
    IF v_try > 50 THEN
      v_username := v_base || ' ' || substring(NEW.id::text FROM 1 FOR 6);
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (id, email, nom_utilisateur, url_avatar)
  VALUES (NEW.id, NEW.email, v_username, NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. XP et niveau
-- ---------------------------------------------------------------------------
-- experience = XP cumulée. Passer du niveau n au niveau n+1 coûte n × 250 XP
-- (même règle que apps/mobile/src/features/account/levels.ts).
CREATE OR REPLACE FUNCTION public.level_for_experience(p_experience INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v_level INTEGER := 1;
  v_left INTEGER := GREATEST(COALESCE(p_experience, 0), 0);
BEGIN
  WHILE v_left >= v_level * 250 LOOP
    v_left := v_left - v_level * 250;
    v_level := v_level + 1;
  END LOOP;
  RETURN v_level;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_level()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.niveau := public.level_for_experience(NEW.experience);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_profiles_sync_level ON public.profiles;
CREATE TRIGGER trigger_profiles_sync_level
  BEFORE INSERT OR UPDATE OF experience ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_level();

-- Crédit de l'XP annoncée par l'écran de scan (mêmes montants que identify-plant).
CREATE OR REPLACE FUNCTION public.credit_collection_xp()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
    SET experience = experience + public.calculate_xp_for_rarity(
      (SELECT p.badge_rarete FROM public.plants p WHERE p.id = NEW.plant_id))
    WHERE id = NEW.user_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_collection_credit_xp ON public.collection;
CREATE TRIGGER trigger_collection_credit_xp
  AFTER INSERT ON public.collection
  FOR EACH ROW EXECUTE FUNCTION public.credit_collection_xp();

REVOKE ALL ON FUNCTION public.credit_collection_xp() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_level() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Storage : chacun supprime ses propres fichiers
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Suppression de ses fichiers" ON storage.objects;
CREATE POLICY "Suppression de ses fichiers" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id IN ('avatars', 'collections', 'posts', 'stories')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- 6. Rattrapage
-- ---------------------------------------------------------------------------
UPDATE public.profiles SET niveau = public.level_for_experience(experience)
  WHERE niveau IS DISTINCT FROM public.level_for_experience(experience);

UPDATE public.collection c
  SET prochain_arrosage = c.date_ajout + make_interval(days => COALESCE(p.frequence_arrosage_jours, 7))
  FROM public.plants p
  WHERE p.id = c.plant_id AND c.type_collection = 'owned' AND c.prochain_arrosage IS NULL;

COMMIT;
