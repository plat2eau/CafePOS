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
