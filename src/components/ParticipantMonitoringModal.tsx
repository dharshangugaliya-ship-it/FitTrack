import React, { useState, useEffect } from 'react';
import { organizerService } from '../services/organizerService';
import { OrganizerChallengeParticipant } from '../types';
import {
  Users,
  X,
  Sparkles,
  Trophy,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface ParticipantMonitoringModalProps {
  challengeId: string;
  challengeTitle: string;
  targetValue: number;
  targetUnit: string;
  organizerId: string | null;
  onClose: () => void;
}

export const ParticipantMonitoringModal: React.FC<ParticipantMonitoringModalProps> = ({
  challengeId,
  challengeTitle,
  targetValue,
  targetUnit,
  organizerId,
  onClose,
}) => {
  const [participants, setParticipants] = useState<OrganizerChallengeParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'fallback'>('supabase');

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      const res = await organizerService.getChallengeParticipants(challengeId, organizerId, 100);
      if (active) {
        if (res.error) {
          setError(res.error);
        } else {
          setParticipants(res.participants);
          setSource(res.source);
        }
        setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [challengeId, organizerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in text-left">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0F141F] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-5 bg-[#141A26]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-indigo-400">
                Authorized Participant Inspection
              </span>
              {source === 'supabase' ? (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-400">
                  SUPABASE AUTHORITATIVE
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-amber-400">
                  EVALUATION STORE
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-white line-clamp-1">{challengeTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Goal: {targetValue.toLocaleString()} {targetUnit} • Monitoring verified progress and completion records
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error ? (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-rose-300">Failed to Retrieve Participant Data</h3>
              <p className="text-xs text-rose-400/80 mt-1">{error}</p>
            </div>
          ) : loading ? (
            <div className="py-20 text-center space-y-3">
              <Sparkles className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
              <p className="text-xs font-mono text-slate-400">
                Querying authorized participant roster and challenge scores...
              </p>
            </div>
          ) : participants.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-white/2 border border-white/5 p-8 space-y-2">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white">No Athletes Enrolled Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Once athletes join this cohort and record verified activity, their official challenge score and progress will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-[#121722] border border-white/8">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/8 bg-white/3 text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Athlete</th>
                      <th className="py-3 px-4">Enrollment Date</th>
                      <th className="py-3 px-4">Challenge Score</th>
                      <th className="py-3 px-4">Progress</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4 text-right">Last Verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/6">
                    {participants.map((p, idx) => {
                      const isComplete = p.status === 'COMPLETED' || p.progressPercentage >= 100;
                      return (
                        <tr key={p.participantId || idx} className="hover:bg-white/2 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {p.avatarUrl ? (
                                <img
                                  src={p.avatarUrl}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-xs">
                                  {p.displayName.charAt(0)}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-white block">{p.displayName}</span>
                                <span className="text-[10px] font-mono text-slate-400">ID: {p.userId.slice(0, 8)}...</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {new Date(p.joinedAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {p.challengeScore.toLocaleString()} {targetUnit}
                          </td>
                          <td className="py-3 px-4">
                            <div className="w-32 space-y-1">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-slate-300">{p.progressPercentage.toFixed(0)}%</span>
                                <span className="text-slate-500">
                                  {p.currentValue.toLocaleString()}/{targetValue.toLocaleString()}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isComplete ? 'bg-emerald-400' : 'bg-indigo-500'
                                  }`}
                                  style={{ width: `${Math.min(100, p.progressPercentage)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 font-mono">
                                <CheckCircle2 className="w-3 h-3" />
                                COMPLETED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400 font-mono">
                                <TrendingUp className="w-3 h-3" />
                                IN PROGRESS
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {p.lastActivityAt ? new Date(p.lastActivityAt).toLocaleDateString() : 'Pending activity'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/8 px-6 py-4 bg-[#141A26] flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Total participants listed: <strong className="text-white font-mono">{participants.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 px-5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
