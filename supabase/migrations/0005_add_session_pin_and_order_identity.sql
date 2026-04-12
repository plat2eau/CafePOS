alter table public.table_sessions
add column session_pin text;

update public.table_sessions
set session_pin = lpad((floor(random() * 10000))::int::text, 4, '0')
where session_pin is null;

alter table public.table_sessions
alter column session_pin set not null;

alter table public.table_sessions
alter column session_pin set default lpad((floor(random() * 10000))::int::text, 4, '0');

alter table public.table_sessions
add constraint table_sessions_session_pin_format_chk
check (session_pin ~ '^\d{4}$');

alter table public.orders
add column ordered_by_name text,
add column ordered_by_phone text;

update public.orders
set
  ordered_by_name = sessions.guest_name,
  ordered_by_phone = sessions.guest_phone
from public.table_sessions as sessions
where orders.session_id = sessions.id
  and (orders.ordered_by_name is null or orders.ordered_by_phone is null);

alter table public.orders
alter column ordered_by_name set not null;

alter table public.orders
alter column ordered_by_phone set not null;
