import { describe, expect, it } from "vitest";
import { calculateGoalProgress } from "../goal-progress";
import { dashboardSnapshot } from "../dashboard-snapshot";

describe("application/dashboard snapshot", () => {
  it("builds a consistent dashboard snapshot from domain inputs", () => {
    const snapshot = dashboardSnapshot({
      openingBalance: { amount: 500, currency: "EUR" },
      transactions: [
        {
          kind: "income",
          source: "salary",
          amount: 2500,
          categoryId: "salary",
          occurredOn: "2026-04-01",
        },
        { kind: "expense", amount: 1000, categoryId: "rent", occurredOn: "2026-04-03" },
      ],
      goals: [
        { id: "g1", name: "Fondo", targetAmount: 5000, currentAmount: 1500, status: "active" },
      ],
    });

    expect(snapshot.balance).toEqual({ amount: 2000, currency: "EUR" });
    expect(snapshot.totals.income).toBe(2500);
    expect(snapshot.totals.expense).toBe(1000);
    expect(snapshot.totals.netSavings).toBe(1500);
    expect(snapshot.distribution[0]?.categoryId).toBe("rent");
    expect(snapshot.goals[0]?.progressPct).toBe(30);
  });

  it("clamps goal progress and protects remaining amount", () => {
    const overTarget = calculateGoalProgress({
      id: "g2",
      name: "Viaje",
      targetAmount: 1000,
      currentAmount: 1400,
      status: "active",
    });

    expect(overTarget.progressPct).toBe(100);
    expect(overTarget.remainingAmount).toBe(0);
  });
});
