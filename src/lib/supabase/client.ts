import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://hcxwwmjkaickznhowiha.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_c7ikjNTQHdk5IHRc0Mkzlw_vdQzkxED';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_URL.startsWith('http') &&
    !SUPABASE_URL.includes('your-project') &&
    SUPABASE_ANON_KEY &&
    SUPABASE_ANON_KEY !== 'your-anon-key'
);

// Fallback dummy URL and anon key if not yet configured so app never crashes
const safeUrl = isSupabaseConfigured ? SUPABASE_URL : 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured ? SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'staff_manager_auth_token',
  },
});
