import { describe, expect, it } from "vitest";
import {
  dashboardSliceQuerySchema,
  dashboardSliceResponseSchema,
  mobileSessionSchema,
} from "./mobile-slice";

describe("contracts/mobile-slice", () => {
  it("accepts valid mobile session payload", () => {
    const parsed = mobileSessionSchema.safeParse({
      userId: "9f5d7b8c-0498-4a13-95cb-c3250a1adf37",
      email: "mobile@velor.dev",
      onboardingCompleted: true,
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts valid dashboard query", () => {
    const parsed = dashboardSliceQuerySchema.safeParse({
      from: "2026-01-01",
      to: "2026-06-30",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid dashboard response", () => {
    const parsed = dashboardSliceResponseSchema.safeParse({
      balance: "wrong",
      currentMonth: { income: 1, expense: 2, net: 3 },
      previousMonth: { income: 1, expense: 2, net: 3 },
      keyMetrics: [],
    });

    expect(parsed.success).toBe(false);
  });
});
