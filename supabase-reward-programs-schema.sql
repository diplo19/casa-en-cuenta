-- Tarjetas de recompensa compartidas por las personas del hogar.
-- Ejecutar una sola vez en Supabase → SQL Editor.
create table if not exists public.household_reward_programs (
  household_id uuid not null references public.households(id) on delete cascade,
  id text not null,
  name text not null check (length(trim(name)) between 1 and 60),
  bank text not null default '',
  cash_per_thousand numeric(12,4) not null check (cash_per_thousand > 0),
  balance_points bigint not null default 0 check (balance_points >= 0),
  balance_updated_at timestamptz,
  primary key (household_id, id)
);

alter table public.household_reward_programs
  add column if not exists balance_points bigint not null default 0 check (balance_points >= 0),
  add column if not exists balance_updated_at timestamptz;

alter table public.household_reward_programs enable row level security;

drop policy if exists "Members can view household reward programs" on public.household_reward_programs;
create policy "Members can view household reward programs"
  on public.household_reward_programs for select to authenticated
  using (public.is_household_member(household_id));

drop policy if exists "Members can add household reward programs" on public.household_reward_programs;
create policy "Members can add household reward programs"
  on public.household_reward_programs for insert to authenticated
  with check (public.is_household_member(household_id));

drop policy if exists "Members can edit household reward programs" on public.household_reward_programs;
create policy "Members can edit household reward programs"
  on public.household_reward_programs for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists "Members can remove household reward programs" on public.household_reward_programs;
create policy "Members can remove household reward programs"
  on public.household_reward_programs for delete to authenticated
  using (public.is_household_member(household_id));

revoke all on public.household_reward_programs from anon, authenticated;
grant select, insert, update, delete on public.household_reward_programs to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'household_reward_programs'
  ) then
    alter publication supabase_realtime add table public.household_reward_programs;
  end if;
end $$;

