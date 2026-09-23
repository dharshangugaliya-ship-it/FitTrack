import React, { useState } from 'react';
import { Challenge } from '../types';
import { VerificationBadge } from './VerificationBadge';
import { X, Users, Calendar, Award, CheckCircle2, Play, ShieldAlert, Sparkles, Trophy, AlertCircle } from 'lucide-react';
import { useRouter } from '../routes/RouterContext';
import { useAuth } from '../context/AuthContext';
import { challengeService } from '../services/challengeService';
import { MOCK_LEADERBOARDS } from '../data/mockData';

interface ChallengeModalProps {
  challenge: Challenge | null;
  onClose: () => void;
  onJoin?: (challengeId: string) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  challenge,
  onClose,
  onJoin,
}) => {
  const { navigate } = useRouter();
  const { user, isAuthenticated, isDemoMode } = useAuth();
  const [joined, setJoined] = useState(challenge?.isEnrolled ?? false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccessNotice, setJoinSuccessNotice] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  if (!challenge) return null;

  const handleJoin = async () => {
    if (!isAuthenticated && !isDemoMode) {
      onClose();
      navigate(`/login?redirect=/challenges/${challenge.id}`);
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    const effectiveUserId = user?.id || 'usr_aarav_01';

    try {
      const res = await challengeService.joinChallenge(challenge.id, effectiveUserId);
      if (res.success) {
        setJoined(true);
        setJoinSuccessNotice(true);
        if (onJoin) {
          onJoin(challenge.id);
        }
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
    onClose();
    navigate(`/workout/${challenge.id}`);
  };

  const leaderboard = MOCK_LEADERBOARDS[challenge.id] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-[#121722] border border-white/12 shadow-2xl my-8 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image Cover */}
        <div className="relative h-60 w-full overflow-hidden bg-slate-900">
          <img
            src={challenge.bannerUrl}
            alt={challenge.title}
            className="h-full w-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121722] via-[#121722]/50 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-slate-300 hover:text-white border border-white/10 hover:bg-black/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Top Badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/10 uppercase tracking-wider">
              {challenge.type.replace('_', ' ')}
            </span>
            <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md px-3 py-1 text-xs font-semibold">
              {challenge.difficulty}
            </span>
          </div>

          {/* Title & Floating Info */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <VerificationBadge status={challenge.verificationRequirement} size="md" className="mb-2" />
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {challenge.title}
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 text-emerald-400 self-start sm:self-auto font-mono">
              <Award className="w-5 h-5 text-emerald-400" />
              <div className="text-right">
                <span className="text-xs uppercase font-medium text-emerald-500 block leading-tight">Reward</span>
                <span className="text-sm font-bold text-white">+{challenge.pointsReward} Points</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[calc(85vh-240px)] overflow-y-auto">
          {/* Join Confirmation Banner */}
          {joinSuccessNotice && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-emerald-300 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white">Enrolled in Challenge!</p>
                  <p className="text-xs text-emerald-300/90">+10 FITTRACK Points added to your account.</p>
                </div>
              </div>
              <button
                onClick={handleStartWorkout}
                className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
              >
                Start Workout
              </button>
            </div>
          )}

          {/* Description & Overview */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">About this Challenge</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {challenge.description}
            </p>
          </div>

          {/* Metric Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white/4 p-3.5 border border-white/6">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Target Goal</span>
              <p className="text-base font-bold text-white font-mono mt-0.5">
                {challenge.targetValue.toLocaleString()} {challenge.targetUnit}
              </p>
            </div>
            <div className="rounded-xl bg-white/4 p-3.5 border border-white/6">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Duration</span>
              <p className="text-base font-bold text-white mt-0.5">{challenge.durationDays} Days</p>
            </div>
            <div className="rounded-xl bg-white/4 p-3.5 border border-white/6">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Participants</span>
              <p className="text-base font-bold text-white mt-0.5">{challenge.participantCount.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-white/4 p-3.5 border border-white/6">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Scope</span>
              <p className="text-base font-bold text-emerald-400 mt-0.5">Open Nationwide</p>
            </div>
          </div>

          {/* Verification Protocol Box */}
          <div className="rounded-2xl bg-white/3 border border-white/8 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Verification Protocol:</span>
                  <span className="text-emerald-400 font-mono">{challenge.verificationRequirement.replace('_', ' ')}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {challenge.verificationRequirement === 'AI_VERIFIED'
                    ? 'Activity is certified using browser-side computer vision (MediaPipe Pose Landmarker) evaluating repetition range of motion and joint angles.'
                    : challenge.verificationRequirement === 'DEVICE_VERIFIED'
                    ? 'Activity is validated via supported smart device or GPS telemetry matching official challenge distance quotas.'
                    : challenge.verificationRequirement === 'ORGANIZER_APPROVED'
                    ? 'Evidence submissions (video/metrics) are reviewed and approved directly by verified challenge coordinators.'
                    : 'Manual activity submission. Labeled as Self-reported on leaderboards.'}
                </p>
              </div>
            </div>
          </div>

          {/* Organizer Card */}
          <div className="flex items-center justify-between rounded-xl bg-white/2 p-3 border border-white/6">
            <div className="flex items-center gap-3">
              <img
                src={challenge.organizerAvatar}
                alt={challenge.organizerName}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10"
              />
              <div>
                <p className="text-sm font-bold text-white">{challenge.organizerName}</p>
                <p className="text-xs text-slate-400">{challenge.organizerRole} • Certified Organizer</p>
              </div>
            </div>
            <span className="rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 text-xs font-semibold">
              Official Challenge
            </span>
          </div>

          {/* Mini Leaderboard Preview */}
          {leaderboard.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Top Challengers Preview
                </h4>
                <span className="text-xs text-slate-500 font-mono">Ranked by {challenge.targetUnit}</span>
              </div>
              <div className="space-y-1.5 rounded-xl bg-white/2 border border-white/6 p-2">
                {leaderboard.slice(0, 3).map((entry) => (
                  <div
                    key={entry.userId}
                    className="flex items-center justify-between rounded-lg bg-white/3 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 font-bold ${entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-300' : 'text-amber-600'}`}>
                        #{entry.rank}
                      </span>
                      <img src={entry.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                      <span className="font-medium text-white">{entry.displayName}</span>
                    </div>
                    <span className="font-bold text-emerald-400 font-mono">
                      {entry.challengeScore.toLocaleString()} {entry.targetUnit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {joinError && (
            <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{joinError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/8 bg-slate-900/50 p-5 sm:p-6">
          <div className="text-xs text-slate-400">
            <span>Points Award: </span>
            <span className="font-bold text-emerald-400">+{challenge.pointsReward} FITTRACK Pts</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {joined ? (
              <button
                onClick={handleStartWorkout}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Workout</span>
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
              >
                {isJoining ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <span>Join Challenge (+{challenge.pointsReward} pts)</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
