/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ChallengeLeaderboard,
  LeaderboardEntry,
  DbLeaderboardRpcEntry,
  DbChallenge,
  VerificationStatus,
} from '../types';
import { MOCK_CHALLENGES, MOCK_LEADERBOARDS } from '../data/mockData';

export const leaderboardService = {
  /**
   * Fetches the official challenge-specific leaderboard.
   *
   * Scoring Rule:
   *   - Ranked by authoritative challenge score (reps, KM, days, minutes)
   *   - FITTRACK Points are completely isolated and never used for challenge ranking
   *   - Eligibility: Participants with qualifying challenge_score > 0
   *   - Tie-breaking: challenge_score DESC, completed_at ASC NULLS LAST, created_at ASC, user_id ASC
   */
  async getChallengeLeaderboard(
    challengeId: string,
    currentUserId?: string | null,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    data: ChallengeLeaderboard | null;
    source: 'supabase' | 'fallback';
    error: string | null;
  }> {
    if (!challengeId) {
      return { data: null, source: 'fallback', error: 'Challenge ID is required.' };
    }

    // 1. Supabase Mode (Authoritative)
    if (isSupabaseConfigured) {
      try {
        // Fetch challenge metadata first (ensuring visibility & existence)
        const { data: challengeData, error: challengeError } = await supabase
          .from('challenges')
          .select('id, title, target_unit, target_value, verification_requirement, visibility, status')
          .eq('id', challengeId)
          .maybeSingle();

        if (challengeError) {
          return { data: null, source: 'supabase', error: challengeError.message };
        }

        if (!challengeData) {
          return { data: null, source: 'supabase', error: 'Challenge not found.' };
        }

        const typedChallenge = challengeData as DbChallenge;

        // Call the hardened SECURITY DEFINER RPC to retrieve ranked leaderboard entries
        const { data: rpcEntries, error: rpcError } = await supabase.rpc(
          'get_challenge_leaderboard',
          {
            p_challenge_id: challengeId,
            p_limit: limit,
            p_offset: offset,
          }
        );

        if (rpcError) {
          // If RPC is not yet applied, fallback to direct query on challenge_progress with join
          console.warn('RPC get_challenge_leaderboard call returned error, trying direct query:', rpcError.message);
          
          const { data: directProgress, error: directError } = await supabase
            .from('challenge_progress')
            .select(`
              user_id,
              challenge_score,
              progress_percentage,
              last_activity_at,
              completed_at,
              profiles:user_id (
                display_name,
                avatar_url
              )
            `)
            .eq('challenge_id', challengeId)
            .gt('challenge_score', 0)
            .order('challenge_score', { ascending: false })
            .order('completed_at', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

          if (directError) {
            return { data: null, source: 'supabase', error: directError.message };
          }

          let rankCounter = offset + 1;
          const mappedEntries: LeaderboardEntry[] = (directProgress || []).map((row: any) => {
            const isMe = currentUserId ? row.user_id === currentUserId : false;
            return {
              rank: rankCounter++,
              userId: row.user_id,
              displayName: row.profiles?.display_name || 'Anonymous Challenger',
              avatarUrl:
                row.profiles?.avatar_url ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
              challengeScore: Number(row.challenge_score) || 0,
              targetUnit: typedChallenge.target_unit || 'reps',
              progressPercentage: Number(row.progress_percentage) || 0,
              verificationStatus: typedChallenge.verification_requirement,
              isCurrentUser: isMe,
              completionDate: row.completed_at
                ? new Date(row.completed_at).toLocaleDateString()
                : row.last_activity_at
                ? new Date(row.last_activity_at).toLocaleDateString()
                : undefined,
              lastActivityAt: row.last_activity_at || undefined,
            };
          });

          // Check if current user has an entry if not in mapped list
          let userEntry: LeaderboardEntry | null =
            mappedEntries.find((e) => e.isCurrentUser) || null;

          return {
            data: {
              challengeId,
              challengeTitle: typedChallenge.title,
              targetUnit: typedChallenge.target_unit,
              targetValue: Number(typedChallenge.target_value),
              verificationRequirement: typedChallenge.verification_requirement,
              entries: mappedEntries,
              totalRankedParticipants: mappedEntries.length,
              currentUserEntry: userEntry,
              dataSource: 'supabase',
            },
            source: 'supabase',
            error: null,
          };
        }

        // Map RPC results
        const entries: LeaderboardEntry[] = ((rpcEntries as DbLeaderboardRpcEntry[]) || []).map(
          (row) => {
            const isMe = currentUserId ? row.user_id === currentUserId : false;
            return {
              rank: Number(row.rank),
              userId: row.user_id,
              displayName: row.display_name || 'Challenger',
              avatarUrl:
                row.avatar_url ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
              challengeScore: Number(row.challenge_score),
              targetUnit: typedChallenge.target_unit,
              progressPercentage: Number(row.progress_percentage),
              verificationStatus: row.verification_requirement || typedChallenge.verification_requirement,
              isCurrentUser: isMe,
              completionDate: row.completed_at
                ? new Date(row.completed_at).toLocaleDateString()
                : row.last_activity_at
                ? new Date(row.last_activity_at).toLocaleDateString()
                : undefined,
              lastActivityAt: row.last_activity_at || undefined,
            };
          }
        );

        let currentUserEntry: LeaderboardEntry | null =
          entries.find((e) => e.isCurrentUser) || null;

        // If current user is enrolled with score > 0 but not in the first N entries, fetch rank via helper RPC
        if (!currentUserEntry && currentUserId) {
          const { data: userRankData } = await supabase.rpc(
            'get_user_challenge_leaderboard_rank',
            {
              p_challenge_id: challengeId,
              p_user_id: currentUserId,
            }
          );

          if (userRankData && userRankData.length > 0) {
            const userRow = userRankData[0] as DbLeaderboardRpcEntry;
            currentUserEntry = {
              rank: Number(userRow.rank),
              userId: userRow.user_id,
              displayName: userRow.display_name || 'You',
              avatarUrl:
                userRow.avatar_url ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
              challengeScore: Number(userRow.challenge_score),
              targetUnit: typedChallenge.target_unit,
              progressPercentage: Number(userRow.progress_percentage),
              verificationStatus: userRow.verification_requirement || typedChallenge.verification_requirement,
              isCurrentUser: true,
              completionDate: userRow.completed_at
                ? new Date(userRow.completed_at).toLocaleDateString()
                : userRow.last_activity_at
                ? new Date(userRow.last_activity_at).toLocaleDateString()
                : undefined,
              lastActivityAt: userRow.last_activity_at || undefined,
            };
          }
        }

        return {
          data: {
            challengeId,
            challengeTitle: typedChallenge.title,
            targetUnit: typedChallenge.target_unit,
            targetValue: Number(typedChallenge.target_value),
            verificationRequirement: typedChallenge.verification_requirement,
            entries,
            totalRankedParticipants: entries.length,
            currentUserEntry,
            dataSource: 'supabase',
          },
          source: 'supabase',
          error: null,
        };
      } catch (err: any) {
        return {
          data: null,
          source: 'supabase',
          error: err?.message || 'Failed to fetch leaderboard from database.',
        };
      }
    }

    // 2. Demo Evaluation Fallback Mode
    // Look up challenge from mock catalog
    const challenge =
      MOCK_CHALLENGES.find((c) => c.id === challengeId) || MOCK_CHALLENGES[0];

    const rawMockEntries = MOCK_LEADERBOARDS[challenge.id] || [];

    // Check if the current user (e.g., Aarav usr_aarav_01) has progress in mock
    const effectiveUserId = currentUserId || 'usr_aarav_01';

    // Clone and map mock entries ensuring deterministic ranking and current user flag
    const mappedDemoEntries: LeaderboardEntry[] = rawMockEntries
      .slice()
      .sort((a, b) => {
        if (b.challengeScore !== a.challengeScore) {
          return b.challengeScore - a.challengeScore;
        }
        return a.userId.localeCompare(b.userId);
      })
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
        targetUnit: challenge.targetUnit,
        isCurrentUser: entry.userId === effectiveUserId,
      }));

    const currentUserEntry =
      mappedDemoEntries.find((e) => e.isCurrentUser) || null;

    return {
      data: {
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        targetUnit: challenge.targetUnit,
        targetValue: challenge.targetValue,
        verificationRequirement: challenge.verificationRequirement,
        entries: mappedDemoEntries,
        totalRankedParticipants: mappedDemoEntries.length,
        currentUserEntry,
        dataSource: 'fallback',
      },
      source: 'fallback',
      error: null,
    };
  },
};
