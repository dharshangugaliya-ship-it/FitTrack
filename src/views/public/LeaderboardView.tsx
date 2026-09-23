import React, { useState, useEffect } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useChallenges } from '../../hooks/useChallenges';
import { useChallengeLeaderboard } from '../../hooks/useChallengeLeaderboard';
import { LeaderboardTable } from '../../components/LeaderboardTable';
import { VerificationBadge } from '../../components/VerificationBadge';
import {
  Trophy,
  Award,
  Info,
  ChevronDown,
  RefreshCw,
  ArrowLeft,
  Database,
  Play,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const { params, navigate } = useRouter();
  const { challenges, loading: loadingChallenges } = useChallenges();

  const urlChallengeId = params.challengeId;
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>(
    urlChallengeId || 'ch-squat-10k'
  );

  // Sync state with URL parameter if it changes
  useEffect(() => {
    if (urlChallengeId && urlChallengeId !== selectedChallengeId) {
      setSelectedChallengeId(urlChallengeId);
    }
  }, [urlChallengeId]);

  // Hook into the Phase 5 secure leaderboard service
  const {
    leaderboard,
    loading: loadingLeaderboard,
    error,
    dataSource,
    refetch,
  } = useChallengeLeaderboard(selectedChallengeId);

  // Find challenge details from fetched challenges or fallback to leaderboard meta
  const currentChallenge =
    challenges.find((c) => c.id === selectedChallengeId) ||
    (leaderboard
      ? {
          id: leaderboard.challengeId,
          title: leaderboard.challengeTitle,
          targetUnit: leaderboard.targetUnit,
          targetValue: leaderboard.targetValue,
          verificationRequirement: leaderboard.verificationRequirement,
          type: 'ACTIVITY',
          participantCount: leaderboard.totalRankedParticipants,
          bannerUrl:
            'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
        }
      : null);

  const handleChallengeChange = (id: string) => {
    setSelectedChallengeId(id);
    navigate(`/leaderboard/${id}`);
  };

  return (
    <div className="space-y-8 pb-16 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Authentic Challenge Competition
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Challenge Leaderboards
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Rankings are strictly scoped to each individual challenge and ordered by official qualifying activity scores.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
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
            onClick={() => refetch()}
            className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh Leaderboard"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingLeaderboard ? 'animate-spin text-emerald-400' : ''}`}
            />
          </button>

          {/* Challenge Selector */}
          <div className="relative">
            <select
              value={selectedChallengeId}
              onChange={(e) => handleChallengeChange(e.target.value)}
              disabled={loadingChallenges}
              className="appearance-none rounded-xl bg-[#121722] border border-white/12 pl-4 pr-10 py-2 text-xs sm:text-sm font-bold text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              {challenges.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.title} ({ch.targetUnit})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-5 flex items-start justify-between gap-4 text-rose-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">Failed to Load Challenge Leaderboard</h4>
              <p className="text-xs text-rose-300/90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Selected Challenge Context Banner */}
      {currentChallenge && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#121722] via-[#121722] to-emerald-950/20 border border-white/8 p-5">
          <div className="flex items-center gap-4">
            <img
              src={currentChallenge.bannerUrl || 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80'}
              alt={currentChallenge.title}
              className="w-14 h-14 rounded-xl object-cover ring-1 ring-white/10 hidden sm:block shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
                  {currentChallenge.type.replace('_', ' ')}
                </span>
                <VerificationBadge status={currentChallenge.verificationRequirement} size="sm" />
              </div>
              <h2 className="text-lg font-bold text-white">{currentChallenge.title}</h2>
              <p className="text-xs text-slate-400">
                Ranked by Official Score:{' '}
                <strong className="text-emerald-400 font-mono">
                  {currentChallenge.targetUnit}
                </strong>{' '}
                • Target Goal: {currentChallenge.targetValue?.toLocaleString()}{' '}
                {currentChallenge.targetUnit}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
            <button
              onClick={() => navigate(`/challenges/${selectedChallengeId}`)}
              className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              <span>Challenge Details</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => navigate(`/workout/${selectedChallengeId}`)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Workout</span>
            </button>
          </div>
        </div>
      )}

      {/* Metric Isolation Architecture Notice */}
      <div className="flex items-center gap-2.5 rounded-xl bg-white/3 border border-white/6 px-4 py-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong className="text-slate-300">Metric Fairness Engine:</strong> Rankings reflect authentic physical performance measured in {currentChallenge?.targetUnit || 'challenge units'}. FITTRACK Points are universal reward currency and do not influence competition ranking.
        </span>
      </div>

      {/* Loading Skeleton */}
      {loadingLeaderboard ? (
        <div className="min-h-[35vh] flex flex-col items-center justify-center space-y-3 rounded-2xl bg-[#121722] border border-white/8 p-12">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-xs font-mono text-slate-400">
            Querying authoritative challenge leaderboard ranking...
          </p>
        </div>
      ) : leaderboard ? (
        /* Leaderboard Table with Podium and Position Tracking */
        <LeaderboardTable
          entries={leaderboard.entries}
          challengeTitle={leaderboard.challengeTitle}
          targetUnit={leaderboard.targetUnit}
          targetValue={leaderboard.targetValue}
          currentUserEntry={leaderboard.currentUserEntry}
        />
      ) : null}
    </div>
  );
};
