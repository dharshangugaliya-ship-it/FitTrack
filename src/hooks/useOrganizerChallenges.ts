import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { organizerService, OrganizerChallengesFilter } from '../services/organizerService';
import { Challenge, ChallengeStatus } from '../types';

export function useOrganizerChallenges(initialFilter?: OrganizerChallengesFilter) {
  const { user, isSupabaseConfigured } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'fallback'>('supabase');
  const [filter, setFilter] = useState<OrganizerChallengesFilter>(initialFilter || { status: 'ALL' });
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const fetchChallenges = useCallback(async () => {
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
      const res = await organizerService.getOrganizerOwnedChallenges(effectiveOrgId, filter);
      if (res.error && isSupabaseConfigured) {
        setError(res.error);
      } else {
        setChallenges(res.challenges);
        setSource(res.source);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isSupabaseConfigured, filter]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const updateStatus = async (challengeId: string, newStatus: ChallengeStatus) => {
    const effectiveOrgId = isSupabaseConfigured ? user?.id || null : user?.id || 'demo_organizer';
    setMutatingId(challengeId);
    try {
      const res = await organizerService.updateChallengeStatus(challengeId, effectiveOrgId, newStatus);
      if (res.success) {
        // Optimistic local refresh
        setChallenges((prev) =>
          prev.map((c) => (c.id === challengeId ? { ...c, status: newStatus } : c))
        );
        return { success: true, error: null };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Update failed' };
    } finally {
      setMutatingId(null);
    }
  };

  return {
    challenges,
    loading,
    error,
    source,
    filter,
    setFilter,
    mutatingId,
    updateStatus,
    refetch: fetchChallenges,
  };
}
