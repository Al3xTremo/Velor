export interface TransactionFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialTransactionFormState: TransactionFormState = {
  status: "idle",
};
