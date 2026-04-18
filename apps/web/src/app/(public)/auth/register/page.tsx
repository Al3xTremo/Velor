import Link from "next/link";
import { AuthPanel } from "@/components/layout/auth-panel";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthPanel title="Crear cuenta" subtitle="Empieza hoy con control total de tus finanzas.">
      <RegisterForm />

      <p className="text-center text-sm text-velor-muted">
        Ya tienes cuenta?{" "}
        <Link
          className="font-semibold text-velor-primary hover:text-velor-primary-strong"
          href="/auth/login"
        >
          Entrar
        </Link>
      </p>
    </AuthPanel>
  );
}
