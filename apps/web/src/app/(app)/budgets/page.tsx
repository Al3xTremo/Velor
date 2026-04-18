import { formatCurrency } from "@velor/core";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BudgetAlertsCard } from "@/features/budgets/components/budget-alerts-card";
import { BudgetLimitsTable } from "@/features/budgets/components/budget-limits-table";
import { BudgetMonthFilter } from "@/features/budgets/components/budget-month-filter";
import { currentMonth, monthToRange } from "@/features/budgets/utils";
import { requireUserSession } from "@/server/application/session-service";
import { findMonthlyBudget, listBudgetLimits } from "@/server/repositories/budgets-repository";
import { listCategoriesForUser } from "@/server/repositories/categories-repository";
import { getPrimaryAccount, getUserProfile } from "@/server/repositories/profile-repository";
import { listTransactionsForUser } from "@/server/repositories/transactions-repository";

export const dynamic = "force-dynamic";

interface BudgetsPageProps {
  searchParams: Promise<{
    month?: string;
    notice?: string;
  }>;
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const params = await searchParams;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth();
  const range = monthToRange(month);

  const { supabase, user } = await requireUserSession();

  const [profile, account, budget, categories, transactions] = await Promise.all([
    getUserProfile(supabase, user.id),
    getPrimaryAccount(supabase, user.id),
    findMonthlyBudget(supabase, { userId: user.id, startsOn: range.startsOn }),
    listCategoriesForUser(supabase, user.id),
    listTransactionsForUser(supabase, {
      userId: user.id,
      filters: {
        kind: "expense",
        from: range.startsOn,
        to: range.endsOn,
      },
    }),
  ]);

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const currency = account?.currency ?? profile.default_currency;
  const budgetId = budget?.id;

  const limits = budgetId
    ? await listBudgetLimits(supabase, { userId: user.id, budgetId })
    : ([] as Array<{ id: string; category_id: string; limit_amount: number }>);
  const limitByCategory = new Map(limits.map((item) => [item.category_id, item]));

  const spendingByCategory = new Map<string, number>();
  for (const row of transactions) {
    const key = row.category_id ?? "uncategorized";
    spendingByCategory.set(key, (spendingByCategory.get(key) ?? 0) + row.amount);
  }

  const rows = categories
    .filter((item) => item.is_system || item.is_active)
    .map((category) => {
      const spent = spendingByCategory.get(category.id) ?? 0;
      const limit = limitByCategory.get(category.id);
      const limitAmount = limit?.limit_amount ?? 0;
      const usagePct = limitAmount > 0 ? (spent / limitAmount) * 100 : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        colorHex: category.color_hex,
        spentLabel: formatCurrency(spent, currency),
        spentAmount: spent,
        limitLabel: limitAmount > 0 ? formatCurrency(limitAmount, currency) : "Sin limite",
        limitAmount,
        usagePct,
        budgetLimitId: limit?.id,
      };
    })
    .sort((a, b) => b.spentAmount - a.spentAmount);

  const overBudget = rows
    .filter((row) => row.limitAmount > 0 && row.usagePct > 100)
    .slice(0, 4)
    .map((row) => ({
      categoryName: row.categoryName,
      spentLabel: row.spentLabel,
      limitLabel: row.limitLabel,
      usagePct: row.usagePct,
    }));

  const nearLimit = rows
    .filter((row) => row.limitAmount > 0 && row.usagePct >= 85 && row.usagePct <= 100)
    .slice(0, 4)
    .map((row) => ({
      categoryName: row.categoryName,
      spentLabel: row.spentLabel,
      limitLabel: row.limitLabel,
      usagePct: row.usagePct,
    }));

  return (
    <AppShell
      title="Presupuestos"
      subtitle="Control mensual por categoria con alertas tempranas para evitar desbordes de gasto."
    >
      {params.notice === "removed" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Limite eliminado correctamente.
        </p>
      ) : null}
      {params.notice === "error" ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No pudimos completar la accion solicitada.
        </p>
      ) : null}
      {params.notice === "rate_limited" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Demasiados intentos en poco tiempo. Espera un momento y vuelve a intentarlo.
        </p>
      ) : null}

      <BudgetMonthFilter month={month} />

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <BudgetLimitsTable month={month} rows={rows} />
        <BudgetAlertsCard overBudget={overBudget} nearLimit={nearLimit} />
      </section>
    </AppShell>
  );
}
