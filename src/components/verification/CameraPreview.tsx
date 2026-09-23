/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Camera,
  RotateCcw,
  AlertTriangle,
  Lock,
  RefreshCw,
  ShieldCheck,
  SwitchCamera,
  Eye,
  Sparkles,
} from 'lucide-react';
import { VerificationSessionState, CameraVerificationError } from '../../types';
import { SquatVerificationHUD } from './SquatVerificationHUD';
import { SquatProcessorMetrics } from '../../services/verification/SquatVerificationProcessor';
import { PlankVerificationHUD } from './PlankVerificationHUD';
import { PlankProcessorMetrics } from '../../services/verification/PlankVerificationProcessor';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  state: VerificationSessionState;
  error: CameraVerificationError | null;
  durationSeconds: number;
  facingMode: 'user' | 'environment';
  onRequestCamera: () => void;
  onRetryCamera: () => void;
  onToggleFacingMode: () => void;
  activityName?: string;
  squatMetrics?: SquatProcessorMetrics | null;
  plankMetrics?: PlankProcessorMetrics | null;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  videoRef,
  state,
  error,
  durationSeconds,
  facingMode,
  onRequestCamera,
  onRetryCamera,
  onToggleFacingMode,
  activityName = 'Activity',
  squatMetrics = null,
  plankMetrics = null,
}) => {
  const isCameraActive = state === 'READY' || state === 'STARTING' || state === 'ACTIVE' || state === 'STOPPING';

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {/* Primary Video Chamber Frame */}
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-[#0B0E14] border border-white/10 shadow-2xl flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />

        {/* Live Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            isCameraActive ? 'opacity-100' : 'opacity-0'
          } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />

        {/* Subtle Edge Vignette */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/40" />
        )}

        {/* TOP HUD (When Camera is Active) */}
        {isCameraActive && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
            {/* Status Pill */}
            <div className="flex items-center gap-2 rounded-full bg-black/70 backdrop-blur-md px-3.5 py-1.5 border border-white/10 text-xs font-mono">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  state === 'ACTIVE'
                    ? 'bg-emerald-400 animate-ping'
                    : state === 'STARTING' || state === 'STOPPING'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-white font-bold tracking-wide">
                {state === 'ACTIVE'
                  ? 'VERIFICATION ACTIVE'
                  : state === 'STARTING'
                  ? 'INITIALIZING SESSION...'
                  : state === 'STOPPING'
                  ? 'FINALIZING...'
                  : 'CAMERA READY'}
              </span>
            </div>

            {/* Right Controls: Timer & Flip */}
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-black/70 backdrop-blur-md px-3.5 py-1.5 border border-white/10 text-xs font-mono font-bold text-white shadow-sm">
                ⏱ {formatTimer(durationSeconds)}
              </div>

              <button
                type="button"
                onClick={onToggleFacingMode}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Switch Camera (Front/Back)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* CENTER OVERLAY: Alignment Box (When Camera is Active) */}
        {isCameraActive && (
          <div className="absolute inset-8 sm:inset-12 pointer-events-none z-10 flex flex-col items-center justify-between border-2 border-dashed border-emerald-500/30 rounded-2xl p-4">
            {/* Corner Indicators */}
            <div className="w-full flex justify-between">
              <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
              <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
            </div>

            {/* Target Guidance Pill */}
            <div className="rounded-full bg-black/70 backdrop-blur-md px-4 py-1.5 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-400 shadow-md">
              Position full body inside guide • {activityName} Verification
            </div>

            <div className="w-full flex justify-between">
              <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
              <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
            </div>
          </div>
        )}

        {/* Squat Computer-Vision HUD Overlay (Phase 9) */}
        {isCameraActive && squatMetrics && (
          <SquatVerificationHUD
            metrics={squatMetrics}
            isSessionActive={state === 'ACTIVE'}
          />
        )}

        {/* Plank Computer-Vision HUD Overlay (Phase 10) */}
        {isCameraActive && plankMetrics && (
          <PlankVerificationHUD
            metrics={plankMetrics}
            isSessionActive={state === 'ACTIVE'}
          />
        )}

        {/* STATE OVERLAYS (When Camera is NOT Active or Error/Requesting) */}

        {/* 1. IDLE STATE: Standby Screen */}
        {state === 'IDLE' && (
          <div className="relative z-20 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Camera Verification Chamber</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Connect your camera to begin optical validation for this challenge. All video streams remain strictly in your browser.
              </p>
            </div>
            <button
              type="button"
              onClick={onRequestCamera}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Enable Camera Preview</span>
            </button>
          </div>
        )}

        {/* 2. REQUESTING PERMISSION */}
        {state === 'REQUESTING_PERMISSION' && (
          <div className="relative z-20 flex flex-col items-center justify-center p-6 text-center space-y-3 max-w-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-white">Requesting Camera Access</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please click <strong>"Allow"</strong> when prompted by your browser to grant webcam access.
            </p>
          </div>
        )}

        {/* 3. PERMISSION DENIED */}
        {state === 'DENIED' && (
          <div className="relative z-20 flex flex-col items-center justify-center p-6 text-center space-y-3 max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Camera Access Denied</h3>
              <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                {error?.details || 'Camera access is required for this verification chamber. Please update your browser site settings and click Retry.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onRetryCamera}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Camera Access</span>
            </button>
          </div>
        )}

        {/* 4. UNSUPPORTED BROWSER */}
        {state === 'UNSUPPORTED' && (
          <div className="relative z-20 flex flex-col items-center justify-center p-6 text-center space-y-3 max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Camera Capture Unavailable</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {error?.details || 'Your browser or current connection does not support HTML5 camera video capture.'}
              </p>
            </div>
            <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-mono text-amber-300">
              Insecure HTTP context or missing mediaDevices API
            </span>
          </div>
        )}

        {/* 5. GENERAL ERROR */}
        {state === 'ERROR' && (
          <div className="relative z-20 flex flex-col items-center justify-center p-6 text-center space-y-3 max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{error?.message || 'Camera Error'}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {error?.details || 'An unexpected error occurred while initializing the camera stream.'}
              </p>
            </div>
            {error?.recoverable && (
              <button
                type="button"
                onClick={onRetryCamera}
                className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Privacy & Architecture Notice */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/2 border border-white/6 px-4 py-2.5 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Local Processing:</strong> Video streams are handled 100% locally in your browser sandbox. No camera footage is saved or uploaded.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-slate-500 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>PHASE 8 PIPELINE</span>
        </div>
      </div>
    </div>
  );
};
