import { z } from "zod";

export const mobileSessionSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  onboardingCompleted: z.boolean(),
});

export const dashboardSliceQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const dashboardSliceMetricSchema = z.object({
  label: z.string().min(1).max(64),
  amount: z.number().finite(),
});

export const dashboardSliceResponseSchema = z.object({
  balance: z.number().finite(),
  currentMonth: z.object({
    income: z.number().finite(),
    expense: z.number().finite(),
    net: z.number().finite(),
  }),
  previousMonth: z.object({
    income: z.number().finite(),
    expense: z.number().finite(),
    net: z.number().finite(),
  }),
  keyMetrics: z.array(dashboardSliceMetricSchema).max(6),
});

export type MobileSession = z.infer<typeof mobileSessionSchema>;
export type DashboardSliceQuery = z.infer<typeof dashboardSliceQuerySchema>;
export type DashboardSliceResponse = z.infer<typeof dashboardSliceResponseSchema>;
