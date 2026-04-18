import { roundToCurrency } from "../helpers/currency";
import { calculateTotalsByMonth } from "./monthly-totals";
import type { Transaction } from "../types/transaction";

export interface BalanceEvolutionPoint {
  month: string;
  label: string;
  balance: number;
}

export const calculateTemporalEvolution = (
  openingBalance: number,
  transactions: Transaction[]
): BalanceEvolutionPoint[] => {
  let runningBalance = openingBalance;

  return calculateTotalsByMonth(transactions).map((monthTotals) => {
    runningBalance += monthTotals.net;

    return {
      month: monthTotals.month,
      label: monthTotals.label,
      balance: roundToCurrency(runningBalance),
    };
  });
};
