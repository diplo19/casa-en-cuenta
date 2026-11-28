-- Permit household members to correct only purchases they created.
drop policy if exists "Members can edit own household purchases" on public.purchases;
create policy "Members can edit own household purchases"
  on public.purchases for update to authenticated
  using (created_by = (select auth.uid()) and public.is_household_member(household_id))
  with check (created_by = (select auth.uid()) and public.is_household_member(household_id));

drop policy if exists "Members can remove own household purchases" on public.purchases;
create policy "Members can remove own household purchases"
  on public.purchases for delete to authenticated
  using (created_by = (select auth.uid()) and public.is_household_member(household_id));

grant select, insert, update, delete on public.purchases to authenticated;

