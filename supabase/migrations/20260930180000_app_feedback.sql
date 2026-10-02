-- Additive migration: preserves existing accounts and application data.
BEGIN;
CREATE TABLE IF NOT EXISTS public.app_feedback (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('suggestion', 'report')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 3000),
  sender_email text NOT NULL,
  sender_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  email_status text NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent')),
  email_id text,
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS app_feedback_user_date ON public.app_feedback(user_id, created_at);
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_feedback FROM anon, authenticated;
GRANT ALL ON public.app_feedback TO service_role;

-- Serialize reservations for each user to enforce limits even on simultaneous taps.
CREATE OR REPLACE FUNCTION public.reserve_app_feedback(p_id uuid, p_kind text, p_message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  feedback public.app_feedback%ROWTYPE;
  name text;
  email text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000'; END IF;
  IF p_id IS NULL OR p_kind IS NULL OR p_kind NOT IN ('suggestion', 'report')
     OR p_message IS NULL OR char_length(btrim(p_message)) NOT BETWEEN 10 AND 3000 THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  SELECT * INTO feedback FROM public.app_feedback WHERE id = p_id;
  IF FOUND THEN
    IF feedback.user_id <> uid OR feedback.kind <> p_kind OR feedback.message <> btrim(p_message) THEN
      RAISE EXCEPTION 'invalid' USING ERRCODE = '22023';
    END IF;
    -- Resend idempotency keys expire after 24 hours: don't reuse older pending sends.
    IF feedback.email_status = 'pending' AND feedback.created_at < now() - interval '23 hours' THEN
      RAISE EXCEPTION 'invalid' USING ERRCODE = '22023';
    END IF;
    RETURN to_jsonb(feedback);
  END IF;
  IF EXISTS (SELECT 1 FROM public.app_feedback WHERE user_id = uid AND created_at > now() - interval '1 minute')
     OR (SELECT count(*) FROM public.app_feedback WHERE user_id = uid AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;
  SELECT p.nom_utilisateur, u.email INTO name, email
    FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE u.id = uid;
  INSERT INTO public.app_feedback(id, user_id, kind, message, sender_email, sender_name)
    VALUES(p_id, uid, p_kind, btrim(p_message), coalesce(email, ''), coalesce(name, 'Utilisateur'))
    RETURNING * INTO feedback;
  RETURN to_jsonb(feedback);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_app_feedback(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_app_feedback(uuid, text, text) TO authenticated;
COMMIT;
