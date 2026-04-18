import { roundToCurrency } from "../helpers/currency";
import { clamp } from "../helpers/format";
import type { Transaction } from "../types/transaction";
import { calculateTotalsByCategory } from "./category-totals";

export interface CategoryDistribution {
  categoryId: string;
  amount: number;
  pct: number;
}

export const calculateDistributionPercentages = (
  transactions: Transaction[],
  kind: Transaction["kind"] = "expense"
): CategoryDistribution[] => {
  const totals = calculateTotalsByCategory(transactions, kind);
  const grandTotal = totals.reduce((accumulator, item) => accumulator + item.amount, 0);

  if (grandTotal <= 0) {
    return totals.map((item) => ({ ...item, pct: 0 }));
  }

  return totals.map((item) => ({
    categoryId: item.categoryId,
    amount: item.amount,
    pct: roundToCurrency(clamp((item.amount / grandTotal) * 100, 0, 100)),
  }));
};
