import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    revalidatePath: vi.fn(),
    isTrustedActionOrigin: vi.fn(),
    requireUserSession: vi.fn(),
    guardUserMutation: vi.fn(),
    updateUserProfileSettings: vi.fn(),
    getPrimaryAccount: vi.fn(),
    updatePrimaryAccount: vi.fn(),
  };
});

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

vi.mock("@/server/repositories/profile-repository", () => ({
  updateUserProfileSettings: mocks.updateUserProfileSettings,
  getPrimaryAccount: mocks.getPrimaryAccount,
  updatePrimaryAccount: mocks.updatePrimaryAccount,
}));

import { updateSettingsAction } from "./actions";

const createFormData = (entries: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
};

describe("settings/actions server integration", () => {
  const validPayload = {
    fullName: "Ada Lovelace",
    defaultCurrency: "EUR",
    timezone: "Europe/Madrid",
    openingBalance: "250.5",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTrustedActionOrigin.mockResolvedValue(true);
    mocks.requireUserSession.mockResolvedValue({ user: { id: "user-1" }, supabase: {} });
    mocks.guardUserMutation.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    mocks.updateUserProfileSettings.mockResolvedValue({ error: null });
    mocks.getPrimaryAccount.mockResolvedValue({ id: "acc-1" });
    mocks.updatePrimaryAccount.mockResolvedValue({ error: null });
  });

  it("updates profile and primary account for valid input", async () => {
    const result = await updateSettingsAction({ status: "idle" }, createFormData(validPayload));

    expect(result).toEqual({
      status: "success",
      message: "Ajustes guardados correctamente.",
    });

    expect(mocks.updateUserProfileSettings).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-1",
        fullName: "Ada Lovelace",
        defaultCurrency: "EUR",
        timezone: "Europe/Madrid",
      })
    );
    expect(mocks.updatePrimaryAccount).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accountId: "acc-1",
        userId: "user-1",
        defaultCurrency: "EUR",
        openingBalance: 250.5,
      })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("returns validation errors when payload is invalid", async () => {
    const result = await updateSettingsAction(
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
    expect(mocks.updateUserProfileSettings).not.toHaveBeenCalled();
  });

  it("returns rate-limit error when mutation guard blocks the request", async () => {
    mocks.guardUserMutation.mockResolvedValue({ allowed: false, retryAfterMs: 1000 });

    const result = await updateSettingsAction({ status: "idle" }, createFormData(validPayload));

    expect(result).toEqual({
      status: "error",
      message: "Demasiados intentos en poco tiempo. Espera un momento y reintenta.",
    });
    expect(mocks.updateUserProfileSettings).not.toHaveBeenCalled();
  });

  it("returns stable error when primary account is missing", async () => {
    mocks.getPrimaryAccount.mockResolvedValue(null);

    const result = await updateSettingsAction({ status: "idle" }, createFormData(validPayload));

    expect(result).toEqual({
      status: "error",
      message: "No pudimos encontrar tu cuenta principal para actualizar el saldo inicial.",
    });
    expect(mocks.updatePrimaryAccount).not.toHaveBeenCalled();
  });
});
