import Link from "next/link";
import { AuthPanel } from "@/components/layout/auth-panel";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthPanel
      title="Crear cuenta"
      subtitle="Empieza hoy con control total de tus finanzas. Te enviaremos un correo de confirmacion para activar el acceso."
    >
      <RegisterForm />

      <div className="space-y-2 text-center text-sm text-velor-muted">
        <p>Solo podras iniciar sesion cuando abras el enlace de confirmacion del correo.</p>
        <p>
          Ya tienes cuenta?{" "}
          <Link
            className="font-semibold text-velor-primary hover:text-velor-primary-strong"
            href="/auth/login"
          >
            Entrar
          </Link>
        </p>
      </div>
    </AuthPanel>
  );
}
