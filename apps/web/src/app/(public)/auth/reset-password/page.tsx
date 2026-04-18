import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/layout/auth-panel";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=Solicita+un+nuevo+enlace+de+recuperacion");
  }

  return (
    <AuthPanel title="Nueva contrasena" subtitle="Define una contrasena segura para tu cuenta.">
      <ResetPasswordForm />
    </AuthPanel>
  );
}
