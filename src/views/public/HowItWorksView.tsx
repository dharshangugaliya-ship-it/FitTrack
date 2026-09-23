import React from 'react';
import { useRouter } from '../../routes/RouterContext';
import { VerificationBadge } from '../../components/VerificationBadge';
import { POINTS_RULES } from '../../data/mockData';
import {
  Sparkles,
  Watch,
  ShieldCheck,
  UserCheck,
  Award,
  Trophy,
  ArrowRightLeft,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

export const HowItWorksView: React.FC = () => {
  const { navigate, setMode } = useRouter();

  return (
    <div className="space-y-12 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3 border-b border-white/8 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold text-emerald-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Platform Verification Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          How Verification Works on FITTRACK
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          FITTRACK bridges personal fitness and authentic competition by introducing an auditable verification layer. Learn how activities are certified and how points are awarded.
        </p>
      </div>

      {/* The 4 Verification Levels Deep-Dive */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">The Four Verification Tiers</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Level 1: AI Verified */}
          <div className="rounded-2xl bg-[#121722] border border-emerald-500/30 p-6 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <VerificationBadge status="AI_VERIFIED" size="md" />
              <span className="text-xs font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Highest Trust
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Computer Vision Verification</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              For camera-supported exercises like <strong>Squats</strong> and <strong>Planks</strong>, FITTRACK uses browser-side pose estimation (MediaPipe Tasks-Vision). The model calculates real-time joint angles, depth planes, and duration without transmitting video feeds to external servers.
            </p>
            <div className="pt-2 text-[11px] text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Yields +20 FITTRACK Points per verified session</span>
            </div>
          </div>

          {/* Level 2: Device Verified */}
          <div className="rounded-2xl bg-[#121722] border border-cyan-500/30 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <VerificationBadge status="DEVICE_VERIFIED" size="md" />
              <span className="text-xs font-bold text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded-md">
                Telemetry Sync
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Device & GPS Telemetry</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Used for endurance activities such as <strong>Running</strong>, <strong>Cycling</strong>, and <strong>Walking</strong>. Telemetry files (GPX/activity logs) and wearable integrations certify pace, distance, and elapsed time against challenge rules.
            </p>
            <div className="pt-2 text-[11px] text-cyan-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Yields +20 FITTRACK Points per verified session</span>
            </div>
          </div>

          {/* Level 3: Organizer Approved */}
          <div className="rounded-2xl bg-[#121722] border border-indigo-500/30 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <VerificationBadge status="ORGANIZER_APPROVED" size="md" />
              <span className="text-xs font-bold text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded-md">
                Human Review
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Organizer Review Queue</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              In event, institutional, or custom community challenges, participants submit evidence (video clips or route logs). Official challenge coordinators inspect the submission in their Organizer Studio before approving.
            </p>
            <div className="pt-2 text-[11px] text-indigo-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Yields +20 FITTRACK Points upon organizer approval</span>
            </div>
          </div>

          {/* Level 4: Self Reported */}
          <div className="rounded-2xl bg-[#121722] border border-amber-500/30 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <VerificationBadge status="SELF_REPORTED" size="md" />
              <span className="text-xs font-bold text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-md">
                Base Trust
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Self-Reported Activity</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Participants can log general workouts without automated tracking. To protect competitive fairness, these entries are explicitly labeled on all public surfaces as <em>"Self-reported — not AI verified"</em>.
            </p>
            <div className="pt-2 text-[11px] text-amber-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Yields +5 FITTRACK Points per recorded session</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Scoring Model */}
      <section className="rounded-3xl bg-[#121722] border border-white/8 p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Scoring Engine</span>
          <h2 className="text-2xl font-bold text-white mt-1">Challenge Score vs FITTRACK Points</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            To prevent comparing "apples to oranges", FITTRACK strictly separates challenge competition metrics from overall platform reward points.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/4 p-5 border border-white/6 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Challenge Score (Domain-Specific)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Measured in the challenge's exact unit. A squat challenge is scored in <strong>verified reps</strong>. A running challenge is scored in <strong>verified kilometers</strong>. Only identical metrics compete on a given challenge leaderboard.
            </p>
          </div>

          <div className="rounded-2xl bg-white/4 p-5 border border-white/6 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Award className="w-5 h-5 text-emerald-400" />
              <span>FITTRACK Points (Universal Reward)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Platform-wide reward currency awarded for participation, daily consistency streaks, challenge completions, and certified verifications. Points are awarded per verified session, not per single rep.
            </p>
          </div>
        </div>

        {/* Points Baseline Table */}
        <div className="overflow-hidden rounded-xl border border-white/8 bg-black/40">
          <div className="px-4 py-3 border-b border-white/8 bg-white/3 flex items-center justify-between text-xs font-bold text-white">
            <span>FITTRACK Points Award Baseline</span>
            <span className="text-emerald-400 font-mono">Proposed SIH Rules</span>
          </div>
          <div className="divide-y divide-white/6 text-xs">
            {POINTS_RULES.map((rule) => (
              <div key={rule.action} className="flex items-center justify-between px-4 py-3 hover:bg-white/2">
                <div>
                  <span className="font-bold text-white block">{rule.action}</span>
                  <span className="text-slate-400 text-[11px]">{rule.description}</span>
                </div>
                <div className="flex items-center gap-2 font-mono font-bold text-emerald-400 text-sm">
                  <span>+{rule.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-Way Role Switching Card */}
      <section className="rounded-3xl bg-gradient-to-r from-emerald-950/30 via-[#121722] to-indigo-950/30 border border-white/10 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">One Account, Two Operating Modes</h3>
            <p className="text-xs text-slate-400">
              Challenger and Organizer workflows exist under a unified user profile.
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          You don't need separate logins to create and participate in challenges. Challengers can click <strong>"For Organizers"</strong> in the top header at any time to open the Organizer Studio, configure rule-sets, and monitor participant cohorts. Switching back to <strong>"Challenger"</strong> mode is instantaneous.
        </p>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={() => {
              setMode('ORGANIZER');
              navigate('/organizer');
            }}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shadow-md"
          >
            Launch Organizer Mode
          </button>
          <button
            onClick={() => {
              setMode('CHALLENGER');
              navigate('/dashboard');
            }}
            className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 text-xs font-semibold text-slate-200 transition-colors"
          >
            Launch Challenger Mode
          </button>
        </div>
      </section>
    </div>
  );
};
