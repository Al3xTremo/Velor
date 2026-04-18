import { describe, expect, it, vi } from "vitest";
import { createTransaction, updateTransaction } from "./transactions-repository";

describe("transactions-repository integration", () => {
  it("maps create transaction payload to persisted columns", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const supabase = { from };

    await createTransaction(supabase as never, {
      userId: "user-1",
      accountId: "acc-1",
      occurredMonth: "2026-04-01",
      values: {
        categoryId: "cat-1",
        kind: "expense",
        source: "manual",
        name: "Cafe",
        amount: 12.5,
        description: "Desayuno",
        notes: "Capuccino",
        isRecurring: false,
        occurredOn: "2026-04-12",
      },
    });

    expect(from).toHaveBeenCalledWith("transactions");
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      account_id: "acc-1",
      category_id: "cat-1",
      kind: "expense",
      source: "manual",
      name: "Cafe",
      amount: 12.5,
      description: "Desayuno",
      notes: "Capuccino",
      is_recurring: false,
      occurred_on: "2026-04-12",
      occurred_month: "2026-04-01",
    });
  });

  it("updates only transaction row owned by user", async () => {
    const eq = vi.fn();
    eq.mockReturnValue({ eq });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    const supabase = { from };

    await updateTransaction(supabase as never, {
      transactionId: "tx-1",
      userId: "user-1",
      occurredMonth: "2026-05-01",
      values: {
        categoryId: "cat-2",
        kind: "income",
        source: "salary",
        name: "Nomina",
        amount: 3200,
        description: "Mayo",
        notes: "",
        isRecurring: true,
        occurredOn: "2026-05-01",
      },
    });

    expect(update).toHaveBeenCalledWith({
      category_id: "cat-2",
      kind: "income",
      source: "salary",
      name: "Nomina",
      amount: 3200,
      description: "Mayo",
      notes: "",
      is_recurring: true,
      occurred_on: "2026-05-01",
      occurred_month: "2026-05-01",
    });
    expect(eq).toHaveBeenNthCalledWith(1, "id", "tx-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
  });
});
