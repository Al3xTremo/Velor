import { describe, expect, it } from "vitest";
import { budgetLimitFormSchema, transactionFormSchema } from "./forms";

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
});
