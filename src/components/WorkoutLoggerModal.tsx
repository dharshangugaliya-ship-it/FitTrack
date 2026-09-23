import React, { useState } from 'react';
import { useRouter } from '../routes/RouterContext';
import { ActivityType } from '../types';
import { VerificationBadge } from './VerificationBadge';
import { X, CheckCircle2, AlertTriangle, Dumbbell, Calendar, Clock, Award } from 'lucide-react';

interface WorkoutLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkoutLoggerModal: React.FC<WorkoutLoggerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activity, setActivity] = useState<ActivityType>('SQUATS');
  const [metricValue, setMetricValue] = useState<number>(50);
  const [duration, setDuration] = useState<number>(25);
  const [notes, setNotes] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1800);
  };

  const getMetricUnit = (act: ActivityType) => {
    switch (act) {
      case 'RUNNING':
      case 'CYCLING':
      case 'WALKING':
        return 'Kilometers (km)';
      case 'PLANK':
        return 'Seconds (sec)';
      case 'YOGA':
        return 'Sessions';
      default:
        return 'Repetitions';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#121722] border border-white/12 shadow-2xl p-6 sm:p-8 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Dumbbell className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-bold text-white">Log Physical Activity</h3>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Record informal or offline workouts. For official challenge competitions, AI or Device verification is recommended.
        </p>

        {/* Verification Status Warning / Pill */}
        <div className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">Verification Level:</span>
            <VerificationBadge status="SELF_REPORTED" size="sm" />
          </div>
          <p className="text-xs text-amber-200/80 leading-relaxed">
            <strong>Important Notice:</strong> Self-reported activity will be publicly flagged as{' '}
            <em>"Self-reported — not AI verified"</em> on leaderboards and yields standard base points (+5 FITTRACK Points).
          </p>
        </div>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Activity Logged Successfully!</h4>
            <p className="text-xs text-emerald-300">
              +5 FITTRACK Points awarded. Your streak has been updated!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Activity Type */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                Exercise / Activity Type
              </label>
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value as ActivityType)}
                className="w-full rounded-xl bg-[#0B0E14] border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-emerald-500 font-medium"
              >
                <option value="SQUATS">Squats (Bodyweight / Gym)</option>
                <option value="PLANK">Plank (Isometric Core)</option>
                <option value="PUSH_UPS">Push-Ups</option>
                <option value="RUNNING">Outdoor / Treadmill Running</option>
                <option value="WALKING">Daily Brisk Walking</option>
                <option value="CYCLING">Outdoor Cycling</option>
                <option value="YOGA">Yoga & Asana Practice</option>
                <option value="SKIPPING">Jump Rope / Skipping</option>
                <option value="SWIMMING">Swimming Laps</option>
              </select>
            </div>

            {/* Target Value & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                  Amount ({getMetricUnit(activity)})
                </label>
                <input
                  type="number"
                  min="1"
                  value={metricValue}
                  onChange={(e) => setMetricValue(Number(e.target.value))}
                  className="w-full rounded-xl bg-[#0B0E14] border border-white/10 px-4 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-xl bg-[#0B0E14] border border-white/10 px-4 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500 font-bold"
                  required
                />
              </div>
            </div>

            {/* Notes / Comments */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                Session Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="E.g. Completed 3 sets of 15 bodyweight squats with good form..."
                className="w-full rounded-xl bg-[#0B0E14] border border-white/10 px-4 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 placeholder:text-slate-600 resize-none"
              />
            </div>

            {/* Footer Points Notice & Submit */}
            <div className="pt-3 flex items-center justify-between border-t border-white/8">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                <Award className="w-4 h-4" />
                <span>Award: +5 Points</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-all active:scale-95 shadow-md shadow-amber-500/20"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
