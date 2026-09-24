import React, { useState, useEffect } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { challengeService } from '../../services/challengeService';
import { Challenge } from '../../types';
import { VerificationBadge } from '../../components/VerificationBadge';
import {
  ArrowLeft,
  Calendar,
  Users,
  Award,
  CheckCircle2,
  Play,
  Sparkles,
  ShieldCheck,
  Watch,
  UserCheck,
  AlertCircle,
  Clock,
  Flame,
  ChevronRight,
  Database,
  Trophy,
  Film,
} from 'lucide-react';
import { ExerciseDemoModal } from '../../components/exercise-demo/ExerciseDemoModal';

export const ChallengeDetailsView: React.FC = () => {
  const { currentPath, params, navigate, setAuthModalOpen } = useRouter();
  const { user, isAuthenticated, isDemoMode, isSupabaseConfigured } = useAuth();

  const challengeId = params.id || params.challengeId || '';

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'fallback'>('fallback');

  // Join button state management
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinSuccessNotice, setJoinSuccessNotice] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);

  // Load challenge details
  useEffect(() => {
    let isMounted = true;
    async function loadChallenge() {
      if (!challengeId) {
        setError('No challenge ID specified');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const effectiveUserId = user?.id || (isDemoMode ? 'usr_aarav_01' : null);
        const res = await challengeService.getChallengeById(challengeId, effectiveUserId);
        if (!isMounted) return;

        if (res.challenge) {
          setChallenge(res.challenge);
          setDataSource(res.source);
        } else {
          setError(res.error || 'Challenge not found');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || 'Failed to load challenge details');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadChallenge();
    return () => {
      isMounted = false;
    };
  }, [challengeId, user?.id, isDemoMode]);

  const handleJoin = async () => {
    if (!challenge) return;

    // Check if user is authenticated
    if (!isAuthenticated && !isDemoMode) {
      // Preserve intended return path:
      // Navigate to /login with redirect query or open auth modal
      navigate(`/login?redirect=/challenges/${challenge.id}`);
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    const effectiveUserId = user?.id || 'usr_aarav_01';

    try {
      const res = await challengeService.joinChallenge(challenge.id, effectiveUserId);
      if (res.success) {
        setChallenge((prev) => (prev ? { ...prev, isEnrolled: true, joinedAt: new Date().toISOString() } : null));
        setJoinSuccessNotice(true);
      } else {
        setJoinError(res.error || 'Unable to join challenge. Please try again.');
      }
    } catch (err: any) {
      setJoinError(err?.message || 'Network error while attempting to join.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartWorkout = () => {
    if (challenge) {
      navigate(`/workout/${challenge.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
          <Sparkles className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Loading challenge specifications...</p>
        <p className="text-xs text-slate-500 font-mono">Querying FITTRACK Supabase registry</p>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="max-w-2xl mx-auto my-12 rounded-3xl bg-[#121722] border border-white/8 p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Challenge Unavailable</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          {error || 'The requested challenge record could not be found or has been removed.'}
        </p>
        <div className="pt-2">
          <button
            onClick={() => navigate('/challenges')}
            className="rounded-xl bg-white/10 hover:bg-white/15 px-5 py-2.5 text-xs font-bold text-white transition-colors"
          >
            Return to Challenge Discovery
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = challenge.status === 'COMPLETED';
  const isCancelled = challenge.status === 'CANCELLED';
  const isEnrolled = Boolean(challenge.isEnrolled);

  const startDateFormatted = new Date(challenge.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const endDateFormatted = new Date(challenge.endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto text-left">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/challenges')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Open Challenges</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/leaderboard/${challenge.id}`)}
            className="flex items-center gap-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400 transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>View Leaderboard</span>
          </button>

          {dataSource === 'supabase' ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
              <Database className="w-3 h-3" />
              SUPABASE CONNECTED
            </span>
          ) : (
            <span className="rounded-full bg-slate-800 border border-white/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-slate-400">
              SIH EVALUATION RECORD
            </span>
          )}
        </div>
      </div>

      {/* Main Challenge Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#121722] border border-white/10 shadow-2xl">
        <div className="relative h-72 sm:h-80 w-full overflow-hidden bg-slate-900">
          <img
            src={challenge.bannerUrl}
            alt={challenge.title}
            className="h-full w-full object-cover opacity-100 brightness-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121722]/90 via-[#121722]/30 to-transparent pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/10 uppercase tracking-wider">
              {challenge.type.replace('_', ' ')}
            </span>
            <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md px-3 py-1 text-xs font-semibold">
              {challenge.difficulty} Difficulty
            </span>
            {challenge.status === 'ACTIVE' && (
              <span className="rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-md px-3 py-1 text-xs font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Active Registration
              </span>
            )}
          </div>

          {/* Title & Floating Info */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <VerificationBadge status={challenge.verificationRequirement} size="md" />
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {challenge.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {challenge.description}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-emerald-400 self-start md:self-auto font-mono shrink-0">
              <Award className="w-6 h-6 text-emerald-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-500 block leading-tight">Reward</span>
                <span className="text-base font-bold text-white">+{challenge.pointsReward} Points</span>
              </div>
            </div>
          </div>
        </div>

        {/* Join Notification Banner */}
        {joinSuccessNotice && (
          <div className="bg-emerald-500/15 border-y border-emerald-500/30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">Successfully Joined Challenge!</p>
                <p className="text-xs text-emerald-300/90">
                  Participation registered in FITTRACK. View progress in your Challenger workspace.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/my-challenges')}
              className="rounded-xl bg-emerald-500 text-slate-950 px-4 py-1.5 text-xs font-bold hover:bg-emerald-400 transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              Go to My Challenges
            </button>
          </div>
        )}

        {joinError && (
          <div className="bg-rose-500/15 border-y border-rose-500/30 px-6 py-3 flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{joinError}</span>
          </div>
        )}

        {/* Specifications Matrix */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Key Metric Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white/4 p-4 border border-white/6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Goal</span>
              <p className="text-xl font-black text-white font-mono mt-1">
                {challenge.targetValue.toLocaleString()} {challenge.targetUnit}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Physical Milestone</span>
            </div>

            <div className="rounded-2xl bg-white/4 p-4 border border-white/6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Challenge Window</span>
              <p className="text-sm font-bold text-white mt-1">
                {startDateFormatted} — {endDateFormatted}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">{challenge.durationDays} days total</span>
            </div>

            <div className="rounded-2xl bg-white/4 p-4 border border-white/6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enrolled Community</span>
              <p className="text-xl font-black text-white font-mono mt-1">
                {challenge.participantCount.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Active Challengers</span>
            </div>

            <div className="rounded-2xl bg-white/4 p-4 border border-white/6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity Category</span>
              <p className="text-base font-bold text-emerald-400 mt-1">
                {challenge.activity.replace('_', ' ')}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Standardized Discipline</span>
            </div>
          </div>

          {/* Verification Protocol Requirement Section */}
          <div className="rounded-2xl bg-white/3 border border-white/8 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Verification Method:</span>
                  <span className="text-emerald-400 font-mono">
                    {challenge.verificationRequirement === 'SELF_REPORTED'
                      ? 'Self-reported — not AI verified'
                      : challenge.verificationRequirement.replace('_', ' ')}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Required submission integrity standard for official certification</p>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-black/30 rounded-xl p-4 border border-white/5">
              {challenge.verificationRequirement === 'AI_VERIFIED' && (
                <p>
                  This challenge requires <strong>AI Pose Verification</strong>. Workout sessions run in the browser using MediaPipe Pose Landmarker, automatically inspecting joint angles, hip depth, and repetition pacing. Form violations do not count toward official completion.
                </p>
              )}
              {challenge.verificationRequirement === 'DEVICE_VERIFIED' && (
                <p>
                  This challenge requires <strong>Device & Telemetry Verification</strong>. Activity is validated via supported smart wearables or GPS telemetry matching official distance and cadence quotas.
                </p>
              )}
              {challenge.verificationRequirement === 'ORGANIZER_APPROVED' && (
                <p>
                  This challenge requires <strong>Organizer Approval</strong>. Submission logs and video evidence are manually audited and certified by approved event coordinators.
                </p>
              )}
              {challenge.verificationRequirement === 'SELF_REPORTED' && (
                <p>
                  <strong>Self-reported — not AI verified</strong>: Activity logs for this challenge are self-reported by the participant. Submissions appear with a dedicated manual attribution marker and cannot earn computer vision verified integrity badges.
                </p>
              )}
            </div>
          </div>

          {/* Exercise Technique & Demonstration Section */}
          <div className="rounded-2xl bg-cyan-950/25 border border-cyan-500/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-cyan-950/20">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-500/35 text-cyan-300">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>3D Human Hologram Exercise Demonstration</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    AI Biomechanical Model
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Explore 360° holographic form execution, joint angles, depth planes, and key checkpoints before starting.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDemoModal(true)}
              className="flex items-center gap-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-4 py-2.5 text-xs transition-all active:scale-95 shadow-md shadow-cyan-400/25 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>Watch 3D Hologram Demo</span>
            </button>
          </div>

          {/* Organizer Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white/3 border border-white/8 p-5">
            <div className="flex items-center gap-4">
              <img
                src={challenge.organizerAvatar}
                alt={challenge.organizerName}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/10"
              />
              <div>
                <h4 className="text-sm font-bold text-white">{challenge.organizerName}</h4>
                <p className="text-xs text-slate-400">
                  {challenge.organizerRole || 'Verified Organizer'} • Smart India Hackathon 2026 Partner
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 text-xs font-semibold">
                Official Event
              </span>
            </div>
          </div>

          {/* Action Footer Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/8 pt-6">
            <div>
              <span className="text-xs text-slate-400 block">Participation Status:</span>
              <span className="text-sm font-bold font-mono text-white">
                {isEnrolled ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Enrolled as Active Participant
                  </span>
                ) : isCompleted ? (
                  <span className="text-slate-400">Challenge Completed • Participation Closed</span>
                ) : isCancelled ? (
                  <span className="text-rose-400">Challenge Cancelled</span>
                ) : (
                  <span className="text-slate-300">Open for Enrollment</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/leaderboard/${challenge.id}`)}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-4 py-3 text-xs font-bold text-amber-400 transition-colors cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Leaderboard</span>
              </button>

              {isEnrolled ? (
                <>
                  <button
                    onClick={() => navigate('/my-challenges')}
                    className="rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 px-4 py-3 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                  >
                    My Challenges
                  </button>
                  <button
                    onClick={() => setShowDemoModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 px-4 py-3 text-xs font-bold text-cyan-200 transition-all cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>AI Hologram Demo</span>
                  </button>
                  <button
                    onClick={handleStartWorkout}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Launch Workout</span>
                  </button>
                </>
              ) : isCompleted || isCancelled ? (
                <button
                  disabled
                  className="rounded-xl bg-slate-800 border border-white/8 px-6 py-3 text-xs font-bold text-slate-500 cursor-not-allowed"
                >
                  Registration Closed
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDemoModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-4 py-3 text-xs font-bold text-cyan-200 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>AI Hologram Demo</span>
                  </button>
                  <button
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-60"
                  >
                    {isJoining ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Joining Challenge...</span>
                      </>
                    ) : (
                      <>
                        <span>Join Challenge</span>
                        <span className="text-[11px] bg-slate-950/20 px-2 py-0.5 rounded-md font-mono">
                          +{challenge.pointsReward} pts
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exercise Demonstration Modal */}
      <ExerciseDemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        challenge={challenge}
        activity={challenge.activity}
        onLaunchWorkout={isEnrolled ? handleStartWorkout : undefined}
      />
    </div>
  );
};
