import type { CategoryKind } from "./category";

export type TransactionSource = "manual" | "salary";

export interface Transaction {
  id?: string;
  kind: CategoryKind;
  source?: TransactionSource;
  amount: number;
  categoryId: string;
  occurredOn: string;
  description?: string;
  notes?: string;
}
