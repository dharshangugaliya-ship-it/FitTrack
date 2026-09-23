-- ==============================================================================
-- FITTRACK: Smart India Hackathon 2026
-- Phase 2 Migration: Profiles Table, Security Policies & Automatic User Trigger
-- ==============================================================================

-- 1. Create Profiles Table linked to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT NULL,
  mode TEXT NOT NULL DEFAULT 'challenger' CHECK (mode IN ('challenger', 'organizer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for lookup performance
CREATE INDEX IF NOT EXISTS idx_profiles_mode ON public.profiles(mode);

-- 2. Enable Row Level Security (RLS) - Mandatory
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Ensure users can ONLY access and modify their own profile data
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Automatically maintain updated_at timestamp on record changes
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

-- 5. Trigger to automatically provision a profile row when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_display_name TEXT;
BEGIN
  -- Extract display name from metadata or derive from email prefix
  default_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1),
    'Challenger'
  );

  INSERT INTO public.profiles (id, display_name, mode)
  VALUES (NEW.id, default_display_name, 'challenger')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution on auth.users after insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
-- ==============================================================================
-- FITTRACK: Smart India Hackathon 2026
-- Phase 3 Migration: Challenges & Challenge Participation with Row-Level Security
-- ==============================================================================

-- 1. Ensure public.profiles has public select permission for display names
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- 2. Create Challenges Table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_visibility ON public.challenges(visibility);
CREATE INDEX IF NOT EXISTS idx_challenges_start_date ON public.challenges(start_date);
CREATE INDEX IF NOT EXISTS idx_challenges_end_date ON public.challenges(end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_organizer_id ON public.challenges(organizer_id);
CREATE INDEX IF NOT EXISTS idx_challenges_type ON public.challenges(type);
CREATE INDEX IF NOT EXISTS idx_challenges_activity ON public.challenges(activity);

-- 3. Enable RLS on challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Challenge RLS Policies:
-- Anyone (authenticated or public) can discover published/active public challenges
DROP POLICY IF EXISTS "Public challenges are viewable by everyone" ON public.challenges;
CREATE POLICY "Public challenges are viewable by everyone"
  ON public.challenges
  FOR SELECT
  USING (
    visibility = 'PUBLIC' AND status IN ('PUBLISHED', 'ACTIVE', 'COMPLETED')
  );

-- Organizers can view ALL their own challenges (including drafts)
DROP POLICY IF EXISTS "Organizers can view own challenges" ON public.challenges;
CREATE POLICY "Organizers can view own challenges"
  ON public.challenges
  FOR SELECT
  USING (auth.uid() = organizer_id);

-- Organizers can insert their own challenges
DROP POLICY IF EXISTS "Organizers can insert own challenges" ON public.challenges;
CREATE POLICY "Organizers can insert own challenges"
  ON public.challenges
  FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

-- Organizers can update their own challenges
DROP POLICY IF EXISTS "Organizers can update own challenges" ON public.challenges;
CREATE POLICY "Organizers can update own challenges"
  ON public.challenges
  FOR UPDATE
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

-- Organizers can delete their own challenges
DROP POLICY IF EXISTS "Organizers can delete own challenges" ON public.challenges;
CREATE POLICY "Organizers can delete own challenges"
  ON public.challenges
  FOR DELETE
  USING (auth.uid() = organizer_id);

-- 4. Create Challenge Participants Table
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  status TEXT NOT NULL DEFAULT 'JOINED' CHECK (status IN ('JOINED', 'COMPLETED', 'LEFT')),
  CONSTRAINT unique_challenge_participant UNIQUE (challenge_id, user_id)
);

-- Indexes for participation lookups
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON public.challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON public.challenge_participants(challenge_id);

-- 5. Enable RLS on challenge_participants
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Participants can view ONLY their own participation records
DROP POLICY IF EXISTS "Users can view own participation" ON public.challenge_participants;
CREATE POLICY "Users can view own participation"
  ON public.challenge_participants
  FOR SELECT
  USING (auth.uid() = user_id);

-- Challenge organizers can view participants in their challenges
DROP POLICY IF EXISTS "Organizers can view participants of own challenges" ON public.challenge_participants;
CREATE POLICY "Organizers can view participants of own challenges"
  ON public.challenge_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.organizer_id = auth.uid()
    )
  );

-- Authenticated users can insert their own participation (join challenge)
DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
CREATE POLICY "Users can join challenges"
  ON public.challenge_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own participation (leave challenge)
DROP POLICY IF EXISTS "Users can leave challenges" ON public.challenge_participants;
CREATE POLICY "Users can leave challenges"
  ON public.challenge_participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Trigger to automatically and securely update participant_count on challenges
CREATE OR REPLACE FUNCTION public.handle_challenge_participant_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_challenge_participant_changed ON public.challenge_participants;
CREATE TRIGGER on_challenge_participant_changed
  AFTER INSERT OR DELETE ON public.challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_challenge_participant_count();

-- 7. Trigger to maintain challenges.updated_at
DROP TRIGGER IF EXISTS on_challenge_updated ON public.challenges;
CREATE TRIGGER on_challenge_updated
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 8. Controlled Development & Demo Seed Script
-- ==============================================================================
DO $$
DECLARE
  v_organizer_id UUID;
BEGIN
  -- Look for an existing organizer or any profile
  SELECT id INTO v_organizer_id FROM public.profiles LIMIT 1;

  -- If an organizer profile is available, insert seed challenges
  IF v_organizer_id IS NOT NULL THEN
    -- 1. 10K Squat Challenge
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

    -- 2. 30-Day Movement Streak
    INSERT INTO public.challenges (
      id, organizer_id, title, description, type, activity,
      target_value, target_unit, start_date, end_date,
      verification_requirement, visibility, status, participant_count,
      points_reward, difficulty, banner_url, organizer_name, organizer_avatar
    ) VALUES (
      '11111111-1111-1111-1111-111111111102',
      v_organizer_id,
      '30-Day Movement Streak',
      'Build unbreakable daily consistency. Complete at least 20 minutes of verified physical activity every day for 30 consecutive days.',
      'CONSISTENCY',
      'WALKING',
      30,
      'days',
      timezone('utc'::text, now()) - interval '7 days',
      timezone('utc'::text, now()) + interval '23 days',
      'DEVICE_VERIFIED',
      'PUBLIC',
      'ACTIVE',
      14210,
      300,
      'Intermediate',
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80',
      'Fit India Initiative',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80'
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. 100 KM India Running Challenge
    INSERT INTO public.challenges (
      id, organizer_id, title, description, type, activity,
      target_value, target_unit, start_date, end_date,
      verification_requirement, visibility, status, participant_count,
      points_reward, difficulty, banner_url, organizer_name, organizer_avatar
    ) VALUES (
      '11111111-1111-1111-1111-111111111103',
      v_organizer_id,
      '100 KM India Running Challenge',
      'Clock 100 kilometers of outdoor or treadmill running verified through GPS activity tracking and wearable sync.',
      'ACTIVITY',
      'RUNNING',
      100,
      'km',
      timezone('utc'::text, now()) - interval '10 days',
      timezone('utc'::text, now()) + interval '20 days',
      'DEVICE_VERIFIED',
      'PUBLIC',
      'ACTIVE',
      6180,
      200,
      'Intermediate',
      'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop&q=80',
      'All-India Athletic Federation',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80'
    ) ON CONFLICT (id) DO NOTHING;

    -- 4. 7-Day Core & Plank Challenge
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

    -- 5. National Sports Day Push-Up Challenge
    INSERT INTO public.challenges (
      id, organizer_id, title, description, type, activity,
      target_value, target_unit, start_date, end_date,
      verification_requirement, visibility, status, participant_count,
      points_reward, difficulty, banner_url, organizer_name, organizer_avatar
    ) VALUES (
      '11111111-1111-1111-1111-111111111105',
      v_organizer_id,
      'National Sports Day Push-Up Challenge',
      'Celebrate national athletic spirit by completing 500 verified push-ups. Form coach monitors 90-degree elbow flexion.',
      'EVENT',
      'PUSH_UPS',
      500,
      'reps',
      timezone('utc'::text, now()) + interval '2 days',
      timezone('utc'::text, now()) + interval '17 days',
      'AI_VERIFIED',
      'PUBLIC',
      'PUBLISHED',
      4920,
      180,
      'Intermediate',
      'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&auto=format&fit=crop&q=80',
      'Ministry of Youth Affairs',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&auto=format&fit=crop&q=80'
    ) ON CONFLICT (id) DO NOTHING;

    -- 6. Morning Asana & Flexibility Flow
    INSERT INTO public.challenges (
      id, organizer_id, title, description, type, activity,
      target_value, target_unit, start_date, end_date,
      verification_requirement, visibility, status, participant_count,
      points_reward, difficulty, banner_url, organizer_name, organizer_avatar
    ) VALUES (
      '11111111-1111-1111-1111-111111111106',
      v_organizer_id,
      'Morning Asana & Flexibility Flow',
      'Practice 14 morning sessions focusing on flexibility and breath control. Log your practice routine with verified daily check-ins.',
      'ACTIVITY',
      'YOGA',
      14,
      'sessions',
      timezone('utc'::text, now()) - interval '4 days',
      timezone('utc'::text, now()) + interval '10 days',
      'SELF_REPORTED',
      'PUBLIC',
      'ACTIVE',
      5600,
      100,
      'Beginner',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
      'International Yoga Chapter',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
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
