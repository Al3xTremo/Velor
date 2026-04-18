import { describe, expect, it } from "vitest";
import { buildDashboardHomeSlice } from "../dashboard-home-slice";

describe("application/dashboard home slice", () => {
  it("builds dashboard slice with monthly totals and derived blocks", () => {
    const result = buildDashboardHomeSlice({
      openingBalance: 1000,
      totalNetAmount: 500,
      now: new Date("2026-04-20T12:00:00.000Z"),
      windowTransactions: [
        {
          id: "t1",
          kind: "income",
          source: "salary",
          amount: 2000,
          categoryId: "salary",
          occurredOn: "2026-04-05",
        },
        {
          id: "t2",
          kind: "expense",
          source: "manual",
          amount: 700,
          categoryId: "rent",
          occurredOn: "2026-04-06",
        },
        {
          id: "t3",
          kind: "income",
          source: "manual",
          amount: 900,
          categoryId: "freelance",
          occurredOn: "2026-03-10",
        },
      ],
      recentTransactions: [
        {
          id: "t2",
          kind: "expense",
          source: "manual",
          amount: 700,
          categoryId: "rent",
          occurredOn: "2026-04-06",
        },
      ],
      goals: [
        {
          id: "g1",
          name: "Fondo",
          targetAmount: 5000,
          currentAmount: 2000,
          status: "active",
        },
      ],
      categoryNameById: new Map([
        ["salary", "Salary"],
        ["rent", "Rent"],
        ["freelance", "Freelance"],
      ]),
    });

    expect(result.currentBalance).toBe(1500);
    expect(result.currentMonth.income).toBe(2000);
    expect(result.currentMonth.expense).toBe(700);
    expect(result.previousMonth.income).toBe(900);
    expect(result.distribution[0]?.categoryName).toBe("Rent");
    expect(result.recent[0]?.categoryName).toBe("Rent");
    expect(result.highlightedGoals[0]?.progressPct).toBe(40);
  });
});
