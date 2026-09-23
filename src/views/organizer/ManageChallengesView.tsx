import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { useOrganizerChallenges } from '../../hooks/useOrganizerChallenges';
import { VerificationBadge } from '../../components/VerificationBadge';
import { ParticipantMonitoringModal } from '../../components/ParticipantMonitoringModal';
import { Challenge, ChallengeStatus } from '../../types';
import {
  Sliders,
  Plus,
  BarChart3,
  Users,
  Trophy,
  Clock,
  ShieldCheck,
  Sparkles,
  Search,
  Filter,
  AlertCircle,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Play,
  FileCheck2,
} from 'lucide-react';

export const ManageChallengesView: React.FC = () => {
  const { navigate } = useRouter();
  const { user, isSupabaseConfigured } = useAuth();
  const {
    challenges,
    loading,
    error,
    source,
    filter,
    setFilter,
    mutatingId,
    updateStatus,
    refetch,
  } = useOrganizerChallenges({ status: 'ALL' });

  const [selectedInspectChallenge, setSelectedInspectChallenge] = useState<Challenge | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleStatusChange = async (challenge: Challenge, newStatus: ChallengeStatus) => {
    const res = await updateStatus(challenge.id, newStatus);
    if (res.success) {
      setActionSuccess(`Updated "${challenge.title}" status to ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } else {
      alert(res.error || 'Failed to update challenge status');
    }
  };

  const statusTabs: { label: string; value: ChallengeStatus | 'ALL' }[] = [
    { label: 'All Cohorts', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Published', value: 'PUBLISHED' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Completed', value: 'COMPLETED' },
  ];

  return (
    <div className="space-y-8 pb-16 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Cohort Management
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
          <h1 className="text-3xl font-black tracking-tight text-white">Manage Challenges</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Inspect your owned fitness cohorts, manage challenge status, and monitor athlete enrollment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh challenges"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/organizer/create')}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Challenge</span>
          </button>
        </div>
      </div>

      {/* Action Notice */}
      {actionSuccess && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-rose-300">Unable to load challenges</h4>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-[#121722] border border-white/8 p-1 rounded-xl overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter({ ...filter, status: tab.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                filter.status === tab.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search owned challenges..."
            value={filter.search || ''}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#121722] border border-white/8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Challenge Table */}
      <div className="overflow-hidden rounded-2xl bg-[#121722] border border-white/8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/8 bg-white/3 text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Challenge</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-4">Athletes</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Sparkles className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    <span className="text-xs font-mono">Loading registered challenges...</span>
                  </td>
                </tr>
              ) : challenges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Sliders className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-white">No challenges matching filter.</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {filter.status !== 'ALL'
                        ? `No challenges currently have status "${filter.status}".`
                        : 'You have not created any fitness challenges yet.'}
                    </p>
                    {filter.status === 'ALL' && (
                      <button
                        onClick={() => navigate('/organizer/create')}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Challenge</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                challenges.map((ch) => {
                  const isMutating = mutatingId === ch.id;
                  return (
                    <tr key={ch.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={ch.bannerUrl}
                            alt=""
                            className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/10"
                          />
                          <div>
                            <span className="font-bold text-white line-clamp-1">{ch.title}</span>
                            <span className="text-xs text-slate-400 font-mono">
                              Target: {ch.targetValue.toLocaleString()} {ch.targetUnit} • {ch.activity}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <VerificationBadge status={ch.verificationRequirement} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        {ch.participantCount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {ch.durationDays} days
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold font-mono ${
                            ch.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : ch.status === 'COMPLETED'
                              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                              : ch.status === 'DRAFT'
                              ? 'bg-slate-700/50 border-white/10 text-slate-400'
                              : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ch.status === 'ACTIVE'
                                ? 'bg-emerald-400'
                                : ch.status === 'COMPLETED'
                                ? 'bg-indigo-400'
                                : ch.status === 'DRAFT'
                                ? 'bg-slate-400'
                                : 'bg-cyan-400'
                            }`}
                          />
                          {ch.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Lifecycle Actions */}
                          {ch.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => navigate(`/organizer/create/${ch.id}`)}
                                className="flex items-center gap-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:text-white transition-colors cursor-pointer"
                                title="Edit challenge draft"
                              >
                                <span>Edit</span>
                              </button>
                              <button
                                disabled={isMutating}
                                onClick={() => handleStatusChange(ch, 'ACTIVE')}
                                className="flex items-center gap-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
                                title="Activate challenge for registration"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Activate</span>
                              </button>
                            </>
                          )}

                          {ch.status === 'ACTIVE' && (
                            <button
                              disabled={isMutating}
                              onClick={() => handleStatusChange(ch, 'COMPLETED')}
                              className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                              title="End and mark challenge as completed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                              <span>End Challenge</span>
                            </button>
                          )}

                          {/* Participant Inspection */}
                          <button
                            onClick={() => setSelectedInspectChallenge(ch)}
                            className="flex items-center gap-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Participants</span>
                          </button>

                          {/* Leaderboard Link */}
                          <button
                            onClick={() => navigate(`/leaderboard/${ch.id}`)}
                            className="flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Leaderboard</span>
                          </button>

                          {/* Analytics Link */}
                          <button
                            onClick={() => navigate(`/organizer/analytics/${ch.id}`)}
                            className="flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                          >
                            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Analytics</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
