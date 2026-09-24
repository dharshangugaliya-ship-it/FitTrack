import React from 'react';
import { useRouter } from '../routes/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useFittrackPoints } from '../hooks/useFittrackPoints';
import { useTheme } from '../context/ThemeContext';
import { MOCK_USER, MOCK_ORGANIZER_USER } from '../data/mockData';
import {
  Flame,
  Award,
  ArrowRightLeft,
  Briefcase,
  Trophy,
  Menu,
  X,
  LogIn,
  User,
  Palette,
} from 'lucide-react';

interface AppHeaderProps {
  onToggleMobileMenu?: () => void;
  mobileMenuOpen?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onToggleMobileMenu,
  mobileMenuOpen,
}) => {
  const { currentPath, mode, setMode, navigate, setAuthModalOpen } = useRouter();
  const { profile, isAuthenticated, isDemoMode, user } = useAuth();
  const { totalPoints } = useFittrackPoints();
  const { theme, currentTheme } = useTheme();

  const isOrganizer = mode === 'ORGANIZER';
  const defaultUser = isOrganizer ? MOCK_ORGANIZER_USER : MOCK_USER;
  const displayName = profile?.display_name || user?.email?.split('@')[0] || defaultUser.displayName;
  const avatarUrl = profile?.avatar_url || defaultUser.avatarUrl;

  const handleModeSwitch = () => {
    if (isOrganizer) {
      setMode('CHALLENGER');
    } else {
      setMode('ORGANIZER');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/8 bg-[#0B0E14]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => navigate(isOrganizer ? '/organizer' : '/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <span className="text-lg leading-none">⚡</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                FIT<span className="text-emerald-400">TRACK</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400 -mt-1">
                {isOrganizer ? 'Organizer Workspace' : 'SIH 2026 Challenge Platform'}
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            <button
              onClick={() => navigate('/challenges')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                currentPath === '/challenges' ? 'bg-white/10 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Discover Challenges
            </button>
            <button
              onClick={() => navigate('/leaderboard/ch-squat-10k')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                currentPath.startsWith('/leaderboard') ? 'bg-white/10 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Leaderboards
            </button>
            <button
              onClick={() => navigate('/how-it-works')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                currentPath === '/how-it-works' ? 'bg-white/10 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              How Verification Works
            </button>
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Challenger Stats Pill (Visible in Challenger mode) */}
          {!isOrganizer && (
            <div
              onClick={() => navigate('/points')}
              className="hidden sm:flex items-center gap-2 rounded-full bg-[#121722] border border-white/10 hover:border-emerald-500/30 px-3 py-1 text-xs cursor-pointer transition-colors"
              title="View FITTRACK Points Ledger"
            >
              <div className="flex items-center gap-1 text-amber-400 font-mono font-bold" title="Current Daily Streak">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                <span>{defaultUser.currentStreak}d</span>
              </div>
              <span className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold" title="Total FITTRACK Points">
                <Award className="w-3.5 h-3.5" />
                <span>{totalPoints.toLocaleString()} pts</span>
              </div>
            </div>
          )}

          {/* Theme Quick Indicator Pill */}
          <button
            onClick={() => navigate(isOrganizer ? '/organizer/profile' : '/profile')}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/8 transition-all hover:border-white/16 shadow-xs cursor-pointer"
            title={`Active Theme: ${currentTheme.name} (${currentTheme.tagline}). Click to customize visual identity.`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: currentTheme.accentColor }}
            />
            <span className="text-[11px] font-mono text-slate-300 hidden md:inline">
              {currentTheme.name}
            </span>
          </button>

          {/* Two-Way Mode Switcher Pill */}
          {isAuthenticated && (
            <button
              onClick={handleModeSwitch}
              className={`group relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 shadow-xs border ${
                isOrganizer
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
              title={isOrganizer ? 'Switch back to Challenger mode' : 'Open Organizer studio to create & manage challenges'}
            >
              {isOrganizer ? (
                <>
                  <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Switch to Challenger</span>
                </>
              ) : (
                <>
                  <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>For Organizers</span>
                </>
              )}
              <ArrowRightLeft className="w-3 h-3 opacity-60 group-hover:rotate-180 transition-transform duration-300" />
            </button>
          )}

          {/* User Account / Auth Trigger */}
          {isAuthenticated ? (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/8 p-1 sm:pr-3 transition-colors text-left"
              title="Manage Account, Roles or Sign Out"
            >
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-white/20"
              />
              <div className="hidden sm:block leading-none">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-white block truncate max-w-[110px]">
                    {displayName.split(' ')[0]}
                  </span>
                  {isDemoMode && (
                    <span className="rounded-sm bg-amber-500/20 text-amber-300 px-1 text-[8px] font-mono font-bold">
                      DEMO
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {isOrganizer ? 'Organizer' : 'Challenger'}
                </span>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 text-xs transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="hidden sm:flex items-center gap-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-3 py-1.5 text-xs transition-colors font-medium cursor-pointer"
              >
                <span>Demo Access</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/8 text-slate-300 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
