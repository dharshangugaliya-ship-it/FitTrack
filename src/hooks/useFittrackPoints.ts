/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { pointsService } from '../services/pointsService';
import { FittrackPointEvent } from '../types';

export function useFittrackPoints() {
  const { user, isDemoMode } = useAuth();
  const effectiveUserId = user?.id || (isDemoMode ? 'usr_aarav_01' : null);

  const [events, setEvents] = useState<FittrackPointEvent[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback');

  const fetchPoints = useCallback(async () => {
    if (!effectiveUserId) {
      setEvents([]);
      setTotalPoints(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await pointsService.getUserPoints(effectiveUserId);
      setEvents(res.events);
      setTotalPoints(res.totalPoints);
      setSource(res.source);
      setError(res.error);
    } catch (err: any) {
      setError(err?.message || 'Failed loading FITTRACK points');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  return {
    events,
    totalPoints,
    loading,
    error,
    source,
    refetch: fetchPoints,
  };
}
