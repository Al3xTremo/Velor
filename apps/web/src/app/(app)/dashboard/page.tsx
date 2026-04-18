import { buildDashboardHomeSlice, formatCurrency } from "@velor/core";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { LogoutForm } from "@/features/auth/components/logout-form";
import { ComparisonNote } from "@/features/dashboard/components/comparison-note";
import { DistributionCard } from "@/features/dashboard/components/distribution-card";
import { EvolutionCard } from "@/features/dashboard/components/evolution-card";
import { HighlightedGoalsCard } from "@/features/dashboard/components/highlighted-goals-card";
import { LatestTransactionsCard } from "@/features/dashboard/components/latest-transactions-card";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { QuickActionsCard } from "@/features/dashboard/components/quick-actions-card";
import { reportUnexpectedError } from "@/server/observability/errors";
import { logEvent } from "@/server/observability/logger";
import { measureServerOperation } from "@/server/observability/perf";
import { requireUserSession } from "@/server/application/session-service";
import { getDashboardData } from "@/server/repositories/dashboard-repository";
import { listHighlightedGoalsForDashboard } from "@/server/repositories/goals-repository";
import { getPrimaryAccount, getUserProfile } from "@/server/repositories/profile-repository";

export const dynamic = "force-dynamic";

const monthStart = (date: Date, offset = 0) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
};

const percentDeltaLabel = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? "sin cambios" : "nuevo registro";
  }

  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta.toFixed(1)}% vs mes anterior`;
};

export default async function DashboardPage() {
  return measureServerOperation("dashboard.page.load", async () => {
    try {
      const { supabase, user } = await requireUserSession();

      const now = new Date();
      const fromDate = monthStart(now, -5).toISOString().slice(0, 10);

      const [profile, account, dashboardData, goals] = await Promise.all([
        getUserProfile(supabase, user.id),
        getPrimaryAccount(supabase, user.id),
        getDashboardData(supabase, {
          userId: user.id,
          fromDate,
        }),
        listHighlightedGoalsForDashboard(supabase, user.id),
      ]);

      const { windowTransactions, recentTransactions, categories, totals } = dashboardData;

      logEvent({
        level: "info",
        event: "dashboard.data.shape",
        scope: "performance",
        expected: true,
        meta: {
          windowTransactions: windowTransactions.length,
          recentTransactions: recentTransactions.length,
          categories: categories.length,
        },
      });

      if (!profile?.onboarding_completed_at) {
        redirect("/onboarding");
      }

      const currency = account?.currency ?? profile.default_currency;
      const openingBalance = account?.opening_balance ?? 0;
      const categoryNameById = new Map(categories.map((item) => [item.id, item.name]));

      const mappedTransactions = windowTransactions.map((item) => ({
        id: item.id,
        kind: item.kind,
        source: item.source,
        amount: item.amount,
        categoryId: item.category_id ?? "uncategorized",
        occurredOn: item.occurred_on,
        description: item.description,
      }));

      const homeSlice = buildDashboardHomeSlice({
        openingBalance,
        totalNetAmount: totals.net,
        now,
        windowTransactions: mappedTransactions,
        recentTransactions: recentTransactions.map((item) => ({
          id: item.id,
          kind: item.kind,
          source: item.source,
          amount: item.amount,
          categoryId: item.category_id ?? "uncategorized",
          occurredOn: item.occurred_on,
        })),
        goals: goals.map((goal) => ({
          id: goal.id,
          name: goal.name,
          targetAmount: goal.target_amount,
          currentAmount: goal.current_amount,
          targetDate: goal.target_date ?? undefined,
          status: goal.status,
        })),
        categoryNameById,
      });

      const evolution = homeSlice.evolution.map((point) => ({
        ...point,
        formattedBalance: formatCurrency(point.balance, currency),
      }));

      const recentItems = homeSlice.recent.map((item) => ({
        id: item.id ?? `${item.occurredOn}-${item.amount}-${item.kind}`,
        ...item,
        amount: formatCurrency(item.amount, currency),
      }));

      const highlightedGoals = homeSlice.highlightedGoals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        progressPct: goal.progressPct,
        remainingLabel: formatCurrency(goal.remainingAmount, currency),
      }));

      const distribution = homeSlice.distribution.map((item) => ({
        ...item,
        amount: formatCurrency(item.amount, currency),
      }));

      return (
        <AppShell
          title={`Hola, ${profile.full_name || "Usuario"}`}
          subtitle="Tu centro de control financiero con foco mensual, evolucion y accion rapida."
          actions={<LogoutForm />}
        >
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              metric={{
                label: "Balance actual",
                value: formatCurrency(homeSlice.currentBalance, currency),
                helper: "Saldo consolidado",
                trend: {
                  label: homeSlice.currentMonth.net >= 0 ? "Mes en positivo" : "Mes en negativo",
                  tone: homeSlice.currentMonth.net >= 0 ? "positive" : "negative",
                },
              }}
            />
            <MetricCard
              metric={{
                label: "Ingresos del mes",
                value: formatCurrency(homeSlice.currentMonth.income, currency),
                helper: "Mes actual",
                trend: {
                  label: percentDeltaLabel(
                    homeSlice.currentMonth.income,
                    homeSlice.previousMonth.income
                  ),
                  tone:
                    homeSlice.currentMonth.income >= homeSlice.previousMonth.income
                      ? "positive"
                      : "warning",
                },
              }}
            />
            <MetricCard
              metric={{
                label: "Gastos del mes",
                value: formatCurrency(homeSlice.currentMonth.expense, currency),
                helper: "Mes actual",
                trend: {
                  label: percentDeltaLabel(
                    homeSlice.currentMonth.expense,
                    homeSlice.previousMonth.expense
                  ),
                  tone:
                    homeSlice.currentMonth.expense <= homeSlice.previousMonth.expense
                      ? "positive"
                      : "negative",
                },
              }}
            />
            <MetricCard
              metric={{
                label: "Ahorro neto",
                value: formatCurrency(homeSlice.currentMonth.net, currency),
                helper: "Ingresos - gastos del mes",
                trend: {
                  label: homeSlice.currentMonth.net >= 0 ? "Objetivo en curso" : "Requiere ajuste",
                  tone: homeSlice.currentMonth.net >= 0 ? "positive" : "negative",
                },
              }}
            />
          </section>

          <ComparisonNote
            incomeChangeLabel={percentDeltaLabel(
              homeSlice.currentMonth.income,
              homeSlice.previousMonth.income
            )}
            expenseChangeLabel={percentDeltaLabel(
              homeSlice.currentMonth.expense,
              homeSlice.previousMonth.expense
            )}
          />

          <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <DistributionCard items={distribution} />
            <HighlightedGoalsCard goals={highlightedGoals} />
          </section>

          <QuickActionsCard />

          <EvolutionCard points={evolution} />

          <LatestTransactionsCard items={recentItems} />
        </AppShell>
      );
    } catch (error) {
      reportUnexpectedError("dashboard.page.unexpected_error", "dashboard", error);
      throw error;
    }
  });
}
