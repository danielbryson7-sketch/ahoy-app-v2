-- Ahoy v2 Phase 5: Tallies

create table if not exists public.tallies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null check (type in ('counter','toggle','duration')),
  color text not null default 'gold'
    check (color in ('gold','blue','green','red','purple','orange','gray')),
  visibility text not null default 'private'
    check (visibility in ('private','public')),
  on_message text,
  off_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tally_name_length check (char_length(trim(name)) between 1 and 60)
);

create table if not exists public.tally_events (
  id uuid primary key default gen_random_uuid(),
  tally_id uuid not null references public.tallies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('increment','toggle','duration')),
  amount numeric not null default 1,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tallies_owner_idx on public.tallies(owner_id, created_at);
create index if not exists tally_events_tally_idx on public.tally_events(tally_id, created_at desc);
create index if not exists tally_events_user_idx on public.tally_events(user_id, created_at desc);

alter table public.tallies enable row level security;
alter table public.tally_events enable row level security;

drop policy if exists "Users read visible tallies" on public.tallies;
create policy "Users read visible tallies"
on public.tallies for select to authenticated
using (owner_id = auth.uid() or visibility = 'public');

drop policy if exists "Users create own tallies" on public.tallies;
create policy "Users create own tallies"
on public.tallies for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Owners update tallies" on public.tallies;
create policy "Owners update tallies"
on public.tallies for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Owners or admins delete tallies" on public.tallies;
create policy "Owners or admins delete tallies"
on public.tallies for delete to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);

drop policy if exists "Users read events for visible tallies" on public.tally_events;
create policy "Users read events for visible tallies"
on public.tally_events for select to authenticated
using (
  exists (
    select 1 from public.tallies t
    where t.id = tally_id
      and (t.owner_id = auth.uid() or t.visibility = 'public')
  )
);

drop policy if exists "Users create events on usable tallies" on public.tally_events;
create policy "Users create events on usable tallies"
on public.tally_events for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.tallies t
    where t.id = tally_id
      and (t.owner_id = auth.uid() or t.visibility = 'public')
  )
);

drop policy if exists "Users update own tally events" on public.tally_events;
create policy "Users update own tally events"
on public.tally_events for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users delete own tally events" on public.tally_events;
create policy "Users delete own tally events"
on public.tally_events for delete to authenticated
using (user_id = auth.uid());

alter publication supabase_realtime add table public.tallies;
alter publication supabase_realtime add table public.tally_events;
