-- Ahoy v2 Phase 12.2: Auth Activity / Error Logging

create table if not exists public.auth_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in (
    'signup',
    'login',
    'password_reset',
    'email_change',
    'account_status',
    'edge_function'
  )),
  email text,
  success boolean not null default false,
  error_code text,
  error_message text,
  ip_address text,
  user_agent text,
  auth_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists auth_events_created_at_idx
  on public.auth_events(created_at desc);

create index if not exists auth_events_type_idx
  on public.auth_events(event_type, created_at desc);

create index if not exists auth_events_success_idx
  on public.auth_events(success, created_at desc);

create index if not exists auth_events_email_idx
  on public.auth_events(lower(email));

alter table public.auth_events enable row level security;

drop policy if exists "Admins read auth events" on public.auth_events;
create policy "Admins read auth events"
on public.auth_events for select
to authenticated
using (public.is_current_user_admin());

grant insert, select on public.auth_events to service_role;
grant usage, select on sequence public.auth_events_id_seq to service_role;

-- Mirror existing login-attempt records into the broader auth activity log going forward.
create or replace function public.log_login_attempt_as_auth_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.auth_events (
    created_at,
    event_type,
    email,
    success,
    error_code,
    error_message,
    ip_address,
    user_agent,
    auth_user_id,
    metadata
  )
  values (
    new.attempted_at,
    'login',
    new.email,
    new.success,
    new.error_code,
    new.error_message,
    new.ip_address,
    new.user_agent,
    new.auth_user_id,
    jsonb_build_object('source', 'login_attempts')
  );

  return new;
end;
$$;

drop trigger if exists trg_login_attempt_auth_event on public.login_attempts;
create trigger trg_login_attempt_auth_event
after insert on public.login_attempts
for each row execute function public.log_login_attempt_as_auth_event();
