-- Velor development seed
-- Minimal seed for MVP: global system categories used by every user.

insert into public.categories (
  user_id,
  code,
  name,
  kind,
  color_hex,
  icon,
  is_system,
  is_active,
  display_order
)
values
  (null, 'salary', 'Salary', 'income', '#1D4ED8', 'briefcase', true, true, 10),
  (null, 'freelance', 'Freelance', 'income', '#0F766E', 'sparkles', true, true, 20),
  (null, 'investments', 'Investments', 'income', '#9333EA', 'trending-up', true, true, 30),
  (null, 'rent', 'Rent', 'expense', '#B91C1C', 'home', true, true, 10),
  (null, 'groceries', 'Groceries', 'expense', '#059669', 'shopping-cart', true, true, 20),
  (null, 'transport', 'Transport', 'expense', '#1D4ED8', 'car', true, true, 30),
  (null, 'utilities', 'Utilities', 'expense', '#EA580C', 'bolt', true, true, 40),
  (null, 'health', 'Health', 'expense', '#BE185D', 'heart', true, true, 50),
  (null, 'entertainment', 'Entertainment', 'expense', '#7C3AED', 'film', true, true, 60)
on conflict do nothing;
