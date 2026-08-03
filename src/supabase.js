import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

export const SUPABASE_URL = 'https://cvhmilkghlfiuikhkres.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_uuqZiiv36Ha5_4W3Eb-nrw_Uv6BoVrW';
export const SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
