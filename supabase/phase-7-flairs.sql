-- Ahoy v2 Phase 7: Crew Flair System

create table if not exists public.flair_catalog (
  name text primary key,
  category text not null,
  is_protected boolean not null default false,
  is_user_selectable boolean not null default false,
  sort_order integer not null default 0
);

alter table public.flair_catalog enable row level security;

drop policy if exists "Signed in users read flair catalog" on public.flair_catalog;
create policy "Signed in users read flair catalog"
on public.flair_catalog for select to authenticated using (true);

insert into public.flair_catalog
  (name, category, is_protected, is_user_selectable, sort_order)
values
  ('Founder','Protected',true,false,1),
  ('Captain','Protected',true,false,2),
  ('Admiral','Protected',true,false,3),
  ('First Mate','Protected',true,false,4),
  ('Quartermaster','Protected',true,false,5),
  ('Harbor Master','Protected',true,false,6),
  ('Fleet Commander','Protected',true,false,7),
  ('Commodore','Protected',true,false,8),
  ('Boatswain','Protected',true,false,9),
  ('Master Gunner','Protected',true,false,10),
  ('Deckhand','Rank',false,true,11),
  ('Lookout','Rank',false,true,12),
  ('Navigator','Rank',false,true,13),
  ('Helmsman','Rank',false,true,14),
  ('Shipwright','Rank',false,true,15),
  ('Cartographer','Rank',false,true,16),
  ('Chronicler','Rank',false,true,17),
  ('Sailmaker','Rank',false,true,18),
  ('Carpenter','Rank',false,true,19),
  ('Cook','Rank',false,true,20),
  ('Surgeon','Rank',false,true,21),
  ('Powder Monkey','Rank',false,true,22),
  ('Cabin Mate','Rank',false,true,23),
  ('Rigger','Rank',false,true,24),
  ('Signal Keeper','Rank',false,true,25),
  ('Treasure Hunter','Achievement',false,false,26),
  ('Gold Hoarder','Achievement',false,false,27),
  ('Old Salt','Achievement',false,false,28),
  ('Storm Chaser','Achievement',false,false,29),
  ('Kraken Tamer','Achievement',false,false,30),
  ('Plank Survivor','Achievement',false,false,31),
  ('Seven Seas Veteran','Achievement',false,false,32),
  ('Map Maker','Achievement',false,false,33),
  ('Cannon Master','Achievement',false,false,34),
  ('Legend of the Deep','Achievement',false,false,35),
  ('Sea Trial Champion','Achievement',false,false,36),
  ('Port Collector','Achievement',false,false,37),
  ('Doubloon Baron','Achievement',false,false,38),
  ('Message in a Bottle','Achievement',false,false,39),
  ('Anchor Dropper','Achievement',false,false,40),
  ('Tide Turner','Achievement',false,false,41),
  ('Wave Rider','Achievement',false,false,42),
  ('Night Watch Veteran','Achievement',false,false,43),
  ('Deep Sea Diver','Achievement',false,false,44),
  ('Compass Keeper','Achievement',false,false,45),
  ('Scallywag','Personality',false,true,46),
  ('Landlubber','Personality',false,true,47),
  ('Sea Dog','Personality',false,true,48),
  ('Rum Runner','Personality',false,true,49),
  ('Mutineer','Personality',false,true,50),
  ('Freebooter','Personality',false,true,51),
  ('Swashbuckler','Personality',false,true,52),
  ('Buccaneer','Personality',false,true,53),
  ('Corsair','Personality',false,true,54),
  ('Privateer','Personality',false,true,55),
  ('Marauder','Personality',false,true,56),
  ('Rebel Sailor','Personality',false,true,57),
  ('Wild Tide','Personality',false,true,58),
  ('Loose Cannon','Personality',false,true,59),
  ('Stormy Temper','Personality',false,true,60),
  ('Smooth Sailor','Personality',false,true,61),
  ('Silent Current','Personality',false,true,62),
  ('Salty Soul','Personality',false,true,63),
  ('Sea Breeze','Personality',false,true,64),
  ('Moonlit Mariner','Personality',false,true,65),
  ('Bilge Rat','Funny',false,true,66),
  ('Deck Goblin','Funny',false,true,67),
  ('Cannon Fodder','Funny',false,true,68),
  ('Snack Smuggler','Funny',false,true,69),
  ('Nap Captain','Funny',false,true,70),
  ('Barnacle Buddy','Funny',false,true,71),
  ('Parrot Wrangler','Funny',false,true,72),
  ('Rumless Runner','Funny',false,true,73),
  ('Lost Compass','Funny',false,true,74),
  ('Soggy Boot','Funny',false,true,75),
  ('Knot Expert-ish','Funny',false,true,76),
  ('Professional Stowaway','Funny',false,true,77),
  ('Seaweed Collector','Funny',false,true,78),
  ('Emergency Oar','Funny',false,true,79),
  ('Captain of Snacks','Funny',false,true,80),
  ('Deck Chair Admiral','Funny',false,true,81),
  ('Certified Land Pirate','Funny',false,true,82),
  ('Anchor Enthusiast','Funny',false,true,83),
  ('Questionable Navigator','Funny',false,true,84),
  ('Definitely Not Seasick','Funny',false,true,85),
  ('Ghost Ship Crew','Special',false,false,86),
  ('Kraken''s Chosen','Special',false,false,87),
  ('Black Flag Society','Special',false,false,88),
  ('Golden Compass Club','Special',false,false,89),
  ('Midnight Watch','Special',false,false,90),
  ('Red Sky Crew','Special',false,false,91),
  ('Blue Horizon','Special',false,false,92),
  ('Stormborn Sailor','Special',false,false,93),
  ('Sunken Treasure Society','Special',false,false,94),
  ('Royal Buccaneer','Special',false,false,95),
  ('Sea Witch''s Favor','Special',false,false,96),
  ('Poseidon''s Pal','Special',false,false,97),
  ('Leviathan League','Special',false,false,98),
  ('Mermaid''s Ally','Special',false,false,99),
  ('Flying Dutchman','Special',false,false,100)
on conflict (name) do update set
  category = excluded.category,
  is_protected = excluded.is_protected,
  is_user_selectable = excluded.is_user_selectable,
  sort_order = excluded.sort_order;

-- Give users Deckhand when their flair array is empty.
update public.profiles
set flair = array['Deckhand']
where coalesce(array_length(flair, 1), 0) = 0;

-- Daniel gets both Founder and Captain.
update public.profiles
set flair = (
  select array_agg(distinct value order by value)
  from unnest(coalesce(flair, '{}'::text[]) || array['Founder','Captain']) value
)
where email = 'daniel.bryson7@gmail.com';

-- New users start as Deckhand.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    flair
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    ),
    array['Deckhand']
  );

  return new;
end;
$$;

-- User can change only the catalog entries marked selectable.
-- Protected/earned flair already assigned to them is preserved.
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
begin
  select coalesce(array_agg(f), '{}'::text[])
  into preserved
  from unnest(coalesce((select flair from public.profiles where id = auth.uid()), '{}'::text[])) f
  where exists (
    select 1 from public.flair_catalog c
    where c.name = f and c.is_user_selectable = false
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

-- Admin can assign any catalog flair to any user.
create or replace function public.admin_set_user_flairs(
  target_user_id uuid,
  selected_flairs text[]
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  result text[];
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Admin access required';
  end if;

  select coalesce(array_agg(distinct c.name order by c.name), array['Deckhand'])
  into result
  from public.flair_catalog c
  where c.name = any(coalesce(selected_flairs, '{}'::text[]));

  if coalesce(array_length(result, 1), 0) = 0 then
    result := array['Deckhand'];
  end if;

  update public.profiles
  set flair = result,
      updated_at = now()
  where id = target_user_id;

  return result;
end;
$$;

revoke all on function public.set_my_selectable_flairs(text[]) from public;
revoke all on function public.admin_set_user_flairs(uuid,text[]) from public;

grant execute on function public.set_my_selectable_flairs(text[]) to authenticated;
grant execute on function public.admin_set_user_flairs(uuid,text[]) to authenticated;
