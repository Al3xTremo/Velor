import type { SubscriptionRuleFormInput } from "@velor/contracts";
import { measureServerOperation } from "@/server/observability/perf";
import type { SupabaseServerClient } from "@/server/supabase/types";

type SupabaseRpcClient = Pick<SupabaseServerClient, "rpc">;

export type SubscriptionRuleRow = {
  id: string;
  name: string;
  amount: number;
  category_id: string;
  interval: "weekly" | "monthly" | "yearly";
  next_charge_on: string;
  is_active: boolean;
};

type SubscriptionMaterializationRpcRow = {
  processed_rules: number | string | null;
  due_occurrences: number | string | null;
  created_transactions: number | string | null;
  skipped_duplicates: number | string | null;
  updated_rules: number | string | null;
  run_date: string | null;
};

export interface SubscriptionMaterializationSummary {
  processedRules: number;
  dueOccurrences: number;
  createdTransactions: number;
  skippedDuplicates: number;
  updatedRules: number;
  runDate: string;
}

const toNonNegativeInt = (value: number | string | null | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }

  return 0;
};

export const listSubscriptionRulesForUser = async (
  supabase: SupabaseServerClient,
  userId: string
) => {
  const result = await measureServerOperation(
    "subscriptions.repository.list_all",
    async () =>
      supabase
        .from("subscriptions")
        .select("id,name,amount,category_id,interval,next_charge_on,is_active")
        .eq("user_id", userId)
        .order("next_charge_on", { ascending: true })
        .order("name", { ascending: true }),
    { userId }
  );

  return (result.data ?? []) as SubscriptionRuleRow[];
};

export const createSubscriptionRule = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    accountId: string;
    values: SubscriptionRuleFormInput;
  }
) => {
  return measureServerOperation(
    "subscriptions.repository.create",
    async () =>
      supabase.from("subscriptions").insert({
        user_id: input.userId,
        account_id: input.accountId,
        category_id: input.values.categoryId,
        name: input.values.name,
        amount: input.values.amount,
        interval: input.values.interval,
        next_charge_on: input.values.nextChargeOn,
        is_active: input.values.isActive,
      }),
    { userId: input.userId }
  );
};

export const updateSubscriptionRule = async (
  supabase: SupabaseServerClient,
  input: {
    subscriptionId: string;
    userId: string;
    values: SubscriptionRuleFormInput;
  }
) => {
  return measureServerOperation(
    "subscriptions.repository.update",
    async () =>
      supabase
        .from("subscriptions")
        .update({
          category_id: input.values.categoryId,
          name: input.values.name,
          amount: input.values.amount,
          interval: input.values.interval,
          next_charge_on: input.values.nextChargeOn,
          is_active: input.values.isActive,
        })
        .eq("id", input.subscriptionId)
        .eq("user_id", input.userId),
    { userId: input.userId }
  );
};

export const toggleSubscriptionRuleActiveStatus = async (
  supabase: SupabaseServerClient,
  input: {
    subscriptionId: string;
    userId: string;
    isActive: boolean;
  }
) => {
  return measureServerOperation(
    "subscriptions.repository.toggle_active",
    async () =>
      supabase
        .from("subscriptions")
        .update({ is_active: input.isActive })
        .eq("id", input.subscriptionId)
        .eq("user_id", input.userId),
    { userId: input.userId }
  );
};

export const materializeDueSubscriptionRules = async (
  supabase: SupabaseRpcClient,
  input: {
    userId?: string;
    runDate?: string;
  } = {}
) => {
  const rpcResult = await measureServerOperation(
    "subscriptions.repository.materialize_due",
    async () =>
      supabase.rpc("materialize_due_subscriptions", {
        p_user_id: input.userId ?? null,
        p_run_date: input.runDate ?? null,
      }),
    {
      userId: input.userId ?? "all_users",
      runDate: input.runDate ?? "current_date",
    }
  );

  if (rpcResult.error) {
    return {
      data: null,
      error: rpcResult.error,
    };
  }

  const firstRow = Array.isArray(rpcResult.data)
    ? (rpcResult.data[0] as SubscriptionMaterializationRpcRow | undefined)
    : undefined;

  if (!firstRow) {
    return {
      data: null,
      error: {
        message: "invalid_materialization_response",
      },
    };
  }

  const summary: SubscriptionMaterializationSummary = {
    processedRules: toNonNegativeInt(firstRow.processed_rules),
    dueOccurrences: toNonNegativeInt(firstRow.due_occurrences),
    createdTransactions: toNonNegativeInt(firstRow.created_transactions),
    skippedDuplicates: toNonNegativeInt(firstRow.skipped_duplicates),
    updatedRules: toNonNegativeInt(firstRow.updated_rules),
    runDate: firstRow.run_date ?? input.runDate ?? new Date().toISOString().slice(0, 10),
  };

  return {
    data: summary,
    error: null,
  };
};
