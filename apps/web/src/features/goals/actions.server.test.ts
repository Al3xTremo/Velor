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
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    setGoalStatus: vi.fn(),
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

vi.mock("@/server/repositories/goals-repository", () => ({
  createGoal: mocks.createGoal,
  updateGoal: mocks.updateGoal,
  setGoalStatus: mocks.setGoalStatus,
}));

import { createGoalAction, toggleGoalArchiveAction, updateGoalAction } from "./actions";

const createFormData = (entries: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
};

describe("goals/actions server integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTrustedActionOrigin.mockResolvedValue(true);
    mocks.requireUserSession.mockResolvedValue({ user: { id: "user-1" }, supabase: {} });
    mocks.guardUserMutation.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    mocks.createGoal.mockResolvedValue({ error: null });
    mocks.updateGoal.mockResolvedValue({ error: null });
    mocks.setGoalStatus.mockResolvedValue({ error: null });
  });

  it("creates goal successfully for valid input", async () => {
    const result = await createGoalAction(
      { status: "idle" },
      createFormData({
        name: "Fondo emergencia",
        targetAmount: "1000",
        currentAmount: "120",
        targetDate: "2026-12-31",
      })
    );

    expect(result).toEqual({
      status: "success",
      message: "Objetivo creado correctamente.",
    });
    expect(mocks.createGoal).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "user-1" })
    );
  });

  it("marks goal as completed when current amount reaches target", async () => {
    const result = await updateGoalAction(
      { status: "idle" },
      createFormData({
        goalId: "11111111-1111-4111-8111-111111111111",
        name: "Laptop",
        targetAmount: "1500",
        currentAmount: "1500",
        targetDate: "2026-10-15",
      })
    );

    expect(result).toEqual({
      status: "success",
      message: "Objetivo actualizado correctamente.",
    });
    expect(mocks.updateGoal).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "completed" })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/goals");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("returns validation errors on invalid payload", async () => {
    const result = await createGoalAction(
      { status: "idle" },
      createFormData({
        name: "",
        targetAmount: "0",
        currentAmount: "-1",
        targetDate: "",
      })
    );

    expect(result.status).toBe("error");
    expect(result.message).toBe("Revisa los campos del objetivo.");
    expect(result.fieldErrors).toEqual(expect.objectContaining({ name: expect.any(String) }));
    expect(mocks.createGoal).not.toHaveBeenCalled();
  });

  it("redirects to rate-limited notice when archive action is blocked", async () => {
    mocks.guardUserMutation.mockResolvedValue({ allowed: false, retryAfterMs: 1000 });

    await expect(
      toggleGoalArchiveAction(
        createFormData({
          goalId: "11111111-1111-4111-8111-111111111111",
          nextStatus: "archived",
        })
      )
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/goals?notice=rate_limited"),
    });
  });
});
