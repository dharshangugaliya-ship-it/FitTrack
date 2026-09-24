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
    const effectiveOrgId = user?.id || 'org_priya_01';

    setLoading(true);
    setError(null);

    try {
      const [statsRes, challengesRes] = await Promise.all([
        organizerService.getOrganizerStats(effectiveOrgId),
        organizerService.getOrganizerOwnedChallenges(effectiveOrgId),
      ]);

      if (statsRes.stats) {
        setStats(statsRes.stats);
        setSource(statsRes.source);
      }

      if (challengesRes.challenges) {
        setRecentChallenges(challengesRes.challenges);
      }

      if (statsRes.error && isSupabaseConfigured) {
        console.warn('Organizer stats warning:', statsRes.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load organizer dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isSupabaseConfigured]);

  useEffect(() => {
    fetchDashboardData();

    const handleUpdate = () => {
      fetchDashboardData();
    };

    window.addEventListener('fittrack_challenges_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('fittrack_challenges_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
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
