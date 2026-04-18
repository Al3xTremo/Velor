export {
  dashboardSnapshot,
  type DashboardInput,
  type DashboardSnapshot,
} from "./application/dashboard-snapshot";
export {
  buildDashboardHomeSlice,
  type DashboardHomeSliceResult,
} from "./application/dashboard-home-slice";
export {
  computeBalance,
  type BalanceComputationInput,
  type BalanceComputationResult,
} from "./application/compute-balance";
export { calculateGoalProgress } from "./application/goal-progress";

export {
  calculateCurrentBalance,
  calculateNetSavings,
  type BalanceResult,
} from "./calculations/balance";
export { calculateTotalsByCategory, type CategoryTotal } from "./calculations/category-totals";
export { calculateTotalsByMonth, type MonthlyTotals } from "./calculations/monthly-totals";
export { calculateTemporalEvolution, type BalanceEvolutionPoint } from "./calculations/evolution";
export {
  calculateDistributionPercentages,
  type CategoryDistribution,
} from "./calculations/distribution";

export { formatCurrency, roundToCurrency } from "./helpers/currency";
export { compareMonthKeys, toMonthKey, toMonthLabel } from "./helpers/date";
export { clamp, formatPercentage } from "./helpers/format";

export type { UserProfile } from "./types/user";
export type { Category, CategoryKind } from "./types/category";
export type { CurrencyCode, Money, TimeSeriesPoint } from "./types/common";
export type { Transaction, TransactionSource } from "./types/transaction";
export type { SavingsGoal, SavingsGoalProgress, SavingsGoalStatus } from "./types/savings-goal";
export type { FinanceDataSnapshot, FinanceRepository } from "./ports/finance-repository";
