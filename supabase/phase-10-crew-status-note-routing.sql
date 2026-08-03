-- Ahoy v2 Phase 10: Crew Status + Note Routing

create table if not exists public.crew_statuses (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status_text text not null,
  updated_at timestamptz not null default now(),
  constraint crew_status_length check (char_length(trim(status_text)) between 1 and 160)
);

alter table public.crew_statuses enable row level security;

drop policy if exists "Signed in users read crew statuses" on public.crew_statuses;
create policy "Signed in users read crew statuses"
on public.crew_statuses for select to authenticated
using (true);

drop policy if exists "Users create own crew status" on public.crew_statuses;
create policy "Users create own crew status"
on public.crew_statuses for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update own crew status" on public.crew_statuses;
create policy "Users update own crew status"
on public.crew_statuses for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users delete own crew status" on public.crew_statuses;
create policy "Users delete own crew status"
on public.crew_statuses for delete to authenticated
using (user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.crew_statuses;
exception when duplicate_object then null;
end $$;
