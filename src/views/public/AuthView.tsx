import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Briefcase,
  Trophy,
  Database,
} from 'lucide-react';

interface AuthViewProps {
  initialMode?: 'login' | 'signup';
}

export const AuthView: React.FC<AuthViewProps> = ({ initialMode = 'login' }) => {
  const { navigate } = useRouter();
  const {
    signIn,
    signUp,
    isSupabaseConfigured,
    setDemoPersona,
    isDemoMode,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'signup'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email format regex
  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!email.trim()) {
      setError('Please enter your email address.');
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
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (authMode === 'signup' && !displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'signup') {
        const res = await signUp(email.trim(), password, displayName.trim());
        if (res.error) {
          setError(res.error);
        } else if (res.requiresEmailConfirmation) {
          setSuccessMessage(
            'Account created! Please check your email inbox to confirm your address before logging in.'
          );
        } else {
          setSuccessMessage('Account created successfully! Redirecting...');
          setTimeout(() => {
            navigate('/dashboard');
          }, 800);
        }
      } else {
        const res = await signIn(email.trim(), password);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage('Logged in successfully! Redirecting...');
          setTimeout(() => {
            navigate('/dashboard');
          }, 600);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (persona: 'CHALLENGER' | 'ORGANIZER') => {
    setDemoPersona(persona);
    if (persona === 'ORGANIZER') {
      navigate('/organizer');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-[#121722] border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/20 mb-1">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {authMode === 'login' ? 'Sign In to FITTRACK' : 'Create FITTRACK Account'}
          </h1>
          <p className="text-xs text-slate-400">
            {authMode === 'login'
              ? 'Access your verified workouts, streaks, and challenge leaderboards'
              : 'Join the nationwide SIH 2026 challenge community with verified tracking'}
          </p>
        </div>

        {/* Supabase Connection Status Pill */}
        <div className="flex items-center justify-between rounded-xl bg-white/3 border border-white/8 px-3 py-2 text-[11px]">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Backend Authority:</span>
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

        {/* Auth Mode Toggle Tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/40 p-1 border border-white/8">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`rounded-lg py-2 text-xs font-bold transition-all ${
              authMode === 'login'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`rounded-lg py-2 text-xs font-bold transition-all ${
              authMode === 'signup'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Display Name / Athlete Handle
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full rounded-xl bg-[#0B0E14] border border-white/10 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@domain.com"
                className="w-full rounded-xl bg-[#0B0E14] border border-white/10 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-hidden focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              {authMode === 'signup' && (
                <span className="text-[10px] text-slate-500">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-[#0B0E14] border border-white/10 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-hidden focus:border-emerald-500 transition-colors font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* SIH 2026 Evaluation / Demo Persona Helper */}
        <div className="pt-4 border-t border-white/8 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              SIH Evaluator Quick Access
            </span>
            <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300">
              Demo Helper
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Test both application modes instantly without requiring prior email confirmation:
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('CHALLENGER')}
              className="flex items-center gap-2 rounded-xl bg-white/4 hover:bg-white/8 border border-white/8 p-2.5 transition-colors text-left"
            >
              <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Aarav (Athlete)</span>
                <span className="text-[10px] text-slate-400 block">Challenger Mode</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('ORGANIZER')}
              className="flex items-center gap-2 rounded-xl bg-white/4 hover:bg-white/8 border border-white/8 p-2.5 transition-colors text-left"
            >
              <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Priya (NFC)</span>
                <span className="text-[10px] text-slate-400 block">Organizer Mode</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
