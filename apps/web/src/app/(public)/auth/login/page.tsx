import Link from "next/link";
import { AuthPanel } from "@/components/layout/auth-panel";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeRedirectPath } from "@/features/auth/utils";

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    message?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeRedirectPath(params.next, "/dashboard");

  return (
    <AuthPanel
      title="Iniciar sesion"
      subtitle="Accede a tus finanzas con una experiencia clara y segura."
    >
      {params.message ? (
        <p className="rounded-xl border border-amber-300 bg-amber-100/70 px-3 py-2 text-sm font-medium text-amber-800">
          {params.message}
        </p>
      ) : null}

      <LoginForm nextPath={nextPath} />

      <div className="space-y-2 text-center text-sm text-velor-muted">
        <p>
          <Link
            className="font-semibold text-velor-primary hover:text-velor-primary-strong"
            href="/auth/forgot-password"
          >
            Olvidaste tu contrasena
          </Link>
        </p>
        <p>
          No tienes cuenta?{" "}
          <Link
            className="font-semibold text-velor-primary hover:text-velor-primary-strong"
            href="/auth/register"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </AuthPanel>
  );
}
