-- ==============================================================================
-- FITTRACK: Smart India Hackathon 2026
-- Phase 6 Migration: Organizer Hardening, Metrics Aggregation & State Management
-- ==============================================================================

-- 1. Ensure composite index for fast organizer challenge retrieval
CREATE INDEX IF NOT EXISTS idx_challenges_organizer_status 
  ON public.challenges(organizer_id, status, created_at DESC);

-- 2. Hardened RPC for aggregated organizer metrics
-- Calculates totals strictly for the authenticated organizer's owned challenges
CREATE OR REPLACE FUNCTION public.get_organizer_metrics(p_organizer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_result JSONB;
BEGIN
  -- Strict Authorization: The caller must be authenticated and requesting their own metrics
  IF v_caller IS NULL OR v_caller != p_organizer_id THEN
    RAISE EXCEPTION 'Access denied: cannot read organizer metrics for another user';
  END IF;

  SELECT jsonb_build_object(
    'total_challenges', COALESCE(COUNT(*), 0),
    'active_challenges', COALESCE(COUNT(*) FILTER (WHERE status = 'ACTIVE'), 0),
    'published_challenges', COALESCE(COUNT(*) FILTER (WHERE status = 'PUBLISHED'), 0),
    'draft_challenges', COALESCE(COUNT(*) FILTER (WHERE status = 'DRAFT'), 0),
    'completed_challenges', COALESCE(COUNT(*) FILTER (WHERE status = 'COMPLETED'), 0),
    'total_participants', COALESCE(SUM(participant_count), 0),
    'total_points_reward_pool', COALESCE(SUM(points_reward), 0)
  )
  INTO v_result
  FROM public.challenges
  WHERE organizer_id = p_organizer_id;

  RETURN v_result;
END;
$$;

-- 3. Hardened RPC for organizer challenge participant monitoring
-- Allows an organizer to inspect the participants & progress of a challenge THEY own
CREATE OR REPLACE FUNCTION public.get_organizer_challenge_participants(
  p_challenge_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  participant_id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ,
  current_value NUMERIC,
  target_value NUMERIC,
  progress_percentage NUMERIC,
  challenge_score NUMERIC,
  last_activity_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_owner UUID;
BEGIN
  -- Verify ownership of the challenge
  SELECT organizer_id INTO v_owner
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  IF v_caller IS NULL OR v_caller != v_owner THEN
    RAISE EXCEPTION 'Access denied: caller is not the organizer of this challenge';
  END IF;

  -- Return participant rows with progress and sanitized profile data
  RETURN QUERY
  SELECT
    cp.id AS participant_id,
    cp.user_id,
    COALESCE(p.display_name, 'Anonymous Athlete')::TEXT AS display_name,
    COALESCE(p.avatar_url, '')::TEXT AS avatar_url,
    cp.status::TEXT,
    cp.joined_at,
    COALESCE(prog.current_value, 0)::NUMERIC AS current_value,
    COALESCE(prog.target_value, c.target_value)::NUMERIC AS target_value,
    COALESCE(prog.progress_percentage, 0)::NUMERIC AS progress_percentage,
    COALESCE(prog.challenge_score, 0)::NUMERIC AS challenge_score,
    prog.last_activity_at,
    prog.completed_at
  FROM public.challenge_participants cp
  JOIN public.challenges c ON c.id = cp.challenge_id
  LEFT JOIN public.profiles p ON p.id = cp.user_id
  LEFT JOIN public.challenge_progress prog ON prog.challenge_id = cp.challenge_id AND prog.user_id = cp.user_id
  WHERE cp.challenge_id = p_challenge_id
  ORDER BY COALESCE(prog.challenge_score, 0) DESC, cp.joined_at ASC
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

-- 4. Hardened RPC for organizer challenge status transitions
-- Allows an organizer to transition their challenge between validated lifecycle states
CREATE OR REPLACE FUNCTION public.update_challenge_status(
  p_challenge_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_current_status TEXT;
  v_owner UUID;
  v_updated_at TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- Validate target status
  IF p_new_status NOT IN ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid challenge status: %', p_new_status;
  END IF;

  -- Fetch challenge record
  SELECT status, organizer_id INTO v_current_status, v_owner
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  -- Validate caller is the owner
  IF v_caller IS NULL OR v_caller != v_owner THEN
    RAISE EXCEPTION 'Access denied: only the challenge organizer can update its status';
  END IF;

  -- Validate lifecycle transition rules:
  -- DRAFT -> PUBLISHED, ACTIVE, CANCELLED
  -- PUBLISHED -> ACTIVE, CANCELLED
  -- ACTIVE -> COMPLETED, CANCELLED
  -- COMPLETED -> CANNOT transition back to DRAFT or ACTIVE
  -- CANCELLED -> CANNOT transition
  IF v_current_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'A cancelled challenge cannot have its status modified';
  END IF;

  IF v_current_status = 'COMPLETED' AND p_new_status IN ('DRAFT', 'ACTIVE', 'PUBLISHED') THEN
    RAISE EXCEPTION 'A completed challenge cannot be reopened to %', p_new_status;
  END IF;

  UPDATE public.challenges
  SET status = p_new_status,
      updated_at = v_updated_at
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object(
    'success', true,
    'challenge_id', p_challenge_id,
    'previous_status', v_current_status,
    'new_status', p_new_status,
    'updated_at', v_updated_at
  );
END;
$$;
