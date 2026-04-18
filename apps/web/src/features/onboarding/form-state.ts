export interface OnboardingFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialOnboardingFormState: OnboardingFormState = {
  status: "idle",
};
