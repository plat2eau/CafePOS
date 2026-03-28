create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.table_sessions(id) on delete cascade,
  table_id text not null references public.tables(id) on delete restrict,
  request_type text not null check (request_type in ('payment', 'assistance')),
  note text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index service_requests_session_id_idx on public.service_requests (session_id);
create index service_requests_table_id_idx on public.service_requests (table_id);
create index service_requests_status_idx on public.service_requests (status, created_at desc);

alter table public.service_requests enable row level security;
