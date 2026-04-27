import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    redirect: vi.fn(),
    requireUserSession: vi.fn(),
    getUserProfile: vi.fn(),
    getPrimaryAccount: vi.fn(),
    getAnalyticsData: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  usePathname: () => "/analytics",
}));

vi.mock("@/server/application/session-service", () => ({
  requireUserSession: mocks.requireUserSession,
}));

vi.mock("@/server/repositories/profile-repository", () => ({
  getUserProfile: mocks.getUserProfile,
  getPrimaryAccount: mocks.getPrimaryAccount,
}));

vi.mock("@/server/repositories/analytics-repository", () => ({
  getAnalyticsData: mocks.getAnalyticsData,
}));

import AnalyticsPage from "./page";

describe("analytics page UX range and empty flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireUserSession.mockResolvedValue({
      supabase: {},
      user: { id: "user-1" },
    });

    mocks.getUserProfile.mockResolvedValue({
      onboarding_completed_at: "2026-04-24T10:00:00.000Z",
      default_currency: "EUR",
    });

    mocks.getPrimaryAccount.mockResolvedValue({
      currency: "EUR",
    });

    mocks.getAnalyticsData.mockResolvedValue({
      categories: [],
      transactions: [],
    });
  });

  it("shows an empty state with useful capture/load CTAs", async () => {
    const ui = await AnalyticsPage({
      searchParams: Promise.resolve({
        from: "2026-01-01",
        to: "2026-01-31",
      }),
    });

    render(ui);

    expect(screen.getByText("No hay datos en el rango seleccionado")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a movimientos" })).toHaveAttribute(
      "href",
      "/transactions"
    );
    expect(screen.getByRole("link", { name: "Ver ultimos 12m" })).toHaveAttribute(
      "href",
      "/analytics?from=2025-01-31&to=2026-01-31"
    );
  });

  it("shows a clamp warning when requested range is recorted", async () => {
    const ui = await AnalyticsPage({
      searchParams: Promise.resolve({
        from: "2020-01-01",
        to: "2026-01-31",
      }),
    });

    render(ui);

    expect(
      screen.getByText(
        /Recortamos el rango solicitado \(2020-01-01 a 2026-01-31\).*Aplicamos 2024-02-01 a 2026-01-31 \(maximo 730 dias\)/
      )
    ).toBeVisible();
  });
});
