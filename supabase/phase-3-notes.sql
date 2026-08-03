-- Ahoy v2 Phase 3: Notes

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  note_date date not null default current_date,
  visibility text not null default 'private'
    check (visibility in ('private','public','shared')),
  show_early_days integer not null default 0
    check (show_early_days between 0 and 30),
  image_path text,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_have_content check (length(trim(body)) > 0 or image_path is not null),
  constraint notes_body_length check (char_length(body) <= 2000)
);

create table if not exists public.note_shares (
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

create index if not exists notes_owner_idx on public.notes(owner_id, note_date);
create index if not exists notes_date_idx on public.notes(note_date);
create index if not exists note_shares_user_idx on public.note_shares(user_id);

alter table public.notes enable row level security;
alter table public.note_shares enable row level security;

drop policy if exists "Users read visible notes" on public.notes;
create policy "Users read visible notes"
on public.notes for select to authenticated
using (
  owner_id = auth.uid()
  or visibility = 'public'
  or exists (
    select 1
    from public.note_shares ns
    where ns.note_id = notes.id
      and ns.user_id = auth.uid()
  )
);

drop policy if exists "Users create their own notes" on public.notes;
create policy "Users create their own notes"
on public.notes for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Owners or admins update notes" on public.notes;
create policy "Owners or admins update notes"
on public.notes for update to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
)
with check (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);

drop policy if exists "Owners or admins delete notes" on public.notes;
create policy "Owners or admins delete notes"
on public.notes for delete to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);

drop policy if exists "Users read note shares" on public.note_shares;
create policy "Users read note shares"
on public.note_shares for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.notes n
    where n.id = note_id and n.owner_id = auth.uid()
  )
);

drop policy if exists "Note owners create shares" on public.note_shares;
create policy "Note owners create shares"
on public.note_shares for insert to authenticated
with check (
  exists (
    select 1 from public.notes n
    where n.id = note_id and n.owner_id = auth.uid()
  )
);

drop policy if exists "Note owners delete shares" on public.note_shares;
create policy "Note owners delete shares"
on public.note_shares for delete to authenticated
using (
  exists (
    select 1 from public.notes n
    where n.id = note_id and n.owner_id = auth.uid()
  )
);

alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.note_shares;
