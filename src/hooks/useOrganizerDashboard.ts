import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { organizerService } from '../services/organizerService';
import { OrganizerDashboardStats, Challenge } from '../types';

export function useOrganizerDashboard() {
  const { user, isDemoMode, isSupabaseConfigured } = useAuth();
  const [stats, setStats] = useState<OrganizerDashboardStats | null>(null);
  const [recentChallenges, setRecentChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'fallback'>('supabase');

  const fetchDashboardData = useCallback(async () => {
    // When Supabase is configured, use authenticated user id
    // In demo mode, use demo ID
    const effectiveOrgId = isSupabaseConfigured
      ? user?.id || null
      : user?.id || 'demo_organizer';

    if (isSupabaseConfigured && !effectiveOrgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [statsRes, challengesRes] = await Promise.all([
        organizerService.getOrganizerStats(effectiveOrgId),
        organizerService.getOrganizerOwnedChallenges(effectiveOrgId),
      ]);

      if (statsRes.error && isSupabaseConfigured) {
        setError(statsRes.error);
      } else {
        setStats(statsRes.stats);
        setSource(statsRes.source);
      }

      if (challengesRes.error && isSupabaseConfigured && !statsRes.error) {
        setError(challengesRes.error);
      } else {
        setRecentChallenges(challengesRes.challenges);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load organizer dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isSupabaseConfigured]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    recentChallenges,
    loading,
    error,
    source,
    refetch: fetchDashboardData,
  };
}
