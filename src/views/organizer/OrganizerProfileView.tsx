/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { MOCK_ORGANIZER_USER } from '../../data/mockData';
import { ThemeSelector } from '../../components/ThemeSelector';
import { StatsCard } from '../../components/StatsCard';
import {
  Briefcase,
  Award,
  Users,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Building2,
  Mail,
  Fingerprint,
  Edit2,
  Check,
  Trophy,
  ArrowRightLeft,
  Database,
  BarChart3,
  Sliders,
} from 'lucide-react';

export const OrganizerProfileView: React.FC = () => {
  const { setMode, navigate } = useRouter();
  const { user, profile, isDemoMode, isSupabaseConfigured, signOut } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(
    profile?.display_name || MOCK_ORGANIZER_USER.displayName
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const displayName = profile?.display_name || MOCK_ORGANIZER_USER.displayName;
  const avatarUrl = profile?.avatar_url || MOCK_ORGANIZER_USER.avatarUrl;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : MOCK_ORGANIZER_USER.joinedDate;

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === displayName) {
      setIsEditingName(false);
      return;
    }
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setIsEditingName(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 400);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Organizer Profile Banner Card */}
      <div className="rounded-3xl bg-[#121722] border border-white/8 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-xl"
              />
              <div className="absolute -bottom-1 -right-1 p-1 bg-indigo-500 text-white rounded-full shadow-md" title="Official Organizer">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="bg-white/5 border border-white/20 rounded-lg px-2.5 py-1 text-base font-bold text-white focus:outline-hidden focus:border-indigo-400"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={saveStatus === 'saving'}
                      className="p-1 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 text-xs font-bold"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl sm:text-2xl font-black text-white">{displayName}</h2>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Edit organization profile name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified SIH Challenge Director
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Member since {memberSince}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setMode('CHALLENGER');
                navigate('/profile');
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-xs font-semibold text-slate-300 transition-colors"
              title="View your Athlete profile"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Athlete Profile</span>
            </button>

            <button
              onClick={() => navigate('/organizer/create')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Challenge</span>
            </button>
          </div>
        </div>

        {/* Organizer Identity Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Affiliation: <strong className="text-slate-200">National Fitness Council</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">
              Contact: <strong className="text-slate-200">{user?.email || 'organizer@sih.gov.in'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Engine: <strong className="text-slate-200">{isSupabaseConfigured ? 'Supabase RLS Active' : 'SIH Evaluation Mode'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Organizer Impact Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Challenges"
          value="6"
          subtitle="4 Published • 2 Review"
          icon={Trophy}
          iconColor="text-indigo-400"
          badgeText="Director"
        />
        <StatsCard
          title="Total Athletes"
          value="14,820"
          subtitle="Across 6 challenges"
          icon={Users}
          iconColor="text-cyan-400"
          badgeText="Active"
        />
        <StatsCard
          title="AI Verification Rate"
          value="94.2%"
          subtitle="Computer Vision pass rate"
          icon={Sparkles}
          iconColor="text-emerald-400"
        />
        <StatsCard
          title="Pending Submissions"
          value="37"
          subtitle="Requires video audit"
          icon={CheckCircle2}
          iconColor="text-amber-400"
          badgeText="Queue"
          badgeType="accent"
        />
      </div>

      {/* Theme Personalization Section for Organizers */}
      <ThemeSelector contextName="Organizer" />

      {/* Organizer Studio Configuration */}
      <div className="rounded-3xl bg-[#121722] border border-white/8 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Challenge Studio Preferences
            </h3>
            <p className="text-xs text-slate-400">
              Configure default verification thresholds and automated milestone alerts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/3 border border-white/6 space-y-2">
            <span className="text-xs font-bold text-white block">Automated AI Rep Validation</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Require strict hip-knee collinearity for bodyweight workouts before awarding +20 pts.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                ENFORCED (≥ 80% CONFIDENCE)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/3 border border-white/6 space-y-2">
            <span className="text-xs font-bold text-white block">Audit Queue Fast-Track</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Submissions with sensor telemetry under 200ms latency skip manual review.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-mono font-bold">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
