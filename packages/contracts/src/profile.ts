import { z } from "zod";
import { currencySchema } from "./finance";

export const profileSetupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  defaultCurrency: currencySchema,
  timezone: z.string().trim().min(2).max(100),
  openingBalance: z.coerce.number().finite().min(-999999999999.99).max(999999999999.99),
});

export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;
