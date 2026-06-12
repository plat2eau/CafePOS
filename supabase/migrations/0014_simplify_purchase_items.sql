alter table public.purchase_items
  drop column if exists category,
  drop column if exists default_unit;
