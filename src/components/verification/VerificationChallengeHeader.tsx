/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Award, Target, Flame, ArrowLeft, ShieldCheck, Database, Play, Sparkles } from 'lucide-react';
import { Challenge } from '../../types';
import { VerificationBadge } from '../VerificationBadge';

interface VerificationChallengeHeaderProps {
  challenge: Challenge;
  dataSource: 'supabase' | 'fallback';
  onBack: () => void;
  onWatchDemo?: () => void;
}

export const VerificationChallengeHeader: React.FC<VerificationChallengeHeaderProps> = ({
  challenge,
  dataSource,
  onBack,
  onWatchDemo,
}) => {
  return (
    <div className="space-y-3 border-b border-white/8 pb-4">
      {/* Top row: Back button & Source pill */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Challenge Details</span>
        </button>

        <div className="flex items-center gap-2">
          {dataSource === 'supabase' ? (
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
              <Database className="w-3 h-3" />
              <span>SUPABASE</span>
            </span>
          ) : (
            <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-400">
              EVALUATION STORE
            </span>
          )}

          <VerificationBadge status={challenge.verificationRequirement} size="sm" />
        </div>
      </div>

      {/* Main Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 border border-white/10">
              {challenge.type.replace('_', ' ')}
            </span>
            <span className="rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold">
              {challenge.difficulty}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {challenge.title}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Target Goal: <strong className="text-emerald-400 font-mono">{challenge.targetValue?.toLocaleString()} {challenge.targetUnit}</strong> • Standardized discipline: <strong className="text-white">{challenge.activity.replace('_', ' ')}</strong>
          </p>
        </div>

        {/* Right Action & Metric Box */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          {onWatchDemo && (
            <button
              type="button"
              onClick={onWatchDemo}
              className="flex items-center gap-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:text-white transition-all cursor-pointer shadow-sm"
              title="Watch 3D Human Hologram exercise demonstration"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI Hologram Demo</span>
            </button>
          )}

          <div className="rounded-xl bg-white/3 border border-white/8 px-3.5 py-2 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Reward Pool</span>
            <span className="text-sm font-black text-amber-400 font-mono">
              +{challenge.pointsReward} Pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
