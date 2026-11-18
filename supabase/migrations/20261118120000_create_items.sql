-- Articoli del registro compravendite, uno per riga, visibili solo al proprietario.
create table public.items (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  purchase_price numeric(10, 2) not null check (purchase_price >= 0),
  purchase_date date,
  status text not null check (status in ('in_magazzino', 'in_vendita', 'venduto', 'tenuto')),
  list_price numeric(10, 2),
  estimated_price numeric(10, 2),
  sale_price numeric(10, 2),
  sale_date date,
  platform text check (platform in ('Vinted', 'Subito', 'eBay', 'Facebook Marketplace', 'Altro')),
  imported boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_user_id_idx on public.items (user_id);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

alter table public.items enable row level security;

create policy "Items: owner can read" on public.items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Items: owner can insert" on public.items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Items: owner can update" on public.items
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Items: owner can delete" on public.items
  for delete to authenticated using ((select auth.uid()) = user_id);
