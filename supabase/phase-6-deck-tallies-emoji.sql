-- Ahoy v2 Phase 6: Deck Tallies + Emoji Mode

alter table public.tallies
  add column if not exists display_mode text not null default 'text'
    check (display_mode in ('text','emoji','both'));

alter table public.tallies
  add column if not exists emoji text;

alter table public.tallies
  drop constraint if exists tally_emoji_length;

alter table public.tallies
  add constraint tally_emoji_length
  check (emoji is null or char_length(emoji) <= 8);
