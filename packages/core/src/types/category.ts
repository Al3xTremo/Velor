export type CategoryKind = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  colorHex?: string;
  icon?: string;
  isSystem?: boolean;
  isActive?: boolean;
}
