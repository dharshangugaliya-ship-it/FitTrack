import { useState, useEffect, useCallback } from 'react';
import { Challenge } from '../types';
import { challengeService } from '../services/challengeService';
import { useAuth } from '../context/AuthContext';

export interface UseChallengesOptions {
  searchQuery?: string;
  verification?: string;
  category?: string;
  activity?: string;
}

export function useChallenges(options?: UseChallengesOptions) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'fallback'>('fallback');

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await challengeService.getPublicChallenges({
        userId: user?.id || null,
        searchQuery: options?.searchQuery,
        verification: options?.verification,
        category: options?.category,
        activity: options?.activity,
      });

      setChallenges(res.challenges);
      setDataSource(res.source);
      if (res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch challenges');
    } finally {
      setLoading(false);
    }
  }, [
    user?.id,
    options?.searchQuery,
    options?.verification,
    options?.category,
    options?.activity,
  ]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  return {
    challenges,
    loading,
    error,
    dataSource,
    refetch: fetchChallenges,
  };
}

export function useMyChallenges() {
  const { user, isDemoMode } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'fallback'>('fallback');

  const userId = user?.id || (isDemoMode ? 'usr_aarav_01' : null);

  const fetchMyChallenges = useCallback(async () => {
    if (!userId) {
      setChallenges([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await challengeService.getMyChallenges(userId);
      setChallenges(res.challenges);
      setDataSource(res.source);
      if (res.error && res.source === 'supabase') {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load your challenges');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMyChallenges();
  }, [fetchMyChallenges]);

  return {
    challenges,
    loading,
    error,
    dataSource,
    refetch: fetchMyChallenges,
  };
}
