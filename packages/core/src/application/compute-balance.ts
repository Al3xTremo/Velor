import type { Money } from "../types/common";
import type { Transaction } from "../types/transaction";
import { calculateCurrentBalance, type BalanceResult } from "../calculations/balance";

export interface BalanceComputationInput {
  openingBalance: Money;
  transactions: Transaction[];
}

export type BalanceComputationResult = BalanceResult;

export const computeBalance = ({
  openingBalance,
  transactions,
}: BalanceComputationInput): BalanceComputationResult => {
  return calculateCurrentBalance(openingBalance, transactions);
};
