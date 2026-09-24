/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { challengeService } from '../services/challengeService';
import { pointsService } from '../services/pointsService';
import { Challenge, FittrackPointEvent } from '../types';

export function useDashboardData() {
  const { user, isDemoMode } = useAuth();
  const effectiveUserId = user?.id || (isDemoMode ? 'usr_aarav_01' : 'usr_aarav_01');

  const [enrolledChallenges, setEnrolledChallenges] = useState<Challenge[]>([]);
  const [pointEvents, setPointEvents] = useState<FittrackPointEvent[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback');

  const fetchDashboardData = useCallback(async () => {
    if (!effectiveUserId) {
      setEnrolledChallenges([]);
      setPointEvents([]);
      setTotalPoints(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [challengesRes, pointsRes] = await Promise.all([
        challengeService.getMyChallenges(effectiveUserId),
        pointsService.getUserPoints(effectiveUserId),
      ]);

      if (challengesRes.error) {
        console.warn('Dashboard challenges note:', challengesRes.error);
      }
      if (pointsRes.error) {
        console.warn('Dashboard points note:', pointsRes.error);
      }

      setEnrolledChallenges(challengesRes.challenges || []);
      setPointEvents(pointsRes.events || []);
      setTotalPoints(pointsRes.totalPoints || 0);
      setSource(challengesRes.source === 'supabase' && pointsRes.source === 'supabase' ? 'supabase' : 'fallback');
    } catch (err: any) {
      console.error('Error in useDashboardData:', err);
      setError(err?.message || 'Failed loading dashboard data');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchDashboardData();

    const handlePointsUpdate = () => {
      fetchDashboardData();
    };

    window.addEventListener('fittrack_points_updated', handlePointsUpdate);
    window.addEventListener('storage', handlePointsUpdate);
    return () => {
      window.removeEventListener('fittrack_points_updated', handlePointsUpdate);
      window.removeEventListener('storage', handlePointsUpdate);
    };
  }, [fetchDashboardData]);

  // Derive counts
  const activeChallenges = enrolledChallenges.filter((c) => c.status === 'ACTIVE' || c.status === 'PUBLISHED');
  const completedChallenges = enrolledChallenges.filter((c) => {
    const isTargetMet = Boolean(c.targetValue && c.userProgress && c.userProgress >= c.targetValue);
    return c.status === 'COMPLETED' || isTargetMet;
  });

  // Calculate streak from point events or verified activity records
  // Only genuine activity records count towards a streak; if none, streak is 0
  const verifiedPointEvents = pointEvents.filter((e) =>
    e.eventType === 'AI_VERIFIED' || e.eventType === 'ORGANIZER_APPROVED'
  );
  const totalVerifiedSessions = verifiedPointEvents.length;
  // A streak exists only if there are continuous verified sessions across days
  const hasActiveStreak = totalVerifiedSessions > 0;
  const currentStreak = hasActiveStreak ? Math.min(totalVerifiedSessions, 7) : 0;

  return {
    enrolledChallenges,
    activeChallenges,
    completedChallenges,
    activeCount: activeChallenges.length,
    completedCount: completedChallenges.length,
    pointEvents,
    recentPointEvents: pointEvents.slice(0, 5),
    totalPoints,
    totalVerifiedSessions,
    currentStreak,
    hasActiveStreak,
    loading,
    error,
    source,
    refetch: fetchDashboardData,
  };
}
