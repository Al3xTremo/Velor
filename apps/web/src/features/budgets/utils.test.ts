import { describe, expect, it } from "vitest";
import { currentMonth, monthToRange } from "./utils";

describe("budgets/utils", () => {
  it("converts month key into start and end dates", () => {
    expect(monthToRange("2026-02")).toEqual({
      startsOn: "2026-02-01",
      endsOn: "2026-02-28",
    });
  });

  it("handles leap-year boundaries correctly", () => {
    expect(monthToRange("2024-02").endsOn).toBe("2024-02-29");
  });

  it("returns YYYY-MM format for current month", () => {
    expect(currentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });
});
