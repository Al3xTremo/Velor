import type { CurrencyCode } from "./common";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  defaultCurrency: CurrencyCode;
  timezone: string;
  onboardingCompletedAt?: string;
}
