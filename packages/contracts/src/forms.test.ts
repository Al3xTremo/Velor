import { describe, expect, it } from "vitest";
import { budgetLimitFormSchema, subscriptionRuleFormSchema, transactionFormSchema } from "./forms";

describe("contracts/forms", () => {
  it("rejects salary transactions when kind is not income", () => {
    const parsed = transactionFormSchema.safeParse({
      name: "Pago incorrecto",
      kind: "expense",
      source: "salary",
      amount: 1200,
      categoryId: "salary",
      occurredOn: "2026-04-01",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(["source"]);
    }
  });

  it("accepts a valid monthly budget limit payload", () => {
    const parsed = budgetLimitFormSchema.safeParse({
      month: "2026-04",
      categoryId: "rent",
      limitAmount: "1500",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limitAmount).toBe(1500);
    }
  });

  it("rejects non-positive budget limits", () => {
    const parsed = budgetLimitFormSchema.safeParse({
      month: "2026-04",
      categoryId: "rent",
      limitAmount: 0,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a valid recurring rule payload", () => {
    const parsed = subscriptionRuleFormSchema.safeParse({
      name: "Internet hogar",
      amount: "49.99",
      categoryId: "rent",
      interval: "monthly",
      nextChargeOn: "2026-05-10",
      isActive: "true",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(49.99);
      expect(parsed.data.isActive).toBe(true);
    }
  });

  it("rejects recurring rules with invalid interval", () => {
    const parsed = subscriptionRuleFormSchema.safeParse({
      name: "Internet hogar",
      amount: 49.99,
      categoryId: "rent",
      interval: "daily",
      nextChargeOn: "2026-05-10",
      isActive: true,
    });

    expect(parsed.success).toBe(false);
  });
});
