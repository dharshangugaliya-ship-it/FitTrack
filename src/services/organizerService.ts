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

export interface OrganizerChallengesFilter {
  status?: ChallengeStatus | 'ALL';
  search?: string;
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
    if (!organizerId) {
      return {
        stats: {
          totalChallenges: 0,
          activeChallenges: 0,
          publishedChallenges: 0,
          draftChallenges: 0,
          completedChallenges: 0,
          totalParticipants: 0,
          totalPointsRewardPool: 0,
          source: 'fallback',
        },
        source: 'fallback',
        error: 'Organizer not authenticated',
      };
    }

    if (!isSupabaseConfigured) {
      // Evaluation fallback metrics computed deterministically from mock data
      const mockOwned = MOCK_CHALLENGES;
      const active = mockOwned.filter((c) => c.status === 'ACTIVE').length;
      const completed = mockOwned.filter((c) => c.status === 'COMPLETED').length;
      const totalParts = mockOwned.reduce((sum, c) => sum + (c.participantCount || 0), 0);
      const totalPoints = mockOwned.reduce((sum, c) => sum + (c.pointsReward || 0), 0);

      return {
        stats: {
          totalChallenges: mockOwned.length,
          activeChallenges: active,
          publishedChallenges: mockOwned.filter((c) => c.status === 'PUBLISHED').length,
          draftChallenges: mockOwned.filter((c) => c.status === 'DRAFT').length,
          completedChallenges: completed,
          totalParticipants: totalParts,
          totalPointsRewardPool: totalPoints,
          source: 'fallback',
        },
        source: 'fallback',
        error: null,
      };
    }

    try {
      // 1. Attempt using optimized PostgreSQL aggregation function
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_organizer_metrics', {
        p_organizer_id: organizerId,
      });

      if (!rpcError && rpcData) {
        return {
          stats: {
            totalChallenges: Number(rpcData.total_challenges || 0),
            activeChallenges: Number(rpcData.active_challenges || 0),
            publishedChallenges: Number(rpcData.published_challenges || 0),
            draftChallenges: Number(rpcData.draft_challenges || 0),
            completedChallenges: Number(rpcData.completed_challenges || 0),
            totalParticipants: Number(rpcData.total_participants || 0),
            totalPointsRewardPool: Number(rpcData.total_points_reward_pool || 0),
            source: 'supabase',
          },
          source: 'supabase',
          error: null,
        };
      }

      // 2. Direct query fallback against challenges table
      const { data, error } = await supabase
        .from('challenges')
        .select('id, status, participant_count, points_reward')
        .eq('organizer_id', organizerId);

      if (error) {
        return {
          stats: {
            totalChallenges: 0,
            activeChallenges: 0,
            publishedChallenges: 0,
            draftChallenges: 0,
            completedChallenges: 0,
            totalParticipants: 0,
            totalPointsRewardPool: 0,
            source: 'supabase',
          },
          source: 'supabase',
          error: error.message,
        };
      }

      const rows = data || [];
      const totalChallenges = rows.length;
      const activeChallenges = rows.filter((r) => r.status === 'ACTIVE').length;
      const publishedChallenges = rows.filter((r) => r.status === 'PUBLISHED').length;
      const draftChallenges = rows.filter((r) => r.status === 'DRAFT').length;
      const completedChallenges = rows.filter((r) => r.status === 'COMPLETED').length;
      const totalParticipants = rows.reduce((acc, r) => acc + (r.participant_count || 0), 0);
      const totalPointsRewardPool = rows.reduce((acc, r) => acc + (r.points_reward || 0), 0);

      return {
        stats: {
          totalChallenges,
          activeChallenges,
          publishedChallenges,
          draftChallenges,
          completedChallenges,
          totalParticipants,
          totalPointsRewardPool,
          source: 'supabase',
        },
        source: 'supabase',
        error: null,
      };
    } catch (err: any) {
      return {
        stats: {
          totalChallenges: 0,
          activeChallenges: 0,
          publishedChallenges: 0,
          draftChallenges: 0,
          completedChallenges: 0,
          totalParticipants: 0,
          totalPointsRewardPool: 0,
          source: 'supabase',
        },
        source: 'supabase',
        error: err?.message || 'Failed to fetch organizer statistics',
      };
    }
  },

  /**
   * Fetch challenges owned strictly by the authenticated organizer
   */
  async getOrganizerOwnedChallenges(
    organizerId: string | null,
    filter?: OrganizerChallengesFilter
  ): Promise<{ challenges: Challenge[]; source: 'supabase' | 'fallback'; error: string | null }> {
    if (!organizerId) {
      return { challenges: [], source: 'fallback', error: 'Authentication required' };
    }

    if (!isSupabaseConfigured) {
      let list = [...MOCK_CHALLENGES];
      if (filter?.status && filter.status !== 'ALL') {
        list = list.filter((c) => c.status === filter.status);
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        list = list.filter((c) => c.title.toLowerCase().includes(q) || c.activity.toLowerCase().includes(q));
      }
      return {
        challenges: list,
        source: 'fallback',
        error: null,
      };
    }

    try {
      let query = supabase
        .from('challenges')
        .select('*')
        .eq('organizer_id', organizerId)
        .order('created_at', { ascending: false });

      if (filter?.status && filter.status !== 'ALL') {
        query = query.eq('status', filter.status);
      }

      if (filter?.search) {
        query = query.ilike('title', `%${filter.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        return {
          challenges: [],
          source: 'supabase',
          error: error.message,
        };
      }

      const mapped = (data as DbChallenge[]).map(mapDbChallengeToDomain);
      return {
        challenges: mapped,
        source: 'supabase',
        error: null,
      };
    } catch (err: any) {
      return {
        challenges: [],
        source: 'supabase',
        error: err?.message || 'Failed to retrieve organizer challenges',
      };
    }
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
    if (!organizerId) {
      return { success: false, error: 'Authentication required' };
    }

    if (!isSupabaseConfigured) {
      // In demo mode, update local mock reference
      const match = MOCK_CHALLENGES.find((c) => c.id === challengeId);
      if (match) {
        match.status = newStatus;
      }
      return { success: true, error: null };
    }

    try {
      // 1. Attempt PostgreSQL RPC with transition rule enforcement
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_challenge_status', {
        p_challenge_id: challengeId,
        p_new_status: newStatus,
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        return { success: true, error: null };
      }

      // 2. Direct authorized update fallback
      const { error } = await supabase
        .from('challenges')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', challengeId)
        .eq('organizer_id', organizerId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to update challenge status',
      };
    }
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
    if (!organizerId) {
      return { success: false, challengeId: null, error: 'Authentication required' };
    }

    // Demo mode fallback
    if (!isSupabaseConfigured) {
      if (formData.id) {
        const existing = MOCK_CHALLENGES.find((c) => c.id === formData.id);
        if (existing) {
          existing.title = formData.title;
          existing.description = formData.description;
          existing.type = formData.type;
          existing.activity = formData.activity;
          existing.targetValue = formData.targetValue;
          existing.targetUnit = formData.targetUnit;
          existing.startDate = formData.startDate;
          existing.endDate = formData.endDate;
          existing.verificationRequirement = formData.verificationRequirement;
          existing.visibility = formData.visibility;
          existing.difficulty = formData.difficulty;
          existing.pointsReward = formData.pointsReward;
          existing.bannerUrl = formData.bannerUrl;
          return { success: true, challengeId: existing.id, error: null };
        }
      }

      const newId = `demo_draft_${Date.now()}`;
      const newMockChallenge: Challenge = {
        id: newId,
        organizerId: organizerId,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        activity: formData.activity,
        organizerName: organizerName || 'Demo Organizer',
        organizerAvatar: organizerAvatar || '',
        startDate: formData.startDate,
        endDate: formData.endDate,
        durationDays: Math.ceil(
          Math.abs(new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) || 30,
        participantCount: 0,
        verificationRequirement: formData.verificationRequirement,
        targetValue: formData.targetValue,
        targetUnit: formData.targetUnit,
        pointsReward: formData.pointsReward,
        difficulty: formData.difficulty,
        visibility: formData.visibility,
        status: 'DRAFT',
        bannerUrl: formData.bannerUrl,
      };
      MOCK_CHALLENGES.unshift(newMockChallenge);
      return { success: true, challengeId: newId, error: null };
    }

    try {
      if (formData.id) {
        // Update existing draft challenge owned by organizer
        const { data, error } = await supabase
          .from('challenges')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim(),
            type: formData.type,
            activity: formData.activity,
            target_value: formData.targetValue,
            target_unit: formData.targetUnit.trim(),
            start_date: new Date(formData.startDate).toISOString(),
            end_date: new Date(formData.endDate).toISOString(),
            verification_requirement: formData.verificationRequirement,
            visibility: formData.visibility,
            difficulty: formData.difficulty,
            points_reward: formData.pointsReward,
            banner_url: formData.bannerUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', formData.id)
          .eq('organizer_id', organizerId)
          .select('id')
          .single();

        if (error) {
          return { success: false, challengeId: null, error: error.message };
        }
        return { success: true, challengeId: data?.id || formData.id, error: null };
      } else {
        // Insert new draft challenge
        const { data, error } = await supabase
          .from('challenges')
          .insert({
            organizer_id: organizerId,
            title: formData.title.trim(),
            description: formData.description.trim(),
            type: formData.type,
            activity: formData.activity,
            target_value: formData.targetValue,
            target_unit: formData.targetUnit.trim(),
            start_date: new Date(formData.startDate).toISOString(),
            end_date: new Date(formData.endDate).toISOString(),
            verification_requirement: formData.verificationRequirement,
            visibility: formData.visibility,
            status: 'DRAFT',
            difficulty: formData.difficulty,
            points_reward: formData.pointsReward,
            banner_url: formData.bannerUrl,
            organizer_name: organizerName || 'Official Organizer',
            organizer_avatar: organizerAvatar || null,
          })
          .select('id')
          .single();

        if (error) {
          return { success: false, challengeId: null, error: error.message };
        }
        return { success: true, challengeId: data?.id || null, error: null };
      }
    } catch (err: any) {
      return { success: false, challengeId: null, error: err?.message || 'Draft save failed' };
    }
  },

  /**
   * Retrieve a challenge draft owned by the authenticated organizer for editing
   */
  async getChallengeDraftById(
    challengeId: string,
    organizerId: string
  ): Promise<{ challenge: Challenge | null; error: string | null }> {
    if (!organizerId) {
      return { challenge: null, error: 'Authentication required' };
    }

    if (!isSupabaseConfigured) {
      const match = MOCK_CHALLENGES.find((c) => c.id === challengeId);
      if (match) {
        return { challenge: match, error: null };
      }
      return { challenge: null, error: 'Challenge draft not found' };
    }

    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .eq('organizer_id', organizerId)
        .single();

      if (error || !data) {
        return { challenge: null, error: error?.message || 'Challenge not found or unauthorized' };
      }

      return { challenge: mapDbChallengeToDomain(data as DbChallenge), error: null };
    } catch (err: any) {
      return { challenge: null, error: err?.message || 'Failed to fetch draft' };
    }
  },

  /**
   * Publish a draft challenge with backend/RPC validation and ownership verification
   */
  async publishChallenge(
    challengeId: string,
    organizerId: string
  ): Promise<{ success: boolean; newStatus: ChallengeStatus; error: string | null }> {
    if (!organizerId) {
      return { success: false, newStatus: 'DRAFT', error: 'Authentication required' };
    }

    if (!isSupabaseConfigured) {
      const match = MOCK_CHALLENGES.find((c) => c.id === challengeId);
      if (match) {
        match.status = 'ACTIVE';
      }
      return { success: true, newStatus: 'ACTIVE', error: null };
    }

    try {
      // 1. Try dedicated publication RPC with deep validation
      const { data: rpcData, error: rpcErr } = await supabase.rpc('publish_organizer_challenge', {
        p_challenge_id: challengeId,
      });

      if (!rpcErr && rpcData && rpcData.success) {
        return {
          success: true,
          newStatus: (rpcData.new_status as ChallengeStatus) || 'PUBLISHED',
          error: null,
        };
      }

      // 2. Fallback to direct authorized status transition if RPC is not yet applied
      const { data: chRow, error: fetchErr } = await supabase
        .from('challenges')
        .select('status, start_date, end_date')
        .eq('id', challengeId)
        .eq('organizer_id', organizerId)
        .single();

      if (fetchErr || !chRow) {
        return {
          success: false,
          newStatus: 'DRAFT',
          error: fetchErr?.message || 'Challenge not found or not owned by you',
        };
      }

      const now = new Date().getTime();
      const start = new Date(chRow.start_date).getTime();
      const end = new Date(chRow.end_date).getTime();
      const targetStatus: ChallengeStatus = start <= now && end >= now ? 'ACTIVE' : 'PUBLISHED';

      const { error: updateErr } = await supabase
        .from('challenges')
        .update({
          status: targetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', challengeId)
        .eq('organizer_id', organizerId);

      if (updateErr) {
        return { success: false, newStatus: 'DRAFT', error: updateErr.message };
      }

      return { success: true, newStatus: targetStatus, error: null };
    } catch (err: any) {
      return { success: false, newStatus: 'DRAFT', error: err?.message || 'Publish operation failed' };
    }
  },
};
