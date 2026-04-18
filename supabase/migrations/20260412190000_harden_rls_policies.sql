-- Velor - RLS hardening pass
-- Goal: remove overly broad FOR ALL policies where unnecessary,
-- and keep operation-level least privilege per table.

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

drop policy if exists accounts_all_own on public.accounts;

drop policy if exists accounts_select_own on public.accounts;
create policy accounts_select_own
on public.accounts
for select
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists accounts_insert_own on public.accounts;
create policy accounts_insert_own
on public.accounts
for insert
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists accounts_update_own on public.accounts;
create policy accounts_update_own
on public.accounts
for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

-- Intentionally no DELETE policy: prevents accidental account-level data wipe.

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

drop policy if exists categories_delete_own on public.categories;

-- Intentionally no DELETE policy: app uses archive/reactivate model.

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------

drop policy if exists transactions_all_own on public.transactions;

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own
on public.transactions
for select
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own
on public.transactions
for insert
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own
on public.transactions
for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own
on public.transactions
for delete
using (auth.uid() is not null and auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Savings goals
-- ---------------------------------------------------------------------------

drop policy if exists savings_goals_all_own on public.savings_goals;

drop policy if exists savings_goals_select_own on public.savings_goals;
create policy savings_goals_select_own
on public.savings_goals
for select
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists savings_goals_insert_own on public.savings_goals;
create policy savings_goals_insert_own
on public.savings_goals
for insert
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists savings_goals_update_own on public.savings_goals;
create policy savings_goals_update_own
on public.savings_goals
for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

-- Intentionally no DELETE policy: app keeps archival history.

-- ---------------------------------------------------------------------------
-- Savings goal contributions
-- ---------------------------------------------------------------------------

drop policy if exists savings_goal_contributions_all_own on public.savings_goal_contributions;

drop policy if exists savings_goal_contributions_select_own on public.savings_goal_contributions;
create policy savings_goal_contributions_select_own
on public.savings_goal_contributions
for select
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists savings_goal_contributions_insert_own on public.savings_goal_contributions;
create policy savings_goal_contributions_insert_own
on public.savings_goal_contributions
for insert
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists savings_goal_contributions_update_own on public.savings_goal_contributions;
create policy savings_goal_contributions_update_own
on public.savings_goal_contributions
for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists savings_goal_contributions_delete_own on public.savings_goal_contributions;
create policy savings_goal_contributions_delete_own
on public.savings_goal_contributions
for delete
using (auth.uid() is not null and auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Budgets
-- ---------------------------------------------------------------------------

drop policy if exists budgets_all_own on public.budgets;

drop policy if exists budgets_select_own on public.budgets;
create policy budgets_select_own
on public.budgets
for select
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists budgets_insert_own on public.budgets;
create policy budgets_insert_own
on public.budgets
for insert
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists budgets_update_own on public.budgets;
create policy budgets_update_own
on public.budgets
for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

-- Intentionally no DELETE policy: prevents dropping historical budget containers.

-- ---------------------------------------------------------------------------
-- Budget limits
-- ---------------------------------------------------------------------------

drop policy if exists budget_limits_all_own on public.budget_limits;

drop policy if exists budget_limits_select_own on public.budget_limits;
create policy budget_limits_select_own
on public.budget_limits
for select
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists budget_limits_insert_own on public.budget_limits;
create policy budget_limits_insert_own
on public.budget_limits
for insert
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists budget_limits_update_own on public.budget_limits;
create policy budget_limits_update_own
on public.budget_limits
for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists budget_limits_delete_own on public.budget_limits;
create policy budget_limits_delete_own
on public.budget_limits
for delete
using (auth.uid() is not null and auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------

drop policy if exists subscriptions_all_own on public.subscriptions;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
on public.subscriptions
for select
using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists subscriptions_insert_own on public.subscriptions;
create policy subscriptions_insert_own
on public.subscriptions
for insert
with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists subscriptions_update_own on public.subscriptions;
create policy subscriptions_update_own
on public.subscriptions
for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

-- Intentionally no DELETE policy in current phase.
