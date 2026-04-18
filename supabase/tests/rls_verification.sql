-- Velor RLS verification script (manual/auditable)
-- Usage idea (after creating 2 real users in local Supabase):
-- 1) replace USER_A_UUID and USER_B_UUID
-- 2) run in psql/Supabase SQL editor as postgres

-- ----------------------------------------------------------------------------
-- Inputs
-- ----------------------------------------------------------------------------

-- Replace these placeholders with real auth.users ids
\set user_a 'USER_A_UUID'
\set user_b 'USER_B_UUID'

-- ----------------------------------------------------------------------------
-- Inspect policies by table
-- ----------------------------------------------------------------------------

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- ----------------------------------------------------------------------------
-- Simulate auth context for user A
-- ----------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', :'user_a', true);

-- A can read own profile/account/categories/transactions/goals/budgets
select count(*) as a_profiles from public.profiles where user_id = :'user_a';
select count(*) as a_accounts from public.accounts where user_id = :'user_a';
select count(*) as a_transactions from public.transactions where user_id = :'user_a';

-- A cannot read B rows
select count(*) as b_profiles_visible_to_a from public.profiles where user_id = :'user_b';
select count(*) as b_accounts_visible_to_a from public.accounts where user_id = :'user_b';
select count(*) as b_transactions_visible_to_a from public.transactions where user_id = :'user_b';

-- ----------------------------------------------------------------------------
-- Mutation-deny checks (expected errors)
-- ----------------------------------------------------------------------------

-- Should fail: A updates B profile
update public.profiles set full_name = 'x'
where user_id = :'user_b';

-- Should fail: A deletes own account (no DELETE policy)
delete from public.accounts
where user_id = :'user_a';

-- Should fail: A deletes own goal (no DELETE policy)
delete from public.savings_goals
where user_id = :'user_a';

-- Should fail: A deletes own budget container (no DELETE policy)
delete from public.budgets
where user_id = :'user_a';

-- Should fail: A deletes own category (no DELETE policy)
delete from public.categories
where user_id = :'user_a' and is_system = false;

reset role;
