import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { profileService } from './profileService';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Profile } from '../types';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  error: string | null;
  requiresEmailConfirmation?: boolean;
}

export const authService = {
  /**
   * Check if Supabase client has active configuration
   */
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  /**
   * Retrieve active session from Supabase
   */
  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error.message);
        return null;
      }
      return data.session;
    } catch (err) {
      console.error('Unexpected error fetching session:', err);
      return null;
    }
  },

  /**
   * Retrieve currently authenticated user
   */
  async getUser(): Promise<User | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    } catch (err) {
      return null;
    }
  },

  /**
   * Sign up with email, password, and display name.
   * Also ensures a corresponding profile is created in the profiles table.
   */
  async signUp(email: string, password: string, displayName: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) {
      return {
        user: null,
        session: null,
        profile: null,
        error: 'Supabase authentication is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const redirectUrl = typeof window !== 'undefined' && window.location ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return {
          user: null,
          session: null,
          profile: null,
          error: error.message,
        };
      }

      const user = data.user;
      const session = data.session;

      if (!user) {
        return {
          user: null,
          session: null,
          profile: null,
          error: 'User creation failed.',
        };
      }

      // Check if email confirmation is required (session is null when email confirmation is enabled)
      const requiresEmailConfirmation = !session && Boolean(user.identities?.length);

      let profile: Profile | null = null;

      // If user is immediately active or session exists, establish/retrieve the profile
      if (user.id) {
        // Attempt to see if DB trigger already created profile
        const existingProfile = await profileService.getProfile(user.id);
        if (existingProfile) {
          profile = existingProfile;
        } else {
          // Frontend fallback profile creation
          const creationRes = await profileService.createProfile({
            id: user.id,
            displayName,
            mode: 'challenger',
          });
          profile = creationRes.profile;
        }
      }

      return {
        user,
        session,
        profile,
        error: null,
        requiresEmailConfirmation,
      };
    } catch (err: any) {
      return {
        user: null,
        session: null,
        profile: null,
        error: err.message || 'An unexpected error occurred during signup.',
      };
    }
  },

  /**
   * Sign in with existing email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) {
      return {
        user: null,
        session: null,
        profile: null,
        error: 'Supabase authentication is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let friendlyMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          friendlyMessage = 'Invalid email or password. Please verify your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
          friendlyMessage = 'Please verify your email address before signing in.';
        }
        return {
          user: null,
          session: null,
          profile: null,
          error: friendlyMessage,
        };
      }

      const user = data.user;
      const session = data.session;

      let profile: Profile | null = null;
      if (user) {
        profile = await profileService.getProfile(user.id);
        // Fallback: If profile record does not yet exist, create it from metadata
        if (!profile) {
          const creationRes = await profileService.createProfile({
            id: user.id,
            displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Challenger',
            mode: 'challenger',
          });
          profile = creationRes.profile;
        }
      }

      return {
        user,
        session,
        profile,
        error: null,
      };
    } catch (err: any) {
      return {
        user: null,
        session: null,
        profile: null,
        error: err.message || 'An unexpected error occurred during sign-in.',
      };
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Error during sign out.' };
    }
  },

  /**
   * Listen to Supabase auth events
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    if (!isSupabaseConfigured) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};
