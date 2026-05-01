import { describe, expect, it } from "vitest";
import { buildAnalyticsRangePresets, clampAnalyticsRange } from "./range";

describe("analytics range helpers", () => {
  it("builds expected quick presets from a base date", () => {
    const presets = buildAnalyticsRangePresets("2026-04-30");

    expect(presets).toHaveLength(4);
    expect(presets.map((item) => item.key)).toEqual(["30d", "90d", "6m", "12m"]);
    expect(presets.find((item) => item.key === "30d")).toEqual({
      key: "30d",
      label: "30d",
      from: "2026-04-01",
      to: "2026-04-30",
    });
    expect(presets.find((item) => item.key === "90d")).toEqual({
      key: "90d",
      label: "90d",
      from: "2026-01-31",
      to: "2026-04-30",
    });
  });

  it("keeps ranges within the max window untouched", () => {
    const result = clampAnalyticsRange({
      from: "2025-08-01",
      to: "2026-04-30",
    });

    expect(result).toEqual({
      requestedFrom: "2025-08-01",
      requestedTo: "2026-04-30",
      from: "2025-08-01",
      to: "2026-04-30",
      clamped: false,
    });
  });

  it("clamps overly large ranges to the allowed max", () => {
    const result = clampAnalyticsRange({
      from: "2020-01-01",
      to: "2026-04-30",
    });

    expect(result).toEqual({
      requestedFrom: "2020-01-01",
      requestedTo: "2026-04-30",
      from: "2024-04-30",
      to: "2026-04-30",
      clamped: true,
    });
  });
});
