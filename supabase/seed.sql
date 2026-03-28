insert into public.tables (id, label)
values
  ('1', 'Table 1'),
  ('2', 'Table 2'),
  ('3', 'Table 3'),
  ('4', 'Table 4'),
  ('5', 'Table 5'),
  ('6', 'Table 6')
on conflict (id) do nothing;

insert into public.menu_categories (id, name, sort_order)
values
  ('coffee', 'Coffee', 10),
  ('tea', 'Tea', 20),
  ('food', 'Food', 30)
on conflict (id) do nothing;

insert into public.menu_items (id, category_id, name, description, price_cents, sort_order)
values
  ('c1', 'coffee', 'Espresso', 'Single shot', 15000, 10),
  ('c2', 'coffee', 'Cappuccino', 'With foam', 22000, 20),
  ('c3', 'coffee', 'Americano', null, 20000, 30),
  ('t1', 'tea', 'Masala Chai', null, 18000, 10),
  ('t2', 'tea', 'Green Tea', null, 16000, 20),
  ('f1', 'food', 'Veg Sandwich', null, 25000, 10),
  ('f2', 'food', 'Croissant', null, 20000, 20)
on conflict (id) do nothing;
