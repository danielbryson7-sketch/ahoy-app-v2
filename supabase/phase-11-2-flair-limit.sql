-- Ahoy v2 Phase 11.2: Limit user-selectable flair to 3

create or replace function public.set_my_selectable_flairs(selected_flairs text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  preserved text[];
  allowed text[];
  result text[];
  selected_count integer;
begin
  select count(distinct c.name)
  into selected_count
  from public.flair_catalog c
  where c.is_user_selectable = true
    and c.name = any(coalesce(selected_flairs, '{}'::text[]));

  if selected_count > 3 then
    raise exception 'You can choose up to 3 selectable flairs.';
  end if;

  select coalesce(array_agg(f), '{}'::text[])
  into preserved
  from unnest(
    coalesce(
      (select flair from public.profiles where id = auth.uid()),
      '{}'::text[]
    )
  ) f
  where exists (
    select 1
    from public.flair_catalog c
    where c.name = f
      and c.is_user_selectable = false
  );

  select coalesce(array_agg(distinct c.name order by c.name), '{}'::text[])
  into allowed
  from public.flair_catalog c
  where c.is_user_selectable = true
    and c.name = any(coalesce(selected_flairs, '{}'::text[]));

  result := (
    select coalesce(array_agg(distinct value order by value), array['Deckhand'])
    from unnest(preserved || allowed) value
  );

  if coalesce(array_length(result, 1), 0) = 0 then
    result := array['Deckhand'];
  end if;

  update public.profiles
  set flair = result,
      updated_at = now()
  where id = auth.uid();

  return result;
end;
$$;

revoke all on function public.set_my_selectable_flairs(text[]) from public;
grant execute on function public.set_my_selectable_flairs(text[]) to authenticated;
