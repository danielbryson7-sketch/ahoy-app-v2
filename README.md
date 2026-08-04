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


## Phase 12.1 loading-screen fix

Fixes the startup freeze caused by `adminNavButton` not being added to `cacheElements()`.

Replace only:
- `src/app.js`

No SQL or Edge Function changes are required.


# Phase 12.2 — Errors / Auth Activity

Adds:

- Admin-panel **Errors / Auth Activity** tab
- Failed and successful signup logging
- Broader authentication event history
- Error code, message, email, IP, browser/device, and timestamp
- Signup flow routed through a secure `auth-signup` Edge Function
- Existing login attempts mirrored into `auth_events`
- `auth_events` available in the read-only database browser

## Install

1. Run:
   - `supabase/phase-12-2-auth-activity.sql`

2. Deploy:
   - `supabase/functions/auth-signup/index.ts`
   - redeploy `supabase/functions/admin-console/index.ts`

3. Replace on GitHub:
   - `index.html`
   - `src/app.js`
   - `src/auth.js`
   - `src/styles.css`

4. Commit and hard-refresh.

No service-role key belongs in GitHub.


# Phase 13 — Crew Directory

Adds:

- New **Crew** tab for all signed-in users
- Searchable list of every active Ahoy user
- Avatar, display name, flair, current status, and status age
- **View Profile** button on every crew card
- Clickable crew cards
- Profile-opening support from cards carrying `data-profile-id`
- Crew Status cards open the associated public profile

## Install

Replace on GitHub:

- `index.html`
- `src/app.js`
- `src/styles.css`

No SQL or Edge Function changes are required.


# Phase 13.1 — Crew Status Fix

Fixes the Crew directory error caused by reading `status_text` and
`status_updated_at` from `profiles`.

Crew profiles are now loaded from `profiles`, statuses are loaded from
`crew_statuses`, and the latest status is merged into each crew card.

Replace only:

- `src/app.js`

No SQL or Edge Function changes are required.


# Phase 14 — View Persistence

This full-project release includes the complete Ahoy project plus the fix that
keeps the user on the current section after leaving and returning to the
browser tab.

The release includes:

- `src/view-persistence.js`
- The required script reference already added to `index.html`

No SQL or Edge Function changes are required for Phase 14.

## Install

Upload the complete contents of this ZIP to the root of the GitHub repository,
replacing the existing files, then commit the changes and hard-refresh Ahoy.
