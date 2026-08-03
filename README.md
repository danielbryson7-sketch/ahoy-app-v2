# Ahoy v2 — Phase 12 Admin Console

Adds a secured admin-only console with:

- All Auth users combined with Ahoy profile data
- Click-through access to public profile pages
- Active/deactivated account control
- Ban/unban account control
- Email confirmation and last-sign-in visibility
- Successful and failed login-attempt history
- IP address and browser/user-agent capture for login attempts
- Dashboard counts for users, posts, notes, tallies, and failed logins
- Read-only browser for approved application database tables
- Search and filtering
- Service-role credentials remain only in Supabase Edge Functions

## Important limitation

This begins recording login attempts after the new `auth-login` Edge Function is deployed. It cannot reconstruct failed login attempts that happened before Phase 12.

## Install

1. Run `supabase/phase-12-admin-console.sql`.
2. Deploy both Edge Functions:
   - `auth-login`
   - `admin-console`
3. Replace on GitHub:
   - `index.html`
   - `src/app.js`
   - `src/auth.js`
   - `src/supabase.js`
   - `src/styles.css`
4. Commit to `main` and hard-refresh.

Supabase automatically provides these Edge Function secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never copy the service-role key into GitHub.
