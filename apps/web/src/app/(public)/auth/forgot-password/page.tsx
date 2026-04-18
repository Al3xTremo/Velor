import Link from "next/link";
import { AuthPanel } from "@/components/layout/auth-panel";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthPanel
      title="Recuperar contrasena"
      subtitle="Te enviaremos un enlace seguro para restablecer tu acceso."
    >
      <ForgotPasswordForm />

      <p className="text-center text-sm text-velor-muted">
        <Link
          className="font-semibold text-velor-primary hover:text-velor-primary-strong"
          href="/auth/login"
        >
          Volver a iniciar sesion
        </Link>
      </p>
    </AuthPanel>
  );
}
