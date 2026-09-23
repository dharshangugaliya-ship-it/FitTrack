-- ==============================================================================
-- FITTRACK: Smart India Hackathon 2026
-- Phase 11 Migration: Secure Verification Commit Engine & Authoritative Transactions
-- ==============================================================================

-- 1. Create Challenge Verification Sessions Table
-- Immutable audit log of all certified AI verification sessions.
-- Provides database-enforced replay protection and prevents duplicate scoring.
CREATE TABLE IF NOT EXISTS public.challenge_verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_session_id TEXT NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  verification_method TEXT NOT NULL CHECK (verification_method IN (
    'AI_VERIFIED',
    'DEVICE_VERIFIED',
    'ORGANIZER_APPROVED',
    'SELF_REPORTED'
  )),
  measured_value NUMERIC NOT NULL CHECK (measured_value > 0),
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  target_value NUMERIC NOT NULL CHECK (target_value >= 0),
  target_unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMMITTED' CHECK (status IN ('COMMITTED', 'REJECTED', 'SUPERSEDED')),
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  client_metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  committed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_verification_session UNIQUE (user_id, verification_session_id)
);

-- Indexes for verification lookup & audit trails
CREATE INDEX IF NOT EXISTS idx_verification_sessions_user ON public.challenge_verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_challenge ON public.challenge_verification_sessions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_session_id ON public.challenge_verification_sessions(verification_session_id);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_committed_at ON public.challenge_verification_sessions(committed_at DESC);

-- Enable RLS on challenge_verification_sessions
ALTER TABLE public.challenge_verification_sessions ENABLE ROW LEVEL SECURITY;

-- Challenger RLS: Challengers can view ONLY their own verification sessions
DROP POLICY IF EXISTS "Users can view own verification sessions" ON public.challenge_verification_sessions;
CREATE POLICY "Users can view own verification sessions"
  ON public.challenge_verification_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Organizer RLS: Organizers can view verification sessions for participants in their own challenges
DROP POLICY IF EXISTS "Organizers can view verification sessions for own challenges" ON public.challenge_verification_sessions;
CREATE POLICY "Organizers can view verification sessions for own challenges"
  ON public.challenge_verification_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.organizer_id = auth.uid()
    )
  );

-- Note: No direct INSERT, UPDATE, or DELETE policies for public clients.
-- Verification sessions can ONLY be recorded via the commit_ai_verification_session RPC.


-- 2. Authoritative Database RPC: commit_ai_verification_session
-- Executes a secure, atomic transaction that validates claims, records the session,
-- increments challenge progress, recalculates leaderboard score, and awards FITTRACK Points.
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
  v_participant RECORD;
  v_progress RECORD;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_target_unit_clean TEXT;
  v_increment NUMERIC;
  v_new_current_value NUMERIC;
  v_new_score NUMERIC;
  v_target NUMERIC;
  v_new_percentage NUMERIC;
  v_was_completed BOOLEAN;
  v_is_now_completed BOOLEAN;
  v_completed_at TIMESTAMPTZ;
  v_completion_points INT;
  v_points_awarded INT := 20; -- Base: +20 points per AI-verified workout session
BEGIN
  -- 1. Authentication Guard: Must be called by authenticated user
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED: Verification sessions can only be committed by authenticated users.';
  END IF;

  -- 2. Basic Input Sanitization
  IF p_verification_session_id IS NULL OR trim(p_verification_session_id) = '' THEN
    RAISE EXCEPTION 'INVALID_SESSION_ID: Verification session ID is required for replay protection.';
  END IF;

  IF p_challenge_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_CHALLENGE: Challenge ID is required.';
  END IF;

  IF p_measured_value IS NULL OR p_measured_value <= 0 THEN
    RAISE EXCEPTION 'INVALID_MEASURED_VALUE: Measured value must be greater than zero to record verified progress.';
  END IF;

  -- 3. Challenge Existence & Lifecycle Status
  SELECT 
    id, 
    title, 
    activity, 
    target_value, 
    target_unit, 
    verification_requirement, 
    status, 
    points_reward,
    start_date,
    end_date
  INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHALLENGE_NOT_FOUND: Challenge % does not exist.', p_challenge_id;
  END IF;

  IF v_challenge.status NOT IN ('PUBLISHED', 'ACTIVE') THEN
    RAISE EXCEPTION 'CHALLENGE_NOT_ACTIVE: Challenge is currently % and cannot accept verification commits.', v_challenge.status;
  END IF;

  -- 4. Verification Requirement Guard
  IF v_challenge.verification_requirement <> 'AI_VERIFIED' THEN
    RAISE EXCEPTION 'VERIFICATION_NOT_REQUIRED: Challenge verification requirement is %, not AI_VERIFIED.', v_challenge.verification_requirement;
  END IF;

  -- 5. Participant Enrollment Guard
  SELECT id, status INTO v_participant
  FROM public.challenge_participants
  WHERE challenge_id = p_challenge_id AND user_id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_A_PARTICIPANT: User is not enrolled in challenge %.', p_challenge_id;
  END IF;

  IF v_participant.status = 'LEFT' THEN
    RAISE EXCEPTION 'NOT_A_PARTICIPANT: User has withdrawn from challenge %.', p_challenge_id;
  END IF;

  -- 6. Activity Matching Guard
  IF upper(trim(p_activity)) <> upper(trim(v_challenge.activity)) THEN
    RAISE EXCEPTION 'ACTIVITY_MISMATCH: Submitted activity (%) does not match challenge requirement (%).', p_activity, v_challenge.activity;
  END IF;

  -- 7. Target Unit & Reasonable Bounds Validation
  v_target_unit_clean := lower(trim(v_challenge.target_unit));

  IF v_challenge.activity = 'SQUATS' THEN
    -- Squats require repetition units
    IF v_target_unit_clean NOT IN ('reps', 'squats', 'count', 'rep') THEN
      RAISE EXCEPTION 'INVALID_UNIT: Incompatible target unit (%) for SQUATS challenge.', v_challenge.target_unit;
    END IF;

    -- Conservative anti-corruption upper bound: max 500 reps per session
    IF p_measured_value > 500 THEN
      RAISE EXCEPTION 'VALUE_OUT_OF_RANGE: Squat count (% reps) exceeds maximum allowable single-session limit (500 reps).', p_measured_value;
    END IF;

    v_increment := p_measured_value;

  ELSIF v_challenge.activity = 'PLANK' THEN
    -- Plank requires duration units (seconds or minutes)
    IF v_target_unit_clean NOT IN ('seconds', 'sec', 's', 'minutes', 'mins', 'min') THEN
      RAISE EXCEPTION 'INVALID_UNIT: Incompatible target unit (%) for PLANK challenge.', v_challenge.target_unit;
    END IF;

    -- Conservative anti-corruption upper bound: max 1800 seconds (30 mins) per session
    IF p_measured_value > 1800 THEN
      RAISE EXCEPTION 'VALUE_OUT_OF_RANGE: Plank hold duration (% seconds) exceeds maximum allowable single-session limit (1800s).', p_measured_value;
    END IF;

    -- Unit conversion: If challenge target is in minutes, normalize seconds to minutes
    IF v_target_unit_clean LIKE 'min%' THEN
      v_increment := ROUND((p_measured_value / 60.0), 2);
    ELSE
      v_increment := p_measured_value;
    END IF;

  ELSE
    -- Generic safety upper bound for other activities
    IF p_measured_value > 100000 THEN
      RAISE EXCEPTION 'VALUE_OUT_OF_RANGE: Measured value (%) exceeds maximum allowable threshold.', p_measured_value;
    END IF;
    v_increment := p_measured_value;
  END IF;

  -- 8. Replay Protection & Idempotency Check
  IF EXISTS (
    SELECT 1 FROM public.challenge_verification_sessions
    WHERE user_id = v_caller_id AND verification_session_id = p_verification_session_id
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_SESSION: Verification session % has already been committed.', p_verification_session_id;
  END IF;

  -- 9. Atomic Progress Calculation with Row Lock
  SELECT * INTO v_progress
  FROM public.challenge_progress
  WHERE challenge_id = p_challenge_id AND user_id = v_caller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- In the rare event initial progress record is missing, provision it now
    INSERT INTO public.challenge_progress (
      challenge_id,
      user_id,
      current_value,
      target_value,
      progress_percentage,
      challenge_score,
      last_activity_at
    ) VALUES (
      p_challenge_id,
      v_caller_id,
      0,
      v_challenge.target_value,
      0,
      0,
      v_now
    ) RETURNING * INTO v_progress;
  END IF;

  -- Evaluate previous completion status
  v_was_completed := (v_progress.completed_at IS NOT NULL OR v_progress.current_value >= v_challenge.target_value);

  -- Derive new progress and score
  v_target := v_challenge.target_value;
  v_new_current_value := v_progress.current_value + v_increment;
  v_new_score := v_new_current_value; -- Cumulative verified activity volume is challenge score
  v_new_percentage := LEAST(100.0, ROUND((v_new_current_value / GREATEST(v_target, 1.0)) * 100.0, 1));
  v_is_now_completed := (v_new_current_value >= v_target);

  v_completed_at := CASE
    WHEN v_is_now_completed AND v_progress.completed_at IS NULL THEN v_now
    ELSE v_progress.completed_at
  END;

  -- Update authoritative challenge_progress
  UPDATE public.challenge_progress
  SET
    current_value = v_new_current_value,
    challenge_score = v_new_score,
    target_value = v_target,
    progress_percentage = v_new_percentage,
    last_activity_at = v_now,
    completed_at = v_completed_at,
    updated_at = v_now
  WHERE id = v_progress.id;

  -- Update participant status if newly completed
  IF v_is_now_completed AND NOT v_was_completed THEN
    UPDATE public.challenge_participants
    SET status = 'COMPLETED'
    WHERE challenge_id = p_challenge_id AND user_id = v_caller_id;
  END IF;

  -- 10. Record Immutable Verification Session
  INSERT INTO public.challenge_verification_sessions (
    verification_session_id,
    challenge_id,
    user_id,
    activity,
    verification_method,
    measured_value,
    duration_seconds,
    target_value,
    target_unit,
    status,
    is_verified,
    client_metadata,
    committed_at
  ) VALUES (
    p_verification_session_id,
    p_challenge_id,
    v_caller_id,
    v_challenge.activity,
    'AI_VERIFIED',
    p_measured_value,
    COALESCE(p_duration_seconds, 0),
    v_target,
    v_challenge.target_unit,
    'COMMITTED',
    TRUE,
    p_client_metadata,
    v_now
  );

  -- 11. Award FITTRACK Points: Idempotent Ledger
  -- Rule A: AI Verified Workout = +20 points per session (NOT per rep or second)
  INSERT INTO public.fittrack_point_events (
    user_id,
    event_type,
    points,
    challenge_id,
    reference_id,
    description
  ) VALUES (
    v_caller_id,
    'AI_VERIFIED',
    20,
    p_challenge_id,
    p_verification_session_id,
    'AI-verified workout session: ' || v_challenge.activity || ' (+' || v_increment::text || ' ' || v_challenge.target_unit || ')'
  ) ON CONFLICT (user_id, event_type, reference_id) DO NOTHING;

  -- Rule B: Challenge Completion Reward (awarded once upon initial completion)
  IF v_is_now_completed AND NOT v_was_completed THEN
    v_completion_points := COALESCE(v_challenge.points_reward, 100);
    v_points_awarded := v_points_awarded + v_completion_points;

    INSERT INTO public.fittrack_point_events (
      user_id,
      event_type,
      points,
      challenge_id,
      reference_id,
      description
    ) VALUES (
      v_caller_id,
      'CHALLENGE_COMPLETED',
      v_completion_points,
      p_challenge_id,
      p_challenge_id::text,
      'Completed challenge: ' || v_challenge.title
    ) ON CONFLICT (user_id, event_type, reference_id) DO NOTHING;
  END IF;

  -- 12. Return Structured Authoritative Commit Outcome
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

-- Grant execution to authenticated users only
GRANT EXECUTE ON FUNCTION public.commit_ai_verification_session(TEXT, UUID, TEXT, NUMERIC, INT, JSONB) TO authenticated;
