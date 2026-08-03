-- Ahoy v2 Phase 8: Advanced Tallies

alter table public.tallies
  add column if not exists cooldown_minutes integer not null default 0
    check (cooldown_minutes >= 0 and cooldown_minutes <= 10080);

alter table public.tallies
  add column if not exists sort_order integer not null default 0;

-- Preserve the existing creation order for current tallies.
with ranked as (
  select
    id,
    row_number() over (
      partition by owner_id, type
      order by created_at, id
    ) * 10 as new_sort_order
  from public.tallies
)
update public.tallies t
set sort_order = ranked.new_sort_order
from ranked
where t.id = ranked.id
  and t.sort_order = 0;

create index if not exists tallies_owner_type_sort_idx
  on public.tallies(owner_id, type, sort_order);

-- Enforce cooldowns in the database, not only in the browser.
create or replace function public.enforce_tally_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cooldown integer;
  most_recent timestamptz;
begin
  select cooldown_minutes
  into cooldown
  from public.tallies
  where id = new.tally_id;

  if coalesce(cooldown, 0) <= 0 then
    return new;
  end if;

  select max(created_at)
  into most_recent
  from public.tally_events
  where tally_id = new.tally_id
    and user_id = new.user_id
    and id is distinct from new.id;

  if most_recent is not null
     and most_recent + make_interval(mins => cooldown) > now() then
    raise exception 'This tally is still in its cooldown period.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_tally_cooldown_trigger on public.tally_events;
create trigger enforce_tally_cooldown_trigger
before insert or update of created_at on public.tally_events
for each row execute function public.enforce_tally_cooldown();
