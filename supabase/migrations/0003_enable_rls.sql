alter table public.tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.table_sessions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "staff can read own profile"
on public.staff_profiles
for select
to authenticated
using (auth.uid() = user_id);
