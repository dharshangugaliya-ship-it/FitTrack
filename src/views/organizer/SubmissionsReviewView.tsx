import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { pointsService } from '../../services/pointsService';
import { MOCK_SUBMISSIONS } from '../../data/mockData';
import { Submission } from '../../types';
import { VerificationBadge } from '../../components/VerificationBadge';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Video,
  User,
  ExternalLink,
  Award,
  AlertCircle,
} from 'lucide-react';

export const SubmissionsReviewView: React.FC = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>(MOCK_SUBMISSIONS);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleApprove = async (id: string, name: string) => {
    const sub = submissions.find((s) => s.id === id);
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'APPROVED' as const } : s))
    );

    if (sub) {
      try {
        await pointsService.recordOrganizerApprovedPointEvent(
          sub.userId,
          sub.challengeId,
          sub.challengeTitle,
          sub.activity,
          sub.score,
          sub.targetUnit,
          sub.id
        );

        // Also credit the active athlete persona so that approving in organizer mode is directly testable in challenger ledger
        const activeUserId = user?.id || 'usr_aarav_01';
        await pointsService.recordOrganizerApprovedPointEvent(
          activeUserId,
          sub.challengeId,
          sub.challengeTitle,
          sub.activity,
          sub.score,
          sub.targetUnit,
          `review_${sub.id}`
        );
      } catch (err) {
        console.warn('Failed recording organizer approved points:', err);
      }
    }

    setActionSuccess(`Submission by ${name} approved. +20 Points certified and synced to ledger.`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleReject = (id: string, name: string) => {
    setSubmissions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, status: 'REJECTED' as const } : sub))
    );
    setActionSuccess(`Submission by ${name} rejected due to incomplete form depth.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const filtered = submissions.filter((s) => {
    if (filter === 'PENDING') return s.status === 'PENDING';
    if (filter === 'APPROVED') return s.status === 'APPROVED';
    return true;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileCheck2 className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Integrity & Verification
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Submissions Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit and approve participant activity evidence to record official organizer-approved leaderboard scores.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-xl bg-[#121722] border border-white/8 p-1">
          <button
            onClick={() => setFilter('PENDING')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === 'PENDING' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending ({submissions.filter((s) => s.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === 'APPROVED' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Certified
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Submissions
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionSuccess && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-xs font-semibold text-emerald-300 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Submissions List */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-2xl bg-[#121722] border border-white/8 p-6 transition-all hover:border-white/16"
            >
              {/* Left Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-base">{sub.userName}</span>
                  <VerificationBadge status={sub.verificationStatus} size="sm" />
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                      sub.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : sub.status === 'REJECTED'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  Challenge: <strong className="text-white">{sub.challengeTitle}</strong>
                </p>

                <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                  {sub.notes || 'Recorded via workout session telemetry with complete repetition log.'}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span>Submitted: {sub.submittedAt}</span>
                  {sub.evidenceUrl && (
                    <a
                      href={sub.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Review Video Clip</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Right Score & Actions */}
              <div className="flex flex-row lg:flex-col items-end justify-between lg:justify-center gap-4 shrink-0 border-t lg:border-t-0 border-white/8 pt-4 lg:pt-0">
                <div className="text-left lg:text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Claimed Metric</span>
                  <span className="text-lg font-black text-white font-mono">
                    {sub.claimedScore} {sub.targetUnit}
                  </span>
                  <span className="text-xs text-emerald-400 font-mono block">+{sub.pointsAwarded} pts</span>
                </div>

                {sub.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(sub.id, sub.userName || sub.displayName)}
                      className="flex items-center gap-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                    <button
                      onClick={() => handleApprove(sub.id, sub.userName || sub.displayName)}
                      className="flex items-center gap-1 rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Certify</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 text-center rounded-3xl bg-[#121722] border border-white/8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
          <h3 className="text-lg font-bold text-white">All Submissions Reviewed!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            There are currently no pending participant submissions awaiting organizer review.
          </p>
        </div>
      )}
    </div>
  );
};
