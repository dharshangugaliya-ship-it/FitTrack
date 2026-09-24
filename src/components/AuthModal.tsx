import React, { useState } from 'react';
import { useRouter } from '../routes/RouterContext';
import { useAuth } from '../context/AuthContext';
import { streakService } from '../services/streakService';
import { MOCK_USER, MOCK_ORGANIZER_USER } from '../data/mockData';
import {
  X,
  Trophy,
  Briefcase,
  Check,
  ShieldCheck,
  LogOut,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Database,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { mode, setMode, navigate } = useRouter();
  const {
    user,
    profile,
    isAuthenticated,
    isDemoMode,
    isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    setDemoPersona,
    updateProfileMode,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'auth' | 'demo'>(
    isAuthenticated ? 'demo' : 'auth'
  );
  const [authSubMode, setAuthSubMode] = useState<'login' | 'signup'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (authSubMode === 'signup' && !displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    setLoading(true);
    try {
      if (authSubMode === 'signup') {
        const res = await signUp(email.trim(), password, displayName.trim());
        if (res.error) {
          setError(res.error);
        } else if (res.requiresEmailConfirmation) {
          setSuccessMessage('Account created! Please check your email to confirm before logging in.');
        } else {
          setSuccessMessage('Account created! Welcome to FITTRACK.');
          setTimeout(() => {
            onClose();
            navigate('/dashboard');
          }, 800);
        }
      } else {
        const res = await signIn(email.trim(), password);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage('Signed in successfully.');
          setTimeout(() => {
            onClose();
            navigate('/dashboard');
          }, 600);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoPersona = (targetMode: 'CHALLENGER' | 'ORGANIZER') => {
    setDemoPersona(targetMode);
    setMode(targetMode);
    onClose();
  };

  const handleModeSwitch = async (newMode: 'CHALLENGER' | 'ORGANIZER') => {
    setMode(newMode);
    await updateProfileMode(newMode);
    if (newMode === 'ORGANIZER') {
      navigate('/organizer');
    } else {
      navigate('/dashboard');
    }
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-[#121722] border border-white/12 shadow-2xl p-6 sm:p-7 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-xl font-bold text-white">
            {isAuthenticated ? 'FITTRACK Identity & Roles' : 'Sign In or Join FITTRACK'}
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          {isAuthenticated
            ? 'Manage your authenticated session, role workspaces, and profile settings.'
            : 'Authenticate via Supabase or use the SIH evaluation demo helper.'}
        </p>

        {/* Backend Authority Indicator */}
        <div className="flex items-center justify-between rounded-xl bg-white/3 border border-white/8 px-3 py-2 text-[11px] mb-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Database className="w-3.5 h-3.5" />
            <span>Auth Authority:</span>
          </div>
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Supabase Auth (Live)
            </span>
          ) : (
            <span className="flex items-center gap-1 font-semibold text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Demo / Unconfigured
            </span>
          )}
        </div>

        {/* If Authenticated: Show Session Card & Mode Switcher */}
        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/3 border border-white/8 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={profile?.avatar_url || MOCK_USER.avatarUrl}
                    alt={profile?.display_name || 'User'}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-500/30"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">
                        {profile?.display_name || user?.email?.split('@')[0] || 'Authenticated User'}
                      </h4>
                      {isDemoMode ? (
                        <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                          DEMO MODE
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                          VERIFIED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-[200px]">
                      {user?.email || 'Demo Athlete Persona'}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white uppercase font-mono">
                  {mode}
                </span>
              </div>

              {/* Quick Workspace Switch Actions */}
              <div className="space-y-2 pt-2 border-t border-white/6">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Switch Active Workspace
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('CHALLENGER')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold transition-all ${
                      mode === 'CHALLENGER'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-white/4 text-slate-300 hover:bg-white/8 hover:text-white border border-white/6'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Challenger</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('ORGANIZER')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold transition-all ${
                      mode === 'ORGANIZER'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white/4 text-slate-300 hover:bg-white/8 hover:text-white border border-white/6'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Organizer</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold py-2.5 text-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of FITTRACK</span>
            </button>
          </div>
        ) : (
          /* Unauthenticated Mode: Tabs for Live Auth vs Demo Helper */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/40 p-1 border border-white/8">
              <button
                type="button"
                onClick={() => setActiveTab('auth')}
                className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'auth'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Supabase Auth
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('demo')}
                className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'demo'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SIH Demo Helper
              </button>
            </div>

            {activeTab === 'auth' ? (
              <div className="space-y-3">
                {/* Login vs Signup Sub-switch */}
                <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setAuthSubMode('login')}
                    className={`font-semibold pb-1 border-b-2 transition-colors ${
                      authSubMode === 'login'
                        ? 'text-white border-emerald-400'
                        : 'border-transparent hover:text-slate-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setAuthSubMode('signup')}
                    className={`font-semibold pb-1 border-b-2 transition-colors ${
                      authSubMode === 'signup'
                        ? 'text-white border-emerald-400'
                        : 'border-transparent hover:text-slate-200'
                    }`}
                  >
                    New Account
                  </button>
                </div>

                {!isSupabaseConfigured && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-amber-200">
                        <strong className="text-amber-300 block">Supabase Keys Not Configured</strong>
                        <span>
                          To authenticate against your own database, add <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_URL</code> and <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_ANON_KEY</code> to your environment settings.
                        </span>
                      </div>
                    </div>
                    <div className="pt-1 flex items-center justify-between border-t border-amber-500/20">
                      <span className="text-[11px] text-slate-300">Evaluating or testing for SIH?</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('demo')}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Use 1-Click Demo Personas →
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                    <div className="flex-1">
                      <span>{error}</span>
                      {!isSupabaseConfigured && (
                        <div className="mt-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveTab('demo')}
                            className="text-amber-300 hover:text-amber-200 underline font-semibold text-[11px] block cursor-pointer"
                          >
                            Switch to SIH Demo Helper to test immediately without Supabase credentials →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  {authSubMode === 'signup' && (
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Display Name"
                        className="w-full rounded-xl bg-[#0B0E14] border border-white/10 pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full rounded-xl bg-[#0B0E14] border border-white/10 pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full rounded-xl bg-[#0B0E14] border border-white/10 pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span>Validating...</span>
                    ) : (
                      <>
                        <span>{authSubMode === 'login' ? 'Sign In' : 'Register Account'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Demo Persona Helper Tab */
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Select a preconfigured evaluation persona to test Challenger or Organizer workflows without registering:
                </p>

                <div
                  onClick={() => handleSelectDemoPersona('CHALLENGER')}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={MOCK_USER.avatarUrl}
                      alt={MOCK_USER.displayName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{MOCK_USER.displayName}</span>
                        <span className="rounded-md bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold">
                          Challenger
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {MOCK_USER.totalPoints.toLocaleString()} Points • {streakService.getStreak('usr_aarav_01').currentStreak}d Streak
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">Select</span>
                </div>

                <div
                  onClick={() => handleSelectDemoPersona('ORGANIZER')}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={MOCK_ORGANIZER_USER.avatarUrl}
                      alt={MOCK_ORGANIZER_USER.displayName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{MOCK_ORGANIZER_USER.displayName}</span>
                        <span className="rounded-md bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 text-[9px] font-bold">
                          Organizer
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        National Fitness Council • 8 Cohorts
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-400">Select</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
