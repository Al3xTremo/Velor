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
    updateUserProfileSettings: vi.fn(),
    getPrimaryAccount: vi.fn(),
    updatePrimaryAccount: vi.fn(),
    createSubscriptionRule: vi.fn(),
    updateSubscriptionRule: vi.fn(),
    toggleSubscriptionRuleActiveStatus: vi.fn(),
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

vi.mock("@/server/repositories/profile-repository", () => ({
  updateUserProfileSettings: mocks.updateUserProfileSettings,
  getPrimaryAccount: mocks.getPrimaryAccount,
  updatePrimaryAccount: mocks.updatePrimaryAccount,
}));

vi.mock("@/server/repositories/subscriptions-repository", () => ({
  createSubscriptionRule: mocks.createSubscriptionRule,
  updateSubscriptionRule: mocks.updateSubscriptionRule,
  toggleSubscriptionRuleActiveStatus: mocks.toggleSubscriptionRuleActiveStatus,
}));

import {
  toggleSubscriptionRuleAction,
  updateSettingsAction,
  upsertSubscriptionRuleAction,
} from "./actions";

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

  const validSubscriptionPayload = {
    name: "Internet hogar",
    amount: "49.99",
    categoryId: "11111111-1111-4111-8111-111111111111",
    interval: "monthly",
    nextChargeOn: "2026-05-10",
    isActive: "on",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTrustedActionOrigin.mockResolvedValue(true);
    mocks.requireUserSession.mockResolvedValue({ user: { id: "user-1" }, supabase: {} });
    mocks.guardUserMutation.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    mocks.updateUserProfileSettings.mockResolvedValue({ error: null });
    mocks.getPrimaryAccount.mockResolvedValue({ id: "acc-1" });
    mocks.updatePrimaryAccount.mockResolvedValue({ error: null });
    mocks.createSubscriptionRule.mockResolvedValue({ error: null });
    mocks.updateSubscriptionRule.mockResolvedValue({ error: null });
    mocks.toggleSubscriptionRuleActiveStatus.mockResolvedValue({ error: null });
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

  it("creates recurring rules over subscriptions with valid payload", async () => {
    const result = await upsertSubscriptionRuleAction(
      { status: "idle" },
      createFormData(validSubscriptionPayload)
    );

    expect(result).toEqual({
      status: "success",
      message: "Regla recurrente creada correctamente.",
    });
    expect(mocks.createSubscriptionRule).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-1",
        accountId: "acc-1",
      })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("updates recurring rules when subscription id is provided", async () => {
    const result = await upsertSubscriptionRuleAction(
      { status: "idle" },
      createFormData({
        ...validSubscriptionPayload,
        subscriptionId: "22222222-2222-4222-8222-222222222222",
      })
    );

    expect(result).toEqual({
      status: "success",
      message: "Regla recurrente actualizada correctamente.",
    });
    expect(mocks.updateSubscriptionRule).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        subscriptionId: "22222222-2222-4222-8222-222222222222",
        userId: "user-1",
      })
    );
    expect(mocks.createSubscriptionRule).not.toHaveBeenCalled();
  });

  it("returns validation errors for invalid recurring payload", async () => {
    const result = await upsertSubscriptionRuleAction(
      { status: "idle" },
      createFormData({
        name: "",
        amount: "0",
        categoryId: "",
        interval: "daily",
        nextChargeOn: "invalid",
      })
    );

    expect(result.status).toBe("error");
    expect(result.message).toBe("Revisa los campos de la regla recurrente.");
    expect(result.fieldErrors).toEqual(expect.objectContaining({ name: expect.any(String) }));
    expect(mocks.createSubscriptionRule).not.toHaveBeenCalled();
    expect(mocks.updateSubscriptionRule).not.toHaveBeenCalled();
  });

  it("toggles recurring rule active status and redirects with success notice", async () => {
    await expect(
      toggleSubscriptionRuleAction(
        createFormData({
          subscriptionId: "33333333-3333-4333-8333-333333333333",
          nextIsActive: "false",
          returnTo: "/settings?editSubscription=33333333-3333-4333-8333-333333333333",
        })
      )
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/settings?notice=subscription_toggled"),
    });

    expect(mocks.toggleSubscriptionRuleActiveStatus).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        subscriptionId: "33333333-3333-4333-8333-333333333333",
        userId: "user-1",
        isActive: false,
      })
    );
  });
});
