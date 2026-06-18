import Link from "next/link";
import { AuthPanel } from "@/components/layout/auth-panel";
import { ResendConfirmationForm } from "@/features/auth/components/resend-confirmation-form";

export default function ConfirmEmailPage() {
  return (
    <AuthPanel
      title="Confirmar correo"
      subtitle="Si ya creaste tu cuenta pero no encuentras el mensaje, te reenviamos un nuevo enlace de confirmacion."
    >
      <ResendConfirmationForm />

      <div className="space-y-2 text-center text-sm text-velor-muted">
        <p>Despues de confirmar tu correo, podras entrar con normalidad.</p>
        <p>
          <Link
            className="font-semibold text-velor-primary hover:text-velor-primary-strong"
            href="/auth/login"
          >
            Volver a iniciar sesion
          </Link>
        </p>
      </div>
    </AuthPanel>
  );
}
