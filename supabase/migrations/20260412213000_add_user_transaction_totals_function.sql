-- Velor - Performance helper for dashboard balance

create or replace function public.user_transaction_totals(p_user_id uuid)
returns table (
  income_total numeric,
  expense_total numeric,
  net_total numeric
)
language sql
stable
security invoker
as $$
  select
    coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric as income_total,
    coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::numeric as expense_total,
    (
      coalesce(sum(t.amount) filter (where t.kind = 'income'), 0) -
      coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)
    )::numeric as net_total
  from public.transactions t
  where t.user_id = p_user_id;
$$;

grant execute on function public.user_transaction_totals(uuid) to authenticated;
