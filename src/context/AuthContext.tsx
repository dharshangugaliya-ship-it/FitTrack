import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Profile, AppMode, AuthInitStatus } from '../types';
import { authService, AuthResponse } from '../services/authService';
import { profileService } from '../services/profileService';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_USER, MOCK_ORGANIZER_USER } from '../data/mockData';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  authStatus: AuthInitStatus;
  loading: boolean;
  isAuthenticated: boolean;
  isSupabaseConfigured: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  updateProfileMode: (newMode: AppMode) => Promise<{ success: boolean; error: string | null }>;
  setDemoPersona: (persona: 'CHALLENGER' | 'ORGANIZER') => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthInitStatus>('INITIALIZING');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    // Check if demo mode was explicitly activated
    return localStorage.getItem('fittrack_demo_mode') === 'true';
  });

  const isAuthenticated = authStatus === 'AUTHENTICATED' || isDemoMode;
  const loading = authStatus === 'INITIALIZING';

  // Helper to construct demo profile for SIH evaluation
  const createDemoProfile = (mode: 'challenger' | 'organizer'): Profile => {
    const mock = mode === 'organizer' ? MOCK_ORGANIZER_USER : MOCK_USER;
    return {
      id: `demo-${mock.id}`,
      display_name: mock.displayName,
      avatar_url: mock.avatarUrl,
      mode,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  // Initial session hydration
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      if (!isSupabaseConfigured) {
        // If Supabase is not configured yet, check if demo mode was active
        if (isDemoMode) {
          const savedMode = (localStorage.getItem('fittrack_app_mode') === 'ORGANIZER' ? 'organizer' : 'challenger');
          if (isMounted) {
            setProfile(createDemoProfile(savedMode));
            setAuthStatus('AUTHENTICATED');
          }
        } else {
          if (isMounted) {
            setAuthStatus('UNAUTHENTICATED');
          }
        }
        return;
      }

      try {
        const initialSession = await authService.getSession();
        if (!isMounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);

          // Retrieve user profile
          const userProfile = await profileService.getProfile(initialSession.user.id);
          if (isMounted) {
            if (userProfile) {
              setProfile(userProfile);
            } else {
              // Create default profile if user exists in auth.users but has no profile row yet
              const created = await profileService.createProfile({
                id: initialSession.user.id,
                displayName:
                  initialSession.user.user_metadata?.display_name ||
                  initialSession.user.email?.split('@')[0] ||
                  'Challenger',
                mode: 'challenger',
              });
              setProfile(created.profile);
            }
            setIsDemoMode(false);
            setAuthStatus('AUTHENTICATED');
          }
        } else {
          // If no Supabase session, check if demo mode was previously enabled by user
          if (isDemoMode) {
            const savedMode = (localStorage.getItem('fittrack_app_mode') === 'ORGANIZER' ? 'organizer' : 'challenger');
            setProfile(createDemoProfile(savedMode));
            setAuthStatus('AUTHENTICATED');
          } else {
            setAuthStatus('UNAUTHENTICATED');
          }
        }
      } catch (err) {
        console.error('Failed to initialize Supabase session:', err);
        if (isMounted) {
          setAuthStatus('UNAUTHENTICATED');
        }
      }
    }

    initializeAuth();

    // Subscribe to Supabase auth events
    const { data: authSubscription } = authService.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          setIsDemoMode(false);
          localStorage.removeItem('fittrack_demo_mode');

          const userProfile = await profileService.getProfile(newSession.user.id);
          if (isMounted) {
            if (userProfile) {
              setProfile(userProfile);
            } else {
              const res = await profileService.createProfile({
                id: newSession.user.id,
                displayName:
                  newSession.user.user_metadata?.display_name ||
                  newSession.user.email?.split('@')[0] ||
                  'Challenger',
                mode: 'challenger',
              });
              setProfile(res.profile);
            }
            setAuthStatus('AUTHENTICATED');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsDemoMode(false);
        localStorage.removeItem('fittrack_demo_mode');
        setAuthStatus('UNAUTHENTICATED');
      }
    });

    return () => {
      isMounted = false;
      authSubscription?.subscription?.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user && isSupabaseConfigured) {
      const refreshed = await profileService.getProfile(user.id);
      if (refreshed) {
        setProfile(refreshed);
      }
    }
  };

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await authService.signIn(email, password);
    if (res.session && res.user) {
      setSession(res.session);
      setUser(res.user);
      setProfile(res.profile);
      setIsDemoMode(false);
      localStorage.removeItem('fittrack_demo_mode');
      setAuthStatus('AUTHENTICATED');
    }
    return res;
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthResponse> => {
    const res = await authService.signUp(email, password, displayName);
    if (res.session && res.user) {
      setSession(res.session);
      setUser(res.user);
      setProfile(res.profile);
      setIsDemoMode(false);
      localStorage.removeItem('fittrack_demo_mode');
      setAuthStatus('AUTHENTICATED');
    }
    return res;
  };

  const signOut = async () => {
    await authService.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsDemoMode(false);
    localStorage.removeItem('fittrack_demo_mode');
    setAuthStatus('UNAUTHENTICATED');
  };

  const updateProfileMode = async (
    newMode: AppMode
  ): Promise<{ success: boolean; error: string | null }> => {
    const dbMode = newMode === 'ORGANIZER' ? 'organizer' : 'challenger';

    // If authenticated in Supabase, persist to database
    if (user && isSupabaseConfigured) {
      const res = await profileService.updateProfileMode(user.id, newMode);
      if (res.success) {
        setProfile((prev) => (prev ? { ...prev, mode: dbMode } : null));
        return { success: true, error: null };
      }
      return res;
    }

    // If in demo mode, update local state
    if (isDemoMode) {
      setProfile((prev) => (prev ? { ...prev, mode: dbMode } : createDemoProfile(dbMode)));
      return { success: true, error: null };
    }

    return { success: false, error: 'User is not authenticated.' };
  };

  // Demo persona helper for evaluation purposes
  const setDemoPersona = (persona: 'CHALLENGER' | 'ORGANIZER') => {
    const dbMode = persona === 'ORGANIZER' ? 'organizer' : 'challenger';
    setIsDemoMode(true);
    localStorage.setItem('fittrack_demo_mode', 'true');
    setProfile(createDemoProfile(dbMode));
    setAuthStatus('AUTHENTICATED');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        authStatus,
        loading,
        isAuthenticated,
        isSupabaseConfigured,
        isDemoMode,
        signIn,
        signUp,
        signOut,
        updateProfileMode,
        setDemoPersona,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
