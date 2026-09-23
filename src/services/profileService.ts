import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, AppMode } from '../types';

export const profileService = {
  /**
   * Retrieve a user profile by user UUID from Supabase profiles table
   */
  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile from Supabase:', error.message);
        return null;
      }

      return data as Profile | null;
    } catch (err) {
      console.error('Failed to get profile:', err);
      return null;
    }
  },

  /**
   * Create a new profile record for an authenticated user
   */
  async createProfile(params: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    mode?: 'challenger' | 'organizer';
  }): Promise<{ profile: Profile | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return {
        profile: null,
        error: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    const now = new Date().toISOString();
    const newProfile: Partial<Profile> = {
      id: params.id,
      display_name: params.displayName,
      avatar_url: params.avatarUrl || null,
      mode: params.mode || 'challenger',
      created_at: now,
      updated_at: now,
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        console.error('Supabase profile insertion error:', error.message);
        return { profile: null, error: error.message };
      }

      return { profile: data as Profile, error: null };
    } catch (err: any) {
      return { profile: null, error: err.message || 'Unknown error creating profile' };
    }
  },

  /**
   * Update the mode for an existing profile ('challenger' <-> 'organizer')
   */
  async updateProfileMode(
    userId: string,
    mode: AppMode
  ): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured' };
    }

    const dbMode = mode === 'ORGANIZER' ? 'organizer' : 'challenger';

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          mode: dbMode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating profile mode in Supabase:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile mode' };
    }
  },

  /**
   * Update arbitrary profile fields for the authenticated user
   */
  async updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>
  ): Promise<{ profile: Profile | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { profile: null, error: 'Supabase is not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { profile: null, error: error.message };
      }

      return { profile: data as Profile, error: null };
    } catch (err: any) {
      return { profile: null, error: err.message || 'Failed to update profile' };
    }
  },
};
