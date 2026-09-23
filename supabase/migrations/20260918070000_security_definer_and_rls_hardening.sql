-- ==============================================================================
-- FITTRACK: Smart India Hackathon 2026
-- Phase 12 Migration: Security Definer, Search Path Hardening & RLS Verification
-- ==============================================================================

-- 1. Hardening handle_new_user() with explicit search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    display_name,
    avatar_url,
    mode,
    points,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'mode', 'CHALLENGER'),
    0,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ) ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Hardening update_challenge_participant_count() with explicit search_path
CREATE OR REPLACE FUNCTION public.update_challenge_participant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.challenges
    SET participant_count = participant_count + 1
    WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.challenges
    SET participant_count = GREATEST(0, participant_count - 1)
    WHERE id = OLD.challenge_id;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. Hardening handle_challenge_participant_joined() with explicit search_path
CREATE OR REPLACE FUNCTION public.handle_challenge_participant_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_title TEXT;
  v_target NUMERIC;
BEGIN
  -- Lookup challenge details
  SELECT title, target_value INTO v_title, v_target 
  FROM public.challenges 
  WHERE id = NEW.challenge_id;

  -- 1. Idempotently award +10 FITTRACK points for joining
  INSERT INTO public.fittrack_point_events (
    user_id,
    event_type,
    points,
    challenge_id,
    reference_id,
    description
  )
  VALUES (
    NEW.user_id,
    'JOIN_CHALLENGE',
    10,
    NEW.challenge_id,
    NEW.challenge_id::text,
    'Joined challenge: ' || COALESCE(v_title, 'Fitness Challenge')
  )
  ON CONFLICT (user_id, event_type, reference_id) DO NOTHING;

  -- 2. Idempotently initialize zero progress record
  INSERT INTO public.challenge_progress (
    challenge_id,
    user_id,
    current_value,
    target_value,
    progress_percentage,
    challenge_score
  )
  VALUES (
    NEW.challenge_id,
    NEW.user_id,
    0,
    COALESCE(v_target, 0),
    0,
    0
  )
  ON CONFLICT (challenge_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4. Hardening handle_challenge_participant_left() with explicit search_path
CREATE OR REPLACE FUNCTION public.handle_challenge_participant_left()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.challenge_progress
  WHERE challenge_id = OLD.challenge_id AND user_id = OLD.user_id;

  RETURN OLD;
END;
$$;

-- 5. Revoke anonymous access from sensitive RPCs and enforce authenticated execution
REVOKE EXECUTE ON FUNCTION public.commit_ai_verification_session(TEXT, UUID, TEXT, NUMERIC, INT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commit_ai_verification_session(TEXT, UUID, TEXT, NUMERIC, INT, JSONB) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.publish_organizer_challenge(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_organizer_challenge(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_challenge_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_challenge_status(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_organizer_metrics(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_organizer_metrics(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_organizer_challenge_participants(UUID, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_organizer_challenge_participants(UUID, INT, INT) TO authenticated;

-- 6. Re-assert strict Row Level Security on core competition state tables
-- Public clients are strictly FORBIDDEN from direct INSERT/UPDATE/DELETE on challenge_progress,
-- fittrack_point_events, and challenge_verification_sessions.
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fittrack_point_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_verification_sessions ENABLE ROW LEVEL SECURITY;
