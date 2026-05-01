import {
  calculateDistributionPercentages,
  calculateTotalsByMonth,
  formatCurrency,
} from "@velor/core";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { DateRangeFilter } from "@/features/analytics/components/date-range-filter";
import { DonutExpenseChart } from "@/features/analytics/components/donut-expense-chart";
import { InsightsCard } from "@/features/analytics/components/insights-card";
import { MonthlyBarsChart } from "@/features/analytics/components/monthly-bars-chart";
import { TemporalIncomeExpenseChart } from "@/features/analytics/components/temporal-income-expense-chart";
import {
  buildAnalyticsRangePresets,
  clampAnalyticsRange,
  isIsoDate,
  MAX_ANALYTICS_RANGE_DAYS,
  toIsoDate,
} from "@/features/analytics/range";
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

const analyticsHref = (from: string, to: string) => {
  return `/analytics?${new URLSearchParams({ from, to }).toString()}`;
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  return measureServerOperation("analytics.page.load", async () => {
    try {
      const params = await searchParams;

      const today = new Date();
      const todayIso = toIsoDate(today);
      const initialPresets = buildAnalyticsRangePresets(todayIso);
      const defaultRange = initialPresets.find((item) => item.key === "6m") ??
        initialPresets[0] ?? {
          from: todayIso,
          to: todayIso,
        };
      const requestedFrom = isIsoDate(params.from) ? params.from : defaultRange.from;
      const requestedTo = isIsoDate(params.to) ? params.to : defaultRange.to;
      const {
        from,
        to,
        clamped,
        requestedFrom: rawRequestedFrom,
        requestedTo: rawRequestedTo,
      } = clampAnalyticsRange({
        from: requestedFrom,
        to: requestedTo,
      });
      const presets = buildAnalyticsRangePresets(to);

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
            requestedFrom: rawRequestedFrom,
            requestedTo: rawRequestedTo,
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

      const clampedNotice = clamped
        ? {
            requestedFrom: rawRequestedFrom,
            requestedTo: rawRequestedTo,
            appliedFrom: from,
            appliedTo: to,
            maxDays: MAX_ANALYTICS_RANGE_DAYS,
          }
        : undefined;

      const range12Months = presets.find((item) => item.key === "12m");
      const broadenRangeHref = range12Months
        ? analyticsHref(range12Months.from, range12Months.to)
        : "/analytics";

      if (mappedTransactions.length === 0) {
        return (
          <AppShell
            title="Analitica visual"
            subtitle="Lectura clara de patrones de gasto, ingresos y evolucion para decisiones mas inteligentes."
          >
            <DateRangeFilter
              from={from}
              to={to}
              presets={presets}
              {...(clampedNotice ? { clampNotice: clampedNotice } : {})}
            />

            <EmptyState
              title="No hay datos en el rango seleccionado"
              description="No encontramos movimientos para este periodo. Registra nuevas transacciones o amplia el rango para cargar mas historial y recuperar contexto."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <a href="/transactions" className="velor-btn-primary">
                    Ir a movimientos
                  </a>
                  <a href={broadenRangeHref} className="velor-btn-secondary">
                    Ver ultimos 12m
                  </a>
                </div>
              }
            />
          </AppShell>
        );
      }

      return (
        <AppShell
          title="Analitica visual"
          subtitle="Lectura clara de patrones de gasto, ingresos y evolucion para decisiones mas inteligentes."
        >
          <DateRangeFilter
            from={from}
            to={to}
            presets={presets}
            {...(clampedNotice ? { clampNotice: clampedNotice } : {})}
          />

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
