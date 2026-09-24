/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { useFittrackPoints } from '../../hooks/useFittrackPoints';
import { pointsService } from '../../services/pointsService';
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
  Target,
  Medal,
  Play,
  PlusCircle,
  Zap,
} from 'lucide-react';

export const PointsHistoryView: React.FC = () => {
  const { navigate } = useRouter();
  const { user, isDemoMode } = useAuth();
  const { events, totalPoints, loading, error, source, refetch } = useFittrackPoints();
  const [testingRule, setTestingRule] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const effectiveUserId = user?.id || (isDemoMode ? 'usr_aarav_01' : 'usr_aarav_01');

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'JOIN_CHALLENGE':
        return {
          icon: Trophy,
          label: 'Challenge Join (+10)',
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        };
      case 'AI_VERIFIED':
        return {
          icon: ShieldCheck,
          label: 'AI-Verified (+20)',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'ORGANIZER_APPROVED':
        return {
          icon: UserCheck,
          label: 'Organizer Approved (+20)',
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'SELF_REPORTED':
        return {
          icon: Activity,
          label: 'Self-Reported (+5)',
          color: 'text-slate-300 bg-white/5 border-white/10',
        };
      case 'DAILY_TARGET_COMPLETED':
        return {
          icon: Target,
          label: 'Daily Target (+15)',
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        };
      case 'STREAK_7_DAY':
        return {
          icon: Flame,
          label: '7-Day Streak (+50)',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        };
      case 'CHALLENGE_COMPLETED':
        return {
          icon: Award,
          label: 'Challenge Complete (+100)',
          color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
        };
      case 'BADGE_EARNED':
        return {
          icon: Medal,
          label: 'Badge Earned (+25)',
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        };
      default:
        return {
          icon: Sparkles,
          label: 'Reward',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
    }
  };

  /**
   * Interactive tester for the 8 Reward Rules
   */
  const handleTriggerRule = async (action: string) => {
    setTestingRule(action);
    setFeedbackMsg(null);

    const now = Date.now();
    try {
      switch (action) {
        case 'Join Challenge':
          await pointsService.recordPointEvent({
            userId: effectiveUserId,
            eventType: 'JOIN_CHALLENGE',
            points: 10,
            challengeId: `ch_test_${now}`,
            challengeTitle: 'Fit India National Push-Up Challenge',
            referenceId: `join_test_${now}`,
            description: 'Enrolled in official challenge: Fit India National Push-Up Challenge (+10 pts)',
          });
          setFeedbackMsg('Awarded +10 pts for Joining Challenge!');
          break;

        case 'AI-Verified Workout':
          await pointsService.recordPointEvent({
            userId: effectiveUserId,
            eventType: 'AI_VERIFIED',
            points: 20,
            challengeId: 'ch-squat-10k',
            challengeTitle: '10K Squat Challenge',
            referenceId: `ai_sess_${now}`,
            description: 'Computer-vision verified workout session: SQUATS (30 clean reps, 98% form score) (+20 pts)',
          });
          setFeedbackMsg('Awarded +20 pts for AI-Verified Workout!');
          break;

        case 'Organizer-Approved Activity':
          await pointsService.recordPointEvent({
            userId: effectiveUserId,
            eventType: 'ORGANIZER_APPROVED',
            points: 20,
            challengeId: 'ch-run-100km',
            challengeTitle: '100 KM Monsoon Endurance Run',
            referenceId: `org_appr_${now}`,
            description: 'Organizer certified activity proof: 5.2 km GPS route (+20 pts)',
          });
          setFeedbackMsg('Awarded +20 pts for Organizer-Approved Activity!');
          break;

        case 'Self-Reported Activity':
          await pointsService.recordPointEvent({
            userId: effectiveUserId,
            eventType: 'SELF_REPORTED',
            points: 5,
            challengeId: 'ch-plank-core',
            challengeTitle: '7-Day Core & Plank Challenge',
            referenceId: `self_rep_${now}`,
            description: 'Self-reported activity: 60s Plank Hold without automated computer-vision (+5 pts)',
          });
          setFeedbackMsg('Awarded +5 pts for Self-Reported Activity!');
          break;

        case 'Daily Target Completed':
          await pointsService.recordPointEvent({
            userId: effectiveUserId,
            eventType: 'DAILY_TARGET_COMPLETED',
            points: 15,
            challengeId: 'ch-squat-10k',
            challengeTitle: '10K Squat Challenge',
            referenceId: `daily_target_${now}`,
            description: 'Achieved daily challenge quota: 50 Reps Target Fulfilled (+15 pts)',
          });
          setFeedbackMsg('Awarded +15 pts for Daily Target Completed!');
          break;

        case '7-Day Streak':
          await pointsService.recordPointEvent({
            userId: effectiveUserId,
            eventType: 'STREAK_7_DAY',
            points: 50,
            referenceId: `streak_7d_${now}`,
            description: 'Bonus awarded for 7 consecutive days of verified activity (+50 pts)',
          });
          setFeedbackMsg('Awarded +50 pts for 7-Day Streak Bonus!');
          break;

        case 'Challenge Completed':
          await pointsService.recordPointEvent({
            userId: effectiveUserId,
            eventType: 'CHALLENGE_COMPLETED',
            points: 100,
            challengeId: 'ch-plank-core',
            challengeTitle: '7-Day Core & Plank Challenge',
            referenceId: `comp_test_${now}`,
            description: 'Earned upon reaching 100% of the challenge goal within time (+100 pts)',
          });
          setFeedbackMsg('Awarded +100 pts for Completing Challenge!');
          break;

        case 'Badge Earned':
          await pointsService.recordPointEvent({
            userId: effectiveUserId,
            eventType: 'BADGE_EARNED',
            points: 25,
            referenceId: `badge_test_${now}`,
            description: 'Awarded for unlocking verified milestone credentials: "National Form Champion" (+25 pts)',
          });
          setFeedbackMsg('Awarded +25 pts for Unlocking Athletic Badge!');
          break;
      }

      await refetch();
    } catch (err: any) {
      console.warn('Rule simulation failed:', err);
      setFeedbackMsg(`Rule test error: ${err?.message || 'unknown'}`);
    } finally {
      setTestingRule(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
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
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-wider">
              Live Synchronized
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Official immutable reward ledger enforcing the 8 SIH 2026 Reward Rules. Points are synced in real time across Header, Dashboard, Profile, and Leaderboards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert if Action Triggered */}
      {feedbackMsg && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 font-semibold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80">Ledger balance updated</span>
        </div>
      )}

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
            <span className="text-emerald-400 font-mono font-medium">Verified Active</span>
          </div>
        </div>

        {/* Currency Rule Clarification */}
        <div className="rounded-2xl bg-[#121722] border border-white/8 p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Reward Framework</span>
            <h3 className="text-sm font-bold text-white mt-1">Universal FITTRACK Points</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Earned across 8 certified athletic rules. Challenge score tracks activity volume (reps/km), while FITTRACK Points measure verified national athletic standing.
            </p>
          </div>
          <div className="mt-3 text-[11px] text-cyan-300 font-medium">
            AI-Verified: +20 pts • Streak: +50 pts • Complete: +100 pts
          </div>
        </div>

        {/* Verification Standard */}
        <div className="rounded-2xl bg-[#121722] border border-white/8 p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Integrity Assurance</span>
            <h3 className="text-sm font-bold text-white mt-1">Real-Time Reactive Ledger</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Point awards trigger atomic notifications across browser tabs, header badges, dashboard widgets, and user profiles.
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
                              Ref: {ev.referenceId.slice(0, 16)}
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

        {/* Reward Rules Panel with Live Test Trigger (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Reward Rules</span>
            </h2>
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
              8 Rules Active
            </span>
          </div>

          <div className="rounded-2xl bg-[#121722] border border-white/8 divide-y divide-white/6 overflow-hidden">
            {POINTS_RULES.map((rule, idx) => {
              const isSimulating = testingRule === rule.action;

              return (
                <div key={idx} className="p-3.5 hover:bg-white/2 transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {rule.action}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-emerald-400">
                        +{rule.points} pts
                      </span>
                      <button
                        onClick={() => handleTriggerRule(rule.action)}
                        disabled={isSimulating}
                        title={`Test and award +${rule.points} pts for ${rule.action}`}
                        className="opacity-80 group-hover:opacity-100 flex items-center gap-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 transition-all cursor-pointer"
                      >
                        {isSimulating ? (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <PlusCircle className="w-2.5 h-2.5" />
                        )}
                        <span>Test</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{rule.description}</p>
                </div>
              );
            })}
          </div>

          {/* Quick Action Navigation */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-4 space-y-2.5 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Zap className="w-4 h-4" />
              <span>Earn Points via Real Workouts</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Launch the AI camera session to earn +20 pts verified by computer vision, or log manual workouts for +5 pts.
            </p>
            <div className="pt-1 flex gap-2">
              <button
                onClick={() => navigate('/challenges')}
                className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-2 text-xs font-bold transition-colors text-center"
              >
                Join Challenge
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-2 text-xs font-bold transition-colors text-center"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
