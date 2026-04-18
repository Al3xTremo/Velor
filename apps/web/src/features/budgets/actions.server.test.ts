import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const redirect = vi.fn((location: string) => {
    const error = new Error(`NEXT_REDIRECT:${location}`) as Error & { digest?: string };
    error.digest = `NEXT_REDIRECT;${location}`;
    throw error;
  });

  return {
    redirect,
    revalidatePath: vi.fn(),
    isTrustedActionOrigin: vi.fn(),
    requireUserSession: vi.fn(),
    guardUserMutation: vi.fn(),
    findMonthlyBudget: vi.fn(),
    createMonthlyBudget: vi.fn(),
    upsertBudgetLimit: vi.fn(),
    removeBudgetLimit: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/server/security/origin-guard", () => ({
  isTrustedActionOrigin: mocks.isTrustedActionOrigin,
}));

vi.mock("@/server/application/session-service", () => ({
  requireUserSession: mocks.requireUserSession,
}));

vi.mock("@/server/security/mutation-guard", () => ({
  guardUserMutation: mocks.guardUserMutation,
}));

vi.mock("@/server/repositories/budgets-repository", () => ({
  createMonthlyBudget: mocks.createMonthlyBudget,
  findMonthlyBudget: mocks.findMonthlyBudget,
  upsertBudgetLimit: mocks.upsertBudgetLimit,
  removeBudgetLimit: mocks.removeBudgetLimit,
}));

import { removeBudgetLimitAction, upsertBudgetLimitAction } from "./actions";

const createFormData = (entries: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
};

describe("budgets/actions server integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTrustedActionOrigin.mockResolvedValue(true);
    mocks.requireUserSession.mockResolvedValue({ user: { id: "user-1" }, supabase: {} });
    mocks.guardUserMutation.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    mocks.findMonthlyBudget.mockResolvedValue(null);
    mocks.createMonthlyBudget.mockResolvedValue({ data: { id: "budget-1" }, error: null });
    mocks.upsertBudgetLimit.mockResolvedValue({ error: null });
    mocks.removeBudgetLimit.mockResolvedValue({ error: null });
  });

  it("creates monthly budget if missing and upserts budget limit", async () => {
    const result = await upsertBudgetLimitAction(
      { status: "idle" },
      createFormData({
        month: "2026-04",
        categoryId: "11111111-1111-4111-8111-111111111111",
        limitAmount: "350",
      })
    );

    expect(result).toEqual({
      status: "success",
      message: "Limite de presupuesto guardado.",
    });
    expect(mocks.createMonthlyBudget).toHaveBeenCalled();
    expect(mocks.upsertBudgetLimit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ budgetId: "budget-1", userId: "user-1" })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/budgets");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/analytics");
  });

  it("returns validation errors for invalid budget payload", async () => {
    const result = await upsertBudgetLimitAction(
      { status: "idle" },
      createFormData({
        month: "invalid-month",
        categoryId: "",
        limitAmount: "-20",
      })
    );

    expect(result.status).toBe("error");
    expect(result.message).toBe("Revisa los datos del presupuesto.");
    expect(result.fieldErrors).toEqual(expect.objectContaining({ month: expect.any(String) }));
    expect(mocks.upsertBudgetLimit).not.toHaveBeenCalled();
  });

  it("returns stable message when infra fails while preparing monthly budget", async () => {
    mocks.createMonthlyBudget.mockResolvedValue({ data: null, error: { message: "deadlock" } });

    const result = await upsertBudgetLimitAction(
      { status: "idle" },
      createFormData({
        month: "2026-04",
        categoryId: "11111111-1111-4111-8111-111111111111",
        limitAmount: "400",
      })
    );

    expect(result).toEqual({
      status: "error",
      message: "No pudimos preparar el presupuesto mensual.",
    });
  });

  it("redirects with error notice when remove receives invalid id", async () => {
    await expect(
      removeBudgetLimitAction(createFormData({ budgetLimitId: "bad-id", month: "2026-04" }))
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/budgets?month=2026-04&notice=error"),
    });

    expect(mocks.removeBudgetLimit).not.toHaveBeenCalled();
  });
});
