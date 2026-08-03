-- Ahoy v2 Phase 11: Custom Crew Profiles

alter table public.profiles add column if not exists bio text default '';
alter table public.profiles add column if not exists about_me text default '';
alter table public.profiles add column if not exists interests text default '';
alter table public.profiles add column if not exists favorite_music text default '';
alter table public.profiles add column if not exists favorite_movies text default '';
alter table public.profiles add column if not exists favorite_games text default '';
alter table public.profiles add column if not exists song_url text;
alter table public.profiles add column if not exists banner_path text;
alter table public.profiles add column if not exists background_path text;
alter table public.profiles add column if not exists theme_primary text not null default '#d4af37';
alter table public.profiles add column if not exists theme_secondary text not null default '#002147';
alter table public.profiles add column if not exists theme_background text not null default '#2f2f2f';
alter table public.profiles add column if not exists theme_font text not null default 'Arial, sans-serif';
alter table public.profiles add column if not exists section_order jsonb not null default '["about","interests","music","movies","games","featured","gallery","guestbook"]'::jsonb;

grant update (
  display_name, profile_image_path, bio, about_me, interests, favorite_music,
  favorite_movies, favorite_games, song_url, banner_path, background_path,
  theme_primary, theme_secondary, theme_background, theme_font, section_order, updated_at
) on public.profiles to authenticated;

create table if not exists public.profile_featured_crew (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  featured_user_id uuid not null references public.profiles(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key(owner_id, featured_user_id),
  constraint cannot_feature_self check (owner_id <> featured_user_id)
);

create table if not exists public.profile_gallery (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  image_path text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.profile_guestbook (
  id uuid primary key default gen_random_uuid(),
  profile_owner_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint guestbook_body_length check(char_length(trim(body)) between 1 and 500)
);

alter table public.profile_featured_crew enable row level security;
alter table public.profile_gallery enable row level security;
alter table public.profile_guestbook enable row level security;

create policy "Anyone signed in reads featured crew" on public.profile_featured_crew
for select to authenticated using(true);
create policy "Owners manage featured crew" on public.profile_featured_crew
for all to authenticated using(owner_id = auth.uid()) with check(owner_id = auth.uid());

create policy "Anyone signed in reads profile galleries" on public.profile_gallery
for select to authenticated using(true);
create policy "Owners add gallery photos" on public.profile_gallery
for insert to authenticated with check(owner_id = auth.uid());
create policy "Owners update gallery photos" on public.profile_gallery
for update to authenticated using(owner_id = auth.uid()) with check(owner_id = auth.uid());
create policy "Owners delete gallery photos" on public.profile_gallery
for delete to authenticated using(owner_id = auth.uid());

create policy "Anyone signed in reads guestbooks" on public.profile_guestbook
for select to authenticated using(true);
create policy "Users sign guestbooks" on public.profile_guestbook
for insert to authenticated with check(author_id = auth.uid());
create policy "Authors or profile owners delete guestbook entries" on public.profile_guestbook
for delete to authenticated using(author_id = auth.uid() or profile_owner_id = auth.uid());

do $$ begin
 alter publication supabase_realtime add table public.profile_guestbook;
exception when duplicate_object then null; end $$;
