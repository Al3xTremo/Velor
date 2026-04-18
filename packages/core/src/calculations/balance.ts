import { roundToCurrency } from "../helpers/currency";
import type { Money } from "../types/common";
import type { Transaction } from "../types/transaction";

export interface BalanceResult {
  currency: Money["currency"];
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  currentBalance: number;
}

export const calculateCurrentBalance = (
  openingBalance: Money,
  transactions: Transaction[]
): BalanceResult => {
  const totals = transactions.reduce(
    (accumulator, transaction) => {
      if (transaction.kind === "income") {
        accumulator.income += transaction.amount;
      } else {
        accumulator.expense += transaction.amount;
      }

      return accumulator;
    },
    { income: 0, expense: 0 }
  );

  const totalIncome = roundToCurrency(totals.income);
  const totalExpense = roundToCurrency(totals.expense);
  const netSavings = roundToCurrency(totalIncome - totalExpense);

  return {
    currency: openingBalance.currency,
    openingBalance: roundToCurrency(openingBalance.amount),
    totalIncome,
    totalExpense,
    netSavings,
    currentBalance: roundToCurrency(openingBalance.amount + netSavings),
  };
};

export const calculateNetSavings = (transactions: Transaction[]) => {
  return calculateCurrentBalance({ amount: 0, currency: "EUR" }, transactions).netSavings;
};
