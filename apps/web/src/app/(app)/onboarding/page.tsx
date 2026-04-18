import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";
import { requireUserSession } from "@/server/application/session-service";
import { getPrimaryAccount, getUserProfile } from "@/server/repositories/profile-repository";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUserSession();

  const [profile, account] = await Promise.all([
    getUserProfile(supabase, user.id),
    getPrimaryAccount(supabase, user.id),
  ]);

  if (profile?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  const initialValues = {
    fullName: profile?.full_name || String(user.user_metadata["full_name"] ?? ""),
    defaultCurrency: profile?.default_currency ?? "EUR",
    timezone: profile?.timezone ?? "UTC",
    openingBalance: String(account?.opening_balance ?? 0),
  };

  return (
    <AppShell
      title="Configuracion inicial"
      subtitle="Ajusta moneda, saldo base y preferencias para personalizar Velor desde el primer dia."
    >
      <OnboardingForm initialValues={initialValues} />
    </AppShell>
  );
}
