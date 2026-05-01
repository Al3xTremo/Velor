import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    getServerSecretEnv: vi.fn(),
    createSupabaseAdminClient: vi.fn(),
    materializeDueSubscriptionRules: vi.fn(),
    logSecurityEvent: vi.fn(),
  };
});

vi.mock("@/lib/env", () => ({
  getServerSecretEnv: mocks.getServerSecretEnv,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

vi.mock("@/server/repositories/subscriptions-repository", () => ({
  materializeDueSubscriptionRules: mocks.materializeDueSubscriptionRules,
}));

vi.mock("@/server/security/audit-log", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
}));

import { POST } from "./route";

const withAuth = (body: unknown = {}) => {
  return new Request("http://localhost/api/ops/subscriptions/materialize", {
    method: "POST",
    headers: {
      authorization: "Bearer super-secret",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
};

describe("api/ops/subscriptions/materialize route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSecretEnv.mockReturnValue({
      SUBSCRIPTION_MATERIALIZATION_CRON_SECRET: "super-secret",
    });
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: vi.fn() });
    mocks.materializeDueSubscriptionRules.mockResolvedValue({
      error: null,
      data: {
        processedRules: 2,
        dueOccurrences: 3,
        createdTransactions: 2,
        skippedDuplicates: 1,
        updatedRules: 2,
        runDate: "2026-05-10",
      },
    });
  });

  it("returns unauthorized when bearer token is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/ops/subscriptions/materialize", {
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    expect(mocks.materializeDueSubscriptionRules).not.toHaveBeenCalled();
  });

  it("rejects invalid payload", async () => {
    const response = await POST(
      withAuth({
        runOn: "invalid-date",
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.materializeDueSubscriptionRules).not.toHaveBeenCalled();
  });

  it("materializes due rules with admin client when auth is valid", async () => {
    const response = await POST(
      withAuth({
        runOn: "2026-05-10",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.materializeDueSubscriptionRules).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        runDate: "2026-05-10",
      })
    );
  });

  it("returns service unavailable when cron secret is not configured", async () => {
    mocks.getServerSecretEnv.mockReturnValue({
      SUBSCRIPTION_MATERIALIZATION_CRON_SECRET: undefined,
    });

    const response = await POST(withAuth());

    expect(response.status).toBe(503);
    expect(mocks.materializeDueSubscriptionRules).not.toHaveBeenCalled();
  });
});
