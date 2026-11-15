-- Ejecutar en Supabase > SQL Editor. Cada pareja puede compartir un mismo "hogar".
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  store text not null check (store in ('selectos','dollarcity','pricemart')),
  purchase_date date not null default current_date,
  note text,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  name text not null,
  category text not null default 'Otros',
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity numeric(12,3) not null check (quantity > 0)
);
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
-- Las políticas de acceso se agregarán junto con autenticación e invitación al hogar.
-- No habilitar acceso público de escritura en una app que contiene datos de gastos.
