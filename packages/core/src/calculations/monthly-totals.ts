import { roundToCurrency } from "../helpers/currency";
import { compareMonthKeys, toMonthKey, toMonthLabel } from "../helpers/date";
import type { Transaction } from "../types/transaction";

export interface MonthlyTotals {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export const calculateTotalsByMonth = (transactions: Transaction[]): MonthlyTotals[] => {
  const monthlyMap = new Map<string, { income: number; expense: number }>();

  for (const transaction of transactions) {
    const month = toMonthKey(transaction.occurredOn);
    const current = monthlyMap.get(month) ?? { income: 0, expense: 0 };

    if (transaction.kind === "income") {
      current.income += transaction.amount;
    } else {
      current.expense += transaction.amount;
    }

    monthlyMap.set(month, current);
  }

  return Array.from(monthlyMap.entries())
    .sort(([monthA], [monthB]) => compareMonthKeys(monthA, monthB))
    .map(([month, values]) => {
      const income = roundToCurrency(values.income);
      const expense = roundToCurrency(values.expense);
      return {
        month,
        label: toMonthLabel(month),
        income,
        expense,
        net: roundToCurrency(income - expense),
      };
    });
};
