import { describe, expect, it, vi } from "vitest";
import {
  createSubscriptionRule,
  listSubscriptionRulesForUser,
  toggleSubscriptionRuleActiveStatus,
  updateSubscriptionRule,
} from "./subscriptions-repository";

describe("subscriptions-repository integration", () => {
  it("lists recurring rules ordered by next date and name", async () => {
    const orderByName = vi.fn().mockResolvedValue({
      data: [
        {
          id: "sub-1",
          name: "Internet hogar",
          amount: 49.99,
          category_id: "cat-1",
          interval: "monthly",
          next_charge_on: "2026-05-10",
          is_active: true,
        },
      ],
    });
    const orderByNextCharge = vi.fn().mockReturnValue({ order: orderByName });
    const eq = vi.fn().mockReturnValue({ order: orderByNextCharge });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const rows = await listSubscriptionRulesForUser({ from } as never, "user-1");

    expect(select).toHaveBeenCalledWith(
      "id,name,amount,category_id,interval,next_charge_on,is_active"
    );
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(orderByNextCharge).toHaveBeenCalledWith("next_charge_on", { ascending: true });
    expect(orderByName).toHaveBeenCalledWith("name", { ascending: true });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("sub-1");
  });

  it("creates, updates and toggles recurring rules in user scope", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const eq = vi.fn().mockReturnThis();
    const update = vi.fn().mockReturnValue({ eq });

    const from = vi.fn((table: string) => {
      if (table === "subscriptions") {
        return {
          insert,
          update,
        };
      }

      return {};
    });

    await createSubscriptionRule({ from } as never, {
      userId: "user-1",
      accountId: "acc-1",
      values: {
        name: "Internet hogar",
        amount: 49.99,
        categoryId: "cat-1",
        interval: "monthly",
        nextChargeOn: "2026-05-10",
        isActive: true,
      },
    });

    await updateSubscriptionRule({ from } as never, {
      subscriptionId: "sub-1",
      userId: "user-1",
      values: {
        name: "Internet hogar",
        amount: 52.99,
        categoryId: "cat-1",
        interval: "monthly",
        nextChargeOn: "2026-06-10",
        isActive: false,
      },
    });

    await toggleSubscriptionRuleActiveStatus({ from } as never, {
      subscriptionId: "sub-1",
      userId: "user-1",
      isActive: true,
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      account_id: "acc-1",
      category_id: "cat-1",
      name: "Internet hogar",
      amount: 49.99,
      interval: "monthly",
      next_charge_on: "2026-05-10",
      is_active: true,
    });

    expect(update).toHaveBeenNthCalledWith(1, {
      category_id: "cat-1",
      name: "Internet hogar",
      amount: 52.99,
      interval: "monthly",
      next_charge_on: "2026-06-10",
      is_active: false,
    });
    expect(update).toHaveBeenNthCalledWith(2, { is_active: true });

    expect(eq).toHaveBeenNthCalledWith(1, "id", "sub-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    expect(eq).toHaveBeenNthCalledWith(3, "id", "sub-1");
    expect(eq).toHaveBeenNthCalledWith(4, "user_id", "user-1");
  });
});
