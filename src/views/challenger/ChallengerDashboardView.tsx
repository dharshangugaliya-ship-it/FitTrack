/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useChallenges } from '../../hooks/useChallenges';
import { StatsCard } from '../../components/StatsCard';
import { ChallengeCard } from '../../components/ChallengeCard';
import {
  Flame,
  Award,
  Trophy,
  CheckCircle2,
  Compass,
  ArrowRight,
  Plus,
  Sparkles,
  RefreshCw,
  Coins,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export const ChallengerDashboardView: React.FC = () => {
  const { navigate, setWorkoutModalOpen } = useRouter();
  const { user, profile } = useAuth();
  const {
    activeChallenges,
    activeCount,
    completedCount,
    recentPointEvents,
    totalPoints,
    totalVerifiedSessions,
    currentStreak,
    hasActiveStreak,
    loading,
    error,
    source,
    refetch,
  } = useDashboardData();

  const { challenges: allChallenges } = useChallenges();
  const recommendedChallenges = allChallenges.filter((c) => !c.isEnrolled).slice(0, 3);

  const displayName = profile?.display_name || (user?.user_metadata as any)?.display_name || 'Aarav Sharma';
  const firstName = displayName.split(' ')[0];

  return (
    <div className="space-y-8 pb-16 text-left">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Challenger Cockpit</span>
            {source === 'fallback' && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                Evaluation Store
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Welcome back, {firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Track your verified participation, maintain genuine workout consistency, and earn FITTRACK Points across nationwide challenges.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2.5 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/points')}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2.5 text-xs font-bold text-emerald-400 transition-colors cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            <span>Points Ledger</span>
          </button>
          <button
            onClick={() => setWorkoutModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Activity</span>
          </button>
          <button
            onClick={() => navigate('/challenges')}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Find Challenges</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => refetch()}
            className="underline font-bold text-rose-200 hover:text-white ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FITTRACK Points */}
        <div onClick={() => navigate('/points')} className="cursor-pointer transition-transform hover:-translate-y-0.5">
          <StatsCard
            title="FITTRACK Points"
            value={totalPoints.toLocaleString()}
            subtitle="Universal reward ledger"
            icon={Award}
            iconColor="text-emerald-400"
            badgeText="View Ledger →"
            badgeType="positive"
          />
        </div>

        {/* Active Challenges */}
        <div onClick={() => navigate('/my-challenges')} className="cursor-pointer transition-transform hover:-translate-y-0.5">
          <StatsCard
            title="Active Challenges"
            value={activeCount}
            subtitle={activeCount > 0 ? 'Enrolled & in progress' : 'No active challenges'}
            icon={Trophy}
            iconColor="text-cyan-400"
            badgeText={activeCount > 0 ? 'Participating' : 'Join Now'}
            badgeType={activeCount > 0 ? 'neutral' : 'accent'}
          />
        </div>

        {/* Completed Challenges */}
        <div onClick={() => navigate('/my-challenges')} className="cursor-pointer transition-transform hover:-translate-y-0.5">
          <StatsCard
            title="Completed Challenges"
            value={completedCount}
            subtitle={completedCount > 0 ? 'Verified completions' : '0 completed so far'}
            icon={CheckCircle2}
            iconColor="text-indigo-400"
            badgeText={completedCount > 0 ? 'Verified' : 'In Progress'}
            badgeType="neutral"
          />
        </div>

        {/* Current Streak */}
        <StatsCard
          title="Current Streak"
          value={`${currentStreak} Days`}
          subtitle={hasActiveStreak ? `${totalVerifiedSessions} verified sessions` : 'No verified sessions yet'}
          icon={Flame}
          iconColor="text-amber-400"
          badgeText={hasActiveStreak ? 'Active 🔥' : '0 Streak'}
          badgeType={hasActiveStreak ? 'accent' : 'neutral'}
        />
      </div>

      {/* Active Enrolled Challenges */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Your Active Challenges</h2>
          </div>
          <button
            onClick={() => navigate('/my-challenges')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Manage All ({activeCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-2xl bg-[#121722] border border-white/6 p-6 h-64 animate-pulse" />
            ))}
          </div>
        ) : activeChallenges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} showProgress={true} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[#121722] border border-white/6 p-10 text-center space-y-3">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">You have not joined any challenges yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Join a nationwide challenge to start tracking verified repetitions, build your fitness streak, and earn FITTRACK Points.
            </p>
            <button
              onClick={() => navigate('/challenges')}
              className="mt-2 rounded-xl bg-emerald-500 text-slate-950 font-bold px-5 py-2 text-xs hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              Browse Open Challenges
            </button>
          </div>
        )}
      </div>

      {/* Two Column Layout: Points Ledger Stream & Recommended Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FITTRACK Points Activity Ledger (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>FITTRACK Points Ledger (Recent Transactions)</span>
            </h3>
            <button
              onClick={() => navigate('/points')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl bg-[#121722] border border-white/8 divide-y divide-white/6">
            {recentPointEvents.length > 0 ? (
              recentPointEvents.map((ev) => {
                const dateStr = new Date(ev.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <div
                    key={ev.id}
                    className="p-4 flex items-center justify-between hover:bg-white/2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{ev.description}</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                            {ev.eventType}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{dateStr}</span>
                          </span>
                          <span className="text-slate-400">
                            Authoritative event entry
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black font-mono text-emerald-400 block">
                        +{ev.points} pts
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-2">
                <Coins className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-white">No Point Events Recorded Yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Enrolling in challenges and completing verified workouts will record immutable transactions here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Open Challenges Sidebar (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Recommended For You</span>
            </h3>
          </div>

          <div className="space-y-3">
            {recommendedChallenges.length > 0 ? (
              recommendedChallenges.map((rc) => (
                <div
                  key={rc.id}
                  onClick={() => navigate(`/challenges/${rc.id}`)}
                  className="group p-4 rounded-2xl bg-[#121722] border border-white/8 hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                      {rc.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      +{rc.pointsReward} pts reward
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {rc.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    Target: {rc.targetValue.toLocaleString()} {rc.targetUnit} • {rc.durationDays}d
                  </p>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/6 text-xs text-slate-400">
                    <span>{rc.participantCount.toLocaleString()} athletes</span>
                    <span className="text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      View Challenge <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-2xl bg-[#121722] border border-white/8 text-center text-xs text-slate-400">
                All open challenges are currently in your active roster!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
