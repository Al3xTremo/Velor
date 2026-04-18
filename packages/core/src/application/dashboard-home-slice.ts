import { calculateDistributionPercentages } from "../calculations/distribution";
import { calculateTemporalEvolution } from "../calculations/evolution";
import { calculateTotalsByMonth } from "../calculations/monthly-totals";
import type { SavingsGoal } from "../types/savings-goal";
import type { Transaction } from "../types/transaction";
import { calculateGoalProgress } from "./goal-progress";

interface DashboardHomeSliceInput {
  openingBalance: number;
  totalNetAmount: number;
  now: Date;
  windowTransactions: Transaction[];
  recentTransactions: Transaction[];
  goals: SavingsGoal[];
  categoryNameById: Map<string, string>;
}

export interface DashboardHomeSliceResult {
  currentBalance: number;
  currentMonth: {
    income: number;
    expense: number;
    net: number;
  };
  previousMonth: {
    income: number;
    expense: number;
    net: number;
  };
  distribution: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    pct: number;
  }>;
  evolution: ReturnType<typeof calculateTemporalEvolution>;
  recent: Array<{
    id?: string;
    occurredOn: string;
    kind: "income" | "expense";
    source: "manual" | "salary";
    categoryName: string;
    amount: number;
  }>;
  highlightedGoals: Array<{
    id: string;
    name: string;
    progressPct: number;
    remainingAmount: number;
  }>;
}

const toMonthKey = (date: Date) => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthStart = (date: Date, offset = 0) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
};

const asIsoDate = (date: Date) => {
  return date.toISOString().slice(0, 10);
};

export const buildDashboardHomeSlice = (
  input: DashboardHomeSliceInput
): DashboardHomeSliceResult => {
  const currentMonthKey = toMonthKey(monthStart(input.now, 0));
  const previousMonthKey = toMonthKey(monthStart(input.now, -1));
  const monthlyTotals = calculateTotalsByMonth(input.windowTransactions);
  const currentMonthTotals = monthlyTotals.find((item) => item.month === currentMonthKey);
  const previousMonthTotals = monthlyTotals.find((item) => item.month === previousMonthKey);

  const currentMonthTransactions = input.windowTransactions.filter(
    (item) => item.occurredOn >= asIsoDate(monthStart(input.now, 0))
  );

  const distribution = calculateDistributionPercentages(currentMonthTransactions, "expense")
    .slice(0, 6)
    .map((item) => ({
      categoryId: item.categoryId,
      categoryName: input.categoryNameById.get(item.categoryId) ?? "Sin categoria",
      amount: item.amount,
      pct: item.pct,
    }));

  const evolution = calculateTemporalEvolution(input.openingBalance, input.windowTransactions);

  const recent = input.recentTransactions.map((item) => ({
    ...(item.id ? { id: item.id } : {}),
    occurredOn: item.occurredOn,
    kind: item.kind,
    source: item.source ?? "manual",
    categoryName: input.categoryNameById.get(item.categoryId) ?? "Sin categoria",
    amount: item.amount,
  }));

  const highlightedGoals = input.goals.map((goal) => {
    const progress = calculateGoalProgress(goal);

    return {
      id: goal.id,
      name: goal.name,
      progressPct: progress.progressPct,
      remainingAmount: progress.remainingAmount,
    };
  });

  return {
    currentBalance: input.openingBalance + input.totalNetAmount,
    currentMonth: {
      income: currentMonthTotals?.income ?? 0,
      expense: currentMonthTotals?.expense ?? 0,
      net: currentMonthTotals?.net ?? 0,
    },
    previousMonth: {
      income: previousMonthTotals?.income ?? 0,
      expense: previousMonthTotals?.expense ?? 0,
      net: previousMonthTotals?.net ?? 0,
    },
    distribution,
    evolution,
    recent,
    highlightedGoals,
  };
};
