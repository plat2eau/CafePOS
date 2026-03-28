alter table public.orders
add column archived_at timestamptz;

create index orders_archived_at_idx on public.orders (archived_at);
