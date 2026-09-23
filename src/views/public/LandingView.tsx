import React from 'react';
import { useRouter } from '../../routes/RouterContext';
import { MOCK_CHALLENGES } from '../../data/mockData';
import { ChallengeCard } from '../../components/ChallengeCard';
import { VerificationBadge } from '../../components/VerificationBadge';
import {
  Compass,
  Sparkles,
  Watch,
  ShieldCheck,
  UserCheck,
  Trophy,
  ArrowRight,
  Flame,
  CheckCircle2,
  Users,
  Award,
} from 'lucide-react';

export const LandingView: React.FC = () => {
  const { navigate, setMode } = useRouter();

  const featuredChallenges = MOCK_CHALLENGES.slice(0, 3);

  const verificationTiers = [
    {
      title: 'AI Verified',
      status: 'AI_VERIFIED' as const,
      description: 'Browser-side computer vision (MediaPipe Pose Landmarker) verifies repetition depth, posture, and exercise integrity in real-time.',
      badge: 'Gold Standard',
      points: '+20 pts',
    },
    {
      title: 'Device Verified',
      status: 'DEVICE_VERIFIED' as const,
      description: 'Activity data certified through connected wearables, smartwatches, or GPS telemetry for running, cycling, and walking.',
      badge: 'Telemetry Sync',
      points: '+20 pts',
    },
    {
      title: 'Organizer Approved',
      status: 'ORGANIZER_APPROVED' as const,
      description: 'Event or community challenge submissions manually certified by official challenge coordinators and organizers.',
      badge: 'Verified Review',
      points: '+20 pts',
    },
    {
      title: 'Self Reported',
      status: 'SELF_REPORTED' as const,
      description: 'Manually logged workouts. Explicitly marked as "Self-reported — not AI verified" to maintain public leaderboard integrity.',
      badge: 'Base Trust',
      points: '+5 pts',
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#121722] via-[#0B0E14] to-[#0B0E14] border border-white/8 p-8 sm:p-12 lg:p-16 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-semibold text-emerald-400">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SIH 2026 Nationwide Fitness Architecture</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Fitness Challenges with a{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Verification Layer
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            FITTRACK is an open nationwide challenge participation platform. Discover physical challenges, participate with computer vision verification, and compete on authentic leaderboards.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => navigate('/challenges')}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/25"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Challenges</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setMode('ORGANIZER');
                navigate('/organizer');
              }}
              className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/12 px-6 py-3.5 text-sm font-bold text-white transition-all active:scale-95"
            >
              <span>For Organizers</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Platform Metrics Micro-bar */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/8 text-center">
            <div>
              <p className="text-2xl font-black text-white font-mono">38,400+</p>
              <p className="text-xs text-slate-400">Nationwide Challengers</p>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-400 font-mono">21,900+</p>
              <p className="text-xs text-slate-400">Verified Sessions</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white font-mono">4-Tier</p>
              <p className="text-xs text-slate-400">Verification Engine</p>
            </div>
            <div>
              <p className="text-2xl font-black text-cyan-400 font-mono">100%</p>
              <p className="text-xs text-slate-400">Open Participation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Product Loop */}
      <section className="space-y-6 text-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">The Experience</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">The Trust-Driven Challenge Loop</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          {[
            { step: '01', label: 'Discover', desc: 'Find open challenges' },
            { step: '02', label: 'Join', desc: 'Enroll with clear rules' },
            { step: '03', label: 'Participate', desc: 'Work out anywhere' },
            { step: '04', label: 'Verify', desc: 'AI, Device or Review' },
            { step: '05', label: 'Score', desc: 'Earn points & metrics' },
            { step: '06', label: 'Compete', desc: 'Fair, trusted rankings' },
            { step: '07', label: 'Progress', desc: 'Streaks & milestones' },
          ].map((item, idx) => (
            <div
              key={item.step}
              className="flex flex-col items-center rounded-2xl bg-[#121722] border border-white/8 p-4 relative"
            >
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md mb-2">
                {item.step}
              </span>
              <h3 className="text-sm font-bold text-white">{item.label}</h3>
              <p className="text-[11px] text-slate-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4 Verification Tiers Breakdown */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Integrity Architecture</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">Multi-Tier Verification Model</h2>
          </div>
          <button
            onClick={() => navigate('/how-it-works')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Learn How Verification Works</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {verificationTiers.map((tier) => (
            <div
              key={tier.title}
              className="flex flex-col justify-between rounded-2xl bg-[#121722] border border-white/8 p-6 transition-all hover:border-white/16"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <VerificationBadge status={tier.status} size="sm" />
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    {tier.points}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{tier.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{tier.description}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-white/6 flex items-center justify-between text-[11px] text-slate-400">
                <span>Trust Tier:</span>
                <span className="font-semibold text-slate-200">{tier.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Challenges */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Active Competitions</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">Featured Nationwide Challenges</h2>
          </div>
          <button
            onClick={() => navigate('/challenges')}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            <span>View All ({MOCK_CHALLENGES.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredChallenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      </section>

      {/* Dual Role Callout */}
      <section className="rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#121722] to-indigo-950/40 border border-white/10 p-8 sm:p-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center lg:text-left">
            <span className="rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 text-xs font-semibold">
              Two Roles • One Account
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white">
              Ready to create your own challenge?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Organizers can define custom exercises, select verification requirements (AI, Device, or Review), and launch open or community fitness challenges in minutes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setMode('ORGANIZER');
                navigate('/organizer/create');
              }}
              className="rounded-xl bg-indigo-600 px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30"
            >
              Open Challenge Creator
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-3 text-xs sm:text-sm font-semibold text-slate-200 transition-colors"
            >
              Challenger Dashboard
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
