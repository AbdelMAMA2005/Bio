-- ============================================================================
-- Réinitialisation complète puis migration NestJS -> Supabase
-- Schéma PostgreSQL complet avec Row Level Security (RLS), Triggers,
-- Fonctions RPC, et configuration Storage.
-- ATTENTION : ce script supprime toutes les données applicatives et les comptes
-- Supabase Auth avant de tout recréer. Les fichiers Storage sont conservés, car
-- Supabase interdit leur suppression directe en SQL (utiliser l'API Storage).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Remise à zéro complète
-- ----------------------------------------------------------------------------

-- Le trigger dépend d'une fonction du schéma public : on le retire avant le reset.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Supprimer tous les comptes existants. Les identités et sessions associées sont
-- supprimées en cascade par Supabase Auth.
DELETE FROM auth.users;

-- Supprimer toutes les tables, fonctions, types, triggers et politiques applicatifs.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public AUTHORIZATION postgres;

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Types ENUM
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE toxicity_level AS ENUM ('green', 'orange', 'red');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE health_status AS ENUM ('green', 'orange', 'red');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plant_type AS ENUM ('owned', 'discovered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE story_media_type AS ENUM ('image', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('membre', 'moderateur', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_target_type AS ENUM ('post', 'story', 'comment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_statut AS ENUM ('ouvert', 'ignore', 'supprime');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quest_type AS ENUM ('quotidien', 'exploration');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 2. Fonction générique pour mise à jour automatique de updated_at
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. Tables
-- ----------------------------------------------------------------------------

-- Table: profiles (étend auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nom_utilisateur TEXT NOT NULL UNIQUE,
  experience INTEGER NOT NULL DEFAULT 0,
  pieces INTEGER NOT NULL DEFAULT 0,
  est_admin BOOLEAN NOT NULL DEFAULT FALSE,
  role user_role NOT NULL DEFAULT 'membre',
  est_suspendu BOOLEAN NOT NULL DEFAULT FALSE,
  derniere_connexion TIMESTAMPTZ,
  niveau INTEGER NOT NULL DEFAULT 1,
  url_avatar TEXT,
  insignes JSONB NOT NULL DEFAULT '[]'::jsonb,
  latitude_reference DOUBLE PRECISION,
  longitude_reference DOUBLE PRECISION,
  date_suppression TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: plants (référentiel des espèces botaniques)
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom_scientifique TEXT NOT NULL,
  nom_commun TEXT NOT NULL,
  famille TEXT,
  toxicite toxicity_level NOT NULL DEFAULT 'green',
  badge_rarete TEXT DEFAULT 'Commun',
  a_propos TEXT,
  conseils_entretien JSONB,
  url_image TEXT,
  frequence_arrosage_jours INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_plants_updated_at ON plants;
CREATE TRIGGER trigger_plants_updated_at
  BEFORE UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: collection (Jardin 'owned' & Herbarium 'discovered')
CREATE TABLE IF NOT EXISTS collection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE RESTRICT,
  type_collection plant_type NOT NULL DEFAULT 'owned',
  date_ajout TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  etat_sante health_status NOT NULL DEFAULT 'green',
  dernier_diagnostic JSONB,
  historique_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  prochain_arrosage TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_user_type ON collection(user_id, type_collection);
CREATE INDEX IF NOT EXISTS idx_collection_plant ON collection(plant_id);

DROP TRIGGER IF EXISTS trigger_collection_updated_at ON collection;
CREATE TRIGGER trigger_collection_updated_at
  BEFORE UPDATE ON collection
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: posts (publications du fil communautaire)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plant_collection_id UUID REFERENCES collection(id) ON DELETE SET NULL,
  contenu TEXT NOT NULL,
  url_image TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

DROP TRIGGER IF EXISTS trigger_posts_updated_at ON posts;
CREATE TRIGGER trigger_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: comments (commentaires sur posts)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  contenu TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

DROP TRIGGER IF EXISTS trigger_comments_updated_at ON comments;
CREATE TRIGGER trigger_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: likes (likes sur posts)
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_likes_user_post UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);

-- Table: stories (médias éphémères 24h)
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url_media TEXT NOT NULL,
  media_type story_media_type NOT NULL DEFAULT 'image',
  date_expiration TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(date_expiration);

-- Table: story_views (vues uniques par story)
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_story_views UNIQUE(viewer_id, story_id)
);

-- Table: story_likes (likes par story)
CREATE TABLE IF NOT EXISTS story_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_story_likes UNIQUE(user_id, story_id)
);

-- Table: conversations (messagerie privée directe)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dernier_message TEXT,
  date_dernier_message TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_conversation_user_order CHECK (user1_id < user2_id),
  CONSTRAINT uq_conversation_users UNIQUE (user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);

DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: messages (messages d'une conversation)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  contenu TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at ASC);

-- Table: reminders (rappels d'arrosage)
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plant_collection_id UUID NOT NULL REFERENCES collection(id) ON DELETE CASCADE,
  frequence_jours INTEGER NOT NULL DEFAULT 7,
  dernier_arrosage TIMESTAMPTZ,
  prochain_arrosage TIMESTAMPTZ NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);

DROP TRIGGER IF EXISTS trigger_reminders_updated_at ON reminders;
CREATE TRIGGER trigger_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: identification_logs (journal des scans réalisés)
CREATE TABLE IF NOT EXISTS identification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plant_id UUID REFERENCES plants(id) ON DELETE SET NULL,
  score_confiance DOUBLE PRECISION,
  reussi BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_id_logs_user_date ON identification_logs(user_id, created_at);

-- Table: quests (catalogue des défis quotidiens et exploration)
CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  libelle TEXT NOT NULL,
  objectif INTEGER NOT NULL,
  recompense_xp INTEGER NOT NULL DEFAULT 0,
  recompense_pieces INTEGER NOT NULL DEFAULT 0,
  type quest_type NOT NULL DEFAULT 'quotidien',
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: quest_progress (historique des récompenses par jour)
CREATE TABLE IF NOT EXISTS quest_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recompense_attribuee BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_quest_user_date UNIQUE(user_id, quest_id, date)
);

-- Table: reports (signalements de modération)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type report_target_type NOT NULL,
  target_id UUID NOT NULL,
  auteur_cible TEXT NOT NULL,
  motif TEXT NOT NULL,
  extrait TEXT NOT NULL,
  statut report_statut NOT NULL DEFAULT 'ouvert',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_reports_updated_at ON reports;
CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Table: feature_flags (interrupteurs de fonctionnalités)
CREATE TABLE IF NOT EXISTS feature_flags (
  cle TEXT PRIMARY KEY,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: device_tokens (tokens Expo push notifications)
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  plateforme TEXT NOT NULL DEFAULT 'expo',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_device_token UNIQUE(user_id, token)
);

-- Table: admin_audit_logs (journal d'audit des actions administrateur)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_pseudo TEXT NOT NULL,
  action TEXT NOT NULL,
  cible TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. Fonctions Métier PostgreSQL
-- ----------------------------------------------------------------------------

-- Distance géodésique Haversine (mètres)
CREATE OR REPLACE FUNCTION haversine_meters(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  r DOUBLE PRECISION := 6371000;
  dlat DOUBLE PRECISION := radians(lat2 - lat1);
  dlon DOUBLE PRECISION := radians(lon2 - lon1);
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  a := sin(dlat / 2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calcul dynamique de la rareté selon les captures mondiales
CREATE OR REPLACE FUNCTION compute_rarity(p_plant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM collection WHERE plant_id = p_plant_id;
  IF v_count = 0 THEN
    RETURN 'Épique';
  ELSIF v_count < 5 THEN
    RETURN 'Rare';
  ELSE
    RETURN 'Commun';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- XP selon la rareté
CREATE OR REPLACE FUNCTION calculate_xp_for_rarity(rarity TEXT)
RETURNS INTEGER AS $$
BEGIN
  IF rarity = 'Épique' THEN RETURN 100;
  ELSIF rarity = 'Rare' THEN RETURN 50;
  ELSE RETURN 25;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Profil public & Statistiques utilisateur
CREATE OR REPLACE FUNCTION get_user_stats(uid UUID)
RETURNS JSONB AS $$
DECLARE
  v_captures INTEGER;
  v_especes INTEGER;
  v_rares INTEGER;
BEGIN
  SELECT count(*) INTO v_captures FROM collection WHERE user_id = uid AND type_collection = 'owned';
  SELECT count(*) INTO v_especes FROM collection WHERE user_id = uid AND type_collection = 'discovered';
  SELECT count(*) INTO v_rares FROM collection c
    JOIN plants p ON p.id = c.plant_id
    WHERE c.user_id = uid AND c.type_collection = 'discovered' AND p.badge_rarete IN ('Rare', 'Épique');
  RETURN jsonb_build_object(
    'captures', COALESCE(v_captures, 0),
    'especes', COALESCE(v_especes, 0),
    'rares', COALESCE(v_rares, 0)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Défis quotidiens & Crédit automatique d'XP / pièces
CREATE OR REPLACE FUNCTION get_daily_quests()
RETURNS JSONB AS $$
DECLARE
  uid UUID := auth.uid();
  v_today DATE := CURRENT_DATE;
  v_start_day TIMESTAMPTZ := date_trunc('day', NOW() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
  v_end_day TIMESTAMPTZ := v_start_day + INTERVAL '1 day';
  v_user_lat DOUBLE PRECISION;
  v_user_lon DOUBLE PRECISION;
  v_scan_count INTEGER := 0;
  v_garden_count INTEGER := 0;
  v_posts_count INTEGER := 0;
  v_likes_count INTEGER := 0;
  v_explore_count INTEGER := 0;
  v_result JSONB := '[]'::jsonb;
  v_quest RECORD;
  v_prog INTEGER;
  v_done BOOLEAN;
  v_already_credited BOOLEAN;
  v_gained_xp INTEGER;
  v_gained_pieces INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;

  SELECT latitude_reference, longitude_reference INTO v_user_lat, v_user_lon FROM profiles WHERE id = uid;

  -- 1. Espèces distinctes scannées aujourd'hui
  SELECT count(DISTINCT plant_id) INTO v_scan_count
  FROM identification_logs
  WHERE user_id = uid AND created_at >= v_start_day AND created_at < v_end_day AND plant_id IS NOT NULL;

  -- 2. Ajout au Jardin aujourd'hui
  SELECT count(*) INTO v_garden_count
  FROM collection
  WHERE user_id = uid AND type_collection = 'owned' AND date_ajout >= v_start_day AND date_ajout < v_end_day;

  -- 3. Publication d'un conseil / post aujourd'hui
  SELECT count(*) INTO v_posts_count
  FROM posts
  WHERE user_id = uid AND created_at >= v_start_day AND created_at < v_end_day;

  -- 4. Likes reçus aujourd'hui sur les posts de l'utilisateur
  SELECT count(l.id) INTO v_likes_count
  FROM likes l
  JOIN posts p ON p.id = l.post_id
  WHERE p.user_id = uid AND l.created_at >= v_start_day AND l.created_at < v_end_day;

  -- 5. Exploration > 1 km
  IF v_user_lat IS NOT NULL AND v_user_lon IS NOT NULL THEN
    SELECT count(*) INTO v_explore_count
    FROM collection c
    JOIN plants p ON p.id = c.plant_id
    WHERE c.user_id = uid AND c.type_collection = 'discovered'
      AND c.date_ajout >= v_start_day AND c.date_ajout < v_end_day
      AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
      AND p.badge_rarete IN ('Rare', 'Épique')
      AND haversine_meters(v_user_lat, v_user_lon, c.latitude, c.longitude) >= 1000;
  END IF;

  FOR v_quest IN SELECT * FROM quests WHERE actif = TRUE ORDER BY id LOOP
    IF v_quest.id = 'scan-3' THEN v_prog := v_scan_count;
    ELSIF v_quest.id = 'add-garden' THEN v_prog := v_garden_count;
    ELSIF v_quest.id = 'publish-tip' THEN v_prog := v_posts_count;
    ELSIF v_quest.id = 'get-5-likes' THEN v_prog := v_likes_count;
    ELSIF v_quest.id = 'explore-rare' THEN v_prog := v_explore_count;
    ELSE v_prog := 0;
    END IF;

    IF v_prog > v_quest.objectif THEN
      v_prog := v_quest.objectif;
    END IF;

    v_done := (v_prog >= v_quest.objectif);
    v_already_credited := FALSE;

    SELECT recompense_attribuee INTO v_already_credited
    FROM quest_progress
    WHERE user_id = uid AND quest_id = v_quest.id AND date = v_today;

    IF v_done AND (v_already_credited IS NULL OR v_already_credited = FALSE) THEN
      UPDATE profiles
      SET experience = experience + v_quest.recompense_xp,
          pieces = pieces + v_quest.recompense_pieces
      WHERE id = uid;

      INSERT INTO quest_progress (user_id, quest_id, date, recompense_attribuee)
      VALUES (uid, v_quest.id, v_today, TRUE)
      ON CONFLICT (user_id, quest_id, date) DO UPDATE SET recompense_attribuee = TRUE;

      v_already_credited := TRUE;
    END IF;

    v_gained_xp := CASE WHEN v_already_credited = TRUE THEN v_quest.recompense_xp ELSE 0 END;
    v_gained_pieces := CASE WHEN v_already_credited = TRUE THEN v_quest.recompense_pieces ELSE 0 END;

    v_result := v_result || jsonb_build_object(
      'id', v_quest.id,
      'libelle', v_quest.libelle,
      'type', COALESCE(v_quest.type::text, 'quotidien'),
      'progression', v_prog,
      'objectif', v_quest.objectif,
      'complete', v_done,
      'recompense', jsonb_build_object(
        'xp', v_gained_xp,
        'pieces', v_gained_pieces
      )
    );
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Suppression de compte RGPD
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_suffix TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  v_suffix := substring(v_uid::text from 1 for 8);
  UPDATE profiles
  SET email = 'deleted-' || v_suffix || '@planai.invalid',
      nom_utilisateur = 'Utilisateur supprimé ' || v_suffix,
      url_avatar = NULL,
      date_suppression = NOW()
  WHERE id = v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. Triggers Automatiques (Profil à l'inscription, Paires de conversations)
-- ----------------------------------------------------------------------------

-- Trigger à la création d'un utilisateur Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
BEGIN
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'nom_utilisateur',
    NEW.raw_user_meta_data->>'pseudo',
    NEW.raw_user_meta_data->>'name',
    'User_' || substring(NEW.id::text from 1 for 6)
  );

  INSERT INTO public.profiles (
    id,
    email,
    nom_utilisateur,
    url_avatar
  ) VALUES (
    NEW.id,
    NEW.email,
    v_username,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger pour normaliser l'ordre des membres de conversation (user1_id < user2_id)
CREATE OR REPLACE FUNCTION normalize_conversation_members()
RETURNS TRIGGER AS $$
DECLARE
  v_tmp UUID;
BEGIN
  IF NEW.user1_id > NEW.user2_id THEN
    v_tmp := NEW.user1_id;
    NEW.user1_id := NEW.user2_id;
    NEW.user2_id := v_tmp;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_normalize_conversation_members ON conversations;
CREATE TRIGGER trigger_normalize_conversation_members
  BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION normalize_conversation_members();

-- ----------------------------------------------------------------------------
-- 6. Row Level Security (RLS)
-- ----------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE identification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques: profiles
DROP POLICY IF EXISTS "Profils publics lisibles par tous" ON profiles;
CREATE POLICY "Profils publics lisibles par tous"
  ON profiles FOR SELECT USING (date_suppression IS NULL);

DROP POLICY IF EXISTS "Modification de son propre profil" ON profiles;
CREATE POLICY "Modification de son propre profil"
  ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Creation de son propre profil" ON profiles;
CREATE POLICY "Creation de son propre profil"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Politiques: plants
DROP POLICY IF EXISTS "Catalogue plantes lisible par tous" ON plants;
CREATE POLICY "Catalogue plantes lisible par tous"
  ON plants FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Gestion catalogue par admin" ON plants;
CREATE POLICY "Gestion catalogue par admin"
  ON plants FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND est_admin = TRUE)
  );

-- Politiques: collection
DROP POLICY IF EXISTS "Acces prive a sa collection" ON collection;
CREATE POLICY "Acces prive a sa collection"
  ON collection FOR ALL USING (auth.uid() = user_id);

-- Politiques: posts
DROP POLICY IF EXISTS "Publications visibles par utilisateurs authentifies" ON posts;
CREATE POLICY "Publications visibles par utilisateurs authentifies"
  ON posts FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Gestion de ses propres publications" ON posts;
CREATE POLICY "Gestion de ses propres publications"
  ON posts FOR ALL USING (auth.uid() = user_id);

-- Politiques: comments
DROP POLICY IF EXISTS "Commentaires lisibles par utilisateurs authentifies" ON comments;
CREATE POLICY "Commentaires lisibles par utilisateurs authentifies"
  ON comments FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Ajout de commentaires" ON comments;
CREATE POLICY "Ajout de commentaires"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Suppression de commentaires" ON comments;
CREATE POLICY "Suppression de commentaires"
  ON comments FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM posts WHERE posts.id = comments.post_id AND posts.user_id = auth.uid())
  );

-- Politiques: likes
DROP POLICY IF EXISTS "Likes lisibles par tous" ON likes;
CREATE POLICY "Likes lisibles par tous"
  ON likes FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Gestion de ses likes" ON likes;
CREATE POLICY "Gestion de ses likes"
  ON likes FOR ALL USING (auth.uid() = user_id);

-- Politiques: stories
DROP POLICY IF EXISTS "Stories actives lisibles" ON stories;
CREATE POLICY "Stories actives lisibles"
  ON stories FOR SELECT USING (date_expiration > NOW());

DROP POLICY IF EXISTS "Gestion de ses propres stories" ON stories;
CREATE POLICY "Gestion de ses propres stories"
  ON stories FOR ALL USING (auth.uid() = user_id);

-- Politiques: story_views
DROP POLICY IF EXISTS "Enregistrement de vue story" ON story_views;
CREATE POLICY "Enregistrement de vue story"
  ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Auteur de story consulte ses vues" ON story_views;
CREATE POLICY "Auteur de story consulte ses vues"
  ON story_views FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE stories.id = story_views.story_id AND stories.user_id = auth.uid())
  );

-- Politiques: story_likes
DROP POLICY IF EXISTS "Likes de stories lisibles" ON story_likes;
CREATE POLICY "Likes de stories lisibles"
  ON story_likes FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Gestion de son like de story" ON story_likes;
CREATE POLICY "Gestion de son like de story"
  ON story_likes FOR ALL USING (auth.uid() = user_id);

-- Politiques: conversations
DROP POLICY IF EXISTS "Acces a ses propres conversations" ON conversations;
CREATE POLICY "Acces a ses propres conversations"
  ON conversations FOR ALL USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Politiques: messages
DROP POLICY IF EXISTS "Lecture des messages de ses conversations" ON messages;
CREATE POLICY "Lecture des messages de ses conversations"
  ON messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Envoi de messages dans sa conversation" ON messages;
CREATE POLICY "Envoi de messages dans sa conversation"
  ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Marquage de ses messages comme lus" ON messages;
CREATE POLICY "Marquage de ses messages comme lus"
  ON messages FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- Politiques: reminders
DROP POLICY IF EXISTS "Gestion de ses rappels" ON reminders;
CREATE POLICY "Gestion de ses rappels"
  ON reminders FOR ALL USING (auth.uid() = user_id);

-- Politiques: identification_logs
DROP POLICY IF EXISTS "Gestion de son journal de scan" ON identification_logs;
CREATE POLICY "Gestion de son journal de scan"
  ON identification_logs FOR ALL USING (auth.uid() = user_id);

-- Politiques: quests
DROP POLICY IF EXISTS "Catalogue des quetes visible" ON quests;
CREATE POLICY "Catalogue des quetes visible"
  ON quests FOR SELECT USING (TRUE);

-- Politiques: quest_progress
DROP POLICY IF EXISTS "Historique des quetes de l'utilisateur" ON quest_progress;
CREATE POLICY "Historique des quetes de l'utilisateur"
  ON quest_progress FOR ALL USING (auth.uid() = user_id);

-- Politiques: reports
DROP POLICY IF EXISTS "Creation de signalements" ON reports;
CREATE POLICY "Creation de signalements"
  ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Consultation signalements par moderateur/admin" ON reports;
CREATE POLICY "Consultation signalements par moderateur/admin"
  ON reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'moderateur' OR role = 'admin' OR est_admin = TRUE))
  );

-- Politiques: feature_flags
DROP POLICY IF EXISTS "Lecture publique des feature flags" ON feature_flags;
CREATE POLICY "Lecture publique des feature flags"
  ON feature_flags FOR SELECT USING (TRUE);

-- Politiques: device_tokens
DROP POLICY IF EXISTS "Gestion de ses device tokens" ON device_tokens;
CREATE POLICY "Gestion de ses device tokens"
  ON device_tokens FOR ALL USING (auth.uid() = user_id);

-- Politiques: admin_audit_logs
DROP POLICY IF EXISTS "Audit logs reserves aux admins" ON admin_audit_logs;
CREATE POLICY "Audit logs reserves aux admins"
  ON admin_audit_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND est_admin = TRUE)
  );

-- ----------------------------------------------------------------------------
-- 7. Supabase Storage Buckets & Policies
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', TRUE),
  ('collections', 'collections', FALSE),
  ('posts', 'posts', TRUE),
  ('stories', 'stories', TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

DROP POLICY IF EXISTS "Avatars publics en lecture" ON storage.objects;
CREATE POLICY "Avatars publics en lecture" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Upload avatar de son propre compte" ON storage.objects;
CREATE POLICY "Upload avatar de son propre compte" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Mise a jour de son avatar" ON storage.objects;
CREATE POLICY "Mise a jour de son avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Lecture photos collection par proprietaire" ON storage.objects;
CREATE POLICY "Lecture photos collection par proprietaire" ON storage.objects
  FOR SELECT USING (bucket_id = 'collections' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Upload photo collection par proprietaire" ON storage.objects;
CREATE POLICY "Upload photo collection par proprietaire" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'collections' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Lecture publique des photos de posts" ON storage.objects;
CREATE POLICY "Lecture publique des photos de posts" ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');
DROP POLICY IF EXISTS "Upload photo post" ON storage.objects;
CREATE POLICY "Upload photo post" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Lecture publique des medias de stories" ON storage.objects;
CREATE POLICY "Lecture publique des medias de stories" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');
DROP POLICY IF EXISTS "Upload media story" ON storage.objects;
CREATE POLICY "Upload media story" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ----------------------------------------------------------------------------
-- 8. Données initiales
-- ----------------------------------------------------------------------------

INSERT INTO quests (id, libelle, objectif, recompense_xp, recompense_pieces, type, actif)
VALUES
  ('scan-3', 'Scanner 3 plantes différentes', 3, 30, 0, 'quotidien', TRUE),
  ('add-garden', 'Ajouter une nouvelle plante à son Jardin', 1, 20, 0, 'quotidien', TRUE),
  ('publish-tip', 'Publier une photo avec un conseil d''entretien', 1, 25, 10, 'quotidien', TRUE),
  ('get-5-likes', 'Recevoir 5 likes sur une publication', 5, 0, 20, 'quotidien', TRUE),
  ('explore-rare', 'Découvrir une espèce Rare ou Épique à plus de 1 km de chez vous', 1, 50, 30, 'exploration', TRUE)
ON CONFLICT (id) DO UPDATE SET
  libelle = EXCLUDED.libelle, objectif = EXCLUDED.objectif,
  recompense_xp = EXCLUDED.recompense_xp, recompense_pieces = EXCLUDED.recompense_pieces,
  type = EXCLUDED.type, actif = EXCLUDED.actif;

INSERT INTO feature_flags (cle, active, description)
VALUES
  ('stories', TRUE, 'Activation des stories éphémères'),
  ('feed_geo', TRUE, 'Filtrage géographique du fil communautaire'),
  ('health_diagnosis', TRUE, 'Diagnostic santé des plantes par photo'),
  ('reminders_push', TRUE, 'Notifications push pour les rappels d''arrosage')
ON CONFLICT (cle) DO UPDATE SET active = EXCLUDED.active, description = EXCLUDED.description;

INSERT INTO plants (id, nom_scientifique, nom_commun, famille, toxicite, badge_rarete, a_propos, conseils_entretien, url_image, frequence_arrosage_jours)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Monstera deliciosa', 'Monstera', 'Araceae', 'orange', 'Commun', 'Plante tropicale grimpante très populaire d''Amérique centrale.', '{"lumiere":"Lumière indirecte vive","sol":"Terreau riche drainant","arrosage":"1x par semaine","multiplication":"Bouturage de tige"}'::jsonb, 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400', 7),
  ('22222222-2222-2222-2222-222222222222', 'Ficus elastica', 'Caoutchouc', 'Moraceae', 'orange', 'Commun', 'Arbre d''intérieur robuste aux larges feuilles luisantes.', '{"lumiere":"Lumière vive indirecte","sol":"Terreau universel","arrosage":"Laisser sécher entre 2 arrosages","multiplication":"Bouturage"}'::jsonb, 'https://images.unsplash.com/photo-1586788224331-947f68671cf1?w=400', 10),
  ('33333333-3333-3333-3333-333333333333', 'Spathiphyllum wallisii', 'Fleur de lune', 'Araceae', 'red', 'Commun', 'Plante dépolluante aux superbes fleurs blanches.', '{"lumiere":"Mi-ombre","sol":"Terreau humide","arrosage":"Maintenir humide","multiplication":"Division de touffe"}'::jsonb, 'https://images.unsplash.com/photo-1593697821252-0c9137d9fc45?w=400', 5),
  ('44444444-4444-4444-4444-444444444444', 'Sansevieria trifasciata', 'Langue de belle-mère', 'Asparagaceae', 'orange', 'Commun', 'Succulente quasi indestructible aux feuilles dressées.', '{"lumiere":"Tolère toutes expositions","sol":"Drainant et sableux","arrosage":"Arroser très peu","multiplication":"Division"}'::jsonb, 'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=400', 14),
  ('55555555-5555-5555-5555-555555555555', 'Aloe vera', 'Aloès', 'Asphodelaceae', 'orange', 'Rare', 'Plante grasse renommée pour son gel aux vertus apaisantes.', '{"lumiere":"Plein soleil à lumière vive","sol":"Terreau cactées","arrosage":"Laisser sécher complètement","multiplication":"Rejets"}'::jsonb, 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=400', 14)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. Droits API après recréation du schéma public
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

COMMIT;
