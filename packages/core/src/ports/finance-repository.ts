import type { SavingsGoal } from "../types/savings-goal";
import type { Transaction } from "../types/transaction";

export interface FinanceDataSnapshot {
  transactions: Transaction[];
  goals: SavingsGoal[];
}

export interface FinanceRepository {
  getSnapshot(userId: string, from?: string, to?: string): Promise<FinanceDataSnapshot>;
}
