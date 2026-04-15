alter table public.menu_items
  add column if not exists half_price_cents integer check (half_price_cents >= 0),
  add column if not exists full_price_cents integer check (full_price_cents >= 0);

alter table public.order_items
  add column if not exists portion text check (portion in ('half', 'full'));

