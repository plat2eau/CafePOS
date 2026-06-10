alter table public.orders
add column if not exists order_type text;

update public.orders
set order_type = case
  when session_id is not null and table_id is not null then 'table'
  else 'out'
end
where order_type is null;

alter table public.orders
alter column order_type set default 'table';

alter table public.orders
alter column order_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_order_type_chk'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
    add constraint orders_order_type_chk
    check (order_type in ('table', 'out'));
  end if;
end $$;

alter table public.orders
drop constraint if exists orders_exactly_one_workflow_chk;

alter table public.orders
add constraint orders_exactly_one_workflow_chk
check (
  (
    order_type = 'table'
    and session_id is not null
    and table_id is not null
  )
  or (
    order_type = 'out'
    and session_id is null
    and table_id is null
  )
);
