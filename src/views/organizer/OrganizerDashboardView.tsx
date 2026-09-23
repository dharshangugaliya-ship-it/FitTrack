import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { useOrganizerDashboard } from '../../hooks/useOrganizerDashboard';
import { StatsCard } from '../../components/StatsCard';
import { VerificationBadge } from '../../components/VerificationBadge';
import { ParticipantMonitoringModal } from '../../components/ParticipantMonitoringModal';
import { Challenge } from '../../types';
import {
  Briefcase,
  Users,
  Trophy,
  FileCheck2,
  BarChart3,
  Plus,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Sliders,
  Database,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const OrganizerDashboardView: React.FC = () => {
  const { navigate, setMode } = useRouter();
  const { user, profile, isSupabaseConfigured } = useAuth();
  const { stats, recentChallenges, loading, error, source, refetch } = useOrganizerDashboard();
  const [selectedInspectChallenge, setSelectedInspectChallenge] = useState<Challenge | null>(null);

  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Organizer';

  return (
    <div className="space-y-8 pb-16 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Organizer Operations Center
            </span>
            {source === 'supabase' ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                <Database className="w-3 h-3" />
                SUPABASE AUTHORITATIVE
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-400">
                EVALUATION STORE
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">{displayName}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your challenge cohorts, monitor verified participation volume, and audit athlete activity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={() => {
              setMode('CHALLENGER');
              navigate('/dashboard');
            }}
            className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            Switch to Challenger Mode
          </button>
          <button
            onClick={() => navigate('/organizer/create')}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Challenge</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-rose-300">Unable to load organizer data</h4>
              <p className="text-xs text-rose-400/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600 transition-colors shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Challenges"
          value={loading ? '...' : (stats?.totalChallenges ?? 0).toLocaleString()}
          subtitle="Owned by your organization"
          icon={Sliders}
          iconColor="text-indigo-400"
        />
        <StatsCard
          title="Active Cohorts"
          value={loading ? '...' : `${stats?.activeChallenges ?? 0} Live`}
          subtitle="Currently running competitions"
          icon={Trophy}
          iconColor="text-emerald-400"
          badgeText="Active"
          badgeType="positive"
        />
        <StatsCard
          title="Total Athletes"
          value={loading ? '...' : (stats?.totalParticipants ?? 0).toLocaleString()}
          subtitle="Enrolled across all cohorts"
          icon={Users}
          iconColor="text-cyan-400"
        />
        <StatsCard
          title="Completed Cohorts"
          value={loading ? '...' : (stats?.completedChallenges ?? 0).toLocaleString()}
          subtitle="Finished and archived"
          icon={FileCheck2}
          iconColor="text-amber-400"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#121722] border border-white/8 p-6 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Manage Challenges
            </h3>
            <p className="text-xs text-slate-400">
              Update challenge status, publish drafts, inspect enrolled athletes, and monitor cohorts.
            </p>
          </div>
          <button
            onClick={() => navigate('/organizer/challenges')}
            className="flex items-center gap-1.5 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 px-4 py-2.5 text-xs font-bold text-white transition-colors shrink-0 cursor-pointer"
          >
            <span>Manage All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="rounded-2xl bg-[#121722] border border-white/8 p-6 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              Review Submissions Queue
            </h3>
            <p className="text-xs text-slate-400">
              Audit manual athlete evidence requiring organizer approval before score certification.
            </p>
          </div>
          <button
            onClick={() => navigate('/organizer/submissions')}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-400 transition-colors shrink-0 cursor-pointer"
          >
            <span>Review Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Published Challenges Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Your Challenge Cohorts</h2>
            <p className="text-xs text-slate-400">
              Active and published challenges owned strictly by your organizer account
            </p>
          </div>
          <button
            onClick={() => navigate('/organizer/challenges')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({recentChallenges.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-[#121722] border border-white/8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/8 bg-white/3 text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Challenge Title</th>
                  <th className="py-3.5 px-4">Verification</th>
                  <th className="py-3.5 px-4">Enrolled Athletes</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6 font-normal">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Sparkles className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
                      <span>Loading your organizer challenges...</span>
                    </td>
                  </tr>
                ) : recentChallenges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Sliders className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-white">You have not created any challenges yet.</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Publish your first fitness cohort to begin enrolling participants and tracking verified activity.
                      </p>
                      <button
                        onClick={() => navigate('/organizer/create')}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create First Challenge</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  recentChallenges.slice(0, 5).map((ch) => (
                    <tr key={ch.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={ch.bannerUrl}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10"
                          />
                          <div>
                            <div className="font-bold text-white line-clamp-1">{ch.title}</div>
                            <p className="text-xs text-slate-400 font-mono">
                              Target: {ch.targetValue.toLocaleString()} {ch.targetUnit}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <VerificationBadge status={ch.verificationRequirement} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {ch.participantCount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {ch.durationDays} Days
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-bold font-mono ${
                            ch.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : ch.status === 'COMPLETED'
                              ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                              : ch.status === 'DRAFT'
                              ? 'bg-slate-700/50 text-slate-400 border-white/10'
                              : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                          }`}
                        >
                          {ch.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedInspectChallenge(ch)}
                            className="flex items-center gap-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Participants</span>
                          </button>
                          <button
                            onClick={() => navigate(`/leaderboard/${ch.id}`)}
                            className="flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Leaderboard</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Participant Inspection Modal */}
      {selectedInspectChallenge && (
        <ParticipantMonitoringModal
          challengeId={selectedInspectChallenge.id}
          challengeTitle={selectedInspectChallenge.title}
          targetValue={selectedInspectChallenge.targetValue}
          targetUnit={selectedInspectChallenge.targetUnit}
          organizerId={user?.id || null}
          onClose={() => setSelectedInspectChallenge(null)}
        />
      )}
    </div>
  );
};
