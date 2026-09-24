export type AppMode = 'CHALLENGER' | 'ORGANIZER';

export type ChallengeType =
  | 'GOAL_BASED'
  | 'CONSISTENCY'
  | 'ACTIVITY'
  | 'COMPETITION'
  | 'TEAM'
  | 'EVENT'
  | 'MULTI_ACTIVITY';

export type ActivityType =
  | 'SQUATS'
  | 'PLANK'
  | 'RUNNING'
  | 'WALKING'
  | 'CYCLING'
  | 'SKIPPING'
  | 'SWIMMING'
  | 'PUSH_UPS'
  | 'YOGA';

export type VerificationStatus =
  | 'AI_VERIFIED'
  | 'DEVICE_VERIFIED'
  | 'ORGANIZER_APPROVED'
  | 'SELF_REPORTED';

export type ChallengeDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type DifficultyLevel = ChallengeDifficulty;

export type ChallengeVisibility = 'PUBLIC' | 'PRIVATE';

export type ChallengeStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'UPCOMING';

export type ParticipationStatus = 'JOINED' | 'COMPLETED' | 'LEFT';

export interface Challenge {
  id: string;
  organizerId?: string;
  title: string;
  description: string;
  type: ChallengeType;
  activity: ActivityType;
  organizerName: string;
  organizerRole?: string;
  organizerAvatar: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  participantCount: number;
  verificationRequirement: VerificationStatus;
  targetValue: number;
  targetUnit: string;
  pointsReward: number;
  difficulty: ChallengeDifficulty;
  visibility?: ChallengeVisibility;
  status: ChallengeStatus;
  bannerUrl: string;
  demoVideoUrl?: string;
  demoVideoType?: 'CUSTOM' | 'AI_GENERATED';
  demoVideoPoster?: string;
  formInstructions?: string[];
  targetMuscles?: string[];
  commonMistakes?: string[];
  featured?: boolean;
  isEnrolled?: boolean;
  userProgress?: number;
  challengeScore?: number;
  pointsEarned?: number;
  joinedAt?: string;
}

export interface DbChallenge {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  type: ChallengeType;
  activity: ActivityType;
  target_value: number;
  target_unit: string;
  start_date: string;
  end_date: string;
  verification_requirement: VerificationStatus;
  visibility: ChallengeVisibility;
  status: ChallengeStatus;
  participant_count: number;
  points_reward: number;
  difficulty: ChallengeDifficulty;
  banner_url: string | null;
  demo_video_url?: string | null;
  demo_video_type?: string | null;
  organizer_name: string;
  organizer_avatar: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  status: ParticipationStatus;
}

export interface Participant {
  id: string;
  challengeId: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  status: 'ACTIVE' | 'COMPLETED';
  currentScore: number;
  targetValue: number;
  targetUnit: string;
  joinedAt: string;
  completedAt?: string;
}

export interface Submission {
  id: string;
  challengeId: string;
  challengeTitle: string;
  userId: string;
  displayName: string;
  userName?: string;
  userAvatar: string;
  activity: ActivityType;
  submittedAt: string;
  verificationStatus: VerificationStatus;
  evidenceUrl?: string;
  evidenceType?: 'video' | 'device_telemetry' | 'manual_entry';
  score: number;
  claimedScore?: number;
  verifiedScore?: number;
  pointsAwarded?: number;
  notes?: string;
  targetUnit: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerNotes?: string;
  aiConfidence?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string;
  challengeScore: number;
  targetUnit: string;
  progressPercentage?: number;
  verificationStatus: VerificationStatus;
  isCurrentUser?: boolean;
  completionDate?: string;
  lastActivityAt?: string;
}

export interface ChallengeLeaderboard {
  challengeId: string;
  challengeTitle: string;
  targetUnit: string;
  targetValue: number;
  verificationRequirement: VerificationStatus;
  entries: LeaderboardEntry[];
  totalRankedParticipants: number;
  currentUserEntry?: LeaderboardEntry | null;
  dataSource: 'supabase' | 'fallback';
}

export interface DbLeaderboardRpcEntry {
  rank: number;
  challenge_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  challenge_score: number;
  progress_percentage: number;
  verification_requirement: VerificationStatus;
  last_activity_at: string | null;
  completed_at: string | null;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  fitnessLevel: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  activeChallenges: number;
  verifiedActivities: number;
  joinedDate: string;
  organization?: string;
  verifiedWorkoutsCount?: number;
  challengesEnrolledCount?: number;
}

export interface OrganizerStats {
  totalParticipants: number;
  activeChallenges: number;
  pendingReviews: number;
  verifiedActivities: number;
  completionRate: number;
  totalSubmissions: number;
}

export interface PointsRule {
  action: string;
  points: number;
  category: string;
  description: string;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  mode: 'challenger' | 'organizer';
  created_at: string;
  updated_at: string;
}

export type AuthInitStatus = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

// ==============================================================================
// Phase 4: FITTRACK Points & Challenge Progress Types
// ==============================================================================

export type PointEventType =
  | 'JOIN_CHALLENGE'
  | 'AI_VERIFIED'
  | 'ORGANIZER_APPROVED'
  | 'SELF_REPORTED'
  | 'DAILY_TARGET_COMPLETED'
  | 'STREAK_7_DAY'
  | 'CHALLENGE_COMPLETED'
  | 'BADGE_EARNED';

export interface FittrackPointEvent {
  id: string;
  userId: string;
  eventType: PointEventType;
  points: number;
  challengeId?: string | null;
  challengeTitle?: string | null;
  referenceId?: string | null;
  description: string;
  createdAt: string;
}

export interface DbPointEvent {
  id: string;
  user_id: string;
  event_type: PointEventType;
  points: number;
  challenge_id: string | null;
  reference_id: string | null;
  description: string;
  created_at: string;
}

export interface ChallengeProgress {
  id: string;
  challengeId: string;
  userId: string;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  challengeScore: number;
  targetUnit?: string;
  lastActivityAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbChallengeProgress {
  id: string;
  challenge_id: string;
  user_id: string;
  current_value: number;
  target_value: number;
  progress_percentage: number;
  challenge_score: number;
  last_activity_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengerDashboardStats {
  totalPoints: number;
  activeChallengesCount: number;
  completedChallengesCount: number;
  currentStreak: number;
  hasActiveStreak: boolean;
  totalVerifiedSessions: number;
  source: 'supabase' | 'fallback';
}

export interface OrganizerDashboardStats {
  totalChallenges: number;
  activeChallenges: number;
  publishedChallenges: number;
  draftChallenges: number;
  completedChallenges: number;
  totalParticipants: number;
  totalPointsRewardPool: number;
  source: 'supabase' | 'fallback';
}

export interface OrganizerChallengeParticipant {
  participantId: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  status: string;
  joinedAt: string;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  challengeScore: number;
  lastActivityAt: string | null;
  completedAt: string | null;
}

export interface ChallengeFormData {
  id?: string;
  title: string;
  description: string;
  type: ChallengeType;
  activity: ActivityType;
  targetValue: number;
  targetUnit: string;
  startDate: string;
  endDate: string;
  verificationRequirement: VerificationStatus;
  visibility: ChallengeVisibility;
  difficulty: ChallengeDifficulty;
  pointsReward: number;
  bannerUrl: string;
  demoVideoUrl?: string;
  demoVideoType?: 'CUSTOM' | 'AI_GENERATED';
  formInstructions?: string[];
}

export interface ChallengeFormErrors {
  title?: string;
  description?: string;
  targetValue?: string;
  targetUnit?: string;
  startDate?: string;
  endDate?: string;
  pointsReward?: string;
  bannerUrl?: string;
  general?: string;
}

// ==========================================
// PHASE 8: CAMERA & VERIFICATION PIPELINE TYPES
// ==========================================

export type VerificationSessionState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'READY'
  | 'STARTING'
  | 'ACTIVE'
  | 'STOPPING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'ERROR'
  | 'DENIED'
  | 'UNSUPPORTED';

export type CameraVerificationErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'UNSUPPORTED_BROWSER'
  | 'PERMISSION_DENIED'
  | 'NO_CAMERA'
  | 'CAMERA_IN_USE'
  | 'STREAM_INITIALIZATION_FAILED'
  | 'SESSION_START_FAILED'
  | 'SESSION_STOP_FAILED'
  | 'PROCESSING_UNAVAILABLE'
  | 'CHALLENGE_NOT_FOUND'
  | 'UNKNOWN_ERROR';

export interface CameraVerificationError {
  code: CameraVerificationErrorCode;
  message: string;
  details?: string;
  recoverable: boolean;
}

export interface VerificationSession {
  id: string;
  challengeId: string;
  userId: string;
  activity: ActivityType;
  verificationRequirement: VerificationStatus;
  status: VerificationSessionState;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
}

export type VerificationResultStatus =
  | 'NOT_PROCESSED'
  | 'PROCESSING_UNAVAILABLE'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'FAILED';

export interface VerificationResult {
  verified: boolean;
  status: VerificationResultStatus;
  activity: ActivityType;
  challengeId: string;
  verificationMethod: VerificationStatus;
  measuredValue?: number;
  targetValue?: number;
  targetUnit?: string;
  confidence?: number;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  reason?: string;
}

export interface VerificationContext {
  challengeId: string;
  activity: ActivityType;
  targetValue: number;
  targetUnit: string;
  verificationRequirement: VerificationStatus;
  userId: string;
}

export interface VerificationFrameResult {
  detected: boolean;
  landmarksCount?: number;
  poseConfidence?: number;
  feedbackMessage?: string;
  metrics?: Record<string, number>;
}

export interface VerificationProcessor {
  name: string;
  initialize(context: VerificationContext): Promise<void>;
  processFrame(videoElement: HTMLVideoElement, timestampMs: number): Promise<VerificationFrameResult>;
  finalize(): Promise<VerificationResult>;
  reset(): void;
  dispose(): void;
}

