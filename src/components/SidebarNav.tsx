import React from 'react';
import { useRouter } from '../routes/RouterContext';
import {
  LayoutDashboard,
  Compass,
  Trophy,
  CheckSquare,
  HelpCircle,
  User,
  PlusCircle,
  Briefcase,
  FileCheck2,
  BarChart3,
  Sliders,
  Sparkles,
  ArrowRightLeft,
  Flame,
  Plus,
  Coins,
} from 'lucide-react';

interface SidebarNavProps {
  onCloseMobile?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ onCloseMobile }) => {
  const { currentPath, mode, setMode, navigate, setWorkoutModalOpen } = useRouter();

  const isOrganizer = mode === 'ORGANIZER';

  const handleNav = (path: string) => {
    navigate(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  interface NavItem {
    label: string;
    path: string;
    icon: any;
    badge?: string;
  }

  const challengerLinks: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Discover Challenges',
      path: '/challenges',
      icon: Compass,
    },
    {
      label: 'My Challenges',
      path: '/my-challenges',
      icon: CheckSquare,
    },
    {
      label: 'FITTRACK Points',
      path: '/points',
      icon: Coins,
    },
    {
      label: 'Leaderboards',
      path: '/leaderboard/ch-squat-10k',
      icon: Trophy,
    },
    {
      label: 'How Verification Works',
      path: '/how-it-works',
      icon: HelpCircle,
    },
    {
      label: 'Athlete Profile',
      path: '/profile',
      icon: User,
    },
  ];

  const organizerLinks: NavItem[] = [
    {
      label: 'Organizer Overview',
      path: '/organizer',
      icon: LayoutDashboard,
    },
    {
      label: 'Create Challenge',
      path: '/organizer/create',
      icon: PlusCircle,
    },
    {
      label: 'Manage Challenges',
      path: '/organizer/challenges',
      icon: Sliders,
    },
    {
      label: 'Review Submissions',
      path: '/organizer/submissions',
      icon: FileCheck2,
      badge: '37',
    },
    {
      label: 'Cohort Analytics',
      path: '/organizer/analytics/ch-squat-10k',
      icon: BarChart3,
    },
    {
      label: 'Organizer Profile',
      path: '/organizer/profile',
      icon: User,
    },
  ];

  const currentLinks = isOrganizer ? organizerLinks : challengerLinks;

  return (
    <aside className="flex flex-col justify-between h-full bg-[#0B0E14] border-r border-white/8 w-64 p-4 select-none">
      <div className="space-y-6">
        {/* Active Mode Banner */}
        <div className="rounded-xl bg-[#121722] border border-white/8 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Workspace</span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isOrganizer ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {mode}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1.5 font-medium">
            {isOrganizer ? 'Manage, verify & publish open challenges.' : 'Participate, verify reps & compete.'}
          </p>
        </div>

        {/* Primary Navigation Rail */}
        <nav className="space-y-1">
          {currentLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.path ||
              (item.path !== '/' && currentPath.startsWith(item.path) && item.path.length > 2);

            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold shadow-xs'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Quick Action & Mode Switch */}
      <div className="space-y-3 pt-4 border-t border-white/8">
        {/* Contextual Action Button */}
        {isOrganizer ? (
          <button
            onClick={() => handleNav('/organizer/create')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all active:scale-95 shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Challenge</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setWorkoutModalOpen(true);
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all active:scale-95 shadow-md shadow-emerald-500/20"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Log Activity (+5 pts)</span>
          </button>
        )}

        {/* Mode Toggle Switcher Card */}
        <div className="rounded-xl bg-[#121722] border border-white/6 p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400 font-medium">Switch Product Role</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <button
            onClick={() => {
              setMode(isOrganizer ? 'CHALLENGER' : 'ORGANIZER');
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors"
          >
            {isOrganizer ? (
              <>
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Switch to Challenger</span>
              </>
            ) : (
              <>
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                <span>For Organizers</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
