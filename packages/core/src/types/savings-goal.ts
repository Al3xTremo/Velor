export type SavingsGoalStatus = "active" | "completed" | "paused" | "archived";

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  status?: SavingsGoalStatus;
}

export interface SavingsGoalProgress extends SavingsGoal {
  progressPct: number;
  remainingAmount: number;
}
