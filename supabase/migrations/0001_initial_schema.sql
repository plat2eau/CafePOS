create extension if not exists pgcrypto;

create table public.tables (
  id text primary key,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.menu_categories (
  id text primary key,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id text primary key,
  category_id text not null references public.menu_categories(id) on delete restrict,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('staff', 'admin')),
  display_name text,
  created_at timestamptz not null default now()
);

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete restrict,
  guest_name text not null,
  guest_phone text not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_reason text
);

create unique index table_sessions_one_active_per_table_idx
  on public.table_sessions (table_id)
  where status = 'active';

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.table_sessions(id) on delete cascade,
  table_id text not null references public.tables(id) on delete restrict,
  status text not null default 'placed' check (status in ('placed', 'preparing', 'served', 'cancelled')),
  note text,
  total_cents integer not null default 0 check (total_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_session_id_idx on public.orders (session_id);
create index orders_table_id_idx on public.orders (table_id);
create index orders_created_at_idx on public.orders (created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id text not null references public.menu_items(id) on delete restrict,
  item_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

