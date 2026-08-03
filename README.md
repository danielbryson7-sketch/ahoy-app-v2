# Ahoy v2 — Phase 2

This release adds the first real Ahoy feature set:

- Deck navigation
- Create text/photo posts
- Live post feed
- Comments
- Like/dislike reactions
- Profile/avatar/flair display on posts
- Delete your own posts/comments
- Admin deletion
- Doubloon counter
- Realtime feed refresh
- Existing login/profile features

## Install

1. In Supabase, open **SQL Editor**.
2. Open `supabase/phase-2-deck.sql`.
3. Copy the entire file, run it, and confirm success.
4. On GitHub, replace:
   - `index.html`
   - `src/app.js`
   - `src/styles.css`
5. Keep `src/auth.js` and `src/supabase.js`, or replace them with the included copies.
6. Commit directly to `main`.
7. Wait about a minute and refresh the GitHub Pages site.

## Notes

The SQL also closes the profile privilege hole so regular users cannot promote themselves to admin or add protected flair through the browser API.
