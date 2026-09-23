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
