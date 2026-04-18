export interface BudgetFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialBudgetFormState: BudgetFormState = {
  status: "idle",
};
