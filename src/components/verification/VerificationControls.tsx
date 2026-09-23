/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Play,
  Square,
  Camera,
  RotateCcw,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { VerificationSessionState } from '../../types';

interface VerificationControlsProps {
  state: VerificationSessionState;
  onRequestCamera: () => void;
  onStartSession: () => void;
  onStopSession: () => void;
  onRetryCamera: () => void;
  onExit: () => void;
  onReset: () => void;
}

export const VerificationControls: React.FC<VerificationControlsProps> = ({
  state,
  onRequestCamera,
  onStartSession,
  onStopSession,
  onRetryCamera,
  onExit,
  onReset,
}) => {
  const isBusy =
    state === 'REQUESTING_PERMISSION' ||
    state === 'STARTING' ||
    state === 'STOPPING' ||
    state === 'PROCESSING';

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
      {/* Secondary / Exit Action */}
      <button
        type="button"
        disabled={isBusy}
        onClick={onExit}
        className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Exit Chamber</span>
      </button>

      {/* Primary Verification Action Group */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* 1. IDLE: Request Camera Access */}
        {state === 'IDLE' && (
          <button
            type="button"
            disabled={isBusy}
            onClick={onRequestCamera}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            <span>Enable Camera</span>
          </button>
        )}

        {/* 2. REQUESTING PERMISSION */}
        {state === 'REQUESTING_PERMISSION' && (
          <button
            type="button"
            disabled
            className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 text-slate-300 px-5 py-2.5 text-xs font-semibold"
          >
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Requesting Access...</span>
          </button>
        )}

        {/* 3. READY: Camera active, ready to begin verification */}
        {state === 'READY' && (
          <button
            type="button"
            disabled={isBusy}
            onClick={onStartSession}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-2.5 text-xs font-black tracking-wide transition-all shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Verification Session</span>
          </button>
        )}

        {/* 4. STARTING */}
        {state === 'STARTING' && (
          <button
            type="button"
            disabled
            className="flex items-center gap-2 rounded-xl bg-emerald-500/50 text-slate-950 px-6 py-2.5 text-xs font-bold"
          >
            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            <span>Starting Session...</span>
          </button>
        )}

        {/* 5. ACTIVE: Verification in progress -> Stop button */}
        {state === 'ACTIVE' && (
          <button
            type="button"
            disabled={isBusy}
            onClick={onStopSession}
            className="flex items-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 text-xs font-black tracking-wide transition-all shadow-lg shadow-rose-500/25 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop Verification Session</span>
          </button>
        )}

        {/* 6. STOPPING / PROCESSING */}
        {(state === 'STOPPING' || state === 'PROCESSING') && (
          <button
            type="button"
            disabled
            className="flex items-center gap-2 rounded-xl bg-white/10 text-slate-300 px-5 py-2.5 text-xs font-semibold"
          >
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Processing Session Data...</span>
          </button>
        )}

        {/* 7. DENIED or ERROR: Retry Camera */}
        {(state === 'DENIED' || state === 'ERROR') && (
          <button
            type="button"
            disabled={isBusy}
            onClick={onRetryCamera}
            className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white px-5 py-2.5 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Camera</span>
          </button>
        )}

        {/* 8. SUCCESS: Session finished -> New session */}
        {state === 'SUCCESS' && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Start Another Session</span>
          </button>
        )}
      </div>
    </div>
  );
};
