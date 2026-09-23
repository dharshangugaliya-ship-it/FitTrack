import React, { useState, useEffect } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { challengeService } from '../../services/challengeService';
import { organizerService } from '../../services/organizerService';
import { StatsCard } from '../../components/StatsCard';
import { VerificationBadge } from '../../components/VerificationBadge';
import { ParticipantMonitoringModal } from '../../components/ParticipantMonitoringModal';
import { Challenge, OrganizerChallengeParticipant } from '../../types';
import {
  BarChart3,
  Users,
  CheckCircle2,
  Trophy,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Percent,
  Database,
  AlertCircle,
} from 'lucide-react';

export const ChallengeAnalyticsView: React.FC = () => {
  const { params, navigate } = useRouter();
  const { user, isSupabaseConfigured } = useAuth();
  const challengeId = params.challengeId || 'ch-squat-10k';

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<OrganizerChallengeParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'fallback'>('supabase');
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [chRes, partsRes] = await Promise.all([
          challengeService.getChallengeById(challengeId, user?.id),
          organizerService.getChallengeParticipants(challengeId, user?.id || 'demo_organizer', 100),
        ]);

        if (active) {
          if (!chRes.challenge) {
            setError(chRes.error || 'Challenge not found');
          } else {
            setChallenge(chRes.challenge);
            setSource(chRes.source);
          }

          if (partsRes.participants) {
            setParticipants(partsRes.participants);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to load challenge analytics');
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [challengeId, user?.id]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Sparkles className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
        <p className="text-xs font-mono text-slate-400">Loading cohort operational summary...</p>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Cohort Unavailable</h2>
        <p className="text-xs text-slate-400">{error || 'Challenge record could not be located.'}</p>
        <button
          onClick={() => navigate('/organizer/challenges')}
          className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-semibold text-white"
        >
          Return to Manage Challenges
        </button>
      </div>
    );
  }

  // Derive metrics from authoritative participant rows
  const enrolledCount = challenge.participantCount || participants.length;
  const completedCount = participants.filter((p) => p.status === 'COMPLETED' || p.progressPercentage >= 100).length;
  const completionRate = enrolledCount > 0 ? ((completedCount / enrolledCount) * 100).toFixed(1) : '0.0';
  const totalVerifiedScore = participants.reduce((acc, p) => acc + (p.challengeScore || 0), 0);
  const avgScore = enrolledCount > 0 ? Math.round(totalVerifiedScore / enrolledCount) : 0;

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 pb-4">
        <button
          onClick={() => navigate('/organizer/challenges')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Manage Challenges</span>
        </button>

        <div className="flex items-center gap-3">
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
          <button
            onClick={() => navigate(`/leaderboard/${challenge.id}`)}
            className="flex items-center gap-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400 transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>View Public Leaderboard</span>
          </button>
        </div>
      </div>

      {/* Challenge Title Banner */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#121722] border border-white/8 p-6">
        <div className="flex items-center gap-4">
          <img
            src={challenge.bannerUrl}
            alt=""
            className="w-16 h-16 rounded-xl object-cover ring-1 ring-white/10 hidden sm:block shrink-0"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                {challenge.type.replace('_', ' ')}
              </span>
              <VerificationBadge status={challenge.verificationRequirement} size="sm" />
              <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold">
                {challenge.status}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">{challenge.title}</h1>
            <p className="text-xs text-slate-400">
              Target Goal: {challenge.targetValue.toLocaleString()} {challenge.targetUnit} • {challenge.durationDays} Days Duration
            </p>
          </div>
        </div>

        <button
          onClick={() => setInspectModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shrink-0 shadow-md shadow-indigo-600/20 cursor-pointer"
        >
          <Users className="w-4 h-4" />
          <span>Inspect Enrolled Athletes</span>
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Enrolled"
          value={enrolledCount.toLocaleString()}
          subtitle="Athletes in this cohort"
          icon={Users}
          iconColor="text-indigo-400"
        />
        <StatsCard
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${completedCount.toLocaleString()} finished goal`}
          icon={Percent}
          iconColor="text-emerald-400"
          badgeText="Verified"
          badgeType="positive"
        />
        <StatsCard
          title="Verified Volume"
          value={`${totalVerifiedScore.toLocaleString()} ${challenge.targetUnit}`}
          subtitle="Total verified metric"
          icon={TrendingUp}
          iconColor="text-cyan-400"
        />
        <StatsCard
          title="Avg Athlete Score"
          value={`${avgScore.toLocaleString()} ${challenge.targetUnit}`}
          subtitle="Per participating challenger"
          icon={CheckCircle2}
          iconColor="text-amber-400"
        />
      </div>

      {/* Inspection Modal */}
      {inspectModalOpen && (
        <ParticipantMonitoringModal
          challengeId={challenge.id}
          challengeTitle={challenge.title}
          targetValue={challenge.targetValue}
          targetUnit={challenge.targetUnit}
          organizerId={user?.id || null}
          onClose={() => setInspectModalOpen(false)}
        />
      )}
    </div>
  );
};
