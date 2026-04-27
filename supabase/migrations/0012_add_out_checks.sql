create table if not exists public.out_checks (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table public.out_checks enable row level security;

alter table public.orders
add column if not exists out_check_id uuid references public.out_checks(id) on delete restrict;

create index if not exists orders_out_check_id_idx on public.orders (out_check_id);

insert into public.out_checks (
  id,
  customer_name,
  customer_phone,
  status,
  created_at,
  closed_at
)
select
  orders.id,
  coalesce(nullif(trim(orders.ordered_by_name), ''), 'Guest'),
  nullif(trim(orders.ordered_by_phone), ''),
  case when orders.archived_at is null then 'open' else 'closed' end,
  orders.created_at,
  orders.archived_at
from public.orders
where orders.session_id is null
  and orders.table_id is null
  and orders.out_check_id is null
  and not exists (
    select 1
    from public.out_checks
    where out_checks.id = orders.id
  );

update public.orders
set out_check_id = id
where session_id is null
  and table_id is null
  and out_check_id is null;

alter table public.orders
drop constraint if exists orders_exactly_one_workflow_chk;

alter table public.orders
add constraint orders_exactly_one_workflow_chk
check (
  (
    order_type = 'table'
    and session_id is not null
    and table_id is not null
    and out_check_id is null
  )
  or (
    order_type = 'out'
    and session_id is null
    and table_id is null
    and out_check_id is not null
  )
);

create or replace function public.close_out_check(p_out_check_id uuid)
returns void
language plpgsql
as $$
declare
  closed_timestamp timestamptz := now();
begin
  update public.out_checks
  set
    status = 'closed',
    closed_at = closed_timestamp
  where id = p_out_check_id
    and status = 'open';

  if not found then
    raise exception 'Out check could not be found or is already closed.';
  end if;

  update public.orders
  set
    status = case when status = 'cancelled' then 'cancelled' else 'served' end,
    archived_at = closed_timestamp,
    updated_at = closed_timestamp
  where out_check_id = p_out_check_id
    and archived_at is null;
end;
$$;
