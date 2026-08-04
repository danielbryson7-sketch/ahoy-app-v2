-- Ahoy v2 Phase 15: comment and crew-status like/dislike reactions

create table if not exists public.comment_reactions (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like','dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.status_reactions (
  status_user_id uuid not null references public.crew_statuses(user_id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like','dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (status_user_id, user_id)
);

alter table public.comment_reactions enable row level security;
alter table public.status_reactions enable row level security;

drop policy if exists "Signed in users read comment reactions" on public.comment_reactions;
create policy "Signed in users read comment reactions"
on public.comment_reactions for select to authenticated using (true);

drop policy if exists "Users create own comment reactions" on public.comment_reactions;
create policy "Users create own comment reactions"
on public.comment_reactions for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users update own comment reactions" on public.comment_reactions;
create policy "Users update own comment reactions"
on public.comment_reactions for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users delete own comment reactions" on public.comment_reactions;
create policy "Users delete own comment reactions"
on public.comment_reactions for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Signed in users read status reactions" on public.status_reactions;
create policy "Signed in users read status reactions"
on public.status_reactions for select to authenticated using (true);

drop policy if exists "Users create own status reactions" on public.status_reactions;
create policy "Users create own status reactions"
on public.status_reactions for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users update own status reactions" on public.status_reactions;
create policy "Users update own status reactions"
on public.status_reactions for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users delete own status reactions" on public.status_reactions;
create policy "Users delete own status reactions"
on public.status_reactions for delete to authenticated using (user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.comment_reactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.status_reactions;
exception when duplicate_object then null;
end $$;
