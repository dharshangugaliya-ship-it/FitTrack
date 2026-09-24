/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { useMyChallenges } from '../../hooks/useChallenges';
import { challengeService } from '../../services/challengeService';
import { VerificationBadge } from '../../components/VerificationBadge';
import { Challenge } from '../../types';
import { ExerciseDemoModal } from '../../components/exercise-demo/ExerciseDemoModal';
import {
  Trophy,
  CheckSquare,
  Play,
  ArrowRight,
  Award,
  Sparkles,
  Database,
  RefreshCw,
  LogOut,
  Compass,
  CheckCircle2,
  Coins,
  AlertTriangle,
  X,
} from 'lucide-react';

export const MyChallengesView: React.FC = () => {
  const { navigate } = useRouter();
  const { user, isDemoMode } = useAuth();
  const { challenges: enrolledChallenges, loading, error, dataSource, refetch } = useMyChallenges();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);
  const [challengeToLeave, setChallengeToLeave] = useState<Challenge | null>(null);
  const [demoModalChallenge, setDemoModalChallenge] = useState<Challenge | null>(null);

  const activeChallenges = enrolledChallenges.filter(
    (c) => c.status === 'ACTIVE' || c.status === 'PUBLISHED'
  );
  const completedChallenges = enrolledChallenges.filter((c) => {
    const isTargetMet = Boolean(c.targetValue && c.userProgress && c.userProgress >= c.targetValue);
    return c.status === 'COMPLETED' || isTargetMet;
  });

  const displayedChallenges = activeTab === 'ACTIVE' ? activeChallenges : completedChallenges;

  const handleInitiateLeave = (challenge: Challenge) => {
    setLeaveError(null);
    setLeaveSuccess(null);
    setChallengeToLeave(challenge);
  };

  const handleConfirmLeave = async () => {
    if (!challengeToLeave) return;
    const effectiveUserId = user?.id || (isDemoMode ? 'usr_aarav_01' : null);
    if (!effectiveUserId) return;

    const targetChallenge = challengeToLeave;
    setLeavingId(targetChallenge.id);
    setLeaveError(null);
    try {
      const res = await challengeService.leaveChallenge(targetChallenge.id, effectiveUserId);
      if (!res.success) {
        setLeaveError(res.error || 'Failed to withdraw from competition.');
      } else {
        setChallengeToLeave(null);
        setLeaveSuccess(`You have successfully withdrawn from "${targetChallenge.title}".`);
        await refetch();
      }
    } catch (err: any) {
      setLeaveError(err?.message || 'Error withdrawing from competition.');
    } finally {
      setLeavingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-16 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Enrollment Tracker</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            My Challenges
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Manage your registered physical challenges, inspect generic progress metrics, and launch verified workout sessions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {dataSource === 'supabase' ? (
            <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-mono font-bold text-emerald-400">
              <Database className="w-3.5 h-3.5" />
              <span>SUPABASE AUTHORITATIVE</span>
            </span>
          ) : (
            <span className="rounded-lg bg-[#121722] border border-white/10 px-3 py-1.5 text-xs font-mono font-bold text-amber-400">
              EVALUATION STORE
            </span>
          )}

          <button
            onClick={() => navigate('/points')}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-bold text-emerald-400 transition-colors cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            <span>Points Ledger</span>
          </button>

          <button
            onClick={() => refetch()}
            className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh participation list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/challenges')}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm cursor-pointer"
          >
            Join More Challenges
          </button>
        </div>
      </div>

      {leaveSuccess && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{leaveSuccess}</span>
          </div>
          <button
            onClick={() => setLeaveSuccess(null)}
            className="text-slate-400 hover:text-white text-xs underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {leaveError && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300">
          {leaveError}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => refetch()} className="underline font-bold text-rose-200">
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-white/8">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`pb-3 text-xs font-bold transition-colors relative cursor-pointer ${
            activeTab === 'ACTIVE' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span>Active In-Progress ({activeChallenges.length})</span>
          {activeTab === 'ACTIVE' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`pb-3 text-xs font-bold transition-colors relative cursor-pointer ${
            activeTab === 'COMPLETED' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span>Past Completed ({completedChallenges.length})</span>
          {activeTab === 'COMPLETED' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="min-h-[30vh] flex flex-col items-center justify-center space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-xs font-mono text-slate-400">Loading your enrolled challenges and progress...</p>
        </div>
      ) : displayedChallenges.length > 0 ? (
        <div className="space-y-4">
          {displayedChallenges.map((challenge) => {
            const hasProgress = typeof challenge.userProgress === 'number' && challenge.userProgress > 0;
            const percent = hasProgress && challenge.targetValue
              ? Math.min(100, Math.round((challenge.userProgress! / challenge.targetValue) * 100))
              : 0;

            return (
              <div
                key={challenge.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-2xl bg-[#121722] border border-white/8 p-6 transition-all hover:border-white/16"
              >
                {/* Left: Info */}
                <div className="flex items-start sm:items-center gap-4">
                  <img
                    src={challenge.bannerUrl}
                    alt={challenge.title}
                    className="w-16 h-16 rounded-xl object-cover ring-1 ring-white/10 hidden sm:block shrink-0 cursor-pointer"
                    onClick={() => navigate(`/challenges/${challenge.id}`)}
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {challenge.type.replace('_', ' ')}
                      </span>
                      <VerificationBadge status={challenge.verificationRequirement} size="sm" />
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        +{challenge.pointsReward} pts reward
                      </span>
                    </div>
                    <h3
                      onClick={() => navigate(`/challenges/${challenge.id}`)}
                      className="text-lg font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      {challenge.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      Target: {challenge.targetValue.toLocaleString()} {challenge.targetUnit} • Organized by {challenge.organizerName}
                    </p>
                  </div>
                </div>

                {/* Middle: Participation Status & Generic Progress */}
                <div className="min-w-[240px] lg:w-80 space-y-2">
                  {hasProgress ? (
                    <div>
                      <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{percent}% Complete</span>
                        </span>
                        <span className="text-white">
                          {challenge.userProgress?.toLocaleString()} / {challenge.targetValue.toLocaleString()} {challenge.targetUnit}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 font-mono">
                        <span>
                          Challenge Score: <strong className="text-white">{(challenge.challengeScore ?? challenge.userProgress)?.toLocaleString()} {challenge.targetUnit}</strong>
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          +{challenge.pointsEarned || 10} pts earned
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white/4 border border-white/6 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Registered Participant • 0%
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          +{challenge.pointsEarned || 10} pts earned
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        No verified activity yet. Start your first session to build progress.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <button
                    onClick={() => navigate(`/challenges/${challenge.id}`)}
                    className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                  >
                    Rules & Details
                  </button>
                  <button
                    onClick={() => setDemoModalChallenge(challenge)}
                    className="flex items-center gap-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 px-3.5 py-2 text-xs font-bold text-cyan-200 transition-colors cursor-pointer"
                    title="Watch 3D Human Hologram exercise demonstration"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>AI Hologram Demo</span>
                  </button>
                  {activeTab === 'ACTIVE' && (
                    <button
                      onClick={() => handleInitiateLeave(challenge)}
                      disabled={leavingId === challenge.id}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                      title="Leave this competition"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Leave</span>
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/workout/${challenge.id}`)}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
                    title="Launch workout session"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Workout</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-16 text-center rounded-3xl bg-[#121722] border border-white/8 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/4 border border-white/8 text-slate-500">
            <Compass className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">
              {activeTab === 'ACTIVE'
                ? 'You have not joined any challenges yet'
                : 'No completed challenges recorded yet'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {activeTab === 'ACTIVE'
                ? 'Explore open nationwide physical challenges, enroll to claim FITTRACK reward points, and start verified workout sessions.'
                : 'Complete 100% of a challenge target to achieve certified milestone credentials.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/challenges')}
            className="rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            Discover Challenges
          </button>
        </div>
      )}

      {/* Leave Competition Confirmation Modal */}
      {challengeToLeave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !leavingId) {
              setChallengeToLeave(null);
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-[#121722] border border-rose-500/30 shadow-2xl p-6 sm:p-7 space-y-5 text-left">
            {/* Close button */}
            <button
              onClick={() => !leavingId && setChallengeToLeave(null)}
              disabled={Boolean(leavingId)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white rounded-lg p-1.5 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400">
                  Confirmation Required
                </span>
                <h3 className="text-lg font-bold text-white leading-tight">
                  Leave Competition?
                </h3>
              </div>
            </div>

            {/* Challenge Summary */}
            <div className="flex items-center gap-3.5 rounded-2xl bg-white/4 border border-white/8 p-3">
              <img
                src={challengeToLeave.bannerUrl}
                alt={challengeToLeave.title}
                className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    {challengeToLeave.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    +{challengeToLeave.pointsReward} pts
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white truncate">
                  {challengeToLeave.title}
                </h4>
                <p className="text-xs text-slate-400 font-mono truncate">
                  Target: {challengeToLeave.targetValue.toLocaleString()} {challengeToLeave.targetUnit}
                </p>
              </div>
            </div>

            {/* Warning Details */}
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 space-y-2 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Are you sure you want to withdraw from <strong className="text-white">"{challengeToLeave.title}"</strong>?
              </p>
              <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                <li>You will be removed from this competition and active tracker.</li>
                <li>Your previously completed workout records remain saved in activity logs.</li>
                <li>You can re-enroll at any time from Discover Challenges.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setChallengeToLeave(null)}
                disabled={Boolean(leavingId)}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancel & Stay Enrolled
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                disabled={Boolean(leavingId)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {leavingId === challengeToLeave.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Leaving...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Confirm & Leave</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Demonstration Modal */}
      {demoModalChallenge && (
        <ExerciseDemoModal
          isOpen={Boolean(demoModalChallenge)}
          onClose={() => setDemoModalChallenge(null)}
          challenge={demoModalChallenge}
          activity={demoModalChallenge.activity}
          onLaunchWorkout={() => {
            const id = demoModalChallenge.id;
            setDemoModalChallenge(null);
            navigate(`/workout/${id}`);
          }}
        />
      )}
    </div>
  );
};
