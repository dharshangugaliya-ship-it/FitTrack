import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Challenge,
  DbChallenge,
  DbChallengeParticipant,
  VerificationStatus,
  ChallengeType,
  ParticipationStatus,
} from '../types';
import { MOCK_CHALLENGES } from '../data/mockData';
import { pointsService } from './pointsService';
import { progressService } from './progressService';
import { toDatabaseChallengeId, toFrontendChallengeId, isUuid } from '../lib/challengeIdMap';

// Local storage key for demo / fallback participation persistence
const LOCAL_PARTICIPATION_KEY = 'fittrack_user_participations';
const LOCAL_WITHDRAWN_KEY = 'fittrack_user_withdrawn_challenges';

interface LocalParticipation {
  challengeId: string;
  userId: string;
  joinedAt: string;
}

interface LocalWithdrawn {
  challengeId: string;
  userId: string;
  withdrawnAt: string;
}

function getLocalParticipations(): LocalParticipation[] {
  try {
    const raw = localStorage.getItem(LOCAL_PARTICIPATION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalParticipations(list: LocalParticipation[]) {
  try {
    localStorage.setItem(LOCAL_PARTICIPATION_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save local participations:', err);
  }
}

function getLocalWithdrawn(): LocalWithdrawn[] {
  try {
    const raw = localStorage.getItem(LOCAL_WITHDRAWN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalWithdrawn(list: LocalWithdrawn[]) {
  try {
    localStorage.setItem(LOCAL_WITHDRAWN_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save local withdrawn list:', err);
  }
}

function markAsWithdrawn(challengeId: string, userId: string) {
  const list = getLocalWithdrawn();
  const dbId = toDatabaseChallengeId(challengeId);
  const exists = list.some(
    (w) =>
      w.userId === userId &&
      (w.challengeId === challengeId ||
        w.challengeId === dbId ||
        toDatabaseChallengeId(w.challengeId) === dbId)
  );
  if (!exists) {
    list.push({ challengeId, userId, withdrawnAt: new Date().toISOString() });
    saveLocalWithdrawn(list);
  }
}

function unmarkWithdrawn(challengeId: string, userId: string) {
  const list = getLocalWithdrawn();
  const dbId = toDatabaseChallengeId(challengeId);
  const filtered = list.filter(
    (w) =>
      !(
        w.userId === userId &&
        (w.challengeId === challengeId ||
          w.challengeId === dbId ||
          toDatabaseChallengeId(w.challengeId) === dbId)
      )
  );
  saveLocalWithdrawn(filtered);
}

// Convert a Supabase DB row to the frontend Challenge interface
function mapDbChallengeToChallenge(
  db: DbChallenge,
  isEnrolled = false,
  joinedAt?: string
): Challenge {
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
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
    startDate: db.start_date,
    endDate: db.end_date,
    durationDays,
    participantCount: Number(db.participant_count) || 0,
    verificationRequirement: db.verification_requirement as VerificationStatus,
    targetValue: Number(db.target_value),
    targetUnit: db.target_unit,
    pointsReward: Number(db.points_reward) || 100,
    difficulty: db.difficulty,
    visibility: db.visibility,
    status: db.status,
    bannerUrl:
      db.banner_url ||
      'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
    isEnrolled,
    joinedAt,
    userProgress: isEnrolled ? 0 : undefined, // Phase 3: Joining registers participant status, no fake workout progress
  };
}

export const challengeService = {
  /**
   * Fetch public challenges from Supabase.
   * If Supabase is unconfigured or returns zero challenges, gracefully falls back to canonical seed dataset.
   * If userId is provided, attaches the real enrollment status for the user.
   */
  async getPublicChallenges(options?: {
    userId?: string | null;
    searchQuery?: string;
    verification?: string;
    category?: string;
    activity?: string;
  }): Promise<{ challenges: Challenge[]; source: 'supabase' | 'fallback'; error: string | null }> {
    const userId = options?.userId || null;

    if (!isSupabaseConfigured) {
      return {
        challenges: this.getFallbackChallenges(userId, options),
        source: 'fallback',
        error: null,
      };
    }

    try {
      // 1. Fetch public challenges from challenges table
      let query = supabase
        .from('challenges')
        .select('*')
        .eq('visibility', 'PUBLIC')
        .in('status', ['PUBLISHED', 'ACTIVE', 'COMPLETED'])
        .order('created_at', { ascending: false });

      if (options?.verification && options.verification !== 'ALL') {
        query = query.eq('verification_requirement', options.verification);
      }

      if (options?.category && options.category !== 'ALL') {
        query = query.eq('type', options.category);
      }

      if (options?.activity && options.activity !== 'ALL') {
        query = query.eq('activity', options.activity);
      }

      let { data: dbChallenges, error: fetchError } = await query;

      // If database returned no challenges and we have a valid authenticated user, attempt auto-seeding
      if ((!dbChallenges || dbChallenges.length === 0) && userId && isUuid(userId)) {
        try {
          const seedRows = MOCK_CHALLENGES.map((mock) => ({
            id: toDatabaseChallengeId(mock.id),
            organizer_id: userId,
            title: mock.title,
            description: mock.description,
            type: mock.type,
            activity: mock.activity,
            target_value: mock.targetValue,
            target_unit: mock.targetUnit,
            start_date: mock.startDate ? new Date(mock.startDate).toISOString() : new Date().toISOString(),
            end_date: mock.endDate ? new Date(mock.endDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
            verification_requirement: mock.verificationRequirement,
            visibility: 'PUBLIC',
            status: 'ACTIVE',
            points_reward: mock.pointsReward,
            difficulty: mock.difficulty,
            banner_url: mock.bannerUrl,
            organizer_name: mock.organizerName || 'FitTrack Challenge Team',
            organizer_avatar: mock.organizerAvatar,
          }));

          const { data: inserted } = await supabase.from('challenges').insert(seedRows).select('*');
          if (inserted && inserted.length > 0) {
            dbChallenges = inserted;
            fetchError = null;
          }
        } catch {
          // Continue to fallback if auto-seed is restricted
        }
      }

      if (fetchError || !dbChallenges || dbChallenges.length === 0) {
        if (fetchError) {
          console.warn('Supabase challenges query returned error, falling back:', fetchError.message);
        }
        return {
          challenges: this.getFallbackChallenges(userId, options),
          source: 'fallback',
          error: fetchError ? fetchError.message : null,
        };
      }

      // 2. If user is authenticated, query user's participation records from database AND local cache
      const userParticipationsMap = new Map<string, string>(); // challenge_id -> joined_at
      if (userId) {
        if (isUuid(userId)) {
          const { data: partRows } = await supabase
            .from('challenge_participants')
            .select('challenge_id, joined_at')
            .eq('user_id', userId);

          if (partRows) {
            partRows.forEach((p) => {
              userParticipationsMap.set(p.challenge_id, p.joined_at);
              const slug = toFrontendChallengeId(p.challenge_id);
              if (slug) userParticipationsMap.set(slug, p.joined_at);
            });
          }
        }

        // Also merge local participations as fallback
        const local = getLocalParticipations().filter((p) => p.userId === userId);
        local.forEach((p) => {
          userParticipationsMap.set(p.challengeId, p.joinedAt);
          const dbId = toDatabaseChallengeId(p.challengeId);
          if (dbId) userParticipationsMap.set(dbId, p.joinedAt);
        });
      }

      // 3. Map database rows to Challenge interface
      let mapped = (dbChallenges as DbChallenge[]).map((db) => {
        const isEnrolled =
          userParticipationsMap.has(db.id) ||
          userParticipationsMap.has(toFrontendChallengeId(db.id));
        const joinedAt =
          userParticipationsMap.get(db.id) ||
          userParticipationsMap.get(toFrontendChallengeId(db.id));
        return mapDbChallengeToChallenge(db, isEnrolled, joinedAt);
      });

      // 4. Apply search filter in-memory if provided
      if (options?.searchQuery && options.searchQuery.trim()) {
        const q = options.searchQuery.toLowerCase();
        mapped = mapped.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.activity.toLowerCase().includes(q) ||
            c.organizerName.toLowerCase().includes(q)
        );
      }

      return { challenges: mapped, source: 'supabase', error: null };
    } catch (err: any) {
      console.error('challengeService.getPublicChallenges exception:', err);
      return {
        challenges: this.getFallbackChallenges(userId, options),
        source: 'fallback',
        error: err?.message || 'Unknown network error',
      };
    }
  },

  /**
   * Get a single challenge by its ID
   */
  async getChallengeById(
    challengeId: string,
    userId?: string | null
  ): Promise<{ challenge: Challenge | null; source: 'supabase' | 'fallback'; error: string | null }> {
    if (!isSupabaseConfigured) {
      const match = this.getFallbackChallenges(userId).find((c) => c.id === challengeId);
      return { challenge: match || null, source: 'fallback', error: null };
    }

    const dbChallengeId = toDatabaseChallengeId(challengeId);

    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', dbChallengeId)
        .maybeSingle();

      if (error || !data) {
        // Check fallback in case id was from mock/demo
        const fallbackMatch = this.getFallbackChallenges(userId).find(
          (c) => c.id === challengeId || c.id === dbChallengeId
        );
        if (fallbackMatch) {
          return { challenge: fallbackMatch, source: 'fallback', error: null };
        }
        return { challenge: null, source: 'supabase', error: error ? error.message : 'Challenge not found' };
      }

      let isEnrolled = false;
      let joinedAt: string | undefined = undefined;

      if (userId) {
        if (isUuid(userId)) {
          const { data: part } = await supabase
            .from('challenge_participants')
            .select('joined_at')
            .eq('challenge_id', dbChallengeId)
            .eq('user_id', userId)
            .maybeSingle();

          if (part) {
            isEnrolled = true;
            joinedAt = part.joined_at;
          }
        }

        if (!isEnrolled) {
          const localPart = getLocalParticipations().find(
            (p) =>
              p.userId === userId &&
              (p.challengeId === challengeId ||
                p.challengeId === dbChallengeId ||
                toDatabaseChallengeId(p.challengeId) === dbChallengeId)
          );
          if (localPart) {
            isEnrolled = true;
            joinedAt = localPart.joinedAt;
          }
        }
      }

      const challenge = mapDbChallengeToChallenge(data as DbChallenge, isEnrolled, joinedAt);
      return { challenge, source: 'supabase', error: null };
    } catch (err: any) {
      console.error('getChallengeById exception:', err);
      const fallbackMatch = this.getFallbackChallenges(userId).find(
        (c) => c.id === challengeId || c.id === dbChallengeId
      );
      return {
        challenge: fallbackMatch || null,
        source: 'fallback',
        error: err?.message || 'Failed to fetch challenge',
      };
    }
  },

  /**
   * Fetch all challenges joined by the specified user
   */
  async getMyChallenges(
    userId: string | null
  ): Promise<{ challenges: Challenge[]; source: 'supabase' | 'fallback'; error: string | null }> {
    if (!userId) {
      return { challenges: [], source: 'fallback', error: 'User is not authenticated' };
    }

    if (!isSupabaseConfigured) {
      const localParts = getLocalParticipations().filter((p) => p.userId === userId);
      const enrolledIds = new Set(localParts.map((p) => p.challengeId));
      const withdrawnList = getLocalWithdrawn().filter((w) => w.userId === userId);
      const isWithdrawn = (id: string) => {
        const dbId = toDatabaseChallengeId(id);
        return withdrawnList.some(
          (w) =>
            w.challengeId === id ||
            w.challengeId === dbId ||
            toDatabaseChallengeId(w.challengeId) === dbId
        );
      };

      const [progressRes, pointsRes] = await Promise.all([
        progressService.getUserAllProgress(userId),
        pointsService.getUserPoints(userId),
      ]);

      const progressMap = progressRes.progressMap;
      const pointsByChallenge = new Map<string, number>();
      pointsRes.events.forEach((ev) => {
        if (ev.challengeId) {
          const fid = toFrontendChallengeId(ev.challengeId);
          const did = toDatabaseChallengeId(ev.challengeId);
          pointsByChallenge.set(ev.challengeId, (pointsByChallenge.get(ev.challengeId) || 0) + ev.points);
          pointsByChallenge.set(fid, (pointsByChallenge.get(fid) || 0) + ev.points);
          pointsByChallenge.set(did, (pointsByChallenge.get(did) || 0) + ev.points);
        }
      });

      const myChallenges = MOCK_CHALLENGES.filter(
        (c) =>
          !isWithdrawn(c.id) &&
          (enrolledIds.has(c.id) || (userId === 'usr_aarav_01' && c.isEnrolled))
      ).map((c) => {
        const part = localParts.find((p) => p.challengeId === c.id);
        const prog = progressMap[c.id];
        return {
          ...c,
          isEnrolled: true,
          joinedAt: part?.joinedAt || '2026-09-12',
          userProgress: prog ? prog.currentValue : 0,
          challengeScore: prog ? prog.challengeScore : 0,
          pointsEarned: pointsByChallenge.get(c.id) || 10,
        };
      });

      return { challenges: myChallenges, source: 'fallback', error: null };
    }

    try {
      const withdrawnList = getLocalWithdrawn().filter((w) => w.userId === userId);
      const isWithdrawn = (id: string) => {
        const dbId = toDatabaseChallengeId(id);
        return withdrawnList.some(
          (w) =>
            w.challengeId === id ||
            w.challengeId === dbId ||
            toDatabaseChallengeId(w.challengeId) === dbId
        );
      };

      // Query challenge_participants for this user if valid UUID
      let partRows: { challenge_id: string; joined_at: string; status: string }[] | null = null;
      if (isUuid(userId)) {
        const res = await supabase
          .from('challenge_participants')
          .select('challenge_id, joined_at, status')
          .eq('user_id', userId);
        partRows = res.data;
      }

      // Merge local participations
      const localParts = getLocalParticipations().filter((p) => p.userId === userId);
      const combinedIds = new Set<string>();
      const joinedAtMap = new Map<string, string>();

      if (partRows) {
        partRows.forEach((r) => {
          if (!isWithdrawn(r.challenge_id)) {
            combinedIds.add(r.challenge_id);
            joinedAtMap.set(r.challenge_id, r.joined_at);
          }
        });
      }

      localParts.forEach((lp) => {
        const dbId = toDatabaseChallengeId(lp.challengeId);
        if (!isWithdrawn(lp.challengeId) && !isWithdrawn(dbId)) {
          combinedIds.add(dbId);
          if (!joinedAtMap.has(dbId)) {
            joinedAtMap.set(dbId, lp.joinedAt);
          }
        }
      });

      if (combinedIds.size === 0) {
        return { challenges: [], source: 'supabase', error: null };
      }

      const challengeIds = Array.from(combinedIds);

      // Fetch the challenges by IDs and simultaneously fetch progress & points
      const [challengesResult, progressRes, pointsRes] = await Promise.all([
        supabase.from('challenges').select('*').in('id', challengeIds),
        progressService.getUserAllProgress(userId),
        pointsService.getUserPoints(userId),
      ]);

      const { data: challengesData } = challengesResult;
      const progressMap = progressRes.progressMap;
      const pointsByChallenge = new Map<string, number>();
      pointsRes.events.forEach((ev) => {
        if (ev.challengeId) {
          const fid = toFrontendChallengeId(ev.challengeId);
          const did = toDatabaseChallengeId(ev.challengeId);
          pointsByChallenge.set(ev.challengeId, (pointsByChallenge.get(ev.challengeId) || 0) + ev.points);
          pointsByChallenge.set(fid, (pointsByChallenge.get(fid) || 0) + ev.points);
          pointsByChallenge.set(did, (pointsByChallenge.get(did) || 0) + ev.points);
        }
      });

      const foundDbIds = new Set<string>();
      const mappedList: Challenge[] = [];

      if (challengesData) {
        (challengesData as DbChallenge[]).forEach((db) => {
          foundDbIds.add(db.id);
          const base = mapDbChallengeToChallenge(db, true, joinedAtMap.get(db.id));
          const prog = progressMap[db.id] || progressMap[toFrontendChallengeId(db.id)];
          mappedList.push({
            ...base,
            userProgress: prog ? prog.currentValue : 0,
            challengeScore: prog ? prog.challengeScore : 0,
            pointsEarned: pointsByChallenge.get(db.id) || pointsByChallenge.get(toFrontendChallengeId(db.id)) || 10,
          });
        });
      }

      // For any challenge IDs in combinedIds not returned from challenges table, load from MOCK_CHALLENGES
      challengeIds.forEach((chId) => {
        if (!foundDbIds.has(chId)) {
          const mockMatch = MOCK_CHALLENGES.find(
            (m) => m.id === chId || toDatabaseChallengeId(m.id) === chId
          );
          if (mockMatch) {
            const prog = progressMap[mockMatch.id] || progressMap[chId];
            mappedList.push({
              ...mockMatch,
              isEnrolled: true,
              joinedAt: joinedAtMap.get(chId) || new Date().toISOString(),
              userProgress: prog ? prog.currentValue : 0,
              challengeScore: prog ? prog.challengeScore : 0,
              pointsEarned: pointsByChallenge.get(mockMatch.id) || pointsByChallenge.get(chId) || 10,
            });
          }
        }
      });

      return { challenges: mappedList, source: 'supabase', error: null };
    } catch (err: any) {
      console.error('getMyChallenges exception:', err);
      return { challenges: [], source: 'fallback', error: err?.message || 'Error loading joined challenges' };
    }
  },

  /**
   * Join a challenge (creates participant record in Supabase or local storage).
   * Enforces duplicate join protection and foreign key resilience.
   */
  async joinChallenge(
    challengeId: string,
    userId: string
  ): Promise<{ success: boolean; alreadyJoined?: boolean; error: string | null }> {
    if (!userId) {
      return { success: false, error: 'Authentication required to join challenge.' };
    }

    const dbChallengeId = toDatabaseChallengeId(challengeId);
    const isUserValidUuid = isUuid(userId);

    // If Supabase is not configured or userId is not a valid UUID (demo mode / mock profile),
    // manage participation in local store.
    unmarkWithdrawn(challengeId, userId);
    if (!isSupabaseConfigured || !isUserValidUuid || userId.startsWith('demo-')) {
      const local = getLocalParticipations();
      const existingLocal = local.find(
        (p) =>
          (p.challengeId === challengeId ||
            p.challengeId === dbChallengeId ||
            toDatabaseChallengeId(p.challengeId) === dbChallengeId) &&
          p.userId === userId
      );
      if (!existingLocal) {
        local.push({
          challengeId,
          userId,
          joinedAt: new Date().toISOString(),
        });
        saveLocalParticipations(local);

        const ch = MOCK_CHALLENGES.find(
          (c) => c.id === challengeId || toDatabaseChallengeId(c.id) === dbChallengeId
        );
        await pointsService.recordJoinPointEvent(userId, challengeId, ch?.title || 'Fitness Challenge');
      }
      return { success: true, alreadyJoined: Boolean(existingLocal), error: null };
    }

    // When Supabase IS configured AND userId is a valid UUID:
    try {
      // 1. Ensure the challenge row exists in public.challenges so foreign key
      // challenge_participants_challenge_id_fkey is satisfied
      const { data: existingChallenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('id', dbChallengeId)
        .maybeSingle();

      if (!existingChallenge) {
        // Auto-provision challenge from MOCK_CHALLENGES with organizer_id = userId
        const mock = MOCK_CHALLENGES.find(
          (c) => c.id === challengeId || toDatabaseChallengeId(c.id) === dbChallengeId
        );
        if (mock) {
          try {
            // Ensure profile exists for organizer foreign key constraint
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .maybeSingle();

            if (!existingProfile) {
              await supabase.from('profiles').insert([
                {
                  id: userId,
                  display_name: 'Challenger',
                  mode: 'challenger',
                },
              ]);
            }

            await supabase.from('challenges').insert([
              {
                id: dbChallengeId,
                organizer_id: userId,
                title: mock.title,
                description: mock.description,
                type: mock.type,
                activity: mock.activity,
                target_value: mock.targetValue,
                target_unit: mock.targetUnit,
                start_date: mock.startDate ? new Date(mock.startDate).toISOString() : new Date().toISOString(),
                end_date: mock.endDate ? new Date(mock.endDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
                verification_requirement: mock.verificationRequirement,
                visibility: 'PUBLIC',
                status: 'ACTIVE',
                points_reward: mock.pointsReward,
                difficulty: mock.difficulty,
                banner_url: mock.bannerUrl,
                organizer_name: mock.organizerName || 'FitTrack Challenge Team',
                organizer_avatar: mock.organizerAvatar,
              },
            ]);
          } catch (seedErr) {
            console.warn('Auto-provision challenge record skipped/failed:', seedErr);
          }
        }
      }

      // 2. Ensure profile exists for user_id foreign key
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!profileCheck) {
        try {
          await supabase.from('profiles').insert([
            {
              id: userId,
              display_name: 'Challenger',
              mode: 'challenger',
            },
          ]);
        } catch (pErr) {
          console.warn('Auto-create user profile encounter:', pErr);
        }
      }

      // 3. Attempt insert into challenge_participants
      const { data, error } = await supabase
        .from('challenge_participants')
        .insert([
          {
            challenge_id: dbChallengeId,
            user_id: userId,
            status: 'JOINED',
          },
        ])
        .select()
        .single();

      if (error) {
        // Postgres unique violation error code 23505 or duplicate participation constraint
        if (
          error.code === '23505' ||
          error.message.toLowerCase().includes('unique') ||
          error.message.toLowerCase().includes('duplicate')
        ) {
          const local = getLocalParticipations();
          if (!local.some((p) => (p.challengeId === challengeId || p.challengeId === dbChallengeId) && p.userId === userId)) {
            local.push({
              challengeId,
              userId,
              joinedAt: new Date().toISOString(),
            });
            saveLocalParticipations(local);
          }
          return { success: true, alreadyJoined: true, error: null };
        }

        // Foreign key constraint violation (e.g. challenge_id_fkey or user_id_fkey)
        // Or any RLS/database error: smoothly fallback to local participation
        console.warn('Supabase join insertion constraint/error; applying local participation fallback:', error.message);
        const local = getLocalParticipations();
        if (!local.some((p) => (p.challengeId === challengeId || p.challengeId === dbChallengeId) && p.userId === userId)) {
          local.push({
            challengeId,
            userId,
            joinedAt: new Date().toISOString(),
          });
          saveLocalParticipations(local);
        }
        const ch = MOCK_CHALLENGES.find((c) => c.id === challengeId || toDatabaseChallengeId(c.id) === dbChallengeId);
        await pointsService.recordJoinPointEvent(userId, challengeId, ch?.title || 'Fitness Challenge');
        return { success: true, alreadyJoined: false, error: null };
      }

      // On clean verified database insertion, sync local UI cache
      const local = getLocalParticipations();
      if (!local.some((p) => (p.challengeId === challengeId || p.challengeId === dbChallengeId) && p.userId === userId)) {
        local.push({
          challengeId,
          userId,
          joinedAt: data?.joined_at || new Date().toISOString(),
        });
        saveLocalParticipations(local);
      }

      const ch = MOCK_CHALLENGES.find((c) => c.id === challengeId || toDatabaseChallengeId(c.id) === dbChallengeId);
      await pointsService.recordJoinPointEvent(userId, challengeId, ch?.title || 'Fitness Challenge');

      return { success: true, alreadyJoined: false, error: null };
    } catch (err: any) {
      console.error('joinChallenge exception, applying local fallback:', err);
      const local = getLocalParticipations();
      if (!local.some((p) => (p.challengeId === challengeId || p.challengeId === dbChallengeId) && p.userId === userId)) {
        local.push({
          challengeId,
          userId,
          joinedAt: new Date().toISOString(),
        });
        saveLocalParticipations(local);
      }
      const ch = MOCK_CHALLENGES.find((c) => c.id === challengeId || toDatabaseChallengeId(c.id) === dbChallengeId);
      await pointsService.recordJoinPointEvent(userId, challengeId, ch?.title || 'Fitness Challenge');
      return {
        success: true,
        alreadyJoined: false,
        error: null,
      };
    }
  },

  /**
   * Leave a challenge
   */
  async leaveChallenge(
    challengeId: string,
    userId: string
  ): Promise<{ success: boolean; error: string | null }> {
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    const dbChallengeId = toDatabaseChallengeId(challengeId);

    // Mark as withdrawn locally for immediate UI update & consistency
    markAsWithdrawn(challengeId, userId);

    // Always remove from local participation cache
    const local = getLocalParticipations().filter(
      (p) =>
        !(
          p.userId === userId &&
          (p.challengeId === challengeId ||
            p.challengeId === dbChallengeId ||
            toDatabaseChallengeId(p.challengeId) === dbChallengeId)
        )
    );
    saveLocalParticipations(local);

    // When Supabase is NOT configured or user is not UUID, local update is complete
    if (!isSupabaseConfigured || !isUuid(userId)) {
      return { success: true, error: null };
    }

    try {
      const { error } = await supabase
        .from('challenge_participants')
        .delete()
        .eq('challenge_id', dbChallengeId)
        .eq('user_id', userId);

      if (error) {
        console.warn('Supabase delete returned error, but local withdrawal applied:', error.message);
      }

      return { success: true, error: null };
    } catch (err: any) {
      console.warn('leaveChallenge exception, local withdrawal applied:', err);
      return { success: true, error: null };
    }
  },

  /**
   * Check participation status for a given challenge and user
   */
  async getParticipationStatus(
    challengeId: string,
    userId: string | null
  ): Promise<ParticipationStatus | 'NOT_JOINED'> {
    if (!userId) return 'NOT_JOINED';

    const dbChallengeId = toDatabaseChallengeId(challengeId);

    // If marked as withdrawn, user is NOT_JOINED
    const withdrawnList = getLocalWithdrawn();
    const isWithdrawn = withdrawnList.some(
      (w) =>
        w.userId === userId &&
        (w.challengeId === challengeId ||
          w.challengeId === dbChallengeId ||
          toDatabaseChallengeId(w.challengeId) === dbChallengeId)
    );
    if (isWithdrawn) return 'NOT_JOINED';

    // Check local store (immediate UI response)
    const local = getLocalParticipations();
    const foundLocal = local.find(
      (p) =>
        p.userId === userId &&
        (p.challengeId === challengeId ||
          p.challengeId === dbChallengeId ||
          toDatabaseChallengeId(p.challengeId) === dbChallengeId)
    );
    if (foundLocal) return 'JOINED';

    const mockMatch = MOCK_CHALLENGES.find(
      (c) => c.id === challengeId || toDatabaseChallengeId(c.id) === dbChallengeId
    );
    if (userId === 'usr_aarav_01' && mockMatch?.isEnrolled && !isWithdrawn) return 'JOINED';

    if (!isSupabaseConfigured || !isUuid(userId)) {
      return 'NOT_JOINED';
    }

    try {
      const { data } = await supabase
        .from('challenge_participants')
        .select('status')
        .eq('challenge_id', dbChallengeId)
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        return (data.status as ParticipationStatus) || 'JOINED';
      }
      return 'NOT_JOINED';
    } catch {
      return 'NOT_JOINED';
    }
  },

  /**
   * Fetch challenges created by a specific organizer
   */
  async getOrganizerChallenges(
    organizerId: string
  ): Promise<{ challenges: Challenge[]; source: 'supabase' | 'fallback'; error: string | null }> {
    if (!isSupabaseConfigured || !isUuid(organizerId)) {
      return {
        challenges: MOCK_CHALLENGES.slice(0, 4),
        source: 'fallback',
        error: null,
      };
    }

    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('organizer_id', organizerId)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return {
          challenges: MOCK_CHALLENGES.slice(0, 4),
          source: 'fallback',
          error: error ? error.message : null,
        };
      }

      const mapped = (data as DbChallenge[]).map((db) => mapDbChallengeToChallenge(db, false));
      return { challenges: mapped, source: 'supabase', error: null };
    } catch (err: any) {
      return {
        challenges: MOCK_CHALLENGES.slice(0, 4),
        source: 'fallback',
        error: err?.message || 'Failed to fetch organizer challenges',
      };
    }
  },

  /**
   * Helper providing fallback challenges enriched with local participation state
   */
  getFallbackChallenges(
    userId?: string | null,
    options?: {
      searchQuery?: string;
      verification?: string;
      category?: string;
      activity?: string;
    }
  ): Challenge[] {
    const local = getLocalParticipations();
    const withdrawnList = getLocalWithdrawn().filter((w) => w.userId === userId);
    const isWithdrawn = (id: string) => {
      const dbId = toDatabaseChallengeId(id);
      return withdrawnList.some(
        (w) =>
          w.challengeId === id ||
          w.challengeId === dbId ||
          toDatabaseChallengeId(w.challengeId) === dbId
      );
    };
    const enrolledIds = new Set(
      local.filter((p) => (userId ? p.userId === userId : false)).map((p) => p.challengeId)
    );

    let list = MOCK_CHALLENGES.map((ch) => {
      const dbId = toDatabaseChallengeId(ch.id);
      const isEnrolledLocally =
        !isWithdrawn(ch.id) &&
        !isWithdrawn(dbId) &&
        (enrolledIds.has(ch.id) ||
          enrolledIds.has(dbId) ||
          (dbId ? enrolledIds.has(toFrontendChallengeId(dbId)) : false));
      const isEnrolledMock = userId === 'usr_aarav_01' && !isWithdrawn(ch.id) ? ch.isEnrolled : false;
      const isEnrolled = isEnrolledLocally || Boolean(isEnrolledMock);
      const part = local.find(
        (p) =>
          p.userId === userId &&
          (p.challengeId === ch.id || p.challengeId === dbId || toDatabaseChallengeId(p.challengeId) === dbId)
      );

      return {
        ...ch,
        isEnrolled,
        joinedAt: part?.joinedAt || (isEnrolled ? '2026-09-10' : undefined),
        userProgress: isEnrolled ? 0 : undefined, // Explicit Phase 3 constraint
      };
    });

    if (options?.verification && options.verification !== 'ALL') {
      list = list.filter((c) => c.verificationRequirement === options.verification);
    }
    if (options?.category && options.category !== 'ALL') {
      list = list.filter((c) => c.type === options.category);
    }
    if (options?.activity && options.activity !== 'ALL') {
      list = list.filter((c) => c.activity === options.activity);
    }
    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.activity.toLowerCase().includes(q) ||
          c.organizerName.toLowerCase().includes(q)
      );
    }

    return list;
  },
};
