import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js';

export async function signIn(email, password) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ email, password })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Unable to sign in.');

  const { data, error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token
  });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
