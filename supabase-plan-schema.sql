-- Add shared budget and shopping-list data to Casa en cuenta.
create table if not exists public.household_budgets (
  household_id uuid primary key references public.households(id) on delete cascade,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  period text not null default 'month' check (period in ('month', 'quincena')),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table if not exists public.grocery_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 80),
  category text not null default 'Otros',
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists grocery_list_household_created_idx
  on public.grocery_list_items (household_id, checked, created_at);

alter table public.household_budgets enable row level security;
alter table public.grocery_list_items enable row level security;

drop policy if exists "Members can view household budgets" on public.household_budgets;
create policy "Members can view household budgets"
  on public.household_budgets for select to authenticated
  using (public.is_household_member(household_id));
drop policy if exists "Members can add household budgets" on public.household_budgets;
create policy "Members can add household budgets"
  on public.household_budgets for insert to authenticated
  with check (updated_by = (select auth.uid()) and public.is_household_member(household_id));
drop policy if exists "Members can edit household budgets" on public.household_budgets;
create policy "Members can edit household budgets"
  on public.household_budgets for update to authenticated
  using (public.is_household_member(household_id))
  with check (updated_by = (select auth.uid()) and public.is_household_member(household_id));

drop policy if exists "Members can view household grocery list" on public.grocery_list_items;
create policy "Members can view household grocery list"
  on public.grocery_list_items for select to authenticated
  using (public.is_household_member(household_id));
drop policy if exists "Members can add household grocery items" on public.grocery_list_items;
create policy "Members can add household grocery items"
  on public.grocery_list_items for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_household_member(household_id));
drop policy if exists "Members can edit household grocery items" on public.grocery_list_items;
create policy "Members can edit household grocery items"
  on public.grocery_list_items for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
drop policy if exists "Members can remove household grocery items" on public.grocery_list_items;
create policy "Members can remove household grocery items"
  on public.grocery_list_items for delete to authenticated
  using (public.is_household_member(household_id));

revoke all on public.household_budgets, public.grocery_list_items from anon, authenticated;
grant select, insert, update on public.household_budgets to authenticated;
grant select, insert, update, delete on public.grocery_list_items to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'household_budgets') then
    alter publication supabase_realtime add table public.household_budgets;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'grocery_list_items') then
    alter publication supabase_realtime add table public.grocery_list_items;
  end if;
end $$;

