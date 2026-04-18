import { z } from "zod";
import { currencySchema, transactionSourceSchema } from "./finance";

const amountSchema = z.coerce.number().finite().nonnegative();

export const userProfileFormSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  defaultCurrency: currencySchema,
  timezone: z.string().trim().min(2).max(100),
});

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(["income", "expense"]),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#64748B"),
  icon: z.string().trim().max(40).optional(),
});

export const transactionFormSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    kind: z.enum(["income", "expense"]),
    source: transactionSourceSchema.default("manual"),
    amount: amountSchema,
    categoryId: z.string().trim().min(1).max(64),
    occurredOn: z.string().date(),
    description: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(500).optional(),
    isRecurring: z.coerce.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.source === "salary" && value.kind !== "income") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source"],
        message: "salary source requires income kind",
      });
    }
  });

export const transactionFiltersSchema = z.object({
  query: z.string().trim().max(120).optional(),
  kind: z.enum(["income", "expense"]).optional(),
  categoryId: z.string().trim().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const savingsGoalFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetAmount: amountSchema.refine((amount) => amount > 0, {
    message: "target amount must be greater than zero",
  }),
  currentAmount: amountSchema.default(0),
  targetDate: z.string().date().optional(),
});

export const budgetLimitFormSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  categoryId: z.string().trim().min(1).max(64),
  limitAmount: z.coerce.number().finite().positive(),
});

export type UserProfileFormInput = z.infer<typeof userProfileFormSchema>;
export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
export type TransactionFormInput = z.infer<typeof transactionFormSchema>;
export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;
export type SavingsGoalFormInput = z.infer<typeof savingsGoalFormSchema>;
export type BudgetLimitFormInput = z.infer<typeof budgetLimitFormSchema>;
