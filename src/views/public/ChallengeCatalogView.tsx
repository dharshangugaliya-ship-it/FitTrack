import React, { useState } from 'react';
import { useChallenges } from '../../hooks/useChallenges';
import { ChallengeCard } from '../../components/ChallengeCard';
import {
  Search,
  Filter,
  Compass,
  Sparkles,
  Watch,
  ShieldCheck,
  UserCheck,
  X,
  Database,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const ChallengeCatalogView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { challenges, loading, error, dataSource, refetch } = useChallenges({
    searchQuery,
    verification: selectedVerification,
    category: selectedCategory,
  });

  const verificationFilters = [
    { label: 'All Tiers', value: 'ALL' },
    { label: 'AI Verified', value: 'AI_VERIFIED', icon: Sparkles },
    { label: 'Device Verified', value: 'DEVICE_VERIFIED', icon: Watch },
    { label: 'Organizer Approved', value: 'ORGANIZER_APPROVED', icon: ShieldCheck },
    { label: 'Self Reported', value: 'SELF_REPORTED', icon: UserCheck },
  ];

  const categoryFilters = [
    { label: 'All Categories', value: 'ALL' },
    { label: 'Goal-Based', value: 'GOAL_BASED' },
    { label: 'Consistency Streak', value: 'CONSISTENCY' },
    { label: 'Activity', value: 'ACTIVITY' },
    { label: 'Event / League', value: 'EVENT' },
    { label: 'Competition', value: 'COMPETITION' },
  ];

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedVerification('ALL');
    setSelectedCategory('ALL');
  };

  const hasActiveFilters = searchQuery !== '' || selectedVerification !== 'ALL' || selectedCategory !== 'ALL';

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Nationwide Discovery</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Discover Open Challenges
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Enroll in open challenges across India. Choose from AI pose-verified milestones, wearable sync streaks, or organizer-certified leagues.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {dataSource === 'supabase' ? (
            <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-mono font-bold text-emerald-400">
              <Database className="w-3.5 h-3.5" />
              <span>SUPABASE LIVE</span>
            </span>
          ) : (
            <span className="rounded-lg bg-[#121722] border border-white/10 px-3 py-1.5 text-xs font-mono font-bold text-slate-300">
              SIH EVALUATION DATASET
            </span>
          )}

          <span className="rounded-lg bg-[#121722] border border-white/10 px-3 py-1.5 text-xs font-mono font-bold text-white">
            {challenges.length} Available
          </span>

          <button
            onClick={() => refetch()}
            className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh challenge catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="space-y-4">
        {/* Search & Verification Row */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges by activity, title, or organizer..."
              className="w-full rounded-xl bg-[#121722] border border-white/10 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-hidden focus:border-emerald-500 placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Verification Tier Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {verificationFilters.map((vf) => {
              const isSelected = selectedVerification === vf.value;
              const Icon = vf.icon;
              return (
                <button
                  key={vf.value}
                  onClick={() => setSelectedVerification(vf.value)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs'
                      : 'bg-[#121722] text-slate-400 border-white/8 hover:text-white hover:border-white/16'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{vf.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Chips */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Category:</span>
            {categoryFilters.map((cf) => (
              <button
                key={cf.value}
                onClick={() => setSelectedCategory(cf.value)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cf.value
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {cf.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Notice if any */}
      {error && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-3 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Notice: {error} (displaying backup evaluation catalog)</span>
        </div>
      )}

      {/* Challenges Grid / Loading / Empty States */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-xs font-mono text-slate-400 tracking-wide">Loading challenges from FITTRACK catalog...</p>
        </div>
      ) : challenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 text-center rounded-3xl bg-[#121722] border border-white/8">
          <Filter className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-white">No challenges match your filters</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Try adjusting your search terms or clearing the verification filter criteria.
          </p>
          <button
            onClick={clearFilters}
            className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};
