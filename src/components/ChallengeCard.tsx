import React from 'react';
import { Challenge } from '../types';
import { VerificationBadge } from './VerificationBadge';
import { Users, Calendar, Award, Play, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from '../routes/RouterContext';

interface ChallengeCardProps {
  challenge: Challenge;
  onSelect?: (challenge: Challenge) => void;
  showProgress?: boolean;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onSelect,
  showProgress = true,
}) => {
  const { navigate } = useRouter();

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(challenge);
    } else {
      navigate(`/challenges/${challenge.id}`);
    }
  };

  const handleStartWorkout = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/workout/${challenge.id}`);
  };

  const hasProgress = typeof challenge.userProgress === 'number' && challenge.userProgress > 0;
  const progressPercent = hasProgress && challenge.targetValue
    ? Math.min(100, Math.round((challenge.userProgress! / challenge.targetValue) * 100))
    : 0;

  const difficultyColors = {
    Beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Advanced: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#121722] border border-white/8 transition-all duration-200 hover:border-white/20 hover:shadow-xl hover:shadow-black/40 cursor-pointer text-left"
    >
      {/* Banner / Cover */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-900">
        <img
          src={challenge.bannerUrl}
          alt={challenge.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-100 brightness-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121722]/80 via-transparent to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 flex-wrap">
          <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white border border-white/10 uppercase tracking-wider">
            {challenge.type.replace('_', ' ')}
          </span>

          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-md ${difficultyColors[challenge.difficulty]}`}>
            {challenge.difficulty}
          </span>
        </div>

        {/* Floating Reward Chip */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md px-3 py-1 border border-emerald-500/40 text-xs font-bold text-emerald-300">
          <Award className="w-3.5 h-3.5 text-emerald-400" />
          <span>+{challenge.pointsReward} pts</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Verification Status */}
        <div className="mb-2">
          <VerificationBadge status={challenge.verificationRequirement} size="sm" />
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
          {challenge.title}
        </h3>
        <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {challenge.description}
        </p>

        {/* Target Metrics */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white/4 p-3 border border-white/6">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Target</span>
            <div className="text-sm font-bold text-white font-mono">
              {challenge.targetValue.toLocaleString()} {challenge.targetUnit}
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Community</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-300">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{challenge.participantCount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Enrolled Status / Progress */}
        {showProgress && challenge.isEnrolled && (
          <div className="mt-4 pt-3 border-t border-white/6 space-y-2">
            {hasProgress ? (
              <div>
                <div className="flex justify-between items-center text-xs font-medium mb-1.5">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Verified Progress</span>
                  </span>
                  <span className="text-slate-300 font-mono">
                    {challenge.userProgress?.toLocaleString()} / {challenge.targetValue.toLocaleString()} {challenge.targetUnit} ({progressPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 font-mono">
                  <span>
                    Challenge Score:{' '}
                    <strong className="text-white">
                      {(challenge.challengeScore ?? challenge.userProgress)?.toLocaleString()} {challenge.targetUnit}
                    </strong>
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    +{challenge.pointsEarned || 10} pts earned
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white/3 border border-white/8 p-2.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Enrolled • 0% Complete</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    +{challenge.pointsEarned || 10} pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  No verified activity yet. Start your first session to build progress.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Organizer info & Action Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-white/6 pt-4">
          <div className="flex items-center gap-2">
            <img
              src={challenge.organizerAvatar}
              alt={challenge.organizerName}
              className="h-6 w-6 rounded-full object-cover ring-1 ring-white/20"
            />
            <div className="text-left">
              <p className="text-xs font-medium text-slate-300 leading-none">{challenge.organizerName}</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">{challenge.durationDays}d challenge</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {challenge.isEnrolled ? (
              <button
                onClick={handleStartWorkout}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-all hover:bg-emerald-400 active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Workout</span>
              </button>
            ) : (
              <button
                onClick={handleCardClick}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors cursor-pointer"
              >
                <span>View Rules</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

