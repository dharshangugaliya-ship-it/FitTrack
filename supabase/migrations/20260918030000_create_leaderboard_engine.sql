-- ==============================================================================
-- FITTRACK: Smart India Hackathon 2026
-- Phase 5 Migration: Challenge Leaderboard Read Model & Deterministic Ranking Engine
-- ==============================================================================

-- 1. Create optimized composite index for challenge leaderboard queries
-- Enables index-only / fast index scans on (challenge_id, challenge_score DESC, completed_at ASC NULLS LAST, created_at ASC)
CREATE INDEX IF NOT EXISTS idx_challenge_progress_leaderboard 
  ON public.challenge_progress (challenge_id, challenge_score DESC, completed_at ASC NULLS LAST, created_at ASC);

-- 2. Create Hardened Security Definer Function to Retrieve Challenge Leaderboard
-- Exposes ONLY the intended public leaderboard fields:
--   challenge_id, rank, user_id, display_name, avatar_url, challenge_score, 
--   progress_percentage, verification_requirement, last_activity_at, completed_at
-- 
-- Strictly protects private participant data:
--   - Does NOT expose email, passwords, private point ledger, auth metadata, or unrelated profiles.
--   - Enforces challenge visibility rules: Private or Draft challenges are accessible ONLY by their organizer or enrolled participants.
--   - Provides deterministic competition ranking using standard DENSE_RANK() or RANK() over (challenge_score DESC, completed_at ASC NULLS LAST, created_at ASC).
--   - Sets explicit search_path = public, pg_temp to prevent schema hijacking / injection attacks.

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_visibility TEXT;
  v_status TEXT;
  v_organizer_id UUID;
  v_caller_id UUID;
  v_is_enrolled BOOLEAN;
BEGIN
  -- Obtain caller's auth id if authenticated
  v_caller_id := auth.uid();

  -- Verify challenge existence & visibility rules
  SELECT visibility, status, organizer_id 
  INTO v_visibility, v_status, v_organizer_id
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- If challenge is PRIVATE or in DRAFT, verify authorization
  IF v_visibility = 'PRIVATE' OR v_status = 'DRAFT' THEN
    -- Organizer has full access
    IF v_caller_id IS NOT NULL AND v_caller_id = v_organizer_id THEN
      -- Authorized as organizer
      NULL;
    ELSE
      -- Check if caller is an enrolled participant
      SELECT EXISTS (
        SELECT 1 FROM public.challenge_participants cp
        WHERE cp.challenge_id = p_challenge_id AND cp.user_id = v_caller_id
      ) INTO v_is_enrolled;

      IF NOT COALESCE(v_is_enrolled, FALSE) THEN
        -- Access denied: return empty set for unauthorized caller
        RETURN;
      END IF;
    END IF;
  END IF;

  -- Return ranked leaderboard entries with verified score > 0
  -- Uses RANK() OVER (ORDER BY cp.challenge_score DESC, cp.completed_at ASC NULLS LAST, cp.created_at ASC)
  -- Join with public.profiles to retrieve display_name and avatar_url securely.
  RETURN QUERY
  WITH ranked_progress AS (
    SELECT
      RANK() OVER (
        ORDER BY 
          cp.challenge_score DESC, 
          cp.completed_at ASC NULLS LAST, 
          cp.created_at ASC
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
    INNER JOIN public.challenges c ON c.id = cp.challenge_id
    INNER JOIN public.profiles p ON p.id = cp.user_id
    WHERE cp.challenge_id = p_challenge_id
      AND cp.challenge_score > 0
  )
  SELECT 
    rp.rank,
    rp.challenge_id,
    rp.user_id,
    rp.display_name,
    rp.avatar_url,
    rp.challenge_score,
    rp.progress_percentage,
    rp.verification_requirement,
    rp.last_activity_at,
    rp.completed_at
  FROM ranked_progress rp
  ORDER BY rp.rank ASC, rp.challenge_score DESC, rp.completed_at ASC NULLS LAST, rp.user_id ASC
  LIMIT LEAST(COALESCE(p_limit, 50), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

-- Grant execution to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_challenge_leaderboard(UUID, INT, INT) TO anon, authenticated;


-- 3. Create Hardened Function to Get a Specific User's Challenge Leaderboard Rank & Entry
-- Allows callers (or participants) to fetch their exact rank even if not in the top N page.
CREATE OR REPLACE FUNCTION public.get_user_challenge_leaderboard_rank(
  p_challenge_id UUID,
  p_user_id UUID
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_progress AS (
    SELECT
      RANK() OVER (
        ORDER BY 
          cp.challenge_score DESC, 
          cp.completed_at ASC NULLS LAST, 
          cp.created_at ASC
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
    INNER JOIN public.challenges c ON c.id = cp.challenge_id
    INNER JOIN public.profiles p ON p.id = cp.user_id
    WHERE cp.challenge_id = p_challenge_id
      AND cp.challenge_score > 0
  )
  SELECT 
    rp.rank,
    rp.challenge_id,
    rp.user_id,
    rp.display_name,
    rp.avatar_url,
    rp.challenge_score,
    rp.progress_percentage,
    rp.verification_requirement,
    rp.last_activity_at,
    rp.completed_at
  FROM ranked_progress rp
  WHERE rp.user_id = p_user_id;
END;
$$;

-- Grant execution to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_user_challenge_leaderboard_rank(UUID, UUID) TO anon, authenticated;
