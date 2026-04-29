import { formatCurrency } from "@velor/core";
import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { SubscriptionRulesSection } from "@/features/settings/components/subscription-rules-section";
import { requireUserSession } from "@/server/application/session-service";
import { listCategoryOptionsForUser } from "@/server/repositories/categories-repository";
import { getPrimaryAccount, getUserProfile } from "@/server/repositories/profile-repository";
import { listSubscriptionRulesForUser } from "@/server/repositories/subscriptions-repository";

export const dynamic = "force-dynamic";

interface SettingsPageProps {
  searchParams: Promise<{
    editSubscription?: string;
    notice?: "subscription_toggled" | "subscription_error" | "subscription_rate_limited";
  }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const { supabase, user } = await requireUserSession();

  const [profile, account, categoryOptions, subscriptionRules] = await Promise.all([
    getUserProfile(supabase, user.id),
    getPrimaryAccount(supabase, user.id),
    listCategoryOptionsForUser(supabase, user.id),
    listSubscriptionRulesForUser(supabase, user.id),
  ]);

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const expenseCategoryOptions = categoryOptions.filter((item) => item.kind === "expense");
  const activeExpenseCategoryOptions = expenseCategoryOptions.filter(
    (item) => item.is_system || item.is_active
  );

  const editingRule = params.editSubscription
    ? (subscriptionRules.find((rule) => rule.id === params.editSubscription) ?? null)
    : null;

  const editingCategory = editingRule
    ? (expenseCategoryOptions.find((item) => item.id === editingRule.category_id) ?? null)
    : null;

  const recurringCategories =
    editingCategory && !activeExpenseCategoryOptions.some((item) => item.id === editingCategory.id)
      ? [
          ...activeExpenseCategoryOptions,
          {
            ...editingCategory,
            name: `${editingCategory.name} (archivada)`,
          },
        ]
      : activeExpenseCategoryOptions;

  const categoryNameById = new Map(expenseCategoryOptions.map((item) => [item.id, item.name]));

  const recurringRows = subscriptionRules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    amountFormatted: formatCurrency(rule.amount, account?.currency ?? profile.default_currency),
    categoryName: categoryNameById.get(rule.category_id) ?? "Sin categoria",
    intervalLabel:
      rule.interval === "weekly" ? "Semanal" : rule.interval === "monthly" ? "Mensual" : "Anual",
    nextChargeOn: rule.next_charge_on,
    isActive: rule.is_active,
    editHref: `/settings?editSubscription=${rule.id}#recurrencias`,
  }));

  const recurringEditingRule = editingRule
    ? {
        id: editingRule.id,
        name: editingRule.name,
        amount: String(editingRule.amount),
        categoryId: editingRule.category_id,
        interval: editingRule.interval,
        nextChargeOn: editingRule.next_charge_on,
        isActive: editingRule.is_active,
      }
    : null;

  const initialValues = {
    fullName: profile.full_name || String(user.user_metadata["full_name"] ?? ""),
    defaultCurrency: account?.currency ?? profile.default_currency,
    timezone: profile.timezone ?? "UTC",
    openingBalance: String(account?.opening_balance ?? 0),
  };

  return (
    <AppShell
      title="Perfil y ajustes"
      subtitle="Gestiona los datos base de tu cuenta para mantener una lectura financiera consistente en toda la app."
    >
      {params.notice === "subscription_toggled" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Regla recurrente actualizada correctamente.
        </p>
      ) : null}
      {params.notice === "subscription_error" ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No pudimos completar la accion sobre la regla recurrente.
        </p>
      ) : null}
      {params.notice === "subscription_rate_limited" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Demasiados intentos en poco tiempo. Espera un momento y vuelve a intentarlo.
        </p>
      ) : null}

      <SettingsForm initialValues={initialValues} />
      <SubscriptionRulesSection
        categories={recurringCategories.map((item) => ({
          id: item.id,
          name: item.name,
        }))}
        rows={recurringRows}
        editingRule={recurringEditingRule}
      />
    </AppShell>
  );
}
