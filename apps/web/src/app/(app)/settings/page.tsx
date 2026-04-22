import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { requireUserSession } from "@/server/application/session-service";
import { getPrimaryAccount, getUserProfile } from "@/server/repositories/profile-repository";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user } = await requireUserSession();

  const [profile, account] = await Promise.all([
    getUserProfile(supabase, user.id),
    getPrimaryAccount(supabase, user.id),
  ]);

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

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
      <SettingsForm initialValues={initialValues} />
    </AppShell>
  );
}
