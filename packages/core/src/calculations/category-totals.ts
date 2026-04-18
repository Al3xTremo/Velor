import { roundToCurrency } from "../helpers/currency";
import type { Transaction } from "../types/transaction";

export interface CategoryTotal {
  categoryId: string;
  amount: number;
}

export const calculateTotalsByCategory = (
  transactions: Transaction[],
  kind: Transaction["kind"] = "expense"
): CategoryTotal[] => {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.kind !== kind) {
      continue;
    }

    totals.set(
      transaction.categoryId,
      (totals.get(transaction.categoryId) ?? 0) + transaction.amount
    );
  }

  return Array.from(totals.entries())
    .map(([categoryId, amount]) => ({ categoryId, amount: roundToCurrency(amount) }))
    .sort((a, b) => b.amount - a.amount);
};
