export interface SettingsFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export interface SubscriptionRuleFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialSettingsFormState: SettingsFormState = {
  status: "idle",
};

export const initialSubscriptionRuleFormState: SubscriptionRuleFormState = {
  status: "idle",
};
