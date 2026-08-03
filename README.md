# Ahoy v2 — Phase 7 Crew Flair System

Adds:

- 100 pirate-themed flairs
- Multiple flairs per user
- Deckhand as the default new-user flair
- Founder + Captain for Daniel
- User-selectable personality/rank/funny flairs
- Protected and earned flairs
- Admin-only full flair manager
- Composer now shows the real profile picture
- Existing flair display on posts, comments, notes, and profiles remains

## Install

1. Run `supabase/phase-7-flairs.sql` in Supabase SQL Editor.
2. Replace on GitHub:
   - `index.html`
   - `src/app.js`
   - `src/styles.css`
3. Commit directly to `main`.
4. Wait about a minute, then hard-refresh.

The SQL safely preserves protected/earned flair when normal users change their selectable flair.
