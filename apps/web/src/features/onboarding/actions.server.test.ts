import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const redirect = vi.fn((location: string) => {
    const error = new Error(`NEXT_REDIRECT:${location}`) as Error & { digest?: string };
    error.digest = `NEXT_REDIRECT;${location}`;
    throw error;
  });

  return {
    redirect,
    isTrustedActionOrigin: vi.fn(),
    requireUserSession: vi.fn(),
    guardUserMutation: vi.fn(),
    upsertOnboardingProfile: vi.fn(),
    getPrimaryAccount: vi.fn(),
    createPrimaryAccount: vi.fn(),
    updatePrimaryAccount: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
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

vi.mock("@/server/repositories/profile-repository", () => ({
  upsertOnboardingProfile: mocks.upsertOnboardingProfile,
  getPrimaryAccount: mocks.getPrimaryAccount,
  createPrimaryAccount: mocks.createPrimaryAccount,
  updatePrimaryAccount: mocks.updatePrimaryAccount,
}));

import { onboardingSetupAction } from "./actions";

const createFormData = (entries: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
};

describe("onboarding/actions server integration", () => {
  const validPayload = {
    fullName: "Ada Lovelace",
    defaultCurrency: "EUR",
    timezone: "Europe/Madrid",
    openingBalance: "200",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTrustedActionOrigin.mockResolvedValue(true);
    mocks.requireUserSession.mockResolvedValue({ user: { id: "user-1" }, supabase: {} });
    mocks.guardUserMutation.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    mocks.upsertOnboardingProfile.mockResolvedValue({ error: null });
    mocks.getPrimaryAccount.mockResolvedValue(null);
    mocks.createPrimaryAccount.mockResolvedValue({ error: null });
    mocks.updatePrimaryAccount.mockResolvedValue({ error: null });
  });

  it("creates primary account for first-time onboarding", async () => {
    await expect(
      onboardingSetupAction({ status: "idle" }, createFormData(validPayload))
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/dashboard"),
    });

    expect(mocks.upsertOnboardingProfile).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "user-1", fullName: "Ada Lovelace" })
    );
    expect(mocks.createPrimaryAccount).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "user-1", openingBalance: 200 })
    );
  });

  it("updates existing primary account when already present", async () => {
    mocks.getPrimaryAccount.mockResolvedValue({ id: "acc-1" });

    await expect(
      onboardingSetupAction({ status: "idle" }, createFormData(validPayload))
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/dashboard"),
    });

    expect(mocks.createPrimaryAccount).not.toHaveBeenCalled();
    expect(mocks.updatePrimaryAccount).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ accountId: "acc-1", userId: "user-1" })
    );
  });

  it("returns validation error when onboarding payload is invalid", async () => {
    const result = await onboardingSetupAction(
      { status: "idle" },
      createFormData({
        fullName: "",
        defaultCurrency: "ARS",
        timezone: "",
        openingBalance: "invalid-number",
      })
    );

    expect(result.status).toBe("error");
    expect(result.message).toBe("Revisa los campos del formulario.");
    expect(result.fieldErrors).toEqual(expect.objectContaining({ fullName: expect.any(String) }));
    expect(mocks.upsertOnboardingProfile).not.toHaveBeenCalled();
  });

  it("returns stable error when profile repository fails", async () => {
    mocks.upsertOnboardingProfile.mockResolvedValue({ error: { message: "write failed" } });

    const result = await onboardingSetupAction({ status: "idle" }, createFormData(validPayload));

    expect(result).toEqual({
      status: "error",
      message: "No pudimos guardar tu perfil inicial.",
    });
  });
});
