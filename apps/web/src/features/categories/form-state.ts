export interface CategoryFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialCategoryFormState: CategoryFormState = {
  status: "idle",
};
