import type { SavingsGoalFormInput } from "@velor/contracts";
import type { SupabaseServerClient } from "@/server/supabase/types";
import { measureServerOperation } from "@/server/observability/perf";

export const listGoalsForUser = async (supabase: SupabaseServerClient, userId: string) => {
  const { data } = await measureServerOperation(
    "goals.repository.list",
    async () =>
      supabase
        .from("savings_goals")
        .select("id,name,target_amount,current_amount,target_date,status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    { userId }
  );

  return data ?? [];
};

export const listHighlightedGoalsForDashboard = async (
  supabase: SupabaseServerClient,
  userId: string
) => {
  const { data } = await measureServerOperation(
    "goals.repository.list_highlighted",
    async () =>
      supabase
        .from("savings_goals")
        .select("id,name,target_amount,current_amount,target_date,status")
        .eq("user_id", userId)
        .neq("status", "archived")
        .order("target_date", { ascending: true })
        .limit(3),
    { userId }
  );

  return data ?? [];
};

export const createGoal = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    values: SavingsGoalFormInput;
  }
) => {
  return measureServerOperation(
    "goals.repository.create",
    async () =>
      supabase.from("savings_goals").insert({
        user_id: input.userId,
        name: input.values.name,
        target_amount: input.values.targetAmount,
        current_amount: input.values.currentAmount,
        target_date: input.values.targetDate ?? null,
        status: "active",
      }),
    { userId: input.userId }
  );
};

export const updateGoal = async (
  supabase: SupabaseServerClient,
  input: {
    goalId: string;
    userId: string;
    values: SavingsGoalFormInput;
    status: "active" | "completed";
  }
) => {
  return measureServerOperation(
    "goals.repository.update",
    async () =>
      supabase
        .from("savings_goals")
        .update({
          name: input.values.name,
          target_amount: input.values.targetAmount,
          current_amount: input.values.currentAmount,
          target_date: input.values.targetDate ?? null,
          status: input.status,
        })
        .eq("id", input.goalId)
        .eq("user_id", input.userId),
    { userId: input.userId }
  );
};

export const setGoalStatus = async (
  supabase: SupabaseServerClient,
  input: {
    goalId: string;
    userId: string;
    status: "active" | "archived";
  }
) => {
  return measureServerOperation(
    "goals.repository.set_status",
    async () =>
      supabase
        .from("savings_goals")
        .update({ status: input.status })
        .eq("id", input.goalId)
        .eq("user_id", input.userId),
    { userId: input.userId }
  );
};
