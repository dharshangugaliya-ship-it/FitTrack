import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {}) as any;

// Candidate URLs and Anon keys with fallback to user-provided project credentials
const rawUrl = env.VITE_SUPABASE_URL || '';
const rawKey = env.VITE_SUPABASE_ANON_KEY || '';

// If container environment injected numeric placeholder (e.g. "25"), fallback to project credentials
const supabaseUrl = (rawUrl && rawUrl.startsWith('http')) 
  ? rawUrl 
  : 'https://jpindwjowrcwknsrdwio.supabase.co';

const supabaseAnonKey = (rawKey && rawKey.startsWith('sb_')) 
  ? rawKey 
  : 'sb_publishable_hD5fur30Up-6j4cfGjzHNw_U_dC8PFF';

// Detect if Supabase is properly configured with a real non-placeholder project URL
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey !== 'your_supabase_publishable_or_anon_key' &&
  supabaseAnonKey !== 'placeholder-anon-key'
);

// Graceful fallback URL to avoid runtime throw if unconfigured during development
const clientUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const clientKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
