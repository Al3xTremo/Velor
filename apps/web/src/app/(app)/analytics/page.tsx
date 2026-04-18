import {
  calculateDistributionPercentages,
  calculateTotalsByMonth,
  formatCurrency,
} from "@velor/core";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DateRangeFilter } from "@/features/analytics/components/date-range-filter";
import { DonutExpenseChart } from "@/features/analytics/components/donut-expense-chart";
import { InsightsCard } from "@/features/analytics/components/insights-card";
import { MonthlyBarsChart } from "@/features/analytics/components/monthly-bars-chart";
import { TemporalIncomeExpenseChart } from "@/features/analytics/components/temporal-income-expense-chart";
import { buildInsights, monthKey } from "@/features/analytics/utils";
import { reportUnexpectedError } from "@/server/observability/errors";
import { logEvent } from "@/server/observability/logger";
import { measureServerOperation } from "@/server/observability/perf";
import { requireUserSession } from "@/server/application/session-service";
import { getAnalyticsData } from "@/server/repositories/analytics-repository";
import { getPrimaryAccount, getUserProfile } from "@/server/repositories/profile-repository";

export const dynamic = "force-dynamic";

interface AnalyticsPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);
const MAX_ANALYTICS_RANGE_DAYS = 730;

const clampRange = (from: string, to: string) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return { from, to, clamped: false };
  }

  const days = Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= MAX_ANALYTICS_RANGE_DAYS) {
    return { from, to, clamped: false };
  }

  const clampedFrom = new Date(toDate.getTime() - MAX_ANALYTICS_RANGE_DAYS * 24 * 60 * 60 * 1000);
  return {
    from: toIsoDate(clampedFrom),
    to,
    clamped: true,
  };
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  return measureServerOperation("analytics.page.load", async () => {
    try {
      const params = await searchParams;

      const today = new Date();
      const defaultFrom = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
      const requestedFrom =
        params.from && params.from.length === 10 ? params.from : toIsoDate(defaultFrom);
      const requestedTo = params.to && params.to.length === 10 ? params.to : toIsoDate(today);
      const { from, to, clamped } = clampRange(requestedFrom, requestedTo);

      const { supabase, user } = await requireUserSession();

      const [profile, account, analyticsData] = await Promise.all([
        getUserProfile(supabase, user.id),
        getPrimaryAccount(supabase, user.id),
        getAnalyticsData(supabase, { userId: user.id, from, to }),
      ]);

      const { categories, transactions } = analyticsData;

      logEvent({
        level: "info",
        event: "analytics.data.shape",
        scope: "performance",
        expected: true,
        meta: {
          categories: categories.length,
          transactions: transactions.length,
          from,
          to,
        },
      });

      if (clamped) {
        logEvent({
          level: "warn",
          event: "analytics.range.clamped",
          scope: "analytics",
          expected: true,
          meta: {
            requestedFrom,
            requestedTo,
            appliedFrom: from,
            appliedTo: to,
          },
        });
      }

      if (!profile?.onboarding_completed_at) {
        redirect("/onboarding");
      }

      const currency = account?.currency ?? profile.default_currency;
      const categoryById = new Map(categories.map((item) => [item.id, item]));
      const mappedTransactions = transactions.map((item) => ({
        kind: item.kind,
        amount: item.amount,
        categoryId: item.category_id ?? "uncategorized",
        occurredOn: item.occurred_on,
      }));

      const monthly = calculateTotalsByMonth(mappedTransactions).map((item) => ({
        ...item,
        incomeLabel: formatCurrency(item.income, currency),
        expenseLabel: formatCurrency(item.expense, currency),
      }));

      const distribution = calculateDistributionPercentages(mappedTransactions, "expense")
        .slice(0, 7)
        .map((item) => ({
          categoryId: item.categoryId,
          categoryName: categoryById.get(item.categoryId)?.name ?? "Sin categoria",
          amountLabel: formatCurrency(item.amount, currency),
          pct: item.pct,
          colorHex: categoryById.get(item.categoryId)?.color_hex ?? "#64748B",
        }));

      const currentMonth = monthKey(to);
      const insights = buildInsights({
        transactions: mappedTransactions,
        categoryNameById: new Map(
          Array.from(categoryById.entries()).map(([id, value]) => [id, value.name])
        ),
        currentMonth,
      });

      const totalExpense = mappedTransactions
        .filter((item) => item.kind === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

      return (
        <AppShell
          title="Analitica visual"
          subtitle="Lectura clara de patrones de gasto, ingresos y evolucion para decisiones mas inteligentes."
        >
          <DateRangeFilter from={from} to={to} />

          <section className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
            <DonutExpenseChart
              items={distribution}
              totalLabel={formatCurrency(totalExpense, currency)}
            />
            <InsightsCard insights={insights} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <MonthlyBarsChart items={monthly} />
            <TemporalIncomeExpenseChart points={monthly} />
          </section>

          <section className="rounded-xl border border-velor-border bg-velor-elevated px-5 py-4">
            <h3 className="font-display text-base font-semibold text-velor-text">
              Preparado para siguientes capas
            </h3>
            <p className="mt-1 text-sm text-velor-muted">
              Este modulo queda listo para incorporar presupuestos mensuales, alertas de sobrecoste
              y predicciones simples de flujo sin rehacer la base actual.
            </p>
          </section>
        </AppShell>
      );
    } catch (error) {
      reportUnexpectedError("analytics.page.unexpected_error", "analytics", error);
      throw error;
    }
  });
}
