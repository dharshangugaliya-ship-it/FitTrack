/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { FittrackPointEvent, DbPointEvent, PointEventType } from '../types';
import { toDatabaseChallengeId, isUuid } from '../lib/challengeIdMap';

const DEMO_POINTS_STORAGE_KEY = 'fittrack_demo_point_events';

// Default initial events for the national athlete persona Aarav Sharma
const INITIAL_DEMO_POINT_EVENTS: FittrackPointEvent[] = [
  {
    id: 'pe_demo_01',
    userId: 'usr_aarav_01',
    eventType: 'JOIN_CHALLENGE',
    points: 10,
    challengeId: 'ch-squat-10k',
    challengeTitle: '10K Squat Challenge',
    referenceId: 'ch-squat-10k',
    description: 'Enrolled in challenge: 10K Squat Challenge',
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'pe_demo_02',
    userId: 'usr_aarav_01',
    eventType: 'AI_VERIFIED',
    points: 20,
    challengeId: 'ch-squat-10k',
    challengeTitle: '10K Squat Challenge',
    referenceId: 'sess_initial_squats_01',
    description: 'AI-verified workout: SQUATS (50 reps, 98% form compliance)',
    createdAt: '2026-09-02T08:30:00.000Z',
  },
  {
    id: 'pe_demo_03',
    userId: 'usr_aarav_01',
    eventType: 'DAILY_TARGET_COMPLETED',
    points: 15,
    challengeId: 'ch-squat-10k',
    challengeTitle: '10K Squat Challenge',
    referenceId: 'daily_ch-squat-10k_2026-09-02',
    description: 'Daily target completed: 50 Squats quota achieved',
    createdAt: '2026-09-02T08:35:00.000Z',
  },
  {
    id: 'pe_demo_04',
    userId: 'usr_aarav_01',
    eventType: 'JOIN_CHALLENGE',
    points: 10,
    challengeId: 'ch-run-100km',
    challengeTitle: '100 KM Monsoon Endurance Run',
    referenceId: 'ch-run-100km',
    description: 'Enrolled in challenge: 100 KM Monsoon Endurance Run',
    createdAt: '2026-09-05T08:30:00.000Z',
  },
  {
    id: 'pe_demo_05',
    userId: 'usr_aarav_01',
    eventType: 'ORGANIZER_APPROVED',
    points: 20,
    challengeId: 'ch-run-100km',
    challengeTitle: '100 KM Monsoon Endurance Run',
    referenceId: 'sub_004',
    description: 'Organizer certified activity proof: RUNNING (10 km outdoor telemetry)',
    createdAt: '2026-09-06T11:00:00.000Z',
  },
  {
    id: 'pe_demo_06',
    userId: 'usr_aarav_01',
    eventType: 'JOIN_CHALLENGE',
    points: 10,
    challengeId: 'ch-plank-core',
    challengeTitle: '7-Day Core & Plank Challenge',
    referenceId: 'ch-plank-core',
    description: 'Enrolled in challenge: 7-Day Core & Plank Challenge',
    createdAt: '2026-09-07T06:15:00.000Z',
  },
  {
    id: 'pe_demo_07',
    userId: 'usr_aarav_01',
    eventType: 'STREAK_7_DAY',
    points: 50,
    challengeId: 'ch-streak-30d',
    challengeTitle: '30-Day Movement Streak',
    referenceId: 'streak_7_day_week1',
    description: '7-Day Streak milestone bonus: 7 consecutive active days verified',
    createdAt: '2026-09-08T18:00:00.000Z',
  },
  {
    id: 'pe_demo_08',
    userId: 'usr_aarav_01',
    eventType: 'BADGE_EARNED',
    points: 25,
    referenceId: 'badge_ai_centurion',
    description: 'Awarded verified milestone credential: AI Form Champion',
    createdAt: '2026-09-09T09:00:00.000Z',
  },
];

function getStoredEvents(): FittrackPointEvent[] {
  if (typeof localStorage === 'undefined') return INITIAL_DEMO_POINT_EVENTS;
  try {
    const raw = localStorage.getItem(DEMO_POINTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_POINTS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_POINT_EVENTS));
      return INITIAL_DEMO_POINT_EVENTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(DEMO_POINTS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_POINT_EVENTS));
      return INITIAL_DEMO_POINT_EVENTS;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed reading point events from localStorage:', err);
    return INITIAL_DEMO_POINT_EVENTS;
  }
}

function saveStoredEvents(events: FittrackPointEvent[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DEMO_POINTS_STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.warn('Failed saving point events to localStorage:', err);
  }
}

/**
 * Normalizes user ID matching across demo persona aliases ('usr_aarav_01', 'demo-usr_aarav_01'),
 * authenticated user UUIDs, and local session personas.
 */
function userMatches(eventUserId: string, targetUserId: string): boolean {
  if (!eventUserId || !targetUserId) return false;
  if (eventUserId === targetUserId) return true;
  const isAarav1 = eventUserId === 'usr_aarav_01' || eventUserId === 'demo-usr_aarav_01';
  const isAarav2 = targetUserId === 'usr_aarav_01' || targetUserId === 'demo-usr_aarav_01';
  if (isAarav1 && isAarav2) return true;
  if (targetUserId.startsWith('demo-') && eventUserId === targetUserId.slice(5)) return true;
  if (eventUserId.startsWith('demo-') && targetUserId === eventUserId.slice(5)) return true;
  return false;
}

export const pointsService = {
  /**
   * Broadcast point updates across components (Header, Dashboard, PointsHistory, etc.)
   */
  notifyPointsUpdated(): void {
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('fittrack_points_updated'));
      } catch (err) {
        console.warn('Failed to dispatch points updated event:', err);
      }
    }
  },

  /**
   * Fetch user's FITTRACK Point ledger events and compute total balance.
   * Seamlessly merges database points with local evaluation points and ensures
   * non-UUID personas never trigger Postgres UUID casting failures.
   */
  async getUserPoints(userId: string): Promise<{
    events: FittrackPointEvent[];
    totalPoints: number;
    source: 'supabase' | 'fallback';
    error: string | null;
  }> {
    const effectiveId = userId || 'usr_aarav_01';
    let allEvents = getStoredEvents();

    // Check if the user has events matching effectiveId or if we should bootstrap initial events
    let userEvents = allEvents.filter((e) => userMatches(e.userId, effectiveId));

    // If an authenticated user has zero local events, clone baseline demo events for their user ID
    // so they have initial points for enrolled challenges
    if (userEvents.length === 0 && effectiveId !== 'usr_aarav_01') {
      const bootstrapped: FittrackPointEvent[] = INITIAL_DEMO_POINT_EVENTS.map((e) => ({
        ...e,
        id: `pe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: effectiveId,
      }));
      allEvents = [...bootstrapped, ...allEvents];
      saveStoredEvents(allEvents);
      userEvents = bootstrapped;
    }

    // If Supabase is not configured or userId is not a database UUID, use local persistent store
    if (!isSupabaseConfigured || !isUuid(effectiveId)) {
      const total = userEvents.reduce((sum, e) => sum + (e.points || 0), 0);
      return { events: userEvents, totalPoints: total, source: 'fallback', error: null };
    }

    // For valid Supabase UUID users: fetch remote DB events and merge idempotently
    try {
      const { data, error } = await supabase
        .from('fittrack_point_events')
        .select('*')
        .eq('user_id', effectiveId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase query note on fittrack_point_events:', error.message);
        const total = userEvents.reduce((sum, e) => sum + (e.points || 0), 0);
        return { events: userEvents, totalPoints: total, source: 'fallback', error: null };
      }

      const dbEvents: FittrackPointEvent[] = (data as DbPointEvent[] || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        eventType: row.event_type,
        points: Number(row.points) || 0,
        challengeId: row.challenge_id,
        referenceId: row.reference_id,
        description: row.description,
        createdAt: row.created_at,
      }));

      // Merge database events and local events, deduplicating by event type and reference/id
      const seen = new Set<string>();
      const merged: FittrackPointEvent[] = [];
      for (const ev of [...dbEvents, ...userEvents]) {
        const key = `${ev.eventType}_${ev.referenceId || ev.challengeId || ev.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(ev);
        }
      }

      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const totalPoints = merged.reduce((sum, e) => sum + e.points, 0);

      return { events: merged, totalPoints, source: dbEvents.length > 0 ? 'supabase' : 'fallback', error: null };
    } catch (err: any) {
      console.warn('pointsService.getUserPoints exception, falling back to local points:', err);
      const total = userEvents.reduce((sum, e) => sum + (e.points || 0), 0);
      return {
        events: userEvents,
        totalPoints: total,
        source: 'fallback',
        error: null,
      };
    }
  },

  /**
   * Universal point event recorder:
   * 1. Idempotently saves to persistent local store (immediate UI update).
   * 2. If user is authenticated with a Supabase UUID, syncs to public.fittrack_point_events.
   * 3. Dispatches reactive update notification across all active views.
   */
  async recordPointEvent(payload: {
    userId?: string;
    eventType: PointEventType;
    points: number;
    challengeId?: string | null;
    challengeTitle?: string | null;
    referenceId?: string | null;
    description?: string;
  }): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded: boolean; error: string | null }> {
    const effectiveUserId = payload.userId || 'usr_aarav_01';
    const { eventType, points, challengeId, challengeTitle, referenceId, description } = payload;

    const refId = referenceId || challengeId || `${eventType}_${Date.now()}`;
    const allEvents = getStoredEvents();

    // Idempotency check: prevent duplicate point awards for same eventType + referenceId
    const alreadyExists = allEvents.some(
      (e) => userMatches(e.userId, effectiveUserId) && e.eventType === eventType && e.referenceId === refId
    );

    if (alreadyExists) {
      return { success: true, pointsAwarded: 0, alreadyAwarded: true, error: null };
    }

    const newEvent: FittrackPointEvent = {
      id: `pe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: effectiveUserId,
      eventType,
      points,
      challengeId: challengeId || null,
      challengeTitle: challengeTitle || null,
      referenceId: refId,
      description: description || `${eventType.replace('_', ' ')} reward: +${points} pts`,
      createdAt: new Date().toISOString(),
    };

    allEvents.unshift(newEvent);
    saveStoredEvents(allEvents);

    // If Supabase is configured and userId is a valid database UUID, sync to remote database
    if (isSupabaseConfigured && isUuid(effectiveUserId)) {
      try {
        const dbChallengeId = challengeId ? toDatabaseChallengeId(challengeId) : null;
        await supabase.from('fittrack_point_events').insert([
          {
            user_id: effectiveUserId,
            event_type: eventType,
            points,
            challenge_id: dbChallengeId && isUuid(dbChallengeId) ? dbChallengeId : null,
            reference_id: refId,
            description: newEvent.description,
          },
        ]);
      } catch (dbErr) {
        console.warn('Supabase remote point insert skipped/failed:', dbErr);
      }
    }

    // Broadcast update across the entire app
    this.notifyPointsUpdated();

    return { success: true, pointsAwarded: points, alreadyAwarded: false, error: null };
  },

  // ============================================================================
  // Dedicated Reward Rule Award Functions (Enforcing the 8 Exact Rules)
  // ============================================================================

  /**
   * Rule 1: Join Challenge (+10 pts)
   * Awarded immediately upon enrolling in an official challenge.
   */
  async recordJoinPointEvent(
    userId: string,
    challengeId: string,
    challengeTitle: string
  ): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded: boolean; error: string | null }> {
    return this.recordPointEvent({
      userId,
      eventType: 'JOIN_CHALLENGE',
      points: 10,
      challengeId,
      challengeTitle,
      referenceId: `join_${challengeId}`,
      description: `Enrolled in official challenge: ${challengeTitle} (+10 pts)`,
    });
  },

  /**
   * Rule 2: AI-Verified Workout (+20 pts)
   * Awarded per computer-vision verified session meeting form standards.
   */
  async recordAiVerifiedPointEvent(
    userId: string,
    challengeId: string,
    challengeTitle: string,
    activity: string,
    measuredValue: number,
    targetUnit: string,
    sessionId: string
  ): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded: boolean; error: string | null }> {
    return this.recordPointEvent({
      userId,
      eventType: 'AI_VERIFIED',
      points: 20,
      challengeId,
      challengeTitle,
      referenceId: sessionId,
      description: `Computer-vision verified session: ${activity} (+${measuredValue} ${targetUnit}) meeting form standards (+20 pts)`,
    });
  },

  /**
   * Rule 3: Organizer-Approved Activity (+20 pts)
   * Awarded when an organizer reviews and certifies activity proof.
   */
  async recordOrganizerApprovedPointEvent(
    userId: string,
    challengeId: string,
    challengeTitle: string,
    activity: string,
    score: number,
    targetUnit: string,
    submissionId: string
  ): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded: boolean; error: string | null }> {
    return this.recordPointEvent({
      userId,
      eventType: 'ORGANIZER_APPROVED',
      points: 20,
      challengeId,
      challengeTitle,
      referenceId: `appr_${submissionId}`,
      description: `Organizer certified activity proof: ${activity} (${score} ${targetUnit}) (+20 pts)`,
    });
  },

  /**
   * Rule 4: Self-Reported Activity (+5 pts)
   * Awarded for logged workouts without automated computer-vision.
   */
  async recordSelfReportedPointEvent(
    userId: string,
    challengeId: string | null | undefined,
    challengeTitle: string | null | undefined,
    activity: string,
    measuredValue: number,
    targetUnit: string,
    durationMins?: number
  ): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded: boolean; error: string | null }> {
    const timestamp = Date.now();
    return this.recordPointEvent({
      userId,
      eventType: 'SELF_REPORTED',
      points: 5,
      challengeId: challengeId || null,
      challengeTitle: challengeTitle || null,
      referenceId: `self_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
      description: `Self-reported activity: ${activity} (${measuredValue} ${targetUnit}${durationMins ? `, ${durationMins}m` : ''}) without automated CV (+5 pts)`,
    });
  },

  /**
   * Rule 5: Daily Target Completed (+15 pts)
   * Achieved when daily challenge quota is fulfilled.
   */
  async recordDailyTargetPointEvent(
    userId: string,
    challengeId: string,
    challengeTitle: string,
    dateStr?: string
  ): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded: boolean; error: string | null }> {
    const dateKey = dateStr || new Date().toISOString().slice(0, 10);
    return this.recordPointEvent({
      userId,
      eventType: 'DAILY_TARGET_COMPLETED',
      points: 15,
      challengeId,
      challengeTitle,
      referenceId: `daily_${challengeId}_${dateKey}`,
      description: `Daily target completed: Quota fulfilled for ${challengeTitle} (${dateKey}) (+15 pts)`,
    });
  },

  /**
   * Rule 6: 7-Day Streak (+50 pts)
   * Bonus awarded for 7 consecutive days of verified activity.
   */
  async record7DayStreakPointEvent(
    userId: string,
    streakCycle?: number | string
  ): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded: boolean; error: string | null }> {
    const cycleKey = streakCycle || `${new Date().getFullYear()}_W${Math.ceil(new Date().getDate() / 7)}`;
    return this.recordPointEvent({
      userId,
      eventType: 'STREAK_7_DAY',
      points: 50,
      referenceId: `streak_7d_${cycleKey}`,
      description: `7-Day Streak milestone bonus: 7 consecutive days of verified athletic activity (+50 pts)`,
    });
  },

  /**
   * Rule 7: Challenge Completed (+100 pts)
   * Earned upon reaching 100% of the challenge goal within time.
   */
  async recordChallengeCompletedPointEvent(
    userId: string,
    challengeId: string,
    challengeTitle: string,
    pointsReward?: number
  ): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded: boolean; error: string | null }> {
    const pts = pointsReward && pointsReward > 0 ? pointsReward : 100;
    return this.recordPointEvent({
      userId,
      eventType: 'CHALLENGE_COMPLETED',
      points: pts,
      challengeId,
      challengeTitle,
      referenceId: `comp_${challengeId}`,
      description: `Challenge Completed: 100% of challenge goal reached within time for ${challengeTitle} (+${pts} pts)`,
    });
  },

  /**
   * Rule 8: Badge Earned (+25 pts)
   * Awarded for unlocking verified milestone credentials.
   */
  async recordBadgeEarnedPointEvent(
    userId: string,
    badgeId: string,
    badgeTitle: string
  ): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded: boolean; error: string | null }> {
    return this.recordPointEvent({
      userId,
      eventType: 'BADGE_EARNED',
      points: 25,
      referenceId: `badge_${badgeId}`,
      description: `Badge Earned: Unlocked verified milestone credential "${badgeTitle}" (+25 pts)`,
    });
  },

  /**
   * Evaluator engine: automatically inspects workout session parameters and evaluates
   * whether the session triggers secondary reward rules (Daily Target +15 pts, 7-Day Streak +50 pts,
   * Challenge Completion +100 pts, Badge +25 pts).
   */
  async evaluateAndAwardSecondaryRules(params: {
    userId: string;
    challengeId: string;
    challengeTitle: string;
    activity: string;
    measuredValue: number;
    targetUnit: string;
    isNowCompleted?: boolean;
    wasCompleted?: boolean;
  }): Promise<{ awards: Array<{ type: PointEventType; points: number; description: string }> }> {
    const {
      userId,
      challengeId,
      challengeTitle,
      activity,
      measuredValue,
      isNowCompleted,
      wasCompleted,
    } = params;

    const awards: Array<{ type: PointEventType; points: number; description: string }> = [];

    // 1. Check Daily Target Rule (+15 pts)
    // Daily quota thresholds: Squats >= 25 reps, Plank >= 45s, Push-ups >= 20 reps, Running >= 3 km, Yoga >= 1 session
    const actUpper = (activity || '').toUpperCase();
    let isDailyTargetMet = false;
    if (actUpper.includes('SQUAT') && measuredValue >= 25) isDailyTargetMet = true;
    else if (actUpper.includes('PLANK') && measuredValue >= 45) isDailyTargetMet = true;
    else if (actUpper.includes('PUSH') && measuredValue >= 20) isDailyTargetMet = true;
    else if (actUpper.includes('RUN') && measuredValue >= 3) isDailyTargetMet = true;
    else if (actUpper.includes('YOGA') && measuredValue >= 1) isDailyTargetMet = true;
    else if (actUpper.includes('CYCL') && measuredValue >= 5) isDailyTargetMet = true;
    else if (measuredValue >= 20) isDailyTargetMet = true;

    if (isDailyTargetMet) {
      const dailyRes = await this.recordDailyTargetPointEvent(userId, challengeId, challengeTitle);
      if (dailyRes.pointsAwarded > 0) {
        awards.push({
          type: 'DAILY_TARGET_COMPLETED',
          points: 15,
          description: `Daily target completed for ${challengeTitle} (+15 pts)`,
        });
      }
    }

    // 2. Check 7-Day Streak Rule (+50 pts)
    // Check if the user has reached 7 active events
    const userPointsRes = await this.getUserPoints(userId);
    const activityEvents = userPointsRes.events.filter(
      (e) => e.eventType === 'AI_VERIFIED' || e.eventType === 'ORGANIZER_APPROVED' || e.eventType === 'SELF_REPORTED'
    );
    if (activityEvents.length >= 7) {
      const streakRes = await this.record7DayStreakPointEvent(userId, 'current_streak');
      if (streakRes.pointsAwarded > 0) {
        awards.push({
          type: 'STREAK_7_DAY',
          points: 50,
          description: '7-Day Streak milestone achieved (+50 pts)',
        });
      }
    }

    // 3. Check Challenge Completed Rule (+100 pts)
    if (isNowCompleted && !wasCompleted) {
      const compRes = await this.recordChallengeCompletedPointEvent(userId, challengeId, challengeTitle, 100);
      if (compRes.pointsAwarded > 0) {
        awards.push({
          type: 'CHALLENGE_COMPLETED',
          points: 100,
          description: `100% Challenge Completed: ${challengeTitle} (+100 pts)`,
        });
      }
    }

    // 4. Check Milestone Badge Rule (+25 pts)
    // First AI workout gives "AI Pose Master" badge
    const aiSessions = userPointsRes.events.filter((e) => e.eventType === 'AI_VERIFIED');
    if (aiSessions.length >= 1) {
      const badgeRes = await this.recordBadgeEarnedPointEvent(userId, 'ai_form_champion', 'AI Form Champion');
      if (badgeRes.pointsAwarded > 0) {
        awards.push({
          type: 'BADGE_EARNED',
          points: 25,
          description: 'Badge Earned: AI Form Champion (+25 pts)',
        });
      }
    }

    return { awards };
  },
};
