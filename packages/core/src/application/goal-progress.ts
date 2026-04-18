import { clamp } from "../helpers/format";
import type { SavingsGoal, SavingsGoalProgress } from "../types/savings-goal";

export const calculateGoalProgress = (goal: SavingsGoal): SavingsGoalProgress => {
  const safeTarget = goal.targetAmount <= 0 ? 0 : goal.targetAmount;
  const progressBase = safeTarget === 0 ? 100 : (goal.currentAmount / safeTarget) * 100;

  return {
    ...goal,
    progressPct: Math.round(clamp(progressBase, 0, 100)),
    remainingAmount: Math.max(safeTarget - goal.currentAmount, 0),
  };
};
