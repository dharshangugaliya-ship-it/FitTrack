import React from 'react';
import { LeaderboardEntry } from '../types';
import { VerificationBadge } from './VerificationBadge';
import { Trophy, Medal, Crown } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  challengeTitle?: string;
  targetUnit?: string;
  targetValue?: number;
  currentUserEntry?: LeaderboardEntry | null;
  className?: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  challengeTitle,
  targetUnit = 'reps',
  targetValue,
  currentUserEntry,
  className = '',
}) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-14 text-center rounded-2xl bg-[#121722] border border-white/8 space-y-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/4 border border-white/8 text-slate-500">
          <Trophy className="w-7 h-7 text-slate-500" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-bold text-white">No leaderboard results yet</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Be the first verified challenger to complete a qualifying workout session and establish an official score!
          </p>
        </div>
      </div>
    );
  }

  // Top 3 for podium
  const topThree = entries.slice(0, 3);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/40">
            <Crown className="w-4 h-4 fill-amber-400" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-300 border border-slate-300/40">
            <Medal className="w-4 h-4" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-600/20 text-amber-500 border border-amber-600/40">
            <Medal className="w-4 h-4" />
          </div>
        );
      default:
        return <span className="font-mono text-xs font-semibold text-slate-400">#{rank}</span>;
    }
  };

  // Check if current user is outside visible top list
  const isCurrentUserInList = entries.some((e) => e.isCurrentUser);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top 3 Podium Cards */}
      {topThree.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          {/* Rank 2 */}
          <div className="flex flex-col items-center justify-end rounded-2xl bg-[#121722] border border-white/8 p-5 text-center order-2 sm:order-1 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-300 border border-slate-300/40 text-xs font-bold font-mono">
              2
            </div>
            <img
              src={topThree[1].avatarUrl}
              alt={topThree[1].displayName}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-400/40 shadow-lg mt-2"
            />
            <h4 className="font-bold text-sm text-white mt-3 line-clamp-1">{topThree[1].displayName}</h4>
            <div className="text-lg font-black text-white font-mono mt-1">
              {topThree[1].challengeScore.toLocaleString()} <span className="text-xs font-normal text-slate-400">{topThree[1].targetUnit}</span>
            </div>
            <div className="mt-2">
              <VerificationBadge status={topThree[1].verificationStatus} size="sm" />
            </div>
          </div>

          {/* Rank 1 (Elevated Podium) */}
          <div className="flex flex-col items-center justify-end rounded-2xl bg-gradient-to-b from-amber-500/15 via-[#121722] to-[#121722] border border-amber-400/30 p-6 text-center order-1 sm:order-2 shadow-xl shadow-amber-500/5 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/30">
              <Crown className="w-4 h-4 fill-slate-950" />
            </div>
            <img
              src={topThree[0].avatarUrl}
              alt={topThree[0].displayName}
              className="w-16 h-16 rounded-full object-cover ring-4 ring-amber-400/60 shadow-xl mt-2"
            />
            <h4 className="font-black text-base text-white mt-3 line-clamp-1">{topThree[0].displayName}</h4>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              {topThree[0].challengeScore.toLocaleString()} <span className="text-xs font-normal text-slate-300">{topThree[0].targetUnit}</span>
            </div>
            <div className="mt-2">
              <VerificationBadge status={topThree[0].verificationStatus} size="sm" />
            </div>
          </div>

          {/* Rank 3 */}
          <div className="flex flex-col items-center justify-end rounded-2xl bg-[#121722] border border-white/8 p-5 text-center order-3 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-amber-600/20 text-amber-500 border border-amber-600/40 text-xs font-bold font-mono">
              3
            </div>
            <img
              src={topThree[2].avatarUrl}
              alt={topThree[2].displayName}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-600/40 shadow-lg mt-2"
            />
            <h4 className="font-bold text-sm text-white mt-3 line-clamp-1">{topThree[2].displayName}</h4>
            <div className="text-lg font-black text-white font-mono mt-1">
              {topThree[2].challengeScore.toLocaleString()} <span className="text-xs font-normal text-slate-400">{topThree[2].targetUnit}</span>
            </div>
            <div className="mt-2">
              <VerificationBadge status={topThree[2].verificationStatus} size="sm" />
            </div>
          </div>
        </div>
      )}

      {/* Persistent Current User Position Sticky Banner (when current user has score but not visible in top rows) */}
      {currentUserEntry && !isCurrentUserInList && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500 text-slate-950 font-bold font-mono text-sm">
              #{currentUserEntry.rank}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{currentUserEntry.displayName}</span>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Your Current Rank
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ranked among official participants based on verified activity
              </p>
            </div>
          </div>

          <div className="text-right font-mono self-end sm:self-auto">
            <span className="text-xs text-slate-400 block font-sans">Your Official Score</span>
            <span className="text-lg font-black text-emerald-400">
              {currentUserEntry.challengeScore.toLocaleString()} {currentUserEntry.targetUnit}
            </span>
          </div>
        </div>
      )}

      {/* Rankings Table */}
      <div className="overflow-hidden rounded-2xl bg-[#121722] border border-white/8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/8 bg-white/3 text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                <th className="py-3.5 px-4">Challenger</th>
                <th className="py-3.5 px-4">Verification Standard</th>
                <th className="py-3.5 px-4 text-right">Official Challenge Score</th>
                <th className="py-3.5 px-4 text-right hidden sm:table-cell">Activity Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 font-normal">
              {entries.map((entry) => (
                <tr
                  key={entry.userId}
                  className={`transition-colors hover:bg-white/3 ${
                    entry.isCurrentUser ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex justify-center">{getRankBadge(entry.rank)}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={entry.avatarUrl}
                        alt={entry.displayName}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <span>{entry.displayName}</span>
                          {entry.isCurrentUser && (
                            <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">Participant</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <VerificationBadge status={entry.verificationStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-base">
                    <span>{entry.challengeScore.toLocaleString()}</span>{' '}
                    <span className="text-xs font-normal text-slate-400">{entry.targetUnit}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-xs text-slate-400 hidden sm:table-cell">
                    {entry.completionDate || 'Recent'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
