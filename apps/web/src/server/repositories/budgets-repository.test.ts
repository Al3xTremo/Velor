import { describe, expect, it, vi } from "vitest";
import { createMonthlyBudget, removeBudgetLimit, upsertBudgetLimit } from "./budgets-repository";

describe("budgets-repository integration", () => {
  it("creates monthly budget with deterministic naming", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "budget-1" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });

    await createMonthlyBudget({ from } as never, {
      userId: "user-1",
      month: "2026-04",
      startsOn: "2026-04-01",
      endsOn: "2026-04-30",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "Presupuesto 2026-04",
      period: "monthly",
      starts_on: "2026-04-01",
      ends_on: "2026-04-30",
      is_active: true,
    });
    expect(select).toHaveBeenCalledWith("id");
  });

  it("upserts and deletes budget limits with ownership constraints", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });

    const eq = vi.fn().mockReturnThis();
    const deleteFn = vi.fn().mockReturnValue({ eq });

    const from = vi.fn((table: string) => {
      if (table === "budget_limits") {
        return {
          upsert,
          delete: deleteFn,
        };
      }

      return {};
    });

    await upsertBudgetLimit({ from } as never, {
      userId: "user-1",
      budgetId: "budget-1",
      categoryId: "cat-1",
      limitAmount: 250,
    });

    await removeBudgetLimit({ from } as never, {
      budgetLimitId: "limit-1",
      userId: "user-1",
    });

    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        budget_id: "budget-1",
        category_id: "cat-1",
        limit_amount: 250,
      },
      { onConflict: "budget_id,category_id" }
    );
    expect(eq).toHaveBeenNthCalledWith(1, "id", "limit-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
  });
});
