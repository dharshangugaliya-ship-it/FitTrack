/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { FittrackPointEvent, DbPointEvent } from '../types';

const DEMO_POINTS_STORAGE_KEY = 'fittrack_demo_point_events';

// Default initial demo events for evaluation persona Aarav Sharma
const INITIAL_DEMO_POINT_EVENTS: FittrackPointEvent[] = [
  {
    id: 'pe_demo_01',
    userId: 'usr_aarav_01',
    eventType: 'JOIN_CHALLENGE',
    points: 10,
    challengeId: 'ch-squat-10k',
    challengeTitle: '10K Squat Challenge',
    referenceId: 'ch-squat-10k',
    description: 'Joined challenge: 10K Squat Challenge [Evaluation Demo]',
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'pe_demo_02',
    userId: 'usr_aarav_01',
    eventType: 'JOIN_CHALLENGE',
    points: 10,
    challengeId: 'ch-run-100km',
    challengeTitle: '100 KM Monsoon Endurance Run',
    referenceId: 'ch-run-100km',
    description: 'Joined challenge: 100 KM Monsoon Endurance Run [Evaluation Demo]',
    createdAt: '2026-09-05T08:30:00.000Z',
  },
  {
    id: 'pe_demo_03',
    userId: 'usr_aarav_01',
    eventType: 'JOIN_CHALLENGE',
    points: 10,
    challengeId: 'ch-yoga-mindful',
    challengeTitle: '30-Day Surya Namaskar Consistency',
    referenceId: 'ch-yoga-mindful',
    description: 'Joined challenge: 30-Day Surya Namaskar Consistency [Evaluation Demo]',
    createdAt: '2026-09-07T06:15:00.000Z',
  },
  {
    id: 'pe_demo_04',
    userId: 'usr_aarav_01',
    eventType: 'JOIN_CHALLENGE',
    points: 10,
    challengeId: 'ch-pushups-500',
    challengeTitle: 'National Sports Day Push-Up Challenge',
    referenceId: 'ch-pushups-500',
    description: 'Joined challenge: National Sports Day Push-Up Challenge [Evaluation Demo]',
    createdAt: '2026-09-10T14:20:00.000Z',
  },
];

function getDemoEvents(): FittrackPointEvent[] {
  try {
    const raw = localStorage.getItem(DEMO_POINTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_POINTS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_POINT_EVENTS));
      return INITIAL_DEMO_POINT_EVENTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed reading demo point events from localStorage:', err);
    return INITIAL_DEMO_POINT_EVENTS;
  }
}

function saveDemoEvents(events: FittrackPointEvent[]): void {
  try {
    localStorage.setItem(DEMO_POINTS_STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.warn('Failed saving demo point events to localStorage:', err);
  }
}

export const pointsService = {
  /**
   * Fetch user's FITTRACK Point ledger events and compute total balance.
   * Supabase-authoritative when configured; isolated demo store when in evaluation mode.
   */
  async getUserPoints(userId: string): Promise<{
    events: FittrackPointEvent[];
    totalPoints: number;
    source: 'supabase' | 'fallback';
    error: string | null;
  }> {
    if (!userId) {
      return { events: [], totalPoints: 0, source: 'fallback', error: null };
    }

    if (!isSupabaseConfigured) {
      const demoList = getDemoEvents().filter((e) => e.userId === userId);
      const total = demoList.reduce((sum, e) => sum + (e.points || 0), 0);
      return { events: demoList, totalPoints: total, source: 'fallback', error: null };
    }

    try {
      const { data, error } = await supabase
        .from('fittrack_point_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching point events from Supabase:', error.message);
        return { events: [], totalPoints: 0, source: 'supabase', error: error.message };
      }

      const events: FittrackPointEvent[] = (data as DbPointEvent[] || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        eventType: row.event_type,
        points: Number(row.points) || 0,
        challengeId: row.challenge_id,
        referenceId: row.reference_id,
        description: row.description,
        createdAt: row.created_at,
      }));

      const totalPoints = events.reduce((sum, e) => sum + e.points, 0);

      return { events, totalPoints, source: 'supabase', error: null };
    } catch (err: any) {
      console.error('pointsService.getUserPoints exception:', err);
      return {
        events: [],
        totalPoints: 0,
        source: 'fallback',
        error: err?.message || 'Failed loading point events',
      };
    }
  },

  /**
   * Idempotently record a JOIN_CHALLENGE point event (+10 points).
   * In Supabase mode, the database trigger on public.challenge_participants executes authoritatively.
   * In Demo mode, this manages the idempotent local storage ledger.
   */
  async recordJoinPointEvent(
    userId: string,
    challengeId: string,
    challengeTitle: string
  ): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded: boolean; error: string | null }> {
    if (!userId || !challengeId) {
      return { success: false, pointsAwarded: 0, alreadyAwarded: false, error: 'Missing parameters' };
    }

    if (!isSupabaseConfigured) {
      const events = getDemoEvents();
      const existing = events.find(
        (e) => e.userId === userId && e.eventType === 'JOIN_CHALLENGE' && e.referenceId === challengeId
      );

      if (existing) {
        return { success: true, pointsAwarded: 0, alreadyAwarded: true, error: null };
      }

      const newEvent: FittrackPointEvent = {
        id: `pe_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        eventType: 'JOIN_CHALLENGE',
        points: 10,
        challengeId,
        challengeTitle,
        referenceId: challengeId,
        description: `Joined challenge: ${challengeTitle}`,
        createdAt: new Date().toISOString(),
      };

      events.unshift(newEvent);
      saveDemoEvents(events);

      return { success: true, pointsAwarded: 10, alreadyAwarded: false, error: null };
    }

    // When Supabase is configured, the database trigger handle_challenge_participant_joined()
    // awards +10 points automatically on INSERT with unique conflict handling.
    return { success: true, pointsAwarded: 10, alreadyAwarded: false, error: null };
  },
};
