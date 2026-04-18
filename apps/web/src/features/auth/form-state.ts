export interface AuthFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialAuthFormState: AuthFormState = {
  status: "idle",
};
