import { describe, expect, it, vi } from "vitest";
import { createGoal, setGoalStatus, updateGoal } from "./goals-repository";

describe("goals-repository integration", () => {
  it("creates goal using expected savings_goals columns", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });

    await createGoal({ from } as never, {
      userId: "user-1",
      values: {
        name: "Fondo emergencia",
        targetAmount: 1500,
        currentAmount: 100,
        targetDate: "2026-12-31",
      },
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "Fondo emergencia",
      target_amount: 1500,
      current_amount: 100,
      target_date: "2026-12-31",
      status: "active",
    });
  });

  it("updates and toggles goal status within user scope", async () => {
    const eq = vi.fn().mockReturnThis();
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    await updateGoal({ from } as never, {
      goalId: "goal-1",
      userId: "user-1",
      status: "completed",
      values: {
        name: "Laptop",
        targetAmount: 1800,
        currentAmount: 1800,
        targetDate: undefined,
      },
    });

    await setGoalStatus({ from } as never, {
      goalId: "goal-1",
      userId: "user-1",
      status: "archived",
    });

    expect(update).toHaveBeenNthCalledWith(1, {
      name: "Laptop",
      target_amount: 1800,
      current_amount: 1800,
      target_date: null,
      status: "completed",
    });
    expect(update).toHaveBeenNthCalledWith(2, { status: "archived" });
    expect(eq).toHaveBeenNthCalledWith(1, "id", "goal-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
  });
});
