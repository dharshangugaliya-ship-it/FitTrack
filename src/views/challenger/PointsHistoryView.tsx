/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { useFittrackPoints } from '../../hooks/useFittrackPoints';
import { POINTS_RULES } from '../../data/mockData';
import {
  Award,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Flame,
  Trophy,
  Activity,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

export const PointsHistoryView: React.FC = () => {
  const { navigate } = useRouter();
  const { isDemoMode } = useAuth();
  const { events, totalPoints, loading, error, source, refetch } = useFittrackPoints();

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'JOIN_CHALLENGE':
        return {
          icon: Trophy,
          label: 'Challenge Join',
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        };
      case 'AI_VERIFIED':
        return {
          icon: ShieldCheck,
          label: 'AI-Verified Session',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'ORGANIZER_APPROVED':
        return {
          icon: UserCheck,
          label: 'Organizer Approved',
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'SELF_REPORTED':
        return {
          icon: Activity,
          label: 'Self-Reported',
          color: 'text-slate-300 bg-white/5 border-white/10',
        };
      case 'STREAK_7_DAY':
        return {
          icon: Flame,
          label: '7-Day Streak',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        };
      case 'CHALLENGE_COMPLETED':
        return {
          icon: Award,
          label: 'Challenge Complete',
          color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
        };
      default:
        return {
          icon: Sparkles,
          label: 'Reward',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
    }
  };

  return (
    <div className="space-y-8 pb-16 text-left max-w-6xl mx-auto">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Award className="w-8 h-8 text-emerald-400" />
              <span>FITTRACK Points Ledger</span>
            </h1>
            {source === 'fallback' && (
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold font-mono text-amber-400 uppercase tracking-wider">
                Evaluation Store
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Universal participation and verified milestone rewards. Unlike challenge-specific scores, FITTRACK Points reflect your verified national fitness engagement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Points Balance */}
        <div className="rounded-2xl bg-[#121722] border border-emerald-500/30 p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Reward Balance</span>
            <div className="mt-2 text-4xl font-black font-mono text-white tracking-tight">
              {totalPoints.toLocaleString()} <span className="text-xl text-emerald-400 font-sans font-semibold">pts</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between text-xs text-slate-400">
            <span>{events.length} ledger transactions</span>
            <span className="text-emerald-400 font-mono font-medium">Protected Ledger</span>
          </div>
        </div>

        {/* Currency Rule Clarification */}
        <div className="rounded-2xl bg-[#121722] border border-white/8 p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Currency Distinction</span>
            <h3 className="text-sm font-bold text-white mt-1">FITTRACK Points vs. Challenge Score</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              <strong>Challenge Score</strong> tracks specific workout volume (e.g. reps, KM, days). <strong>FITTRACK Points</strong> are the universal reward currency earned via participation and verified completion.
            </p>
          </div>
          <div className="mt-3 text-[11px] text-cyan-300 font-medium">
            AI-Verified Session: +20 pts (per session, not per rep)
          </div>
        </div>

        {/* Verification Standard */}
        <div className="rounded-2xl bg-[#121722] border border-white/8 p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Integrity Assurance</span>
            <h3 className="text-sm font-bold text-white mt-1">Immutable Ledger Architecture</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Point awards are enforced server-side via cryptographic timestamps and database constraints. Arbitrary client manipulation is blocked.
            </p>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>SIH 2026 Verification Standard</span>
          </div>
        </div>
      </div>

      {/* Main Content: Ledger Transactions & Point Rules Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ledger Transaction History (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>Point Transaction History</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {events.length} Recorded {events.length === 1 ? 'Event' : 'Events'}
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-[#121722] border border-white/8 p-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-mono">Loading FITTRACK point records...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-6 text-center space-y-3">
              <p className="text-xs text-rose-300 font-semibold">{error}</p>
              <button
                onClick={() => refetch()}
                className="rounded-xl bg-rose-500/20 text-rose-300 px-4 py-1.5 text-xs font-bold hover:bg-rose-500/30 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl bg-[#121722] border border-white/8 p-12 text-center space-y-3">
              <Award className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Point Events Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Join a challenge to earn your first +10 FITTRACK Points, or complete an activity session to build your reward ledger.
              </p>
              <button
                onClick={() => navigate('/challenges')}
                className="mt-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                Explore Challenges
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-[#121722] border border-white/8 divide-y divide-white/6">
              {events.map((ev) => {
                const badge = getEventBadge(ev.eventType);
                const Icon = badge.icon;
                const dateStr = new Date(ev.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={ev.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/8 text-emerald-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{ev.description}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{dateStr}</span>
                          </span>
                          {ev.referenceId && (
                            <span className="font-mono text-[10px] text-slate-400">
                              Ref: {ev.referenceId.slice(0, 12)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base sm:text-lg font-black font-mono text-emerald-400 block">
                        +{ev.points} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Standard Points Rule Reference (1 Col) */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Reward Rules</span>
          </h2>

          <div className="rounded-2xl bg-[#121722] border border-white/8 divide-y divide-white/6 overflow-hidden">
            {POINTS_RULES.map((rule, idx) => (
              <div key={idx} className="p-3.5 hover:bg-white/2 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{rule.action}</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    +{rule.points} pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{rule.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
