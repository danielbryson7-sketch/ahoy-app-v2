-- Ahoy v2 Phase 9: Note Groups and Editing

alter table public.notes
  drop constraint if exists notes_visibility_check;

alter table public.notes
  add constraint notes_visibility_check
  check (visibility in ('private','public','shared','group'));

create table if not exists public.note_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint note_group_name_length check (char_length(trim(name)) between 1 and 60)
);

create table if not exists public.note_group_members (
  group_id uuid not null references public.note_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.note_group_shares (
  note_id uuid not null references public.notes(id) on delete cascade,
  group_id uuid not null references public.note_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, group_id)
);

create index if not exists note_groups_owner_idx on public.note_groups(owner_id, name);
create index if not exists note_group_members_user_idx on public.note_group_members(user_id);
create index if not exists note_group_shares_group_idx on public.note_group_shares(group_id);

alter table public.note_groups enable row level security;
alter table public.note_group_members enable row level security;
alter table public.note_group_shares enable row level security;

-- Helpers avoid recursive RLS checks.
create or replace function public.owns_note_group(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.note_groups
    where id = target_group_id and owner_id = auth.uid()
  );
$$;

create or replace function public.is_note_group_member(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.note_group_members
    where group_id = target_group_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_read_group_note(target_note_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.note_group_shares ngs
    join public.note_group_members ngm on ngm.group_id = ngs.group_id
    where ngs.note_id = target_note_id
      and ngm.user_id = auth.uid()
  );
$$;

revoke all on function public.owns_note_group(uuid) from public;
revoke all on function public.is_note_group_member(uuid) from public;
revoke all on function public.can_read_group_note(uuid) from public;
grant execute on function public.owns_note_group(uuid) to authenticated;
grant execute on function public.is_note_group_member(uuid) to authenticated;
grant execute on function public.can_read_group_note(uuid) to authenticated;

drop policy if exists "Users read visible notes" on public.notes;
create policy "Users read visible notes"
on public.notes for select to authenticated
using (
  owner_id = auth.uid()
  or visibility = 'public'
  or public.can_read_note(id)
  or public.can_read_group_note(id)
);

drop policy if exists "Owners manage note groups" on public.note_groups;
create policy "Owners manage note groups"
on public.note_groups for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Owners read group members" on public.note_group_members;
create policy "Owners read group members"
on public.note_group_members for select to authenticated
using (
  public.owns_note_group(group_id)
  or user_id = auth.uid()
);

drop policy if exists "Owners create group members" on public.note_group_members;
create policy "Owners create group members"
on public.note_group_members for insert to authenticated
with check (public.owns_note_group(group_id));

drop policy if exists "Owners delete group members" on public.note_group_members;
create policy "Owners delete group members"
on public.note_group_members for delete to authenticated
using (public.owns_note_group(group_id));

drop policy if exists "Users read visible group shares" on public.note_group_shares;
create policy "Users read visible group shares"
on public.note_group_shares for select to authenticated
using (
  public.owns_note(note_id)
  or public.is_note_group_member(group_id)
);

drop policy if exists "Note owners create group shares" on public.note_group_shares;
create policy "Note owners create group shares"
on public.note_group_shares for insert to authenticated
with check (
  public.owns_note(note_id)
  and public.owns_note_group(group_id)
);

drop policy if exists "Note owners delete group shares" on public.note_group_shares;
create policy "Note owners delete group shares"
on public.note_group_shares for delete to authenticated
using (public.owns_note(note_id));

-- Realtime additions, safely ignoring tables already present.
do $$
begin
  alter publication supabase_realtime add table public.note_groups;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.note_group_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.note_group_shares;
exception when duplicate_object then null;
end $$;
