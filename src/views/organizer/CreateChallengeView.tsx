import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useChallengeCreator, ACTIVITY_PRESETS } from '../../hooks/useChallengeCreator';
import {
  ChallengeType,
  VerificationStatus,
  ActivityType,
  ChallengeDifficulty,
  ChallengeVisibility,
} from '../../types';
import { VerificationBadge } from '../../components/VerificationBadge';
import {
  PlusCircle,
  Sparkles,
  Watch,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Award,
  Calendar,
  Layers,
  Save,
  AlertCircle,
  Eye,
  Loader2,
  Image as ImageIcon,
  Flame,
  Globe,
  Lock,
} from 'lucide-react';

export const CreateChallengeView: React.FC = () => {
  const { navigate, params } = useRouter();
  const draftId = params.challengeId || params.id;

  const {
    formData,
    errors,
    loading,
    saving,
    publishing,
    saveSuccessMessage,
    loadError,
    hasUnsavedChanges,
    updateField,
    validateForm,
    saveDraft,
    publish,
  } = useChallengeCreator(draftId);

  // 4-step wizard navigation
  const [step, setStep] = useState<number>(1);
  const [publishSuccess, setPublishSuccess] = useState<boolean>(false);
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);

  const calculateDurationDays = () => {
    if (!formData.startDate || !formData.endDate) return 30;
    const start = new Date(formData.startDate).getTime();
    const end = new Date(formData.endDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return 0;
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
  };

  const handleStepClick = (targetStep: number) => {
    // Allow reviewing earlier steps or moving ahead
    setStep(targetStep);
  };

  const handleNextStep = () => {
    if (step === 1) {
      // Light check for step 1
      if (!formData.title.trim()) {
        validateForm();
        return;
      }
    }
    if (step < 4) {
      setStep((s) => s + 1);
    }
  };

  const handleSaveDraftClick = async () => {
    const res = await saveDraft();
    if (res.success && res.challengeId && !draftId) {
      // Update URL hash/path to include the draft ID
      navigate(`/organizer/create/${res.challengeId}`);
    }
  };

  const handlePublishClick = async () => {
    const res = await publish();
    if (res.success && res.challengeId) {
      setCreatedChallengeId(res.challengeId);
      setPublishSuccess(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400 font-mono tracking-wide">
          Loading challenge draft studio...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto my-12 rounded-3xl bg-[#121722] border border-rose-500/30 p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-xl font-black text-white">Unable to Load Challenge Draft</h2>
        <p className="text-xs text-slate-400">{loadError}</p>
        <button
          onClick={() => navigate('/organizer/challenges')}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Manage Challenges</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Top Banner / Breadcrumb Header */}
      <div className="border-b border-white/8 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PlusCircle className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Challenge Creator Studio
            </span>
            {draftId && (
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                Draft ID: {draftId.slice(0, 8)}...
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {draftId ? 'Edit Challenge Draft' : 'Create New Challenge'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Publish an AI-verified fitness challenge with automated pose estimation or device telemetry.
          </p>
        </div>

        {/* Action Buttons: Save Draft */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving || publishing}
            onClick={handleSaveDraftClick}
            className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Save your work as a draft in your organizer portfolio"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <Save className="w-4 h-4 text-indigo-400" />
            )}
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/organizer/challenges')}
            className="flex items-center gap-1.5 rounded-xl bg-transparent hover:bg-white/5 border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <span>Cancel</span>
          </button>
        </div>
      </div>

      {/* Draft Save Banner Notification */}
      {saveSuccessMessage && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Status: DRAFT</span>
        </div>
      )}

      {/* Form Validation Errors Banner */}
      {errors.general && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-xs font-medium text-rose-300">{errors.general}</span>
        </div>
      )}

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { stepNum: 1, label: '1. Basic Info', icon: Layers },
          { stepNum: 2, label: '2. Metrics & Rules', icon: Calendar },
          { stepNum: 3, label: '3. Verification', icon: ShieldCheck },
          { stepNum: 4, label: '4. Preview & Publish', icon: Eye },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = step === s.stepNum;
          const isDone = step > s.stepNum;
          return (
            <div
              key={s.stepNum}
              onClick={() => handleStepClick(s.stepNum)}
              className={`cursor-pointer rounded-xl p-3 border transition-all flex items-center gap-2.5 ${
                isActive
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-md shadow-indigo-500/10'
                  : isDone
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-white/2 border-white/6 text-slate-400 hover:bg-white/4'
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                  isActive
                    ? 'bg-indigo-500 text-white'
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.stepNum}
              </div>
              <span className="text-xs font-bold truncate">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Wizard Content or Success State */}
      {publishSuccess ? (
        <div className="rounded-3xl bg-[#121722] border border-emerald-500/40 p-10 sm:p-14 text-center space-y-6 animate-in zoom-in-95">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xl shadow-emerald-500/10">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white">Challenge Published Successfully!</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              <strong className="text-white font-semibold">{formData.title}</strong> is now officially
              active. Challengers can enroll, submit workout sessions, and compete on the live leaderboard.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
            {createdChallengeId && (
              <button
                onClick={() => navigate(`/challenges/${createdChallengeId}`)}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>View Challenge Details</span>
              </button>
            )}
            <button
              onClick={() => navigate('/organizer/challenges')}
              className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <span>Manage My Challenges</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-[#121722] border border-white/8 p-6 sm:p-8 space-y-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-white/6 pb-3">
                <h3 className="text-lg font-bold text-white">Step 1: Challenge Overview</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set the title, narrative, sport type, and banner visuals.
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                  Challenge Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g. National 10K Squat Milestone 2026"
                  className={`w-full rounded-xl bg-[#0B0E14] border px-4 py-2.5 text-sm text-white focus:outline-hidden transition-colors ${
                    errors.title
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-white/10 focus:border-indigo-500'
                  }`}
                />
                {errors.title && (
                  <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                    {errors.title}
                  </span>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                  Description & Motivation <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  placeholder="Describe the milestone goal, rules, form guidelines, and inspiration for athletes..."
                  className={`w-full rounded-xl bg-[#0B0E14] border px-4 py-2.5 text-xs text-white focus:outline-hidden leading-relaxed transition-colors ${
                    errors.description
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-white/10 focus:border-indigo-500'
                  }`}
                />
                {errors.description && (
                  <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                    {errors.description}
                  </span>
                )}
              </div>

              {/* Archetype and Sport Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                    Challenge Archetype
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => updateField('type', e.target.value as ChallengeType)}
                    className="w-full rounded-xl bg-[#0B0E14] border border-white/10 px-4 py-2.5 text-xs text-white font-medium focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="GOAL_BASED">Goal-Based (Target Reps / Distance Milestone)</option>
                    <option value="CONSISTENCY">Consistency (Daily Streak)</option>
                    <option value="ACTIVITY">Activity Focused</option>
                    <option value="EVENT">Event / Institutional League</option>
                    <option value="COMPETITION">Timed Competition</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                    Exercise / Sport Activity
                  </label>
                  <select
                    value={formData.activity}
                    onChange={(e) => updateField('activity', e.target.value as ActivityType)}
                    className="w-full rounded-xl bg-[#0B0E14] border border-white/10 px-4 py-2.5 text-xs text-white font-medium focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="SQUATS">Squats (AI Vision Form Check)</option>
                    <option value="PUSH_UPS">Push-Ups (AI Vision Form Check)</option>
                    <option value="PLANK">Plank (AI Posture Stopwatch)</option>
                    <option value="RUNNING">Running (GPS Distance Telemetry)</option>
                    <option value="WALKING">Walking (Step Cadence)</option>
                    <option value="CYCLING">Cycling (Speed & GPS Track)</option>
                    <option value="SKIPPING">Jumping Rope / Skipping</option>
                    <option value="SWIMMING">Swimming</option>
                    <option value="YOGA">Yoga & Asanas</option>
                  </select>
                </div>
              </div>

              {/* Visibility and Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                    Audience Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateField('visibility', 'PUBLIC')}
                      className={`flex items-center justify-center gap-2 rounded-xl p-2.5 border text-xs font-bold transition-all cursor-pointer ${
                        formData.visibility === 'PUBLIC'
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-[#0B0E14] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public Catalog</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('visibility', 'PRIVATE')}
                      className={`flex items-center justify-center gap-2 rounded-xl p-2.5 border text-xs font-bold transition-all cursor-pointer ${
                        formData.visibility === 'PRIVATE'
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-[#0B0E14] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Private / Invite</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                    Banner Visual URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.bannerUrl}
                      onChange={(e) => updateField('bannerUrl', e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl bg-[#0B0E14] border border-white/10 px-4 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                    <img
                      src={formData.bannerUrl}
                      alt="Preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80';
                      }}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Metrics & Timeline */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-white/6 pb-3">
                <h3 className="text-lg font-bold text-white">Step 2: Metrics, Target & Timeline</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure numerical targets, target units for leaderboard scoring, and competition dates.
                </p>
              </div>

              {/* Target Goal Amount & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                    Target Goal Amount <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.targetValue}
                    onChange={(e) => updateField('targetValue', Number(e.target.value))}
                    className={`w-full rounded-xl bg-[#0B0E14] border px-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-hidden transition-colors ${
                      errors.targetValue
                        ? 'border-rose-500/80 focus:border-rose-500'
                        : 'border-white/10 focus:border-indigo-500'
                    }`}
                  />
                  {errors.targetValue && (
                    <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                      {errors.targetValue}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Total required repetitions, distance, or time for completion.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                    Target Metric Unit <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.targetUnit}
                    onChange={(e) => updateField('targetUnit', e.target.value)}
                    placeholder="e.g. reps, km, seconds, minutes"
                    className={`w-full rounded-xl bg-[#0B0E14] border px-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-hidden transition-colors ${
                      errors.targetUnit
                        ? 'border-rose-500/80 focus:border-rose-500'
                        : 'border-white/10 focus:border-indigo-500'
                    }`}
                  />
                  {errors.targetUnit && (
                    <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                      {errors.targetUnit}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-slate-400">Quick select:</span>
                    {['reps', 'km', 'seconds', 'meters', 'minutes'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => updateField('targetUnit', u)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-mono transition-colors cursor-pointer ${
                          formData.targetUnit === u
                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                            : 'bg-white/3 border-white/6 text-slate-400 hover:text-white'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Start Date and End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                    Competition Start Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                    className={`w-full rounded-xl bg-[#0B0E14] border px-4 py-2.5 text-xs text-white font-mono focus:outline-hidden transition-colors ${
                      errors.startDate
                        ? 'border-rose-500/80 focus:border-rose-500'
                        : 'border-white/10 focus:border-indigo-500'
                    }`}
                  />
                  {errors.startDate && (
                    <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                      {errors.startDate}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                    Competition End Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => updateField('endDate', e.target.value)}
                    className={`w-full rounded-xl bg-[#0B0E14] border px-4 py-2.5 text-xs text-white font-mono focus:outline-hidden transition-colors ${
                      errors.endDate
                        ? 'border-rose-500/80 focus:border-rose-500'
                        : 'border-white/10 focus:border-indigo-500'
                    }`}
                  />
                  {errors.endDate && (
                    <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                      {errors.endDate}
                    </span>
                  )}
                </div>
              </div>

              {/* Duration Preview and Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-2xl bg-white/2 border border-white/6 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Computed Duration</span>
                    <span className="text-lg font-black text-white font-mono">
                      {calculateDurationDays()} Days
                    </span>
                  </div>
                  <Calendar className="w-6 h-6 text-indigo-400" />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                    Difficulty Rating
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => updateField('difficulty', e.target.value as ChallengeDifficulty)}
                    className="w-full rounded-xl bg-[#0B0E14] border border-white/10 px-4 py-2.5 text-xs text-white font-medium focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Beginner">Beginner (Open to all fitness levels)</option>
                    <option value="Intermediate">Intermediate (Requires consistent conditioning)</option>
                    <option value="Advanced">Advanced (High-intensity endurance)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Verification Requirements & Rewards */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-white/6 pb-3">
                <h3 className="text-lg font-bold text-white">Step 3: Verification Layer & Reward Pool</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select the certification tier required for athletes to earn verified leaderboard status.
                </p>
              </div>

              {/* Verification Tiers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    tier: 'AI_VERIFIED' as const,
                    title: 'AI Verified (Computer Vision)',
                    desc: 'Automated computer-vision pose analysis certification tier (live with MediaPipe Pose Landmarker).',
                    icon: Sparkles,
                    color: 'border-emerald-500/40 text-emerald-400',
                  },
                  {
                    tier: 'DEVICE_VERIFIED' as const,
                    title: 'Device Verified (GPS & Wearables)',
                    desc: 'Telemetry verification from wearable sensors, cadence monitors, and GPS tracks.',
                    icon: Watch,
                    color: 'border-cyan-500/40 text-cyan-400',
                  },
                  {
                    tier: 'ORGANIZER_APPROVED' as const,
                    title: 'Organizer Approved (Review Queue)',
                    desc: 'Athletes submit workout evidence clips reviewed in your organizer submission studio.',
                    icon: ShieldCheck,
                    color: 'border-indigo-500/40 text-indigo-300',
                  },
                  {
                    tier: 'SELF_REPORTED' as const,
                    title: 'Self Reported',
                    desc: 'Honor-system athlete logs. Clearly flagged as uncertified on the national board.',
                    icon: UserCheck,
                    color: 'border-amber-500/40 text-amber-400',
                  },
                ].map((item) => {
                  const isSelected = formData.verificationRequirement === item.tier;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.tier}
                      onClick={() => updateField('verificationRequirement', item.tier)}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                        isSelected
                          ? `bg-white/5 ${item.color} shadow-lg ring-1 ring-white/20`
                          : 'bg-white/2 border-white/6 hover:bg-white/4'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="w-5 h-5" />
                        {isSelected && (
                          <span className="rounded-full bg-emerald-500 text-slate-950 px-2 py-0.5 text-[10px] font-bold">
                            Selected
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Points Reward */}
              <div className="rounded-2xl bg-white/2 border border-white/6 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider">
                      Completion Points Reward
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Awarded automatically to each participant upon reaching 100% completion.
                    </p>
                  </div>
                  <Award className="w-6 h-6 text-amber-400" />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="25"
                    step="25"
                    max="5000"
                    value={formData.pointsReward}
                    onChange={(e) => updateField('pointsReward', Number(e.target.value))}
                    className={`w-36 rounded-xl bg-[#0B0E14] border px-4 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-hidden ${
                      errors.pointsReward ? 'border-rose-500' : 'border-white/10 focus:border-indigo-500'
                    }`}
                  />
                  <span className="text-xs font-mono font-bold text-slate-300">FITTRACK Points</span>
                </div>
                {errors.pointsReward && (
                  <span className="text-[11px] text-rose-400 block font-medium">
                    {errors.pointsReward}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Preview & Publish */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-white/6 pb-3">
                <h3 className="text-lg font-bold text-white">Step 4: Final Confirmation Preview</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review the exact card and parameters that will appear in the nationwide challenges catalog.
                </p>
              </div>

              {/* Card Preview */}
              <div className="rounded-2xl bg-[#0B0E14] border border-white/10 overflow-hidden">
                {/* Banner Header */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-800">
                  <img
                    src={formData.bannerUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/50 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="rounded-md bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-white uppercase border border-white/10">
                      {formData.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <VerificationBadge status={formData.verificationRequirement} size="md" />
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h2 className="text-2xl font-black text-white">{formData.title || 'Untitled Challenge'}</h2>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {formData.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="rounded-xl bg-white/3 p-3">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Target Goal
                      </span>
                      <span className="text-sm font-bold text-white font-mono">
                        {formData.targetValue.toLocaleString()} {formData.targetUnit}
                      </span>
                    </div>
                    <div className="rounded-xl bg-white/3 p-3">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Duration
                      </span>
                      <span className="text-sm font-bold text-white font-mono">
                        {calculateDurationDays()} Days
                      </span>
                    </div>
                    <div className="rounded-xl bg-white/3 p-3">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Difficulty
                      </span>
                      <span className="text-sm font-bold text-emerald-400">{formData.difficulty}</span>
                    </div>
                    <div className="rounded-xl bg-white/3 p-3">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Reward
                      </span>
                      <span className="text-sm font-bold text-amber-400 font-mono">
                        +{formData.pointsReward} pts
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/6 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Timeline: <strong className="text-slate-200">{formData.startDate}</strong> to{' '}
                      <strong className="text-slate-200">{formData.endDate}</strong>
                    </span>
                    <span>
                      Visibility: <strong className="text-slate-200">{formData.visibility}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-6 border-t border-white/8 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shadow-md cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublishClick}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {publishing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                )}
                <span>{publishing ? 'Publishing Challenge...' : 'Publish to Nationwide Catalog'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
