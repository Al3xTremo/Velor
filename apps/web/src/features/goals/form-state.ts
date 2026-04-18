export interface GoalFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialGoalFormState: GoalFormState = {
  status: "idle",
};
