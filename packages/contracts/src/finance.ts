import { z } from "zod";

const moneyAmount = z.number().finite().nonnegative();

export const currencySchema = z.enum(["EUR", "USD"]);
export const transactionSourceSchema = z.enum(["manual", "salary"]);

export const openingBalanceSchema = z.object({
  amount: moneyAmount,
  currency: currencySchema,
});

export const createTransactionSchema = z
  .object({
    kind: z.enum(["income", "expense"]),
    source: transactionSourceSchema.default("manual"),
    amount: moneyAmount,
    categoryId: z.string().min(1).max(64),
    occurredOn: z.string().date(),
  })
  .superRefine((input, context) => {
    if (input.source === "salary" && input.kind !== "income") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source"],
        message: "salary source is only valid for income transactions",
      });
    }
  });

export const createGoalSchema = z.object({
  id: z.string().min(1).max(64),
  targetAmount: moneyAmount,
  currentAmount: moneyAmount,
});

export type OpeningBalanceInput = z.infer<typeof openingBalanceSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
