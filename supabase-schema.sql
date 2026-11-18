
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

create table if not exists public.household_stores (
  household_id uuid not null references public.households(id) on delete cascade,
  id text not null,
  name text not null check (length(trim(name)) between 1 and 50),
  sub text not null default '',
  icon text not null default '🏪',
  active boolean not null default true,
  primary key (household_id, id)
);
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  store text not null,
  store_name text,
  purchase_date date not null default current_date,
  note text,
  total numeric(12,2) not null default 0 check (total >= 0),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  created_at timestamptz not null default now()
);

create index if not exists purchases_household_date_idx
  on public.purchases (household_id, purchase_date desc, created_at desc);

create or replace function public.is_household_member(target_household uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = target_household and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.create_household(household_name text)
returns table (id uuid, name text, invite_code text)
language plpgsql security definer
set search_path = ''
as $$
declare new_household public.households%rowtype;
begin
  if auth.uid() is null then raise exception 'Debés iniciar sesión.'; end if;
  if exists (select 1 from public.household_members m where m.user_id = auth.uid()) then
    raise exception 'Esta cuenta ya pertenece a un hogar.';
  end if;
  insert into public.households(name, created_by)
  values (trim(household_name), auth.uid()) returning * into new_household;
  insert into public.household_members(household_id, user_id)
  values (new_household.id, auth.uid());
  return query select new_household.id, new_household.name, new_household.invite_code;
end;
$$;

create or replace function public.join_household(code text)
returns table (id uuid, name text, invite_code text)
language plpgsql security definer
set search_path = ''
as $$
declare target public.households%rowtype;
begin
  if auth.uid() is null then raise exception 'Debés iniciar sesión.'; end if;
  if exists (select 1 from public.household_members m where m.user_id = auth.uid()) then
    raise exception 'Esta cuenta ya pertenece a un hogar.';
  end if;
  select h.* into target from public.households h
    where h.invite_code = lower(trim(code));
  if target.id is null then raise exception 'Ese código no coincide con ningún hogar.'; end if;
  insert into public.household_members(household_id, user_id)
  values (target.id, auth.uid());
  return query select target.id, target.name, target.invite_code;
end;
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_stores enable row level security;
alter table public.purchases enable row level security;

drop policy if exists "Household members can view their household" on public.households;
create policy "Household members can view their household"
  on public.households for select to authenticated
  using (public.is_household_member(id));

drop policy if exists "Members can view household membership" on public.household_members;
create policy "Members can view household membership"
  on public.household_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_household_member(household_id));

drop policy if exists "Members can view household stores" on public.household_stores;
create policy "Members can view household stores"
  on public.household_stores for select to authenticated
  using (public.is_household_member(household_id));

drop policy if exists "Members can add household stores" on public.household_stores;
create policy "Members can add household stores"
  on public.household_stores for insert to authenticated
  with check (public.is_household_member(household_id));

drop policy if exists "Members can edit household stores" on public.household_stores;
create policy "Members can edit household stores"
  on public.household_stores for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
drop policy if exists "Members can view household purchases" on public.purchases;
create policy "Members can view household purchases"
  on public.purchases for select to authenticated
  using (public.is_household_member(household_id));

drop policy if exists "Members can add purchases to their household" on public.purchases;
create policy "Members can add purchases to their household"
  on public.purchases for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_household_member(household_id));

revoke all on public.households, public.household_members, public.household_stores, public.purchases from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.households, public.household_members to authenticated;
grant select, insert, update on public.household_stores to authenticated;
grant select, insert on public.purchases to authenticated;
revoke all on function public.is_household_member(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;
revoke all on function public.create_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;
revoke all on function public.join_household(text) from public, anon;
grant execute on function public.join_household(text) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'purchases') then
    alter publication supabase_realtime add table public.purchases;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'household_stores') then
    alter publication supabase_realtime add table public.household_stores;
  end if;
end $$;
