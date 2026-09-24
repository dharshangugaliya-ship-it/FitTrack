/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { streakService, StreakData } from '../services/streakService';

export function useStreak(customUserId?: string) {
  const { user, isDemoMode, profile } = useAuth();

  const isOrganizer = profile?.mode === 'organizer';
  const effectiveUserId =
    customUserId ||
    user?.id ||
    (isOrganizer ? 'org_priya_01' : (isDemoMode ? 'usr_aarav_01' : 'usr_aarav_01'));

  const [streakData, setStreakData] = useState<StreakData>(() =>
    streakService.getStreak(effectiveUserId)
  );

  const refreshStreak = useCallback(() => {
    const updated = streakService.getStreak(effectiveUserId);
    setStreakData(updated);
  }, [effectiveUserId]);

  useEffect(() => {
    refreshStreak();

    const handleStreakUpdate = (e: any) => {
      if (e?.detail?.userId) {
        const detailUserId = e.detail.userId;
        const normEffective = effectiveUserId.replace('demo-', '');
        const normDetail = detailUserId.replace('demo-', '');
        if (normEffective === normDetail) {
          setStreakData(e.detail);
          return;
        }
      }
      refreshStreak();
    };

    const handleGenericUpdate = () => {
      refreshStreak();
    };

    window.addEventListener('fittrack_streak_updated', handleStreakUpdate);
    window.addEventListener('fittrack_points_updated', handleGenericUpdate);
    window.addEventListener('storage', handleGenericUpdate);

    return () => {
      window.removeEventListener('fittrack_streak_updated', handleStreakUpdate);
      window.removeEventListener('fittrack_points_updated', handleGenericUpdate);
      window.removeEventListener('storage', handleGenericUpdate);
    };
  }, [effectiveUserId, refreshStreak]);

  const recordWorkoutToday = useCallback(
    async (activityDate?: string) => {
      const res = await streakService.recordActivity(effectiveUserId, activityDate);
      setStreakData(res);
      return res;
    },
    [effectiveUserId]
  );

  const boostStreak = useCallback(
    (days: number) => {
      const res = streakService.boostStreak(effectiveUserId, days);
      setStreakData(res);
      return res;
    },
    [effectiveUserId]
  );

  return {
    ...streakData,
    recordWorkoutToday,
    boostStreak,
    refreshStreak,
  };
}
