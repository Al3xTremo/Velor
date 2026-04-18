import type { ZodError } from "zod";

export const zodFieldErrors = (error: ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) {
      errors[key] = issue.message;
    }
  }

  return errors;
};

export const CATEGORY_ICON_OPTIONS = [
  "wallet",
  "briefcase",
  "shopping-cart",
  "home",
  "car",
  "heart",
  "film",
  "gift",
  "bolt",
  "piggy-bank",
];
