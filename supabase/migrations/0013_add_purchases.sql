create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_name_not_blank_chk check (length(trim(name)) > 0)
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  default_unit text not null default 'pcs' check (default_unit in ('kg', 'g', 'litre', 'ml', 'pcs', 'pack', 'box')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_items_name_not_blank_chk check (length(trim(name)) > 0)
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  purchase_date date not null default current_date,
  invoice_number text,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid')),
  payment_method text check (payment_method in ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  notes text,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  created_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchases_total_matches_components_chk check (total_cents = subtotal_cents + tax_cents - discount_cents)
);

create table public.purchase_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  purchase_item_id uuid not null references public.purchase_items(id) on delete restrict,
  item_name text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit text not null check (unit in ('kg', 'g', 'litre', 'ml', 'pcs', 'pack', 'box')),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now(),
  constraint purchase_lines_item_name_not_blank_chk check (length(trim(item_name)) > 0)
);

create index vendors_active_name_idx on public.vendors (is_active, lower(name));
create index purchase_items_active_name_idx on public.purchase_items (is_active, lower(name));
create index purchases_purchase_date_idx on public.purchases (purchase_date desc, created_at desc);
create index purchases_vendor_id_idx on public.purchases (vendor_id);
create index purchase_lines_purchase_id_idx on public.purchase_lines (purchase_id);

alter table public.vendors enable row level security;
alter table public.purchase_items enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_lines enable row level security;
