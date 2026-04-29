import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AnalyticsRangePreset } from "@/features/analytics/range";
import { DateRangeFilter } from "./date-range-filter";

const presets: AnalyticsRangePreset[] = [
  { key: "30d", label: "30d", from: "2026-04-01", to: "2026-04-30" },
  { key: "90d", label: "90d", from: "2026-01-31", to: "2026-04-30" },
  { key: "6m", label: "6m", from: "2025-10-30", to: "2026-04-30" },
  { key: "12m", label: "12m", from: "2025-04-30", to: "2026-04-30" },
];

describe("DateRangeFilter", () => {
  it("renders preset links and marks the active range", () => {
    render(<DateRangeFilter from="2026-01-31" to="2026-04-30" presets={presets} />);

    expect(screen.getByRole("link", { name: "30d" })).toHaveAttribute(
      "href",
      "/analytics?from=2026-04-01&to=2026-04-30"
    );
    expect(screen.getByRole("link", { name: "90d" })).toHaveAttribute(
      "class",
      expect.stringContaining("velor-btn-primary")
    );
    expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toBe("2026-01-31");
    expect((screen.getByLabelText("Hasta") as HTMLInputElement).value).toBe("2026-04-30");
  });

  it("shows a clear clamp notice when range is recorted", () => {
    render(
      <DateRangeFilter
        from="2024-04-30"
        to="2026-04-30"
        presets={presets}
        clampNotice={{
          requestedFrom: "2020-01-01",
          requestedTo: "2026-04-30",
          appliedFrom: "2024-04-30",
          appliedTo: "2026-04-30",
          maxDays: 730,
        }}
      />
    );

    expect(
      screen.getByText(
        /Recortamos el rango solicitado \(2020-01-01 a 2026-04-30\).*Aplicamos 2024-04-30 a 2026-04-30 \(maximo 730 dias\)/
      )
    ).toBeVisible();
  });
});
