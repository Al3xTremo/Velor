import { describe, expect, it } from "vitest";
import { calculateDistributionPercentages } from "../distribution";
import { calculateTemporalEvolution } from "../evolution";
import { calculateTotalsByCategory } from "../category-totals";
import { calculateTotalsByMonth } from "../monthly-totals";
import type { Transaction } from "../../types/transaction";

const transactions: Transaction[] = [
  {
    kind: "income",
    source: "salary",
    amount: 2500,
    categoryId: "salary",
    occurredOn: "2026-03-01",
  },
  { kind: "expense", amount: 700, categoryId: "rent", occurredOn: "2026-03-02" },
  { kind: "expense", amount: 200, categoryId: "groceries", occurredOn: "2026-03-06" },
  { kind: "income", amount: 300, categoryId: "freelance", occurredOn: "2026-04-03" },
  { kind: "expense", amount: 1000, categoryId: "rent", occurredOn: "2026-04-07" },
];

describe("analytics calculations", () => {
  it("groups totals by category", () => {
    const totals = calculateTotalsByCategory(transactions, "expense");
    expect(totals).toEqual([
      { categoryId: "rent", amount: 1700 },
      { categoryId: "groceries", amount: 200 },
    ]);
  });

  it("groups totals by month and computes net", () => {
    const monthly = calculateTotalsByMonth(transactions);
    expect(monthly).toHaveLength(2);
    expect(monthly[0]?.month).toBe("2026-03");
    expect(monthly[0]?.net).toBe(1600);
    expect(monthly[1]?.month).toBe("2026-04");
    expect(monthly[1]?.net).toBe(-700);
  });

  it("calculates temporal evolution", () => {
    const evolution = calculateTemporalEvolution(1000, transactions);
    expect(evolution[0]?.balance).toBe(2600);
    expect(evolution[1]?.balance).toBe(1900);
  });

  it("calculates distribution percentages", () => {
    const distribution = calculateDistributionPercentages(transactions, "expense");
    expect(distribution[0]?.pct).toBeCloseTo(89.47, 2);
    expect(distribution[1]?.pct).toBeCloseTo(10.53, 2);
  });
});
