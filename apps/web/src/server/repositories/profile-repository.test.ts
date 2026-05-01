import { describe, expect, it, vi } from "vitest";
import {
  createPrimaryAccount,
  updateUserProfileSettings,
  updatePrimaryAccount,
  upsertOnboardingProfile,
} from "./profile-repository";

describe("profile-repository integration", () => {
  it("updates onboarding profile with completion timestamp", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    await upsertOnboardingProfile({ from } as never, {
      userId: "user-1",
      fullName: "Ada Lovelace",
      defaultCurrency: "EUR",
      timezone: "Europe/Madrid",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Ada Lovelace",
        default_currency: "EUR",
        timezone: "Europe/Madrid",
        onboarding_completed_at: expect.any(String),
      })
    );
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("updates profile settings without touching onboarding timestamp", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    await updateUserProfileSettings({ from } as never, {
      userId: "user-1",
      fullName: "Ada Lovelace",
      defaultCurrency: "USD",
      timezone: "UTC",
    });

    expect(update).toHaveBeenCalledWith({
      full_name: "Ada Lovelace",
      default_currency: "USD",
      timezone: "UTC",
    });
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("creates and updates primary account in user scope", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const eq = vi.fn().mockReturnThis();
    const update = vi.fn().mockReturnValue({ eq });

    const from = vi.fn((table: string) => {
      if (table === "accounts") {
        return {
          insert,
          update,
        };
      }

      return {};
    });

    await createPrimaryAccount({ from } as never, {
      userId: "user-1",
      defaultCurrency: "USD",
      openingBalance: 500,
    });

    await updatePrimaryAccount({ from } as never, {
      accountId: "acc-1",
      userId: "user-1",
      defaultCurrency: "EUR",
      openingBalance: 700,
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "Principal",
      currency: "USD",
      opening_balance: 500,
      is_primary: true,
    });
    expect(update).toHaveBeenCalledWith({
      currency: "EUR",
      opening_balance: 700,
    });
    expect(eq).toHaveBeenNthCalledWith(1, "id", "acc-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
  });
});
