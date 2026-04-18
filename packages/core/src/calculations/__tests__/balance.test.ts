import { describe, expect, it } from "vitest";
import { calculateCurrentBalance, calculateNetSavings } from "../balance";
import type { Transaction } from "../../types/transaction";

describe("balance calculations", () => {
  it("calculates current balance and net savings", () => {
    const transactions: Transaction[] = [
      { kind: "income", amount: 3000, categoryId: "salary", occurredOn: "2026-04-01" },
      { kind: "expense", amount: 900, categoryId: "rent", occurredOn: "2026-04-02" },
      { kind: "expense", amount: 250.5, categoryId: "groceries", occurredOn: "2026-04-04" },
    ];

    const result = calculateCurrentBalance({ amount: 1000, currency: "EUR" }, transactions);

    expect(result.totalIncome).toBe(3000);
    expect(result.totalExpense).toBe(1150.5);
    expect(result.netSavings).toBe(1849.5);
    expect(result.currentBalance).toBe(2849.5);
    expect(calculateNetSavings(transactions)).toBe(1849.5);
  });
});
