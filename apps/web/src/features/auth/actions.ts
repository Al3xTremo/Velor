"use server";

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@velor/contracts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getWebEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  sendPasswordRecovery,
  signInWithPassword,
  signOutUser,
  signUpUser,
  updateUserPassword,
} from "@/server/repositories/auth-repository";
import { clearLoginLock, guardAuthAttempt, guardLoginLock } from "@/server/security/auth-guard";
import { logSecurityEvent } from "@/server/security/audit-log";
import { isNextNavigationError, reportUnexpectedError } from "@/server/observability/errors";
import { isTrustedActionOrigin } from "@/server/security/origin-guard";
import { getRequestFingerprint } from "@/server/security/request-fingerprint";
import type { AuthFormState } from "./form-state";
import { safeRedirectPath, zodFieldErrors } from "./utils";

const getSiteUrl = async () => {
  const env = getWebEnv();

  if (env.NEXT_PUBLIC_SITE_URL) {
    return env.NEXT_PUBLIC_SITE_URL;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return "http://localhost:3000";
  }

  return `${proto}://${host}`;
};

export const loginAction = async (
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> => {
  try {
    const fingerprint = await getRequestFingerprint();
    const trustedOrigin = await isTrustedActionOrigin();
    if (!trustedOrigin) {
      logSecurityEvent({ event: "auth.login.invalid_origin", severity: "warn", fingerprint });
      return {
        status: "error",
        message: "No pudimos validar el origen de la solicitud.",
      };
    }
    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const attemptGuard = await guardAuthAttempt(fingerprint, "login");
    if (!attemptGuard.allowed) {
      logSecurityEvent({
        event: "auth.login.rate_limited",
        severity: "warn",
        fingerprint,
        details: {
          retryAfterMs: attemptGuard.retryAfterMs,
          strategy: attemptGuard.strategy ?? "unknown",
          degraded: attemptGuard.degraded ?? false,
        },
      });
      return {
        status: "error",
        message: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
      };
    }

    const parsedPayload = loginSchema.safeParse(payload);

    if (!parsedPayload.success) {
      logSecurityEvent({
        event: "auth.login.invalid_payload",
        severity: "warn",
        fingerprint,
      });
      return {
        status: "error",
        message: "Revisa los campos del formulario.",
        fieldErrors: zodFieldErrors(parsedPayload.error),
      };
    }

    const lockGuard = await guardLoginLock(fingerprint, parsedPayload.data.email);
    if (!lockGuard.allowed) {
      logSecurityEvent({
        event: "auth.login.locked",
        severity: "warn",
        fingerprint,
        details: {
          retryAfterMs: lockGuard.retryAfterMs,
          strategy: lockGuard.strategy ?? "unknown",
          degraded: lockGuard.degraded ?? false,
        },
      });
      return {
        status: "error",
        message: "Demasiados intentos fallidos. Espera antes de reintentar.",
      };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await signInWithPassword(supabase, parsedPayload.data);

    if (error) {
      logSecurityEvent({
        event: "auth.login.failed",
        severity: "warn",
        fingerprint,
        details: { reason: error.message },
      });
      return {
        status: "error",
        message: "No pudimos iniciar sesion. Verifica tus credenciales.",
      };
    }

    await clearLoginLock(fingerprint, parsedPayload.data.email);
    logSecurityEvent({ event: "auth.login.success", fingerprint });

    const nextPath = safeRedirectPath(String(formData.get("next") ?? ""), "/dashboard");
    redirect(nextPath);
  } catch (error) {
    if (isNextNavigationError(error)) {
      throw error;
    }

    reportUnexpectedError("auth.login.unexpected_error", "auth", error);
    return {
      status: "error",
      message: "No pudimos iniciar sesion por un error inesperado. Intentalo nuevamente.",
    };
  }
};

export const registerAction = async (
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> => {
  try {
    const fingerprint = await getRequestFingerprint();
    const trustedOrigin = await isTrustedActionOrigin();
    if (!trustedOrigin) {
      logSecurityEvent({ event: "auth.register.invalid_origin", severity: "warn", fingerprint });
      return {
        status: "error",
        message: "No pudimos validar el origen de la solicitud.",
      };
    }
    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      defaultCurrency: String(formData.get("defaultCurrency") ?? "EUR"),
    };

    const parsedPayload = registerSchema.safeParse(payload);

    const attemptGuard = await guardAuthAttempt(fingerprint, "register");
    if (!attemptGuard.allowed) {
      logSecurityEvent({
        event: "auth.register.rate_limited",
        severity: "warn",
        fingerprint,
        details: {
          retryAfterMs: attemptGuard.retryAfterMs,
          strategy: attemptGuard.strategy ?? "unknown",
          degraded: attemptGuard.degraded ?? false,
        },
      });
      return {
        status: "error",
        message: "Demasiados intentos. Espera antes de crear otra cuenta.",
      };
    }

    if (!parsedPayload.success) {
      return {
        status: "error",
        message: "Revisa los campos del formulario.",
        fieldErrors: zodFieldErrors(parsedPayload.error),
      };
    }

    const supabase = await createSupabaseServerClient();
    const siteUrl = await getSiteUrl();

    const { data, error } = await signUpUser(supabase, {
      email: parsedPayload.data.email,
      password: parsedPayload.data.password,
      fullName: parsedPayload.data.fullName,
      defaultCurrency: parsedPayload.data.defaultCurrency,
      redirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
    });

    if (error) {
      logSecurityEvent({
        event: "auth.register.failed",
        severity: "warn",
        fingerprint,
        details: { reason: error.message },
      });
      return {
        status: "error",
        message: "No pudimos crear tu cuenta. Intentalo nuevamente.",
      };
    }

    if (data.session) {
      logSecurityEvent({ event: "auth.register.success_with_session", fingerprint });
      redirect("/onboarding");
    }

    logSecurityEvent({ event: "auth.register.success_pending_confirmation", fingerprint });

    return {
      status: "success",
      message: "Cuenta creada. Revisa tu correo para confirmar el acceso.",
    };
  } catch (error) {
    if (isNextNavigationError(error)) {
      throw error;
    }

    reportUnexpectedError("auth.register.unexpected_error", "auth", error);
    return {
      status: "error",
      message: "No pudimos completar el registro por un error inesperado.",
    };
  }
};

export const forgotPasswordAction = async (
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> => {
  try {
    const fingerprint = await getRequestFingerprint();
    const trustedOrigin = await isTrustedActionOrigin();
    if (!trustedOrigin) {
      logSecurityEvent({
        event: "auth.forgot_password.invalid_origin",
        severity: "warn",
        fingerprint,
      });
      return {
        status: "error",
        message: "No pudimos validar el origen de la solicitud.",
      };
    }
    const payload = {
      email: String(formData.get("email") ?? ""),
    };

    const parsedPayload = forgotPasswordSchema.safeParse(payload);

    const attemptGuard = await guardAuthAttempt(fingerprint, "forgot");
    if (!attemptGuard.allowed) {
      logSecurityEvent({
        event: "auth.forgot_password.rate_limited",
        severity: "warn",
        fingerprint,
        details: {
          retryAfterMs: attemptGuard.retryAfterMs,
          strategy: attemptGuard.strategy ?? "unknown",
          degraded: attemptGuard.degraded ?? false,
        },
      });
      return {
        status: "error",
        message: "Demasiados intentos. Espera antes de solicitar otro enlace.",
      };
    }

    if (!parsedPayload.success) {
      return {
        status: "error",
        message: "Revisa el correo ingresado.",
        fieldErrors: zodFieldErrors(parsedPayload.error),
      };
    }

    const supabase = await createSupabaseServerClient();
    const siteUrl = await getSiteUrl();

    const { error } = await sendPasswordRecovery(supabase, {
      email: parsedPayload.data.email,
      redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      logSecurityEvent({
        event: "auth.forgot_password.failed",
        severity: "warn",
        fingerprint,
        details: { reason: error.message },
      });
      return {
        status: "error",
        message: "No pudimos enviar el correo de recuperacion. Intentalo nuevamente.",
      };
    }

    logSecurityEvent({ event: "auth.forgot_password.requested", fingerprint });
    return {
      status: "success",
      message: "Si el correo existe, recibiras un enlace para restablecer tu contrasena.",
    };
  } catch (error) {
    if (isNextNavigationError(error)) {
      throw error;
    }

    reportUnexpectedError("auth.forgot_password.unexpected_error", "auth", error);
    return {
      status: "error",
      message: "No pudimos procesar la solicitud por un error inesperado.",
    };
  }
};

export const resetPasswordAction = async (
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> => {
  try {
    const fingerprint = await getRequestFingerprint();
    const trustedOrigin = await isTrustedActionOrigin();
    if (!trustedOrigin) {
      logSecurityEvent({
        event: "auth.reset_password.invalid_origin",
        severity: "warn",
        fingerprint,
      });
      return {
        status: "error",
        message: "No pudimos validar el origen de la solicitud.",
      };
    }
    const payload = {
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    };

    const parsedPayload = resetPasswordSchema.safeParse(payload);

    const attemptGuard = await guardAuthAttempt(fingerprint, "reset");
    if (!attemptGuard.allowed) {
      logSecurityEvent({
        event: "auth.reset_password.rate_limited",
        severity: "warn",
        fingerprint,
        details: {
          retryAfterMs: attemptGuard.retryAfterMs,
          strategy: attemptGuard.strategy ?? "unknown",
          degraded: attemptGuard.degraded ?? false,
        },
      });
      return {
        status: "error",
        message: "Proteccion temporal activa. Espera un momento antes de reintentar.",
      };
    }

    if (!parsedPayload.success) {
      return {
        status: "error",
        message: "Revisa los campos del formulario.",
        fieldErrors: zodFieldErrors(parsedPayload.error),
      };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await updateUserPassword(supabase, {
      password: parsedPayload.data.password,
    });

    if (error) {
      logSecurityEvent({
        event: "auth.reset_password.failed",
        severity: "warn",
        fingerprint,
        details: { reason: error.message },
      });
      return {
        status: "error",
        message: "No pudimos actualizar tu contrasena. Solicita un nuevo enlace.",
      };
    }

    logSecurityEvent({ event: "auth.reset_password.success", fingerprint });
    redirect("/dashboard");
  } catch (error) {
    if (isNextNavigationError(error)) {
      throw error;
    }

    reportUnexpectedError("auth.reset_password.unexpected_error", "auth", error);
    return {
      status: "error",
      message: "No pudimos actualizar la contrasena por un error inesperado.",
    };
  }
};

export const logoutAction = async () => {
  try {
    const fingerprint = await getRequestFingerprint();
    const trustedOrigin = await isTrustedActionOrigin();
    if (!trustedOrigin) {
      logSecurityEvent({ event: "auth.logout.invalid_origin", severity: "warn", fingerprint });
      redirect("/auth/login?message=Origen%20de%20solicitud%20invalido");
    }
    const supabase = await createSupabaseServerClient();
    await signOutUser(supabase);
    logSecurityEvent({ event: "auth.logout", fingerprint });
    redirect("/auth/login");
  } catch (error) {
    if (isNextNavigationError(error)) {
      throw error;
    }

    reportUnexpectedError("auth.logout.unexpected_error", "auth", error);
    redirect("/auth/login?message=No%20pudimos%20cerrar%20sesion%20correctamente");
  }
};
