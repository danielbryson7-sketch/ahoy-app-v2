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


# Phase 14.1 — No Tab Reload / Preserve Unsaved Forms

This replaces the Phase 14 focus-click workaround with the proper fix.

Changes:

- Supabase `TOKEN_REFRESHED` events no longer rebuild the entire app.
- Switching browser tabs does not call navigation buttons or reload profile data.
- Unsaved Profile form content remains intact while copying from another tab.
- The selected Ahoy section is still remembered for an actual page reload.
- The obsolete `src/view-persistence.js` file and script tag were removed.

## Install

Upload the complete contents of this ZIP to the root of the GitHub repository,
replace the existing files, commit, and hard-refresh.

No SQL or Edge Function changes are required.


# Phase 14.2 — All Notes on Notes Page

Changes only the Notes page:

- Shows every note the current user is allowed to see
- Includes past, current, and future notes
- Keeps private/shared/group/public visibility rules in place
- Keeps the completed-notes toggle behavior
- Leaves Deck notes unchanged, so the Deck still shows only active/upcoming notes

## Install

Upload the complete contents of this ZIP to the root of the GitHub repository,
replace the existing files, commit, and hard-refresh.

No SQL or Edge Function changes are required.

## Phase 14.3 — Direct Supabase authentication

Login and signup now use Supabase Auth directly through `signInWithPassword()` and `signUp()` in `src/auth.js`.
The browser no longer calls the `auth-login` or `auth-signup` Edge Functions, eliminating the failing function request from the login path.
The protected `admin-console` Edge Function remains in the project.

Because the custom login/signup functions are no longer used, failed login attempts are not written to the custom `login_attempts`/`auth_events` tables by those functions.

## Phase 15 installation

1. In Supabase, open **SQL Editor**.
2. Run `supabase/phase-15-comment-status-reactions.sql` once.
3. Upload the entire project to the GitHub repository, replacing the existing files.
4. Wait for GitHub Pages to redeploy, then hard-refresh Ahoy.

Phase 15 adds:
- Browser-side image resizing and WebP compression before Storage upload.
- Like/dislike reactions on comments.
- Like/dislike reactions on crew statuses.
- A more compact interface across desktop and mobile.
- Larger toggle state/message and “since” text without enlarging tally cards.


## Phase 15.1
- Enlarged tally counts, toggle state text, toggle messages, and precise “since” text while preserving the existing card dimensions.

### Phase 15.2
- Enlarged the Deck tally amount and precise “since” readouts only.
- Preserved the existing tally button/card dimensions.

## Phase 15.3 mobile layout update

- Uses the full available mobile viewport width.
- Removes the unused right-side space on narrow screens.
- Enlarges Deck tally values, labels, and since timers for at-a-glance reading.
- Keeps the three-column tally layout and square card footprint.
- Adds asset cache-busting so phones receive the updated CSS and JavaScript after deployment.


## Phase 15.4
- Editing an existing tally now refreshes the Tallies screen and Deck from the same fresh Supabase result immediately after save.
- Updated tally name, type, color, visibility, display mode, emoji, cooldown, and toggle messages appear without logging out or reloading.


## Phase 15.5
Deck tally cards now use the saved tally color with the same top accent bar and colored value treatment as the Tallies management screen. No SQL changes are required.


## Phase 15.6
Fixed Deck tally color inheritance so the color selected in the tally editor controls the Deck accent bar and value color. No SQL changes required.


## Phase 16 optimization release

- Consolidates the stacked Phase 15.x CSS overrides into one authoritative UI layer.
- Adds `src/tally-theme.js` as the single tally color source of truth.
- Applies saved tally colors directly at render time on both the Tallies page and Deck.
- Removes duplicate tally fetches after actions by refreshing both views from one query.
- Avoids duplicate initial-view data loads during application startup.
- Preserves the existing database schema and all current features.
