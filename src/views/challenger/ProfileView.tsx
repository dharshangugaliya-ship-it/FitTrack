import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { useFittrackPoints } from '../../hooks/useFittrackPoints';
import { useDashboardData } from '../../hooks/useDashboardData';
import { profileService } from '../../services/profileService';
import { MOCK_USER } from '../../data/mockData';
import { StatsCard } from '../../components/StatsCard';
import {
  Flame,
  Award,
  Trophy,
  CheckCircle2,
  Calendar,
  Sparkles,
  Watch,
  UserCheck,
  ShieldCheck,
  Briefcase,
  LogOut,
  Edit2,
  Check,
  Database,
  Mail,
  Fingerprint,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { setMode, navigate } = useRouter();
  const {
    user,
    profile,
    isDemoMode,
    isSupabaseConfigured,
    signOut,
    refreshProfile,
  } = useAuth();

  const { totalPoints, events } = useFittrackPoints();
  const { enrolledChallenges } = useDashboardData();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profile?.display_name || MOCK_USER.displayName);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const displayName = profile?.display_name || MOCK_USER.displayName;
  const avatarUrl = profile?.avatar_url || MOCK_USER.avatarUrl;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : MOCK_USER.joinedDate;

  // Real-time calculated verified workouts and enrolled metrics
  const verifiedWorkoutsCount = events.filter(
    (e) => e.eventType === 'AI_VERIFIED' || e.eventType === 'ORGANIZER_APPROVED'
  ).length;
  const displayPoints = totalPoints > 0 ? totalPoints : MOCK_USER.totalPoints;
  const displayVerifiedWorkouts = verifiedWorkoutsCount > 0 ? verifiedWorkoutsCount : (MOCK_USER.verifiedWorkoutsCount ?? 14);
  const displayEnrolledCount = enrolledChallenges.length > 0 ? enrolledChallenges.length : (MOCK_USER.challengesEnrolledCount ?? 4);

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === displayName) {
      setIsEditingName(false);
      return;
    }

    setSaveStatus('saving');
    if (user?.id && isSupabaseConfigured) {
      await profileService.updateProfile(user.id, { display_name: editedName.trim() });
      await refreshProfile();
    }
    setSaveStatus('saved');
    setTimeout(() => {
      setIsEditingName(false);
      setSaveStatus('idle');
    }, 400);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const badges = [
    { title: '7-Day Streak Master', desc: 'Maintained 7 consecutive active days', date: 'Earned yesterday', icon: '🔥' },
    { title: 'AI Squat Centurion', desc: '100+ AI pose-verified squats in a single session', date: 'Earned 3d ago', icon: '⚡' },
    { title: 'Early Adopter', desc: 'Registered for SIH 2026 Nationwide challenge series', date: 'Earned Sept 2026', icon: '🎖️' },
    { title: 'Integrity Champion', desc: '90%+ workout verification score over 30 days', date: 'Earned 1w ago', icon: '🛡️' },
  ];

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto text-left">
      {/* Profile Card Header */}
      <div className="relative overflow-hidden rounded-3xl bg-[#121722] border border-white/8 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-24 h-24 rounded-2xl object-cover ring-4 ring-emerald-500/30 shadow-xl shrink-0"
          />

          <div className="space-y-2 flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="rounded-lg bg-black/50 border border-emerald-500/50 px-2.5 py-1 text-lg font-bold text-white focus:outline-hidden"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={saveStatus === 'saving'}
                        className="rounded-lg bg-emerald-500 text-slate-950 px-2.5 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl sm:text-3xl font-black text-white">{displayName}</h1>
                      <button
                        onClick={() => {
                          setEditedName(displayName);
                          setIsEditingName(true);
                        }}
                        className="text-slate-400 hover:text-white p-1"
                        title="Edit display name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                    Level 4 Athlete
                  </span>

                  {isDemoMode ? (
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                      DEMO MODE
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                      SUPABASE VERIFIED
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-0.5">
                  Member since {memberSince} • Bengaluru, India • FITTRACK Verified Challenger
                </p>
              </div>

              <div className="flex items-center gap-2 self-center sm:self-auto">
                <button
                  onClick={() => {
                    setMode('ORGANIZER');
                    navigate('/organizer');
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Organizer Workspace</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Competitive fitness enthusiast training for the SIH 2026 National Calisthenics & Endurance Open. Focused on verified bodyweight strength and continuous daily streaks.
            </p>
          </div>
        </div>

        {/* Supabase Identity & Auth Record Bar */}
        <div className="mt-6 pt-5 border-t border-white/8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Mail className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Account Email</span>
              <span className="text-slate-200 font-mono text-[11px] truncate">
                {user?.email || 'demo.athlete@fittrack.gov.in'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <Fingerprint className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Identity UUID</span>
              <span className="text-slate-200 font-mono text-[11px] truncate">
                {user?.id || profile?.id || 'usr_fittrack_demo_001'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <Database className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Backend Authority</span>
              <span className="text-[11px] font-semibold text-emerald-400">
                {isSupabaseConfigured ? 'Supabase Auth & RLS Active' : 'SIH Evaluation Mode'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/points')}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Click to view FITTRACK Points Ledger"
        >
          <StatsCard
            title="FITTRACK Points"
            value={displayPoints.toLocaleString()}
            subtitle="Top 3% Nationwide • View Ledger"
            icon={Award}
            iconColor="text-emerald-400"
            badgeText="Live Synced"
          />
        </div>
        <StatsCard
          title="Active Streak"
          value={`${MOCK_USER.currentStreak} Days`}
          subtitle="Longest: 14 Days"
          icon={Flame}
          iconColor="text-amber-400"
          badgeText="Streak"
          badgeType="accent"
        />
        <StatsCard
          title="Verified Workouts"
          value={displayVerifiedWorkouts}
          subtitle="Computer Vision & GPS"
          icon={CheckCircle2}
          iconColor="text-cyan-400"
        />
        <StatsCard
          title="Enrolled Challenges"
          value={displayEnrolledCount}
          subtitle="Active & In-progress"
          icon={Trophy}
          iconColor="text-indigo-400"
        />
      </div>

      {/* Verification Breakdown */}
      <div className="rounded-3xl bg-[#121722] border border-white/8 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Trust & Verification Distribution</h3>
            <p className="text-xs text-slate-400">Auditable breakdown of completed workouts</p>
          </div>
          <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
            93% Verified Rate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/3 p-4 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-400">AI Pose Verified</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">22 Sessions</div>
            <p className="text-[11px] text-slate-400 mt-1">Computer vision certified</p>
          </div>

          <div className="rounded-2xl bg-white/3 p-4 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-cyan-400">Device & Telemetry</span>
              <Watch className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">6 Sessions</div>
            <p className="text-[11px] text-slate-400 mt-1">Wearable GPS sync</p>
          </div>

          <div className="rounded-2xl bg-white/3 p-4 border border-amber-500/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-400">Self Reported</span>
              <UserCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">2 Sessions</div>
            <p className="text-[11px] text-slate-400 mt-1">Offline manual logs</p>
          </div>
        </div>
      </div>

      {/* Earned Badges Showcase */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Earned Athletic Badges
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {badges.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl bg-[#121722] border border-white/8 p-5 text-center space-y-2 hover:border-white/16 transition-colors"
            >
              <div className="text-3xl mx-auto">{b.icon}</div>
              <h4 className="text-sm font-bold text-white">{b.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{b.desc}</p>
              <span className="text-[10px] font-mono text-emerald-400 block pt-1">{b.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
