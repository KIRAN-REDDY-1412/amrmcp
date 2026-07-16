import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing in environment configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Creates a secondary Supabase client that doesn't persist auth state in localStorage.
 * This is crucial for admin/HOD users who register other users (principals, HODs, faculty)
 * without losing their own active administrator session.
 */
export const createAuthClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};
