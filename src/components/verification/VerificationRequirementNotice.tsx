/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Watch, ShieldCheck, UserCheck, Info } from 'lucide-react';
import { VerificationStatus } from '../../types';

interface VerificationRequirementNoticeProps {
  requirement: VerificationStatus;
}

export const VerificationRequirementNotice: React.FC<VerificationRequirementNoticeProps> = ({
  requirement,
}) => {
  switch (requirement) {
    case 'AI_VERIFIED':
      return (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Sparkles className="w-4 h-4" />
            <span>AI Verification Protocol (Computer Vision)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            MediaPipe Pose Landmarker computer-vision engine actively tracks hip, knee, and ankle kinematics.
            Repetitions are certified only when full parallel depth (≤98°) and complete standing lockout (≥160°) are achieved.
          </p>
          <div className="text-[11px] font-mono text-emerald-400/90 pt-1">
            Status: Live AI computer-vision verification active.
          </div>
        </div>
      );

    case 'DEVICE_VERIFIED':
      return (
        <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
            <Watch className="w-4 h-4" />
            <span>Device Telemetry Requirement</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            This challenge is configured for wearable sensors, cadence monitors, or GPS tracking.
            Camera verification provides real-time video feedback, but official completion requires wearable telemetry certification.
          </p>
          <div className="text-[11px] font-mono text-cyan-400/90 pt-1">
            Notice: Camera sessions do not replace external device telemetry credentials.
          </div>
        </div>
      );

    case 'ORGANIZER_APPROVED':
      return (
        <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Organizer Review Required</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Evidence clips submitted for this challenge are audited directly by verified event organizers.
            Sessions recorded here can be previewed before submitting to the organizer review studio.
          </p>
          <div className="text-[11px] font-mono text-indigo-300/90 pt-1">
            Notice: Requires coordinator sign-off before leaderboard ranking is certified.
          </div>
        </div>
      );

    case 'SELF_REPORTED':
    default:
      return (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <UserCheck className="w-4 h-4" />
            <span>Self-Reported Honor System</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            This challenge operates on community honor logs. Camera verification is entirely optional.
            Submissions are flagged as uncertified on the national leaderboard.
          </p>
          <div className="text-[11px] font-mono text-amber-400/90 pt-1">
            Notice: Camera usage is optional for self-reported challenges.
          </div>
        </div>
      );
  }
};
