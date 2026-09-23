/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ChallengeProgress, DbChallengeProgress } from '../types';
import { verificationCommitService } from './verificationCommitService';
import { toDatabaseChallengeId, toFrontendChallengeId } from '../lib/challengeIdMap';

const DEMO_PROGRESS_STORAGE_KEY = 'fittrack_demo_progress_map';

export const progressService = {
  /**
   * Fetch all challenge progress records for a user.
   * Returns a map of challengeId -> ChallengeProgress.
   */
  async getUserAllProgress(userId: string): Promise<{
    progressMap: Record<string, ChallengeProgress>;
    source: 'supabase' | 'fallback';
    error: string | null;
  }> {
    if (!userId) {
      return { progressMap: {}, source: 'fallback', error: null };
    }

    if (!isSupabaseConfigured) {
      // Demo evaluation fallback: initial progress for Aarav Sharma merged with local demo storage
      const demoMap: Record<string, ChallengeProgress> = {
        'ch-squat-10k': {
          id: 'prog_demo_01',
          challengeId: 'ch-squat-10k',
          userId: 'usr_aarav_01',
          currentValue: 3420,
          targetValue: 10000,
          progressPercentage: 34,
          challengeScore: 3420,
          targetUnit: 'reps',
          lastActivityAt: '2026-09-18T10:00:00.000Z',
          createdAt: '2026-09-01T10:00:00.000Z',
          updatedAt: '2026-09-18T10:00:00.000Z',
        },
        'ch-run-100km': {
          id: 'prog_demo_02',
          challengeId: 'ch-run-100km',
          userId: 'usr_aarav_01',
          currentValue: 42,
          targetValue: 100,
          progressPercentage: 42,
          challengeScore: 42,
          targetUnit: 'KM',
          lastActivityAt: '2026-09-17T08:00:00.000Z',
          createdAt: '2026-09-05T08:30:00.000Z',
          updatedAt: '2026-09-17T08:00:00.000Z',
        },
        'ch-yoga-mindful': {
          id: 'prog_demo_03',
          challengeId: 'ch-yoga-mindful',
          userId: 'usr_aarav_01',
          currentValue: 14,
          targetValue: 30,
          progressPercentage: 46,
          challengeScore: 14,
          targetUnit: 'days',
          lastActivityAt: '2026-09-18T06:30:00.000Z',
          createdAt: '2026-09-07T06:15:00.000Z',
          updatedAt: '2026-09-18T06:30:00.000Z',
        },
      };

      try {
        const stored = localStorage.getItem(DEMO_PROGRESS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.assign(demoMap, parsed);
        }
      } catch {
        // Ignore JSON parse error
      }

      return { progressMap: userId === 'usr_aarav_01' ? demoMap : {}, source: 'fallback', error: null };
    }

    try {
      const { data, error } = await supabase
        .from('challenge_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error querying challenge_progress:', error.message);
        return { progressMap: {}, source: 'supabase', error: error.message };
      }

      const progressMap: Record<string, ChallengeProgress> = {};

      (data as DbChallengeProgress[] || []).forEach((row) => {
        const item: ChallengeProgress = {
          id: row.id,
          challengeId: row.challenge_id,
          userId: row.user_id,
          currentValue: Number(row.current_value) || 0,
          targetValue: Number(row.target_value) || 0,
          progressPercentage: Math.min(100, Math.max(0, Number(row.progress_percentage) || 0)),
          challengeScore: Number(row.challenge_score) || 0,
          lastActivityAt: row.last_activity_at,
          completedAt: row.completed_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
        progressMap[row.challenge_id] = item;
        const slug = toFrontendChallengeId(row.challenge_id);
        if (slug && slug !== row.challenge_id) {
          progressMap[slug] = item;
        }
      });

      return { progressMap, source: 'supabase', error: null };
    } catch (err: any) {
      console.error('progressService.getUserAllProgress exception:', err);
      return {
        progressMap: {},
        source: isSupabaseConfigured ? 'supabase' : 'fallback',
        error: err?.message || 'Failed loading progress',
      };
    }
  },

  /**
   * Get progress for a specific challenge and user.
   */
  async getChallengeProgress(
    userId: string,
    challengeId: string
  ): Promise<{ progress: ChallengeProgress | null; source: 'supabase' | 'fallback'; error: string | null }> {
    const res = await this.getUserAllProgress(userId);
    const dbId = toDatabaseChallengeId(challengeId);
    const slug = toFrontendChallengeId(challengeId);
    return {
      progress: res.progressMap[challengeId] || res.progressMap[dbId] || res.progressMap[slug] || null,
      source: res.source,
      error: res.error,
    };
  },

  /**
   * @deprecated Use `verificationCommitService.commitVerificationSession` directly for authoritative commit.
   * Record verified workout activity into challenge progress.
   * Delegates authoritatively to verificationCommitService (RPC commit_ai_verification_session).
   */
  async recordVerifiedActivity(
    userId: string,
    challengeId: string,
    repsCompleted: number,
    targetValue: number,
    targetUnit: string,
    activity: string = 'SQUATS',
    verificationSessionId?: string
  ): Promise<{ success: boolean; updatedProgress: ChallengeProgress | null; error: string | null }> {
    if (!userId || !challengeId || repsCompleted <= 0) {
      return { success: false, updatedProgress: null, error: 'Invalid parameters for recording activity' };
    }

    const sessionId = verificationSessionId || `session_legacy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const commitRes = await verificationCommitService.commitVerificationSession({
      verificationSessionId: sessionId,
      challengeId,
      activity: (activity as any) || 'SQUATS',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: repsCompleted,
      durationSeconds: 0,
    });

    if (!commitRes.success || !commitRes.data) {
      return {
        success: false,
        updatedProgress: null,
        error: commitRes.error || 'Failed to commit verified activity',
      };
    }

    const d = commitRes.data;
    const updated: ChallengeProgress = {
      id: `prog_${d.challengeId}_${d.userId}`,
      challengeId: d.challengeId,
      userId: d.userId,
      currentValue: d.currentValue,
      targetValue: d.targetValue,
      progressPercentage: d.progressPercentage,
      challengeScore: d.challengeScore,
      targetUnit: d.targetUnit,
      lastActivityAt: d.lastActivityAt,
      completedAt: d.completedAt || undefined,
      createdAt: d.lastActivityAt,
      updatedAt: d.lastActivityAt,
    };

    return {
      success: true,
      updatedProgress: updated,
      error: null,
    };
  },
};
