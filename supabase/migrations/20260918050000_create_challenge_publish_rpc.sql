-- ==============================================================================
-- FITTRACK: Smart India Hackathon 2026
-- Phase 7 Migration: Hardened Challenge Draft Creation & Publishing RPCs
-- ==============================================================================

-- 1. Hardened RPC for publishing a draft challenge
-- Validates:
--   - Caller must be authenticated
--   - Caller must be the challenge organizer (auth.uid() = organizer_id)
--   - Challenge must currently be in 'DRAFT' status
--   - Required fields must be non-empty and mathematically valid
--   - End date must not precede start date
--   - Target value must be greater than zero
CREATE OR REPLACE FUNCTION public.publish_organizer_challenge(
  p_challenge_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_challenge public.challenges%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required to publish challenge';
  END IF;

  -- Lock and retrieve challenge row
  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  IF v_challenge.organizer_id != v_caller THEN
    RAISE EXCEPTION 'Access denied: caller is not the organizer of this challenge';
  END IF;

  IF v_challenge.status != 'DRAFT' THEN
    RAISE EXCEPTION 'Challenge cannot be published from its current status (%)', v_challenge.status;
  END IF;

  -- Validate configuration completeness
  IF TRIM(COALESCE(v_challenge.title, '')) = '' THEN
    RAISE EXCEPTION 'Challenge title cannot be blank';
  END IF;

  IF TRIM(COALESCE(v_challenge.description, '')) = '' THEN
    RAISE EXCEPTION 'Challenge description cannot be blank';
  END IF;

  IF v_challenge.target_value IS NULL OR v_challenge.target_value <= 0 THEN
    RAISE EXCEPTION 'Target goal value must be greater than zero';
  END IF;

  IF TRIM(COALESCE(v_challenge.target_unit, '')) = '' THEN
    RAISE EXCEPTION 'Target unit cannot be blank';
  END IF;

  IF v_challenge.end_date < v_challenge.start_date THEN
    RAISE EXCEPTION 'End date cannot precede start date';
  END IF;

  -- Transition status to PUBLISHED (or ACTIVE if start_date <= now)
  UPDATE public.challenges
  SET
    status = CASE
      WHEN start_date <= timezone('utc'::text, now()) AND end_date >= timezone('utc'::text, now()) THEN 'ACTIVE'
      ELSE 'PUBLISHED'
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object(
    'success', true,
    'challenge_id', p_challenge_id,
    'new_status', CASE
      WHEN v_challenge.start_date <= timezone('utc'::text, now()) AND v_challenge.end_date >= timezone('utc'::text, now()) THEN 'ACTIVE'
      ELSE 'PUBLISHED'
    END
  );
END;
$$;
