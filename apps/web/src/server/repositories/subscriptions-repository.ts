import type { SubscriptionRuleFormInput } from "@velor/contracts";
import { measureServerOperation } from "@/server/observability/perf";
import type { SupabaseServerClient } from "@/server/supabase/types";

export type SubscriptionRuleRow = {
  id: string;
  name: string;
  amount: number;
  category_id: string;
  interval: "weekly" | "monthly" | "yearly";
  next_charge_on: string;
  is_active: boolean;
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
