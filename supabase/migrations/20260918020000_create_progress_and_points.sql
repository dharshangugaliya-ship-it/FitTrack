-- ==============================================================================
-- FITTRACK: Smart India Hackathon 2026
-- Phase 4 Migration: Challenge Progress, FITTRACK Points Ledger & Secure Triggers
-- ==============================================================================

-- 1. Create Challenge Progress Table
-- Tracks individual participant progress and challenge-specific score per challenge.
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

-- Indexes for progress lookups
CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON public.challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge ON public.challenge_progress(challenge_id);

-- Enable RLS on challenge_progress
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

-- Challenger RLS: Users can view ONLY their own progress
DROP POLICY IF EXISTS "Users can view own progress" ON public.challenge_progress;
CREATE POLICY "Users can view own progress"
  ON public.challenge_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Organizer RLS: Organizers can view participant progress for their own challenges
DROP POLICY IF EXISTS "Organizers can view participant progress" ON public.challenge_progress;
CREATE POLICY "Organizers can view participant progress"
  ON public.challenge_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.organizer_id = auth.uid()
    )
  );

-- Note: No INSERT, UPDATE, or DELETE policies for public clients.
-- Progress is maintained strictly via verified activity engines and database triggers.


-- 2. Create FITTRACK Point Events Ledger Table
-- Authoritative append-only event ledger for all FITTRACK Point rewards.
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

-- Indexes for points queries
CREATE INDEX IF NOT EXISTS idx_point_events_user ON public.fittrack_point_events(user_id);
CREATE INDEX IF NOT EXISTS idx_point_events_created_at ON public.fittrack_point_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_events_challenge ON public.fittrack_point_events(challenge_id);

-- Enable RLS on fittrack_point_events
ALTER TABLE public.fittrack_point_events ENABLE ROW LEVEL SECURITY;

-- Point Events RLS: Users can view ONLY their own point events
DROP POLICY IF EXISTS "Users can view own point events" ON public.fittrack_point_events;
CREATE POLICY "Users can view own point events"
  ON public.fittrack_point_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Note: No INSERT, UPDATE, or DELETE policies for public clients.
-- Users CANNOT arbitrarily insert or modify points. Points are awarded solely via triggers and verified services.


-- 3. Automated Trigger for Challenge Join Points and Progress Provisioning
-- When a user is inserted into public.challenge_participants:
--   a) Awards +10 FITTRACK points idempotently (one JOIN_CHALLENGE event per user+challenge).
--   b) Provisions an initial challenge_progress record with current_value = 0, score = 0.
CREATE OR REPLACE FUNCTION public.handle_challenge_participant_joined()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to challenge_participants table
DROP TRIGGER IF EXISTS on_challenge_participant_joined ON public.challenge_participants;
CREATE TRIGGER on_challenge_participant_joined
  AFTER INSERT ON public.challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_challenge_participant_joined();


-- 4. Clean up progress if participant withdraws/leaves challenge
CREATE OR REPLACE FUNCTION public.handle_challenge_participant_left()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.challenge_progress
  WHERE challenge_id = OLD.challenge_id AND user_id = OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_challenge_participant_left ON public.challenge_participants;
CREATE TRIGGER on_challenge_participant_left
  AFTER DELETE ON public.challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_challenge_participant_left();
