import type { SupabaseServerClient } from "@/server/supabase/types";
import { measureServerOperation } from "@/server/observability/perf";

export const findMonthlyBudget = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    startsOn: string;
  }
) => {
  const { data } = await measureServerOperation(
    "budgets.repository.find_monthly",
    async () =>
      supabase
        .from("budgets")
        .select("id")
        .eq("user_id", input.userId)
        .eq("starts_on", input.startsOn)
        .eq("period", "monthly")
        .maybeSingle(),
    { userId: input.userId }
  );

  return data;
};

export const createMonthlyBudget = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    month: string;
    startsOn: string;
    endsOn: string;
  }
) => {
  return measureServerOperation(
    "budgets.repository.create_monthly",
    async () =>
      supabase
        .from("budgets")
        .insert({
          user_id: input.userId,
          name: `Presupuesto ${input.month}`,
          period: "monthly",
          starts_on: input.startsOn,
          ends_on: input.endsOn,
          is_active: true,
        })
        .select("id")
        .single(),
    { userId: input.userId }
  );
};

export const listBudgetLimits = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    budgetId: string;
  }
) => {
  const { data } = await measureServerOperation(
    "budgets.repository.list_limits",
    async () =>
      supabase
        .from("budget_limits")
        .select("id,category_id,limit_amount")
        .eq("user_id", input.userId)
        .eq("budget_id", input.budgetId),
    { userId: input.userId }
  );

  return data ?? [];
};

export const upsertBudgetLimit = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    budgetId: string;
    categoryId: string;
    limitAmount: number;
  }
) => {
  return measureServerOperation(
    "budgets.repository.upsert_limit",
    async () =>
      supabase.from("budget_limits").upsert(
        {
          user_id: input.userId,
          budget_id: input.budgetId,
          category_id: input.categoryId,
          limit_amount: input.limitAmount,
        },
        { onConflict: "budget_id,category_id" }
      ),
    { userId: input.userId }
  );
};

export const removeBudgetLimit = async (
  supabase: SupabaseServerClient,
  input: {
    budgetLimitId: string;
    userId: string;
  }
) => {
  return measureServerOperation(
    "budgets.repository.remove_limit",
    async () =>
      supabase
        .from("budget_limits")
        .delete()
        .eq("id", input.budgetLimitId)
        .eq("user_id", input.userId),
    { userId: input.userId }
  );
};
