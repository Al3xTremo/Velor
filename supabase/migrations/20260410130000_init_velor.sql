-- Velor - Initial Supabase/Postgres data model
-- Scope: MVP tables + future-ready tables (budgets and subscriptions)
-- Naming conventions:
--   - snake_case for tables and columns
--   - plural table names
--   - *_id suffix for foreign keys
--   - utc timestamps in created_at / updated_at

create extension if not exists pgcrypto;

do $$
begin
  create type public.currency_code as enum ('EUR', 'USD');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.transaction_kind as enum ('income', 'expense');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.transaction_source as enum ('manual', 'salary');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.goal_status as enum ('active', 'completed', 'paused', 'archived');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.budget_period as enum ('monthly', 'weekly');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.subscription_interval as enum ('weekly', 'monthly', 'yearly');
exception
  when duplicate_object then null;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- MVP tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  default_currency public.currency_code not null default 'EUR',
  timezone text not null default 'UTC',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_full_name_length check (char_length(full_name) <= 120)
);

comment on table public.profiles is 'Perfil de usuario para configuracion personal de Velor.';
comment on column public.profiles.default_currency is 'Moneda principal del usuario.';

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency public.currency_code not null default 'EUR',
  opening_balance numeric(14, 2) not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint accounts_name_not_blank check (char_length(trim(name)) > 0),
  constraint accounts_opening_balance_range check (
    opening_balance between -999999999999.99 and 999999999999.99
  )
);

comment on table public.accounts is 'Cuentas financieras del usuario. MVP usa una cuenta principal.';
comment on column public.accounts.opening_balance is 'Saldo inicial configurado por el usuario.';

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  code text,
  name text not null,
  kind public.transaction_kind not null,
  color_hex text not null default '#64748B',
  icon text,
  is_system boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint categories_name_not_blank check (char_length(trim(name)) > 0),
  constraint categories_owner_scope check (
    (is_system = true and user_id is null) or
    (is_system = false and user_id is not null)
  ),
  constraint categories_code_scope check (
    (is_system = true and code is not null) or
    (is_system = false and code is null)
  ),
  constraint categories_code_format check (
    code is null or code ~ '^[a-z0-9_]{2,40}$'
  ),
  constraint categories_color_hex_format check (
    color_hex ~ '^#[0-9A-Fa-f]{6}$'
  )
);

comment on table public.categories is 'Categorias de ingresos y gastos. Soporta categorias del sistema y personalizadas.';
comment on column public.categories.is_system is 'true para categorias globales de solo lectura.';

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null,
  current_amount numeric(14, 2) not null default 0,
  target_date date,
  status public.goal_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint savings_goals_name_not_blank check (char_length(trim(name)) > 0),
  constraint savings_goals_target_positive check (target_amount > 0),
  constraint savings_goals_current_non_negative check (current_amount >= 0)
);

comment on table public.savings_goals is 'Objetivos de ahorro por usuario.';

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  category_id uuid references public.categories(id) on delete set null,
  kind public.transaction_kind not null,
  source public.transaction_source not null default 'manual',
  name text not null,
  amount numeric(14, 2) not null,
  description text not null default '',
  notes text,
  is_recurring boolean not null default false,
  occurred_on date not null,
  occurred_month date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint transactions_name_not_blank check (char_length(trim(name)) > 0),
  constraint transactions_amount_positive check (amount > 0),
  constraint transactions_salary_is_income check (
    source <> 'salary' or kind = 'income'
  ),
  constraint transactions_description_max_length check (char_length(description) <= 200)
);

comment on table public.transactions is 'Movimientos financieros del usuario para dashboard, filtros y historico.';
comment on column public.transactions.source is 'Origen del movimiento: manual o nomina.';
comment on column public.transactions.occurred_month is 'Columna generada para agregaciones mensuales.';

create table if not exists public.savings_goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  amount numeric(14, 2) not null,
  contributed_on date not null default current_date,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint savings_goal_contributions_amount_positive check (amount > 0)
);

comment on table public.savings_goal_contributions is 'Historial de aportes para trazabilidad de objetivos de ahorro.';

-- ---------------------------------------------------------------------------
-- Future-ready tables (post-MVP)
-- ---------------------------------------------------------------------------

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  period public.budget_period not null default 'monthly',
  currency public.currency_code not null default 'EUR',
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint budgets_name_not_blank check (char_length(trim(name)) > 0),
  constraint budgets_valid_range check (ends_on >= starts_on)
);

comment on table public.budgets is 'Preparado para presupuesto por periodos.';

create table if not exists public.budget_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  limit_amount numeric(14, 2) not null,
  rollover_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint budget_limits_amount_positive check (limit_amount > 0)
);

comment on table public.budget_limits is 'Limites por categoria para presupuestos futuros.';

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  amount numeric(14, 2) not null,
  interval public.subscription_interval not null default 'monthly',
  next_charge_on date not null,
  is_active boolean not null default true,
  last_charged_on date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subscriptions_name_not_blank check (char_length(trim(name)) > 0),
  constraint subscriptions_amount_positive check (amount > 0)
);

comment on table public.subscriptions is 'Preparado para gastos recurrentes y alertas futuras.';

-- ---------------------------------------------------------------------------
-- Foreign keys with ownership guarantees
-- ---------------------------------------------------------------------------

create unique index if not exists accounts_user_id_id_uidx
  on public.accounts (user_id, id);

create unique index if not exists savings_goals_user_id_id_uidx
  on public.savings_goals (user_id, id);

create unique index if not exists budgets_user_id_id_uidx
  on public.budgets (user_id, id);

alter table public.transactions
  add constraint transactions_account_owner_fk
  foreign key (user_id, account_id)
  references public.accounts (user_id, id)
  on delete cascade;

alter table public.savings_goal_contributions
  add constraint savings_goal_contributions_goal_owner_fk
  foreign key (user_id, goal_id)
  references public.savings_goals (user_id, id)
  on delete cascade;

alter table public.budget_limits
  add constraint budget_limits_budget_owner_fk
  foreign key (user_id, budget_id)
  references public.budgets (user_id, id)
  on delete cascade;

alter table public.subscriptions
  add constraint subscriptions_account_owner_fk
  foreign key (user_id, account_id)
  references public.accounts (user_id, id)
  on delete cascade;

-- ---------------------------------------------------------------------------
-- Indexes for dashboard, filters and analytics
-- ---------------------------------------------------------------------------

create unique index if not exists accounts_user_primary_unique
  on public.accounts (user_id)
  where is_primary = true;

create unique index if not exists accounts_user_name_unique
  on public.accounts (user_id, lower(name));

create unique index if not exists categories_system_kind_name_unique
  on public.categories (kind, lower(name))
  where user_id is null;

create unique index if not exists categories_user_kind_name_unique
  on public.categories (user_id, kind, lower(name))
  where user_id is not null;

create unique index if not exists categories_system_code_unique
  on public.categories (code)
  where code is not null;

create index if not exists categories_user_kind_active_idx
  on public.categories (user_id, kind, is_active);

create index if not exists transactions_user_occurred_on_desc_idx
  on public.transactions (user_id, occurred_on desc, id);

create index if not exists transactions_user_kind_occurred_on_idx
  on public.transactions (user_id, kind, occurred_on desc);

create index if not exists transactions_user_category_occurred_on_idx
  on public.transactions (user_id, category_id, occurred_on desc)
  where category_id is not null;

create index if not exists transactions_user_occurred_month_idx
  on public.transactions (user_id, occurred_month);

create unique index if not exists savings_goals_user_name_unique
  on public.savings_goals (user_id, lower(name));

create index if not exists savings_goals_user_status_target_idx
  on public.savings_goals (user_id, status, target_date);

create index if not exists savings_goal_contributions_user_date_idx
  on public.savings_goal_contributions (user_id, contributed_on desc);

create index if not exists savings_goal_contributions_goal_date_idx
  on public.savings_goal_contributions (goal_id, contributed_on desc);

create index if not exists budgets_user_active_start_idx
  on public.budgets (user_id, is_active, starts_on desc);

create unique index if not exists budget_limits_budget_category_unique
  on public.budget_limits (budget_id, category_id);

create index if not exists budget_limits_user_budget_idx
  on public.budget_limits (user_id, budget_id);

create index if not exists subscriptions_user_active_next_charge_idx
  on public.subscriptions (user_id, is_active, next_charge_on);

-- ---------------------------------------------------------------------------
-- Validation helpers
-- ---------------------------------------------------------------------------

create or replace function public.assert_category_for_user(
  p_user_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind
)
returns void
language plpgsql
as $$
begin
  if p_category_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.categories c
    where c.id = p_category_id
      and c.kind = p_kind
      and (c.user_id = p_user_id or c.is_system = true)
  ) then
    raise exception 'Category % is not valid for user % and kind %', p_category_id, p_user_id, p_kind;
  end if;
end;
$$;

create or replace function public.validate_transactions_category()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_category_for_user(new.user_id, new.category_id, new.kind);
  return new;
end;
$$;

create or replace function public.set_transaction_occurred_month()
returns trigger
language plpgsql
as $$
begin
  new.occurred_month := make_date(
    extract(year from new.occurred_on)::integer,
    extract(month from new.occurred_on)::integer,
    1
  );
  return new;
end;
$$;

create or replace function public.validate_budget_limits_category()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_category_for_user(new.user_id, new.category_id, 'expense');
  return new;
end;
$$;

create or replace function public.validate_subscriptions_category()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_category_for_user(new.user_id, new.category_id, 'expense');
  return new;
end;
$$;

create or replace function public.recalculate_goal_current_amount(
  p_user_id uuid,
  p_goal_id uuid
)
returns void
language plpgsql
as $$
begin
  update public.savings_goals g
  set current_amount = coalesce(
    (
      select sum(c.amount)
      from public.savings_goal_contributions c
      where c.user_id = p_user_id
        and c.goal_id = p_goal_id
    ),
    0
  )
  where g.user_id = p_user_id
    and g.id = p_goal_id;
end;
$$;

create or replace function public.sync_goal_current_amount_from_contributions()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_goal_current_amount(old.user_id, old.goal_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and (old.user_id <> new.user_id or old.goal_id <> new.goal_id) then
    perform public.recalculate_goal_current_amount(old.user_id, old.goal_id);
  end if;

  perform public.recalculate_goal_current_amount(new.user_id, new.goal_id);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Automation on user creation
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, default_currency)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when (new.raw_user_meta_data ->> 'default_currency') in ('EUR', 'USD')
        then (new.raw_user_meta_data ->> 'default_currency')::public.currency_code
      else 'EUR'::public.currency_code
    end
  )
  on conflict (user_id) do nothing;

  insert into public.accounts (user_id, name, currency, opening_balance, is_primary)
  values (
    new.id,
    'Principal',
    case
      when (new.raw_user_meta_data ->> 'default_currency') in ('EUR', 'USD')
        then (new.raw_user_meta_data ->> 'default_currency')::public.currency_code
      else 'EUR'::public.currency_code
    end,
    0,
    true
  )
  on conflict do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists savings_goals_set_updated_at on public.savings_goals;
create trigger savings_goals_set_updated_at
before update on public.savings_goals
for each row execute function public.set_updated_at();

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

drop trigger if exists budget_limits_set_updated_at on public.budget_limits;
create trigger budget_limits_set_updated_at
before update on public.budget_limits
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists transactions_validate_category_trigger on public.transactions;
create trigger transactions_validate_category_trigger
before insert or update on public.transactions
for each row execute function public.validate_transactions_category();

drop trigger if exists transactions_set_occurred_month_trigger on public.transactions;
create trigger transactions_set_occurred_month_trigger
before insert or update of occurred_on on public.transactions
for each row execute function public.set_transaction_occurred_month();

drop trigger if exists budget_limits_validate_category_trigger on public.budget_limits;
create trigger budget_limits_validate_category_trigger
before insert or update on public.budget_limits
for each row execute function public.validate_budget_limits_category();

drop trigger if exists subscriptions_validate_category_trigger on public.subscriptions;
create trigger subscriptions_validate_category_trigger
before insert or update on public.subscriptions
for each row execute function public.validate_subscriptions_category();

drop trigger if exists savings_goal_contributions_sync_goal_trigger on public.savings_goal_contributions;
create trigger savings_goal_contributions_sync_goal_trigger
after insert or update or delete on public.savings_goal_contributions
for each row execute function public.sync_goal_current_amount_from_contributions();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_goal_contributions enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_limits enable row level security;
alter table public.subscriptions enable row level security;

alter table public.profiles force row level security;
alter table public.accounts force row level security;
alter table public.categories force row level security;
alter table public.transactions force row level security;
alter table public.savings_goals force row level security;
alter table public.savings_goal_contributions force row level security;
alter table public.budgets force row level security;
alter table public.budget_limits force row level security;
alter table public.subscriptions force row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists accounts_all_own on public.accounts;
create policy accounts_all_own
on public.accounts
for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists categories_select_system_or_own on public.categories;
create policy categories_select_system_or_own
on public.categories
for select
using (
  auth.uid() is not null and
  (
    is_system = true or auth.uid() = user_id
  )
);

drop policy if exists categories_insert_own on public.categories;
create policy categories_insert_own
on public.categories
for insert
with check (
  auth.uid() is not null and
  auth.uid() = user_id and
  is_system = false
);

drop policy if exists categories_update_own on public.categories;
create policy categories_update_own
on public.categories
for update
using (
  auth.uid() is not null and
  auth.uid() = user_id and
  is_system = false
)
with check (
  auth.uid() is not null and
  auth.uid() = user_id and
  is_system = false
);

drop policy if exists categories_delete_own on public.categories;
create policy categories_delete_own
on public.categories
for delete
using (
  auth.uid() is not null and
  auth.uid() = user_id and
  is_system = false
);

drop policy if exists transactions_all_own on public.transactions;
create policy transactions_all_own
on public.transactions
for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists savings_goals_all_own on public.savings_goals;
create policy savings_goals_all_own
on public.savings_goals
for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists savings_goal_contributions_all_own on public.savings_goal_contributions;
create policy savings_goal_contributions_all_own
on public.savings_goal_contributions
for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists budgets_all_own on public.budgets;
create policy budgets_all_own
on public.budgets
for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists budget_limits_all_own on public.budget_limits;
create policy budget_limits_all_own
on public.budget_limits
for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists subscriptions_all_own on public.subscriptions;
create policy subscriptions_all_own
on public.subscriptions
for all
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);
