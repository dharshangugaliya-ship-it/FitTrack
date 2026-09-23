/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Activity, AlertCircle, Sparkles, Timer, CheckCircle2 } from 'lucide-react';
import { PlankProcessorMetrics } from '../../services/verification/PlankVerificationProcessor';

interface PlankVerificationHUDProps {
  metrics: PlankProcessorMetrics;
  isSessionActive: boolean;
}

export const PlankVerificationHUD: React.FC<PlankVerificationHUDProps> = ({
  metrics,
  isSessionActive,
}) => {
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'COMPLETED':
        return 'text-emerald-300 border-emerald-500/50 bg-emerald-500/20';
      case 'HOLDING':
        return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/20 animate-pulse';
      case 'READY':
        return 'text-cyan-400 border-cyan-500/50 bg-cyan-500/20';
      case 'FORM_WARNING':
        return 'text-amber-400 border-amber-500/50 bg-amber-500/20 animate-pulse';
      case 'FORM_LOST':
        return 'text-rose-400 border-rose-500/50 bg-rose-500/20';
      case 'CALIBRATING':
        return 'text-cyan-400 border-cyan-500/50 bg-cyan-500/20';
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

  const getFormAlignmentLabel = (angle: number, isProne: boolean) => {
    if (!isProne) return { text: 'Not Horizontal', color: 'text-amber-400' };
    if (angle >= 165 && angle <= 180) return { text: 'Optimal Spine Alignment', color: 'text-emerald-400' };
    if (angle >= 155 && angle <= 180) return { text: 'Acceptable Alignment', color: 'text-cyan-400' };
    return { text: 'Hip Sag / Pike Detected', color: 'text-rose-400' };
  };

  const alignmentLabel = getFormAlignmentLabel(metrics.alignmentAngle, metrics.isProne);

  return (
    <div className="absolute inset-x-4 bottom-4 z-20 flex flex-col gap-2 pointer-events-none">
      {/* Real-time Guidance Banner */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 px-4 py-2.5 shadow-xl text-left">
        <div className="flex items-center gap-2.5 min-w-0">
          {metrics.isTargetReached ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : metrics.state === 'FORM_WARNING' || metrics.state === 'FORM_LOST' ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : metrics.state === 'HOLDING' ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Sparkles className="w-4 h-4" />
            </div>
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Activity className="w-4 h-4" />
            </div>
          )}

          <div className="truncate">
            <span className="text-xs font-semibold text-white block truncate">
              {metrics.feedbackMessage}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              {getQualityBadge(metrics.poseQuality)}
              {metrics.preferredSide !== 'none' && ` • ${metrics.preferredSide.toUpperCase()} VIEW`}
              {metrics.inferenceFps > 0 && ` • ${metrics.inferenceFps} FPS`}
            </span>
          </div>
        </div>

        {/* State Badge */}
        <div
          className={`shrink-0 rounded-xl px-3 py-1 text-xs font-mono font-black border uppercase tracking-wider ${getStateColor(
            metrics.state
          )}`}
        >
          {metrics.state === 'FORM_WARNING' ? 'FORM WARNING' : metrics.state.replace('_', ' ')}
        </div>
      </div>

      {/* Primary Telemetry HUD Card */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-black/85 backdrop-blur-md border border-white/15 p-3 shadow-2xl">
        {/* Metric 1: Verified Hold Stopwatch */}
        <div className="rounded-xl bg-white/5 p-2.5 border border-white/10 flex flex-col justify-between text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Timer className="w-3 h-3 text-emerald-400" />
              Verified Hold
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {metrics.progressPercentage}%
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              {formatTime(metrics.holdDurationSeconds)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              / {formatTime(metrics.targetDurationSeconds)}
            </span>
          </div>
          {/* Progress Mini-Bar */}
          <div className="w-full bg-white/10 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, metrics.progressPercentage)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Live Body Alignment Angle */}
        <div className="rounded-xl bg-white/5 p-2.5 border border-white/10 flex flex-col justify-between text-left">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Spine Alignment
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {metrics.alignmentAngle ? `${metrics.alignmentAngle}°` : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              (ideal 180°)
            </span>
          </div>
          <span className={`text-[10px] font-semibold truncate ${alignmentLabel.color}`}>
            {alignmentLabel.text}
          </span>
        </div>

        {/* Metric 3: Prone Angle & Hold Status */}
        <div className="rounded-xl bg-white/5 p-2.5 border border-white/10 flex flex-col justify-between text-left">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Horizontal Tilt
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
              {metrics.bodyTiltAngle}°
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              from floor
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono truncate">
            {metrics.state === 'HOLDING' ? 'Holding Active' : metrics.state.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
};
