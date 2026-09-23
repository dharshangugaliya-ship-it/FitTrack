/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaderboardService } from '../services/leaderboardService';
import { ChallengeLeaderboard } from '../types';

export function useChallengeLeaderboard(challengeId: string) {
  const { user, isDemoMode } = useAuth();
  const [data, setData] = useState<ChallengeLeaderboard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'fallback'>('fallback');

  const fetchLeaderboard = useCallback(async () => {
    if (!challengeId) return;

    setLoading(true);
    setError(null);

    const effectiveUserId = user?.id || (isDemoMode ? 'usr_aarav_01' : null);

    try {
      const res = await leaderboardService.getChallengeLeaderboard(
        challengeId,
        effectiveUserId
      );

      if (res.error) {
        setError(res.error);
        setData(null);
      } else {
        setData(res.data);
        setDataSource(res.source);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load challenge leaderboard.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [challengeId, user?.id, isDemoMode]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard: data,
    loading,
    error,
    dataSource,
    refetch: fetchLeaderboard,
  };
}
