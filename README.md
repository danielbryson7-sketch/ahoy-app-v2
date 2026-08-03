# Ahoy v2 — Phase 8 Advanced Tallies

Adds:

- Square tally boxes
- Three-column layout on Deck and Tallies
- Saved per-user ordering
- Drag-and-drop rearranging on the Tallies page
- Optional cooldowns from 1 minute through 24 hours
- Database-enforced cooldown protection
- Live seconds/minutes/hours-since-last-tap
- Counters reset visually at local midnight while retaining their full history
- Daily toggles reset at local midnight
- Duration totals show today's time
- Recent duration session history
- Existing emoji modes, privacy, colors, Realtime, and Doubloons remain

## Install

1. Run `supabase/phase-8-advanced-tallies.sql`.
2. Replace:
   - `index.html`
   - `src/app.js`
   - `src/styles.css`
3. Commit to `main`.
4. Hard-refresh after GitHub Pages finishes publishing.
