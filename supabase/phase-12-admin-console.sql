-- Ahoy v2 Phase 12: Admin Console

alter table public.profiles
  add column if not exists active boolean not null default true;

create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  attempted_at timestamptz not null default now(),
  email text,
  success boolean not null default false,
  error_code text,
  error_message text,
  ip_address text,
  user_agent text,
  auth_user_id uuid references auth.users(id) on delete set null
);

create index if not exists login_attempts_time_idx on public.login_attempts(attempted_at desc);
create index if not exists login_attempts_email_idx on public.login_attempts(lower(email));
create index if not exists login_attempts_success_idx on public.login_attempts(success, attempted_at desc);

alter table public.login_attempts enable row level security;

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true and active = true
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists "Admins read login attempts" on public.login_attempts;
create policy "Admins read login attempts"
on public.login_attempts for select to authenticated
using (public.is_current_user_admin());

-- Users may read active profiles; admins can still inspect inactive profiles through the Edge Function.
drop policy if exists "Authenticated users read profiles" on public.profiles;
create policy "Authenticated users read profiles"
on public.profiles for select to authenticated
using (active = true or id = auth.uid() or public.is_current_user_admin());

-- Service role writes login attempts from the secure auth-login Edge Function.
grant insert, select on public.login_attempts to service_role;
grant usage, select on sequence public.login_attempts_id_seq to service_role;
