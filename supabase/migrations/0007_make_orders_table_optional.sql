alter table public.orders
alter column session_id drop not null;

alter table public.orders
alter column table_id drop not null;
