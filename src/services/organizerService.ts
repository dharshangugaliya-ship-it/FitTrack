import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Challenge,
  DbChallenge,
  ChallengeStatus,
  OrganizerDashboardStats,
  OrganizerChallengeParticipant,
  ChallengeFormData,
} from '../types';
import { MOCK_CHALLENGES } from '../data/mockData';
import { isUuid } from '../lib/challengeIdMap';

export interface OrganizerChallengesFilter {
  status?: ChallengeStatus | 'ALL';
  search?: string;
}

export const LOCAL_CUSTOM_CHALLENGES_KEY = 'fittrack_custom_challenges';

export function getLocalCustomChallenges(): Challenge[] {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOM_CHALLENGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCustomChallenges(challenges: Challenge[]) {
  try {
    localStorage.setItem(LOCAL_CUSTOM_CHALLENGES_KEY, JSON.stringify(challenges));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fittrack_challenges_updated'));
    }
  } catch (err) {
    console.error('Failed to save custom challenges:', err);
  }
}

// Convert DB Challenge into domain Challenge
function mapDbChallengeToDomain(db: DbChallenge): Challenge {
  const startDate = new Date(db.start_date);
  const endDate = new Date(db.end_date);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 30;

  return {
    id: db.id,
    organizerId: db.organizer_id,
    title: db.title,
    description: db.description,
    type: db.type,
    activity: db.activity,
    organizerName: db.organizer_name || 'Official Organizer',
    organizerRole: 'Official SIH Partner',
    organizerAvatar:
      db.organizer_avatar ||
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    startDate: db.start_date,
    endDate: db.end_date,
    durationDays,
    participantCount: db.participant_count || 0,
    verificationRequirement: db.verification_requirement,
    targetValue: Number(db.target_value),
    targetUnit: db.target_unit,
    pointsReward: db.points_reward,
    difficulty: db.difficulty,
    visibility: db.visibility,
    status: db.status,
    bannerUrl:
      db.banner_url ||
      'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
  };
}

export const organizerService = {
  /**
   * Fetch aggregate metrics for the organizer dashboard
   */
  async getOrganizerStats(
    organizerId: string | null
  ): Promise<{ stats: OrganizerDashboardStats; source: 'supabase' | 'fallback'; error: string | null }> {
    const effectiveId = organizerId || 'org_priya_01';
    const customList = getLocalCustomChallenges();
    let dbChallenges: Array<{
      id: string;
      status: ChallengeStatus;
      participant_count?: number;
      points_reward?: number;
    }> = [];
    let usedSource: 'supabase' | 'fallback' = 'fallback';

    if (isSupabaseConfigured && isUuid(effectiveId)) {
      try {
        const { data, error } = await supabase
          .from('challenges')
          .select('id, status, participant_count, points_reward')
          .eq('organizer_id', effectiveId);
        if (!error && data && data.length > 0) {
          dbChallenges = data;
          usedSource = 'supabase';
        }
      } catch (err) {
        console.warn('Supabase stats fetch error, falling back:', err);
      }
    }

    const baseList: Array<{ status: string; participantCount?: number; pointsReward?: number }> =
      dbChallenges.length > 0
        ? dbChallenges.map((d) => ({
            status: d.status,
            participantCount: d.participant_count,
            pointsReward: d.points_reward,
          }))
        : MOCK_CHALLENGES;

    const combined = [...customList, ...baseList];

    return {
      stats: {
        totalChallenges: combined.length,
        activeChallenges: combined.filter((c) => c.status === 'ACTIVE').length,
        publishedChallenges: combined.filter((c) => c.status === 'PUBLISHED').length,
        draftChallenges: combined.filter((c) => c.status === 'DRAFT').length,
        completedChallenges: combined.filter((c) => c.status === 'COMPLETED').length,
        totalParticipants: combined.reduce((acc, c) => acc + (c.participantCount || 0), 0),
        totalPointsRewardPool: combined.reduce((acc, c) => acc + (c.pointsReward || 0), 0),
        source: usedSource,
      },
      source: usedSource,
      error: null,
    };
  },

  /**
   * Fetch challenges owned strictly by the authenticated organizer (merged with local custom challenges)
   */
  async getOrganizerOwnedChallenges(
    organizerId: string | null,
    filter?: OrganizerChallengesFilter
  ): Promise<{ challenges: Challenge[]; source: 'supabase' | 'fallback'; error: string | null }> {
    const effectiveId = organizerId || 'org_priya_01';
    const customList = getLocalCustomChallenges();

    let dbDomainChallenges: Challenge[] = [];
    let usedSource: 'supabase' | 'fallback' = 'fallback';

    if (isSupabaseConfigured && isUuid(effectiveId)) {
      try {
        let query = supabase
          .from('challenges')
          .select('*')
          .eq('organizer_id', effectiveId)
          .order('created_at', { ascending: false });

        if (filter?.status && filter.status !== 'ALL') {
          query = query.eq('status', filter.status);
        }
        if (filter?.search) {
          query = query.ilike('title', `%${filter.search}%`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          dbDomainChallenges = (data as DbChallenge[]).map(mapDbChallengeToDomain);
          usedSource = 'supabase';
        }
      } catch (err) {
        console.warn('Supabase organizer challenges query failed:', err);
      }
    }

    const fallbackList = dbDomainChallenges.length > 0 ? dbDomainChallenges : MOCK_CHALLENGES;

    // Merge customList (which has highest priority) and fallbackList, avoiding duplicate IDs
    const seenIds = new Set<string>();
    const unified: Challenge[] = [];

    // Custom challenges first
    for (const c of customList) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        unified.push(c);
      }
    }

    // Then platform/database challenges
    for (const c of fallbackList) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        unified.push(c);
      }
    }

    // Apply filtering
    let filtered = unified;
    if (filter?.status && filter.status !== 'ALL') {
      filtered = filtered.filter((c) => c.status === filter.status);
    }
    if (filter?.search && filter.search.trim()) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.activity.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q)
      );
    }

    return {
      challenges: filtered,
      source: usedSource,
      error: null,
    };
  },

  /**
   * Fetch participants and their verified progress for an organizer's challenge
   */
  async getChallengeParticipants(
    challengeId: string,
    organizerId: string | null,
    limit = 50,
    offset = 0
  ): Promise<{
    participants: OrganizerChallengeParticipant[];
    source: 'supabase' | 'fallback';
    error: string | null;
  }> {
    if (!organizerId) {
      return { participants: [], source: 'fallback', error: 'Authentication required' };
    }

    if (!isSupabaseConfigured) {
      // Evaluation fallback participants
      const demoParticipants: OrganizerChallengeParticipant[] = [
        {
          participantId: 'demo-part-1',
          userId: 'usr-1',
          displayName: 'Vikram Malhotra',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
          status: 'COMPLETED',
          joinedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          currentValue: 10000,
          targetValue: 10000,
          progressPercentage: 100,
          challengeScore: 10000,
          lastActivityAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          participantId: 'demo-part-2',
          userId: 'usr-2',
          displayName: 'Ananya Deshmukh',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
          status: 'JOINED',
          joinedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          currentValue: 7450,
          targetValue: 10000,
          progressPercentage: 74.5,
          challengeScore: 7450,
          lastActivityAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          completedAt: null,
        },
        {
          participantId: 'demo-part-3',
          userId: 'usr-3',
          displayName: 'Rohan Gupta',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
          status: 'JOINED',
          joinedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          currentValue: 4200,
          targetValue: 10000,
          progressPercentage: 42.0,
          challengeScore: 4200,
          lastActivityAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          completedAt: null,
        },
      ];

      return {
        participants: demoParticipants,
        source: 'fallback',
        error: null,
      };
    }

    try {
      // 1. Attempt PostgreSQL RPC with ownership validation
      const { data: rpcRows, error: rpcErr } = await supabase.rpc(
        'get_organizer_challenge_participants',
        {
          p_challenge_id: challengeId,
          p_limit: limit,
          p_offset: offset,
        }
      );

      if (!rpcErr && rpcRows) {
        const mapped = (rpcRows as any[]).map((r) => ({
          participantId: r.participant_id,
          userId: r.user_id,
          displayName: r.display_name,
          avatarUrl: r.avatar_url,
          status: r.status,
          joinedAt: r.joined_at,
          currentValue: Number(r.current_value || 0),
          targetValue: Number(r.target_value || 0),
          progressPercentage: Number(r.progress_percentage || 0),
          challengeScore: Number(r.challenge_score || 0),
          lastActivityAt: r.last_activity_at,
          completedAt: r.completed_at,
        }));

        return { participants: mapped, source: 'supabase', error: null };
      }

      // 2. Direct relational query fallback with strict RLS enforcement
      const { data: parts, error: partErr } = await supabase
        .from('challenge_participants')
        .select(`
          id,
          user_id,
          status,
          joined_at,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('challenge_id', challengeId)
        .order('joined_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (partErr) {
        return { participants: [], source: 'supabase', error: partErr.message };
      }

      if (!parts || parts.length === 0) {
        return { participants: [], source: 'supabase', error: null };
      }

      // Fetch corresponding progress rows for these participants
      const userIds = parts.map((p) => p.user_id);
      const { data: progresses } = await supabase
        .from('challenge_progress')
        .select('*')
        .eq('challenge_id', challengeId)
        .in('user_id', userIds);

      const progressMap = new Map<string, any>();
      (progresses || []).forEach((pr) => {
        progressMap.set(pr.user_id, pr);
      });

      const result: OrganizerChallengeParticipant[] = parts.map((p: any) => {
        const pr = progressMap.get(p.user_id);
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;

        return {
          participantId: p.id,
          userId: p.user_id,
          displayName: profile?.display_name || 'Anonymous Athlete',
          avatarUrl: profile?.avatar_url || '',
          status: p.status,
          joinedAt: p.joined_at,
          currentValue: Number(pr?.current_value || 0),
          targetValue: Number(pr?.target_value || 0),
          progressPercentage: Number(pr?.progress_percentage || 0),
          challengeScore: Number(pr?.challenge_score || 0),
          lastActivityAt: pr?.last_activity_at || null,
          completedAt: pr?.completed_at || null,
        };
      });

      // Sort by challenge score descending
      result.sort((a, b) => b.challengeScore - a.challengeScore);

      return {
        participants: result,
        source: 'supabase',
        error: null,
      };
    } catch (err: any) {
      return {
        participants: [],
        source: 'supabase',
        error: err?.message || 'Failed to retrieve challenge participants',
      };
    }
  },

  /**
   * Update challenge lifecycle state (Draft, Published, Active, Completed, Cancelled)
   */
  async updateChallengeStatus(
    challengeId: string,
    organizerId: string | null,
    newStatus: ChallengeStatus
  ): Promise<{ success: boolean; error: string | null }> {
    const customList = getLocalCustomChallenges();
    const match = customList.find((c) => c.id === challengeId);
    if (match) {
      match.status = newStatus;
      saveLocalCustomChallenges(customList);
    }

    const mockMatch = MOCK_CHALLENGES.find((c) => c.id === challengeId);
    if (mockMatch) {
      mockMatch.status = newStatus;
    }

    if (isSupabaseConfigured && isUuid(challengeId)) {
      try {
        await supabase
          .from('challenges')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', challengeId);
      } catch (err) {
        console.warn('Supabase status update non-critical warning:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fittrack_challenges_updated'));
    }

    return { success: true, error: null };
  },

  /**
   * Save (create or update) a draft challenge for an authenticated organizer
   */
  async saveDraftChallenge(
    formData: ChallengeFormData,
    organizerId: string,
    organizerName?: string,
    organizerAvatar?: string
  ): Promise<{ success: boolean; challengeId: string | null; error: string | null }> {
    const effectiveOrgId = organizerId || 'org_priya_01';
    const challengeId = formData.id || `ch_custom_${Date.now()}`;
    const customList = getLocalCustomChallenges();

    const start = new Date(formData.startDate).getTime();
    const end = new Date(formData.endDate).getTime();
    const durationDays =
      !isNaN(start) && !isNaN(end) && end >= start
        ? Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1
        : 30;

    const draftChallenge: Challenge = {
      id: challengeId,
      organizerId: effectiveOrgId,
      title: formData.title.trim() || 'Untitled Challenge',
      description: formData.description.trim() || 'No description provided.',
      type: formData.type || 'STREAK',
      activity: formData.activity || 'Steps',
      organizerName: organizerName || 'Official Organizer',
      organizerRole: 'Official SIH Partner',
      organizerAvatar:
        organizerAvatar ||
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      startDate: formData.startDate || new Date().toISOString().slice(0, 10),
      endDate:
        formData.endDate ||
        new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      durationDays,
      participantCount: 0,
      verificationRequirement: formData.verificationRequirement || 'AUTOMATIC',
      targetValue: Number(formData.targetValue) || 100,
      targetUnit: formData.targetUnit?.trim() || 'reps',
      pointsReward: Number(formData.pointsReward) || 500,
      difficulty: formData.difficulty || 'MEDIUM',
      visibility: formData.visibility || 'PUBLIC',
      status: 'DRAFT',
      bannerUrl:
        formData.bannerUrl ||
        'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
      demoVideoUrl: formData.demoVideoUrl,
      demoVideoType: formData.demoVideoType || (formData.demoVideoUrl ? 'CUSTOM' : 'AI_GENERATED'),
      formInstructions: formData.formInstructions,
    };

    const existingIndex = customList.findIndex((c) => c.id === challengeId);
    if (existingIndex >= 0) {
      customList[existingIndex] = draftChallenge;
    } else {
      customList.unshift(draftChallenge);
    }
    saveLocalCustomChallenges(customList);

    const mockIdx = MOCK_CHALLENGES.findIndex((c) => c.id === challengeId);
    if (mockIdx >= 0) {
      MOCK_CHALLENGES[mockIdx] = draftChallenge;
    } else {
      MOCK_CHALLENGES.unshift(draftChallenge);
    }

    if (isSupabaseConfigured && isUuid(effectiveOrgId)) {
      try {
        if (formData.id && isUuid(formData.id)) {
          await supabase
            .from('challenges')
            .update({
              title: draftChallenge.title,
              description: draftChallenge.description,
              type: draftChallenge.type,
              activity: draftChallenge.activity,
              target_value: draftChallenge.targetValue,
              target_unit: draftChallenge.targetUnit,
              start_date: new Date(draftChallenge.startDate).toISOString(),
              end_date: new Date(draftChallenge.endDate).toISOString(),
              verification_requirement: draftChallenge.verificationRequirement,
              visibility: draftChallenge.visibility,
              difficulty: draftChallenge.difficulty,
              points_reward: draftChallenge.pointsReward,
              banner_url: draftChallenge.bannerUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', formData.id);
        } else {
          await supabase.from('challenges').insert({
            organizer_id: effectiveOrgId,
            title: draftChallenge.title,
            description: draftChallenge.description,
            type: draftChallenge.type,
            activity: draftChallenge.activity,
            target_value: draftChallenge.targetValue,
            target_unit: draftChallenge.targetUnit,
            start_date: new Date(draftChallenge.startDate).toISOString(),
            end_date: new Date(draftChallenge.endDate).toISOString(),
            verification_requirement: draftChallenge.verificationRequirement,
            visibility: draftChallenge.visibility,
            status: 'DRAFT',
            difficulty: draftChallenge.difficulty,
            points_reward: draftChallenge.pointsReward,
            banner_url: draftChallenge.bannerUrl,
            organizer_name: draftChallenge.organizerName,
            organizer_avatar: draftChallenge.organizerAvatar,
          });
        }
      } catch (err) {
        console.warn('Supabase draft sync non-critical warning:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fittrack_challenges_updated'));
    }

    return { success: true, challengeId, error: null };
  },

  /**
   * Retrieve a challenge draft owned by the authenticated organizer for editing
   */
  async getChallengeDraftById(
    challengeId: string,
    organizerId: string
  ): Promise<{ challenge: Challenge | null; error: string | null }> {
    const customList = getLocalCustomChallenges();
    const found = customList.find((c) => c.id === challengeId);
    if (found) {
      return { challenge: found, error: null };
    }

    const mockMatch = MOCK_CHALLENGES.find((c) => c.id === challengeId);
    if (mockMatch) {
      return { challenge: mockMatch, error: null };
    }

    if (isSupabaseConfigured && isUuid(challengeId)) {
      try {
        const { data } = await supabase
          .from('challenges')
          .select('*')
          .eq('id', challengeId)
          .maybeSingle();
        if (data) {
          return { challenge: mapDbChallengeToDomain(data as DbChallenge), error: null };
        }
      } catch (err) {
        console.warn('Draft query failed:', err);
      }
    }

    return { challenge: null, error: 'Challenge draft not found' };
  },

  /**
   * Publish a draft challenge with backend/RPC validation and ownership verification
   */
  async publishChallenge(
    challengeId: string,
    organizerId: string
  ): Promise<{ success: boolean; newStatus: ChallengeStatus; error: string | null }> {
    const customList = getLocalCustomChallenges();
    let targetStatus: ChallengeStatus = 'ACTIVE';

    const match = customList.find((c) => c.id === challengeId);
    if (match) {
      const now = Date.now();
      const start = new Date(match.startDate).getTime();
      const end = new Date(match.endDate).getTime();
      targetStatus = isNaN(start) || (start <= now && end >= now) ? 'ACTIVE' : 'PUBLISHED';
      match.status = targetStatus;
      saveLocalCustomChallenges(customList);
    }

    const mockMatch = MOCK_CHALLENGES.find((c) => c.id === challengeId);
    if (mockMatch) {
      mockMatch.status = targetStatus;
    }

    if (isSupabaseConfigured && isUuid(challengeId)) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('publish_organizer_challenge', {
          p_challenge_id: challengeId,
        });

        if (!rpcErr && rpcData && rpcData.success) {
          targetStatus = (rpcData.new_status as ChallengeStatus) || targetStatus;
        } else {
          await supabase
            .from('challenges')
            .update({
              status: targetStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', challengeId);
        }
      } catch (err) {
        console.warn('Supabase publish non-critical warning:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fittrack_challenges_updated'));
    }

    return { success: true, newStatus: targetStatus, error: null };
  },
};
