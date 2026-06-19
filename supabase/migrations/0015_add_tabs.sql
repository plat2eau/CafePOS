create table if not exists public.tab_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tab_accounts_phone_digits_chk check (phone ~ '^[0-9]{10}$')
);

create unique index if not exists tab_accounts_phone_key
  on public.tab_accounts (phone);

create index if not exists tab_accounts_is_active_name_idx
  on public.tab_accounts (is_active, name);

create table if not exists public.tab_charges (
  id uuid primary key default gen_random_uuid(),
  tab_account_id uuid not null references public.tab_accounts(id) on delete restrict,
  source_type text not null check (source_type in ('table_session', 'out_check')),
  table_session_id uuid references public.table_sessions(id) on delete restrict,
  out_check_id uuid references public.out_checks(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  order_count integer not null check (order_count > 0),
  created_at timestamptz not null default now(),
  constraint tab_charges_exactly_one_source_chk check (
    (
      source_type = 'table_session'
      and table_session_id is not null
      and out_check_id is null
    )
    or (
      source_type = 'out_check'
      and table_session_id is null
      and out_check_id is not null
    )
  )
);

create unique index if not exists tab_charges_table_session_key
  on public.tab_charges (table_session_id)
  where table_session_id is not null;

create unique index if not exists tab_charges_out_check_key
  on public.tab_charges (out_check_id)
  where out_check_id is not null;

create index if not exists tab_charges_tab_account_id_created_at_idx
  on public.tab_charges (tab_account_id, created_at desc);

create table if not exists public.tab_payments (
  id uuid primary key default gen_random_uuid(),
  tab_account_id uuid not null references public.tab_accounts(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create index if not exists tab_payments_tab_account_id_created_at_idx
  on public.tab_payments (tab_account_id, created_at desc);

alter table public.tab_accounts enable row level security;
alter table public.tab_charges enable row level security;
alter table public.tab_payments enable row level security;

create or replace function public.transfer_table_session_to_tab(
  p_session_id uuid,
  p_table_id text,
  p_tab_account_id uuid
)
returns void
language plpgsql
as $$
declare
  transferred_at timestamptz := now();
  charge_amount integer;
  charge_order_count integer;
begin
  if not exists (
    select 1
    from public.tab_accounts
    where id = p_tab_account_id
      and is_active = true
  ) then
    raise exception 'Tab account could not be found.';
  end if;

  if not exists (
    select 1
    from public.table_sessions
    where id = p_session_id
      and table_id = p_table_id
      and status = 'active'
  ) then
    raise exception 'Table session could not be found or is already closed.';
  end if;

  select
    coalesce(sum(total_cents), 0)::integer,
    count(*)::integer
  into charge_amount, charge_order_count
  from public.orders
  where session_id = p_session_id
    and table_id = p_table_id
    and archived_at is null
    and status <> 'cancelled';

  if charge_amount <= 0 or charge_order_count <= 0 then
    raise exception 'There is no positive tab balance to transfer.';
  end if;

  insert into public.tab_charges (
    tab_account_id,
    source_type,
    table_session_id,
    amount_cents,
    order_count,
    created_at
  )
  values (
    p_tab_account_id,
    'table_session',
    p_session_id,
    charge_amount,
    charge_order_count,
    transferred_at
  );

  update public.table_sessions
  set
    status = 'closed',
    closed_at = transferred_at,
    closed_reason = 'Transferred to tab'
  where id = p_session_id
    and table_id = p_table_id
    and status = 'active';

  update public.orders
  set
    archived_at = transferred_at,
    updated_at = transferred_at
  where session_id = p_session_id
    and table_id = p_table_id
    and archived_at is null;

  update public.service_requests
  set
    status = 'resolved',
    resolved_at = transferred_at
  where session_id = p_session_id
    and status = 'open';
end;
$$;

create or replace function public.transfer_out_check_to_tab(
  p_out_check_id uuid,
  p_tab_account_id uuid
)
returns void
language plpgsql
as $$
declare
  transferred_at timestamptz := now();
  charge_amount integer;
  charge_order_count integer;
begin
  if not exists (
    select 1
    from public.tab_accounts
    where id = p_tab_account_id
      and is_active = true
  ) then
    raise exception 'Tab account could not be found.';
  end if;

  if not exists (
    select 1
    from public.out_checks
    where id = p_out_check_id
      and status = 'open'
  ) then
    raise exception 'Out check could not be found or is already closed.';
  end if;

  select
    coalesce(sum(total_cents), 0)::integer,
    count(*)::integer
  into charge_amount, charge_order_count
  from public.orders
  where out_check_id = p_out_check_id
    and archived_at is null
    and status <> 'cancelled';

  if charge_amount <= 0 or charge_order_count <= 0 then
    raise exception 'There is no positive tab balance to transfer.';
  end if;

  insert into public.tab_charges (
    tab_account_id,
    source_type,
    out_check_id,
    amount_cents,
    order_count,
    created_at
  )
  values (
    p_tab_account_id,
    'out_check',
    p_out_check_id,
    charge_amount,
    charge_order_count,
    transferred_at
  );

  update public.out_checks
  set
    status = 'closed',
    closed_at = transferred_at
  where id = p_out_check_id
    and status = 'open';

  update public.orders
  set
    status = case when status = 'cancelled' then 'cancelled' else 'served' end,
    archived_at = transferred_at,
    updated_at = transferred_at
  where out_check_id = p_out_check_id
    and archived_at is null;
end;
$$;
