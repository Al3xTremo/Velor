import type { Money } from "../types/common";
import type { SavingsGoal } from "../types/savings-goal";
import type { Transaction } from "../types/transaction";
import { calculateCurrentBalance } from "../calculations/balance";
import { calculateDistributionPercentages } from "../calculations/distribution";
import { calculateTemporalEvolution } from "../calculations/evolution";
import { calculateGoalProgress } from "./goal-progress";

export interface DashboardInput {
  openingBalance: Money;
  transactions: Transaction[];
  goals: SavingsGoal[];
}

export interface DashboardSnapshot {
  balance: {
    amount: number;
    currency: Money["currency"];
  };
  totals: {
    income: number;
    expense: number;
    netSavings: number;
  };
  distribution: ReturnType<typeof calculateDistributionPercentages>;
  evolution: ReturnType<typeof calculateTemporalEvolution>;
  goals: ReturnType<typeof calculateGoalProgress>[];
}

export const dashboardSnapshot = (input: DashboardInput): DashboardSnapshot => {
  const balance = calculateCurrentBalance(input.openingBalance, input.transactions);

  return {
    balance: {
      amount: balance.currentBalance,
      currency: balance.currency,
    },
    totals: {
      income: balance.totalIncome,
      expense: balance.totalExpense,
      netSavings: balance.netSavings,
    },
    distribution: calculateDistributionPercentages(input.transactions, "expense"),
    evolution: calculateTemporalEvolution(input.openingBalance.amount, input.transactions),
    goals: input.goals.map(calculateGoalProgress),
  };
};
