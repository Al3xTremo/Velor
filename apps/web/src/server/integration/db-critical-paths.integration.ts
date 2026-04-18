/* @vitest-environment node */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminKeyOrThrow, getWebEnv } from "@/lib/env";
import {
  createMonthlyBudget,
  findMonthlyBudget,
  listBudgetLimits,
  upsertBudgetLimit,
} from "@/server/repositories/budgets-repository";
import { createGoal, listGoalsForUser, updateGoal } from "@/server/repositories/goals-repository";
import { getPrimaryAccount, getUserProfile } from "@/server/repositories/profile-repository";
import {
  createTransaction,
  listTransactionsPageForUser,
  updateTransaction,
} from "@/server/repositories/transactions-repository";

type DbClient = SupabaseClient;

interface IntegrationUser {
  id: string;
  email: string;
  password: string;
}

const runtimeEnv = getWebEnv();
const baseUrl = runtimeEnv.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = runtimeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminKey = getSupabaseAdminKeyOrThrow();

const buildDbClient = (key: string): DbClient => {
  return createClient(baseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

const adminClient = buildDbClient(adminKey);

const randomEmail = (prefix: string) => {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@velor.test`;
};

const createIntegrationUser = async (prefix: string): Promise<IntegrationUser> => {
  const email = randomEmail(prefix);
  const password = `P4ss-${Math.random().toString(36).slice(2, 10)}!`;

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Integration ${prefix}`,
      default_currency: "EUR",
    },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create integration user: ${error?.message ?? "unknown_error"}`);
  }

  return {
    id: data.user.id,
    email,
    password,
  };
};

const loginAsUser = async (email: string, password: string): Promise<DbClient> => {
  const client = buildDbClient(anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(`Failed login for integration user: ${error.message}`);
  }

  return client;
};

const getSystemCategoryId = async (client: DbClient, kind: "income" | "expense") => {
  const { data, error } = await client
    .from("categories")
    .select("id")
    .eq("is_system", true)
    .eq("kind", kind)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`Missing system ${kind} category for integration tests.`);
  }

  return data.id;
};

describe("db integration critical paths (RLS + triggers)", () => {
  let ownerUser: IntegrationUser;
  let outsiderUser: IntegrationUser;
  let ownerClient: DbClient;
  let outsiderClient: DbClient;

  let ownerAccountId: string;
  let ownerExpenseCategoryId: string;
  let ownerIncomeCategoryId: string;
  let createdTransactionId: string;
  let createdBudgetId: string;
  let createdGoalId: string;

  beforeAll(async () => {
    ownerUser = await createIntegrationUser("owner");
    outsiderUser = await createIntegrationUser("outsider");

    ownerClient = await loginAsUser(ownerUser.email, ownerUser.password);
    outsiderClient = await loginAsUser(outsiderUser.email, outsiderUser.password);

    const account = await getPrimaryAccount(ownerClient as never, ownerUser.id);
    if (!account) {
      throw new Error("Primary account not created by auth trigger.");
    }

    ownerAccountId = account.id;
    ownerExpenseCategoryId = await getSystemCategoryId(ownerClient, "expense");
    ownerIncomeCategoryId = await getSystemCategoryId(ownerClient, "income");
  });

  afterAll(async () => {
    if (ownerUser?.id) {
      await adminClient.auth.admin.deleteUser(ownerUser.id);
    }
    if (outsiderUser?.id) {
      await adminClient.auth.admin.deleteUser(outsiderUser.id);
    }
  });

  it("creates auth bootstrap data and enforces profile/account RLS isolation", async () => {
    const profile = await getUserProfile(ownerClient as never, ownerUser.id);
    expect(profile).not.toBeNull();
    expect(profile?.default_currency).toBe("EUR");

    const ownerAccount = await getPrimaryAccount(ownerClient as never, ownerUser.id);
    expect(ownerAccount?.id).toBeDefined();

    const outsiderRead = await outsiderClient
      .from("profiles")
      .select("user_id")
      .eq("user_id", ownerUser.id);
    expect(outsiderRead.error).toBeNull();
    expect(outsiderRead.data ?? []).toHaveLength(0);

    const outsiderAccountRead = await outsiderClient
      .from("accounts")
      .select("id")
      .eq("user_id", ownerUser.id);
    expect(outsiderAccountRead.error).toBeNull();
    expect(outsiderAccountRead.data ?? []).toHaveLength(0);
  });

  it("creates and updates transactions with real trigger behavior and RLS", async () => {
    const createResult = await createTransaction(ownerClient as never, {
      userId: ownerUser.id,
      accountId: ownerAccountId,
      occurredMonth: "1999-01-01",
      values: {
        categoryId: ownerExpenseCategoryId,
        kind: "expense",
        source: "manual",
        name: "Integration coffee",
        amount: 12.34,
        description: "integration insert",
        notes: "initial",
        isRecurring: false,
        occurredOn: "2026-04-10",
      },
    });

    expect(createResult.error).toBeNull();

    const createdRows = await ownerClient
      .from("transactions")
      .select("id,occurred_month")
      .eq("user_id", ownerUser.id)
      .eq("name", "Integration coffee")
      .limit(1)
      .single();
    expect(createdRows.error).toBeNull();
    expect(createdRows.data?.occurred_month).toBe("2026-04-01");

    createdTransactionId = createdRows.data!.id;

    const updateResult = await updateTransaction(ownerClient as never, {
      transactionId: createdTransactionId,
      userId: ownerUser.id,
      occurredMonth: "2040-12-01",
      values: {
        categoryId: ownerExpenseCategoryId,
        kind: "expense",
        source: "manual",
        name: "Integration coffee updated",
        amount: 18.5,
        description: "integration update",
        notes: "changed",
        isRecurring: true,
        occurredOn: "2026-05-02",
      },
    });
    expect(updateResult.error).toBeNull();

    const updatedRow = await ownerClient
      .from("transactions")
      .select("name,amount,occurred_month")
      .eq("id", createdTransactionId)
      .single();
    expect(updatedRow.data?.name).toBe("Integration coffee updated");
    expect(updatedRow.data?.amount).toBe(18.5);
    expect(updatedRow.data?.occurred_month).toBe("2026-05-01");

    const outsiderUpdate = await outsiderClient
      .from("transactions")
      .update({ name: "hijacked" })
      .eq("id", createdTransactionId);
    expect(outsiderUpdate.error).toBeNull();

    const ownerAfterOutsiderAttempt = await ownerClient
      .from("transactions")
      .select("name")
      .eq("id", createdTransactionId)
      .single();
    expect(ownerAfterOutsiderAttempt.data?.name).toBe("Integration coffee updated");
  });

  it("enforces budget category trigger and budget_limit ownership", async () => {
    const budgetResult = await createMonthlyBudget(ownerClient as never, {
      userId: ownerUser.id,
      month: "2026-05",
      startsOn: "2026-05-01",
      endsOn: "2026-05-31",
    });

    expect(budgetResult.error).toBeNull();
    expect(budgetResult.data?.id).toBeDefined();
    createdBudgetId = budgetResult.data!.id;

    const upsertOk = await upsertBudgetLimit(ownerClient as never, {
      userId: ownerUser.id,
      budgetId: createdBudgetId,
      categoryId: ownerExpenseCategoryId,
      limitAmount: 250,
    });
    expect(upsertOk.error).toBeNull();

    const upsertInvalid = await upsertBudgetLimit(ownerClient as never, {
      userId: ownerUser.id,
      budgetId: createdBudgetId,
      categoryId: ownerIncomeCategoryId,
      limitAmount: 99,
    });
    expect(upsertInvalid.error).not.toBeNull();

    const outsiderLimits = await listBudgetLimits(outsiderClient as never, {
      userId: outsiderUser.id,
      budgetId: createdBudgetId,
    });
    expect(outsiderLimits).toHaveLength(0);

    const budgetLookup = await findMonthlyBudget(ownerClient as never, {
      userId: ownerUser.id,
      startsOn: "2026-05-01",
    });
    expect(budgetLookup?.id).toBe(createdBudgetId);
  });

  it("keeps goals isolated by user and validates sensitive list path", async () => {
    const goalInsert = await createGoal(ownerClient as never, {
      userId: ownerUser.id,
      values: {
        name: "Integration emergency",
        targetAmount: 1000,
        currentAmount: 100,
        targetDate: "2026-12-31",
      },
    });
    expect(goalInsert.error).toBeNull();

    const goals = await listGoalsForUser(ownerClient as never, ownerUser.id);
    expect(goals.length).toBeGreaterThan(0);
    const inserted = goals.find((item) => item.name === "Integration emergency");
    expect(inserted).toBeDefined();

    createdGoalId = inserted!.id;

    const outsiderUpdate = await outsiderClient
      .from("savings_goals")
      .update({ current_amount: 999 })
      .eq("id", createdGoalId);
    expect(outsiderUpdate.error).toBeNull();

    const ownerGoal = await ownerClient
      .from("savings_goals")
      .select("current_amount")
      .eq("id", createdGoalId)
      .single();
    expect(ownerGoal.data?.current_amount).toBe(100);

    const updateGoalResult = await updateGoal(ownerClient as never, {
      goalId: createdGoalId,
      userId: ownerUser.id,
      status: "completed",
      values: {
        name: "Integration emergency",
        targetAmount: 1000,
        currentAmount: 1000,
        targetDate: "2026-12-31",
      },
    });
    expect(updateGoalResult.error).toBeNull();

    const listWithSensitiveQuery = await listTransactionsPageForUser(ownerClient as never, {
      userId: ownerUser.id,
      page: 1,
      pageSize: 30,
      filters: {
        query: "%'; drop table transactions; -- Integration",
      },
    });
    expect(listWithSensitiveQuery.pageSize).toBe(30);
    expect(listWithSensitiveQuery.totalCount).toBeGreaterThanOrEqual(0);
  });

  it("returns controlled error for missing RPC path", async () => {
    const missingRpc = await ownerClient.rpc("velor_missing_probe_fn");
    expect(missingRpc.error).not.toBeNull();
  });
});
