-- ==============================================================================
-- FITTRACK: Smart India Hackathon 2026
-- Complete Production Database Schema & RPC Functions for Supabase
-- Target Project ID: jpindwjowrcwknsrdwio
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/jpindwjowrcwknsrdwio/sql)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. PROFILES TABLE & AUTH TRIGGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT NULL,
  mode TEXT NOT NULL DEFAULT 'challenger' CHECK (mode IN ('challenger', 'organizer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_mode ON public.profiles(mode);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-provision profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  default_display_name TEXT;
  default_mode TEXT;
BEGIN
  default_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1),
    'Challenger'
  );
  default_mode := LOWER(COALESCE(NEW.raw_user_meta_data->>'mode', 'challenger'));
  IF default_mode NOT IN ('challenger', 'organizer') THEN
    default_mode := 'challenger';
  END IF;

  INSERT INTO public.profiles (id, display_name, mode, avatar_url)
  VALUES (
    NEW.id,
    default_display_name,
    default_mode,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    display_name = EXCLUDED.display_name,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------------------------
-- 3. CHALLENGES TABLE & POLICIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'GOAL_BASED',
    'CONSISTENCY',
    'ACTIVITY',
    'COMPETITION',
    'TEAM',
    'EVENT',
    'MULTI_ACTIVITY'
  )),
  activity TEXT NOT NULL CHECK (activity IN (
    'RUNNING',
    'WALKING',
    'CYCLING',
    'SKIPPING',
    'SWIMMING',
    'PUSH_UPS',
    'SQUATS',
    'PLANK',
    'YOGA'
  )),
  target_value NUMERIC NOT NULL CHECK (target_value > 0),
  target_unit TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  verification_requirement TEXT NOT NULL CHECK (verification_requirement IN (
    'AI_VERIFIED',
    'DEVICE_VERIFIED',
    'ORGANIZER_APPROVED',
    'SELF_REPORTED'
  )),
  visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN (
    'DRAFT',
    'PUBLISHED',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
  )),
  participant_count INTEGER NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
  points_reward INTEGER NOT NULL DEFAULT 100,
  difficulty TEXT NOT NULL DEFAULT 'Intermediate' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  banner_url TEXT NULL,
  organizer_name TEXT NOT NULL DEFAULT 'Official Organizer',
  organizer_avatar TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_visibility ON public.challenges(visibility);
CREATE INDEX IF NOT EXISTS idx_challenges_start_date ON public.challenges(start_date);
CREATE INDEX IF NOT EXISTS idx_challenges_end_date ON public.challenges(end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_organizer_id ON public.challenges(organizer_id);
CREATE INDEX IF NOT EXISTS idx_challenges_type ON public.challenges(type);
CREATE INDEX IF NOT EXISTS idx_challenges_activity ON public.challenges(activity);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public challenges are viewable by everyone" ON public.challenges;
CREATE POLICY "Public challenges are viewable by everyone"
  ON public.challenges FOR SELECT
  USING (visibility = 'PUBLIC' AND status IN ('PUBLISHED', 'ACTIVE', 'COMPLETED'));

DROP POLICY IF EXISTS "Organizers can view own challenges" ON public.challenges;
CREATE POLICY "Organizers can view own challenges"
  ON public.challenges FOR SELECT
  USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can insert own challenges" ON public.challenges;
CREATE POLICY "Organizers can insert own challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can update own challenges" ON public.challenges;
CREATE POLICY "Organizers can update own challenges"
  ON public.challenges FOR UPDATE
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can delete own challenges" ON public.challenges;
CREATE POLICY "Organizers can delete own challenges"
  ON public.challenges FOR DELETE
  USING (auth.uid() = organizer_id);

DROP TRIGGER IF EXISTS on_challenge_updated ON public.challenges;
CREATE TRIGGER on_challenge_updated
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ------------------------------------------------------------------------------
-- 4. CHALLENGE PARTICIPANTS TABLE & TRIGGERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  status TEXT NOT NULL DEFAULT 'JOINED' CHECK (status IN ('JOINED', 'COMPLETED', 'LEFT')),
  CONSTRAINT unique_challenge_participant UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON public.challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON public.challenge_participants(challenge_id);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own participation" ON public.challenge_participants;
CREATE POLICY "Users can view own participation"
  ON public.challenge_participants FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organizers can view participants of own challenges" ON public.challenge_participants;
CREATE POLICY "Organizers can view participants of own challenges"
  ON public.challenge_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
CREATE POLICY "Users can join challenges"
  ON public.challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave challenges" ON public.challenge_participants;
CREATE POLICY "Users can leave challenges"
  ON public.challenge_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Update participant counter on challenges
CREATE OR REPLACE FUNCTION public.handle_challenge_participant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.challenges
    SET participant_count = participant_count + 1
    WHERE id = NEW.challenge_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.challenges
    SET participant_count = GREATEST(0, participant_count - 1)
    WHERE id = OLD.challenge_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_challenge_participant_changed ON public.challenge_participants;
CREATE TRIGGER on_challenge_participant_changed
  AFTER INSERT OR DELETE ON public.challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_challenge_participant_count();


-- ------------------------------------------------------------------------------
-- 5. CHALLENGE PROGRESS & FITTRACK POINTS LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_value NUMERIC NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  target_value NUMERIC NOT NULL DEFAULT 0 CHECK (target_value >= 0),
  progress_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  challenge_score NUMERIC NOT NULL DEFAULT 0 CHECK (challenge_score >= 0),
  last_activity_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_challenge_progress UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON public.challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge ON public.challenge_progress(challenge_id);

ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON public.challenge_progress;
CREATE POLICY "Users can view own progress"
  ON public.challenge_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organizers can view participant progress" ON public.challenge_progress;
CREATE POLICY "Organizers can view participant progress"
  ON public.challenge_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.organizer_id = auth.uid()
    )
  );

-- Points event ledger
CREATE TABLE IF NOT EXISTS public.fittrack_point_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'JOIN_CHALLENGE',
    'AI_VERIFIED',
    'ORGANIZER_APPROVED',
    'SELF_REPORTED',
    'DAILY_TARGET_COMPLETED',
    'STREAK_7_DAY',
    'CHALLENGE_COMPLETED',
    'BADGE_EARNED'
  )),
  points INTEGER NOT NULL CHECK (points > 0),
  challenge_id UUID NULL REFERENCES public.challenges(id) ON DELETE SET NULL,
  reference_id TEXT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_point_event UNIQUE (user_id, event_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_point_events_user ON public.fittrack_point_events(user_id);
CREATE INDEX IF NOT EXISTS idx_point_events_created_at ON public.fittrack_point_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_events_challenge ON public.fittrack_point_events(challenge_id);

ALTER TABLE public.fittrack_point_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own point events" ON public.fittrack_point_events;
CREATE POLICY "Users can view own point events"
  ON public.fittrack_point_events FOR SELECT
  USING (auth.uid() = user_id);

-- Initialize progress and join points when joining challenge
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
  SELECT title, target_value INTO v_title, v_target 
  FROM public.challenges 
  WHERE id = NEW.challenge_id;

  INSERT INTO public.fittrack_point_events (
    user_id, event_type, points, challenge_id, reference_id, description
  ) VALUES (
    NEW.user_id,
    'JOIN_CHALLENGE',
    10,
    NEW.challenge_id,
    NEW.challenge_id::text,
    'Joined challenge: ' || COALESCE(v_title, 'Fitness Challenge')
  ) ON CONFLICT (user_id, event_type, reference_id) DO NOTHING;

  INSERT INTO public.challenge_progress (
    challenge_id, user_id, current_value, target_value, progress_percentage, challenge_score
  ) VALUES (
    NEW.challenge_id,
    NEW.user_id,
    0,
    COALESCE(v_target, 0),
    0,
    0
  ) ON CONFLICT (challenge_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_challenge_participant_joined ON public.challenge_participants;
CREATE TRIGGER on_challenge_participant_joined
  AFTER INSERT ON public.challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_challenge_participant_joined();


-- ------------------------------------------------------------------------------
-- 6. VERIFICATION COMMITS TABLE (ANTI-REPLAY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.challenge_verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_session_id TEXT NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  verification_requirement TEXT NOT NULL,
  measured_value NUMERIC NOT NULL CHECK (measured_value > 0),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL,
  target_unit TEXT NOT NULL,
  commit_status TEXT NOT NULL DEFAULT 'COMMITTED' CHECK (commit_status IN ('COMMITTED', 'REJECTED')),
  authoritative_verified BOOLEAN NOT NULL DEFAULT TRUE,
  client_metadata JSONB NULL,
  committed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_verification_session_id UNIQUE (verification_session_id)
);

CREATE INDEX IF NOT EXISTS idx_verif_sess_user ON public.challenge_verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_verif_sess_challenge ON public.challenge_verification_sessions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_verif_sess_committed_at ON public.challenge_verification_sessions(committed_at DESC);

ALTER TABLE public.challenge_verification_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verification sessions" ON public.challenge_verification_sessions;
CREATE POLICY "Users can view own verification sessions"
  ON public.challenge_verification_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organizers can view verification sessions for their challenges" ON public.challenge_verification_sessions;
CREATE POLICY "Organizers can view verification sessions for their challenges"
  ON public.challenge_verification_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.organizer_id = auth.uid()
    )
  );


-- ------------------------------------------------------------------------------
-- 7. AUTHORITATIVE LEADERBOARD ENGINE RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_challenge_leaderboard(
  p_challenge_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  rank BIGINT,
  challenge_id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  challenge_score NUMERIC,
  progress_percentage NUMERIC,
  verification_requirement TEXT,
  last_activity_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    DENSE_RANK() OVER (
      ORDER BY
        cp.challenge_score DESC,
        cp.progress_percentage DESC,
        cp.completed_at ASC NULLS LAST,
        cp.last_activity_at ASC NULLS LAST,
        p.created_at ASC
    ) AS rank,
    cp.challenge_id,
    cp.user_id,
    p.display_name,
    p.avatar_url,
    cp.challenge_score,
    cp.progress_percentage,
    c.verification_requirement,
    cp.last_activity_at,
    cp.completed_at
  FROM public.challenge_progress cp
  JOIN public.profiles p ON p.id = cp.user_id
  JOIN public.challenges c ON c.id = cp.challenge_id
  WHERE cp.challenge_id = p_challenge_id
    AND cp.challenge_score > 0
  ORDER BY
    rank ASC,
    cp.completed_at ASC NULLS LAST,
    cp.last_activity_at ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_challenge_leaderboard(UUID, INT, INT) TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 8. AUTHORITATIVE AI VERIFICATION COMMIT RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commit_ai_verification_session(
  p_verification_session_id TEXT,
  p_challenge_id UUID,
  p_activity TEXT,
  p_measured_value NUMERIC,
  p_duration_seconds INT DEFAULT 0,
  p_client_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_challenge RECORD;
  v_progress RECORD;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_increment NUMERIC;
  v_new_current_value NUMERIC;
  v_new_percentage NUMERIC;
  v_new_score NUMERIC;
  v_target NUMERIC;
  v_is_now_completed BOOLEAN;
  v_was_completed BOOLEAN := FALSE;
  v_completed_at TIMESTAMPTZ;
  v_points_awarded INT := 20;
  v_completion_points INT := 0;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AUTHENTICATION_REQUIRED', 'message', 'Authenticated user session is required to commit verified workouts.');
  END IF;

  IF p_verification_session_id IS NULL OR length(trim(p_verification_session_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_SESSION_ID', 'message', 'A unique verification session ID is required.');
  END IF;

  IF p_measured_value IS NULL OR p_measured_value <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_MEASURED_VALUE', 'message', 'Measured verification value must be strictly positive.');
  END IF;

  IF (UPPER(p_activity) = 'SQUATS' AND p_measured_value > 500) OR
     (UPPER(p_activity) = 'PLANK' AND p_measured_value > 1800) THEN
    RETURN jsonb_build_object('success', false, 'error', 'VALUE_OUT_OF_RANGE', 'message', 'Reported volume exceeds realistic physiological thresholds.');
  END IF;

  SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHALLENGE_NOT_FOUND', 'message', 'Specified challenge does not exist.');
  END IF;

  IF UPPER(v_challenge.activity) <> UPPER(p_activity) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ACTIVITY_MISMATCH', 'message', 'Submitted activity type does not match challenge specification.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.challenge_verification_sessions WHERE verification_session_id = p_verification_session_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_SESSION', 'message', 'This verification session has already been recorded and committed.');
  END IF;

  SELECT * INTO v_progress FROM public.challenge_progress WHERE challenge_id = p_challenge_id AND user_id = v_caller_id;

  v_target := v_challenge.target_value;
  v_increment := p_measured_value;

  IF FOUND THEN
    v_was_completed := (v_progress.completed_at IS NOT NULL) OR (v_progress.current_value >= v_target);
    v_new_current_value := v_progress.current_value + v_increment;
  ELSE
    v_new_current_value := v_increment;
    INSERT INTO public.challenge_participants (challenge_id, user_id, status)
    VALUES (p_challenge_id, v_caller_id, 'JOINED')
    ON CONFLICT (challenge_id, user_id) DO NOTHING;
  END IF;

  v_new_percentage := LEAST(100, ROUND((v_new_current_value / GREATEST(1, v_target)) * 100, 2));
  v_new_score := v_new_current_value;
  v_is_now_completed := (v_new_current_value >= v_target);

  IF v_is_now_completed THEN
    v_completed_at := COALESCE(v_progress.completed_at, v_now);
  ELSE
    v_completed_at := NULL;
  END IF;

  INSERT INTO public.challenge_progress (
    challenge_id, user_id, current_value, target_value, progress_percentage, challenge_score, last_activity_at, completed_at, updated_at
  ) VALUES (
    p_challenge_id, v_caller_id, v_new_current_value, v_target, v_new_percentage, v_new_score, v_now, v_completed_at, v_now
  ) ON CONFLICT (challenge_id, user_id) DO UPDATE SET
    current_value = EXCLUDED.current_value,
    progress_percentage = EXCLUDED.progress_percentage,
    challenge_score = EXCLUDED.challenge_score,
    last_activity_at = EXCLUDED.last_activity_at,
    completed_at = COALESCE(public.challenge_progress.completed_at, EXCLUDED.completed_at),
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.challenge_verification_sessions (
    verification_session_id, challenge_id, user_id, activity, verification_requirement,
    measured_value, duration_seconds, target_value, target_unit, commit_status, authoritative_verified, client_metadata, committed_at
  ) VALUES (
    p_verification_session_id, p_challenge_id, v_caller_id, v_challenge.activity, 'AI_VERIFIED',
    p_measured_value, COALESCE(p_duration_seconds, 0), v_target, v_challenge.target_unit, 'COMMITTED', TRUE, p_client_metadata, v_now
  );

  INSERT INTO public.fittrack_point_events (
    user_id, event_type, points, challenge_id, reference_id, description
  ) VALUES (
    v_caller_id, 'AI_VERIFIED', 20, p_challenge_id, p_verification_session_id,
    'AI-verified workout session: ' || v_challenge.activity || ' (+' || v_increment::text || ' ' || v_challenge.target_unit || ')'
  ) ON CONFLICT (user_id, event_type, reference_id) DO NOTHING;

  IF v_is_now_completed AND NOT v_was_completed THEN
    v_completion_points := COALESCE(v_challenge.points_reward, 100);
    v_points_awarded := v_points_awarded + v_completion_points;

    INSERT INTO public.fittrack_point_events (
      user_id, event_type, points, challenge_id, reference_id, description
    ) VALUES (
      v_caller_id, 'CHALLENGE_COMPLETED', v_completion_points, p_challenge_id, p_challenge_id::text,
      'Completed challenge: ' || v_challenge.title
    ) ON CONFLICT (user_id, event_type, reference_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'verificationSessionId', p_verification_session_id,
    'challengeId', p_challenge_id,
    'userId', v_caller_id,
    'activity', v_challenge.activity,
    'measuredValue', p_measured_value,
    'incrementApplied', v_increment,
    'currentValue', v_new_current_value,
    'targetValue', v_target,
    'targetUnit', v_challenge.target_unit,
    'progressPercentage', v_new_percentage,
    'challengeScore', v_new_score,
    'isCompleted', v_is_now_completed,
    'wasNewlyCompleted', (v_is_now_completed AND NOT v_was_completed),
    'pointsAwarded', v_points_awarded,
    'sessionPoints', 20,
    'completionPoints', CASE WHEN (v_is_now_completed AND NOT v_was_completed) THEN v_completion_points ELSE 0 END,
    'lastActivityAt', v_now,
    'completedAt', v_completed_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.commit_ai_verification_session(TEXT, UUID, TEXT, NUMERIC, INT, JSONB) TO authenticated;


-- ------------------------------------------------------------------------------
-- 9. ORGANIZER STUDIO RPC FUNCTIONS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_organizer_challenge(p_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_challenge RECORD;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Authentication required.');
  END IF;

  SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Challenge not found.');
  END IF;

  IF v_challenge.organizer_id <> v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'You can only publish challenges you created.');
  END IF;

  UPDATE public.challenges
  SET status = 'PUBLISHED', updated_at = timezone('utc'::text, now())
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object('success', true, 'challengeId', p_challenge_id, 'status', 'PUBLISHED');
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_organizer_challenge(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_challenge_status(p_challenge_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_challenge RECORD;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Authentication required.');
  END IF;

  IF p_status NOT IN ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'message', 'Invalid challenge status.');
  END IF;

  SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Challenge not found.');
  END IF;

  IF v_challenge.organizer_id <> v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'You can only update your own challenges.');
  END IF;

  UPDATE public.challenges
  SET status = p_status, updated_at = timezone('utc'::text, now())
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object('success', true, 'challengeId', p_challenge_id, 'status', p_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_challenge_status(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_organizer_metrics(p_organizer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_challenges INT := 0;
  v_active_challenges INT := 0;
  v_published_challenges INT := 0;
  v_draft_challenges INT := 0;
  v_completed_challenges INT := 0;
  v_total_participants INT := 0;
  v_points_pool INT := 0;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'ACTIVE'),
    COUNT(*) FILTER (WHERE status = 'PUBLISHED'),
    COUNT(*) FILTER (WHERE status = 'DRAFT'),
    COUNT(*) FILTER (WHERE status = 'COMPLETED'),
    COALESCE(SUM(participant_count), 0),
    COALESCE(SUM(points_reward), 0)
  INTO
    v_total_challenges,
    v_active_challenges,
    v_published_challenges,
    v_draft_challenges,
    v_completed_challenges,
    v_total_participants,
    v_points_pool
  FROM public.challenges
  WHERE organizer_id = p_organizer_id;

  RETURN jsonb_build_object(
    'totalChallenges', v_total_challenges,
    'activeChallenges', v_active_challenges,
    'publishedChallenges', v_published_challenges,
    'draftChallenges', v_draft_challenges,
    'completedChallenges', v_completed_challenges,
    'totalParticipants', v_total_participants,
    'totalPointsRewardPool', v_points_pool
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_organizer_metrics(UUID) TO authenticated;


-- ------------------------------------------------------------------------------
-- 10. SEED CHALLENGES (Default Catalogue)
-- ------------------------------------------------------------------------------
-- If a registered organizer or user profile already exists, seeds initial challenges
DO $$
DECLARE
  v_organizer_id UUID;
BEGIN
  SELECT id INTO v_organizer_id FROM public.profiles LIMIT 1;
  IF v_organizer_id IS NOT NULL THEN
    INSERT INTO public.challenges (
      id, organizer_id, title, description, type, activity,
      target_value, target_unit, start_date, end_date,
      verification_requirement, visibility, status, participant_count,
      points_reward, difficulty, banner_url, organizer_name, organizer_avatar
    ) VALUES (
      '11111111-1111-1111-1111-111111111101',
      v_organizer_id,
      '10K Squat Challenge',
      'A nationwide endurance milestone. Perform deep, verified squats with real-time pose estimation tracking hip-knee collinearity.',
      'GOAL_BASED',
      'SQUATS',
      10000,
      'reps',
      timezone('utc'::text, now()) - interval '14 days',
      timezone('utc'::text, now()) + interval '30 days',
      'AI_VERIFIED',
      'PUBLIC',
      'ACTIVE',
      8420,
      250,
      'Advanced',
      'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
      'National Fitness Council',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.challenges (
      id, organizer_id, title, description, type, activity,
      target_value, target_unit, start_date, end_date,
      verification_requirement, visibility, status, participant_count,
      points_reward, difficulty, banner_url, organizer_name, organizer_avatar
    ) VALUES (
      '11111111-1111-1111-1111-111111111104',
      v_organizer_id,
      '7-Day Core & Plank Challenge',
      'Test your isometric resilience. Accumulate 420 seconds of verified plank holds with strict spine horizontal alignment.',
      'GOAL_BASED',
      'PLANK',
      420,
      'seconds',
      timezone('utc'::text, now()) - interval '2 days',
      timezone('utc'::text, now()) + interval '5 days',
      'AI_VERIFIED',
      'PUBLIC',
      'ACTIVE',
      9340,
      150,
      'Beginner',
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
      'Sports Authority of India',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
