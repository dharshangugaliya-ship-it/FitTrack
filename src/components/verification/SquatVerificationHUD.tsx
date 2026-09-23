/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Activity, AlertCircle, Sparkles } from 'lucide-react';
import { SquatProcessorMetrics } from '../../services/verification/SquatVerificationProcessor';

interface SquatVerificationHUDProps {
  metrics: SquatProcessorMetrics;
  isSessionActive: boolean;
}

export const SquatVerificationHUD: React.FC<SquatVerificationHUDProps> = ({
  metrics,
  isSessionActive,
}) => {
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'BOTTOM':
        return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/20';
      case 'DESCENDING':
      case 'ASCENDING':
        return 'text-cyan-400 border-cyan-500/50 bg-cyan-500/20';
      case 'STANDING':
        return 'text-white border-white/20 bg-white/10';
      case 'CALIBRATING':
        return 'text-amber-400 border-amber-500/50 bg-amber-500/20';
      default:
        return 'text-slate-400 border-white/10 bg-black/40';
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'GOOD':
        return <span className="text-emerald-400 font-bold">Optimal Tracking</span>;
      case 'FAIR':
        return <span className="text-amber-400 font-bold">Acceptable Pose</span>;
      case 'POOR':
        return <span className="text-rose-400 font-bold">Occluded / Low Confidence</span>;
      default:
        return <span className="text-slate-400">Searching for Pose...</span>;
    }
  };

  return (
    <div className="absolute inset-x-4 bottom-4 z-20 flex flex-col gap-2 pointer-events-none">
      {/* Real-time Feedback & Guidance Banner */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 px-4 py-2.5 shadow-xl text-left">
        <div className="flex items-center gap-2.5 min-w-0">
          {metrics.phase === 'BOTTOM' ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
          ) : metrics.partialRepNotice ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Activity className="w-4 h-4" />
            </div>
          )}
          <div className="truncate">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block leading-none">
              AI Biomechanical Guidance
            </span>
            <p className="text-xs font-semibold text-white truncate mt-0.5">
              {metrics.feedbackMessage}
            </p>
          </div>
        </div>

        {/* Phase Pill */}
        <div className="shrink-0">
          <span
            className={`rounded-xl px-3 py-1 text-[11px] font-mono font-bold border transition-colors ${getPhaseColor(
              metrics.phase
            )}`}
          >
            {metrics.phase === 'CALIBRATING'
              ? `CALIBRATING ${Math.round(metrics.calibrationProgress * 100)}%`
              : metrics.phase.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Real-Time Angle & Rep Metrics Strip */}
      {isSessionActive && (
        <div className="grid grid-cols-4 gap-2 text-center font-mono">
          {/* 1. Verified Reps */}
          <div className="rounded-xl bg-black/80 backdrop-blur-md border border-emerald-500/30 p-2 text-left">
            <span className="text-[9px] uppercase font-bold text-emerald-400 block tracking-wider">
              Verified Reps
            </span>
            <div className="text-xl font-black text-emerald-400 leading-tight mt-0.5">
              {metrics.verifiedReps}
            </div>
          </div>

          {/* 2. Live Knee Angle */}
          <div className="rounded-xl bg-black/80 backdrop-blur-md border border-white/10 p-2 text-left">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
              Knee Angle
            </span>
            <div className="text-xl font-black text-white leading-tight mt-0.5">
              {metrics.currentKneeAngle > 0 ? `${metrics.currentKneeAngle}°` : '—'}
            </div>
          </div>

          {/* 3. Deepest Depth in Current Rep */}
          <div className="rounded-xl bg-black/80 backdrop-blur-md border border-white/10 p-2 text-left">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
              Min Depth
            </span>
            <div className="text-xl font-black text-cyan-400 leading-tight mt-0.5">
              {metrics.lowestAngleInCurrentRep < 180 ? `${metrics.lowestAngleInCurrentRep}°` : '—'}
            </div>
          </div>

          {/* 4. Tracking Quality & FPS */}
          <div className="rounded-xl bg-black/80 backdrop-blur-md border border-white/10 p-2 text-left">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
              Vision Tracking
            </span>
            <div className="text-xs font-bold mt-0.5 truncate">
              {getQualityBadge(metrics.poseQuality)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
