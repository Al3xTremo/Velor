import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const redirect = vi.fn((location: string) => {
    const error = new Error(`NEXT_REDIRECT:${location}`) as Error & { digest?: string };
    error.digest = `NEXT_REDIRECT;${location}`;
    throw error;
  });

  return {
    redirect,
    getRequestFingerprint: vi.fn(),
    isTrustedActionOrigin: vi.fn(),
    guardAuthAttempt: vi.fn(),
    guardLoginLock: vi.fn(),
    clearLoginLock: vi.fn(),
    createSupabaseServerClient: vi.fn(),
    reportUnexpectedError: vi.fn(),
    getWebEnv: vi.fn(),
    getServerSecretEnv: vi.fn(),
    logSecurityEvent: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/server/security/request-fingerprint", () => ({
  getRequestFingerprint: mocks.getRequestFingerprint,
}));

vi.mock("@/server/security/origin-guard", () => ({
  isTrustedActionOrigin: mocks.isTrustedActionOrigin,
}));

vi.mock("@/server/security/auth-guard", () => ({
  guardAuthAttempt: mocks.guardAuthAttempt,
  guardLoginLock: mocks.guardLoginLock,
  clearLoginLock: mocks.clearLoginLock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@/server/observability/errors", async () => {
  return {
    isNextNavigationError: (error: unknown) => {
      if (!error || typeof error !== "object") {
        return false;
      }
      const digest = (error as { digest?: string }).digest ?? "";
      return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
    },
    reportUnexpectedError: mocks.reportUnexpectedError,
  };
});

vi.mock("@/lib/env", () => ({
  getWebEnv: mocks.getWebEnv,
  getServerSecretEnv: mocks.getServerSecretEnv,
}));

vi.mock("@/server/security/audit-log", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
}));

import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resendConfirmationAction,
} from "./actions";

const createFormData = (entries: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
};

describe("auth/actions server integration", () => {
  const supabaseAuth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestFingerprint.mockResolvedValue("fp-test");
    mocks.isTrustedActionOrigin.mockResolvedValue(true);
    mocks.guardAuthAttempt.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    mocks.guardLoginLock.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    mocks.clearLoginLock.mockResolvedValue(undefined);
    mocks.getWebEnv.mockReturnValue({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });
    mocks.getServerSecretEnv.mockReturnValue({ OBS_ALERTS_ENABLED: "0" });
    mocks.createSupabaseServerClient.mockResolvedValue({ auth: supabaseAuth });
    supabaseAuth.signInWithPassword.mockResolvedValue({ error: null });
    supabaseAuth.signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });
    supabaseAuth.resend.mockResolvedValue({ error: null });
    supabaseAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it("redirects to dashboard when login succeeds", async () => {
    const formData = createFormData({
      email: "user@example.com",
      password: "secret-123",
      next: "/dashboard",
    });

    await expect(loginAction({ status: "idle" }, formData)).rejects.toMatchObject({
      digest: expect.stringContaining("/dashboard"),
    });

    expect(mocks.guardAuthAttempt).toHaveBeenCalledWith("fp-test", "login");
    expect(mocks.guardLoginLock).toHaveBeenCalledWith("fp-test", "user@example.com");
    expect(supabaseAuth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret-123",
    });
    expect(mocks.clearLoginLock).toHaveBeenCalledWith("fp-test", "user@example.com");
  });

  it("returns user-facing error when login is rate limited", async () => {
    mocks.guardAuthAttempt.mockResolvedValue({ allowed: false, retryAfterMs: 25_000 });

    const result = await loginAction(
      { status: "idle" },
      createFormData({ email: "user@example.com", password: "secret-123" })
    );

    expect(result).toEqual({
      status: "error",
      message: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
    });
    expect(supabaseAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("asks the user to confirm their email before login when Supabase blocks unconfirmed access", async () => {
    supabaseAuth.signInWithPassword.mockResolvedValue({
      error: { message: "Email not confirmed" },
    });

    const result = await loginAction(
      { status: "idle" },
      createFormData({ email: "user@example.com", password: "secret-123" })
    );

    expect(result).toEqual({
      status: "error",
      message: "Confirma tu correo desde el enlace que te enviamos antes de iniciar sesion.",
    });
  });

  it("returns pending-confirmation success after sign up when the email is not confirmed yet", async () => {
    const result = await registerAction(
      { status: "idle" },
      createFormData({
        email: "user@example.com",
        password: "secret-123",
        fullName: "Ada Lovelace",
        defaultCurrency: "EUR",
      })
    );

    expect(result).toEqual({
      status: "success",
      message:
        "Cuenta creada. Te enviamos un correo de confirmacion. Abre el enlace para activar tu acceso.",
    });
    expect(mocks.guardAuthAttempt).toHaveBeenCalledWith("fp-test", "register");
    expect(supabaseAuth.signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret-123",
      options: {
        data: {
          full_name: "Ada Lovelace",
          default_currency: "EUR",
        },
        emailRedirectTo: "http://localhost:3000/auth/callback?next=/onboarding",
      },
    });
  });

  it("redirects to onboarding when sign up returns an already confirmed session", async () => {
    supabaseAuth.signUp.mockResolvedValue({
      data: {
        user: { id: "u1", email_confirmed_at: "2026-01-01T00:00:00.000Z" },
        session: { user: { email_confirmed_at: "2026-01-01T00:00:00.000Z" } },
      },
      error: null,
    });

    await expect(
      registerAction(
        { status: "idle" },
        createFormData({
          email: "user@example.com",
          password: "secret-123",
          fullName: "Ada Lovelace",
          defaultCurrency: "EUR",
        })
      )
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/onboarding"),
    });
  });

  it("keeps the account pending when sign up returns a session without confirmed email", async () => {
    supabaseAuth.signUp.mockResolvedValue({
      data: {
        user: { id: "u1", email_confirmed_at: null },
        session: { user: { email_confirmed_at: null } },
      },
      error: null,
    });

    const result = await registerAction(
      { status: "idle" },
      createFormData({
        email: "user@example.com",
        password: "secret-123",
        fullName: "Ada Lovelace",
        defaultCurrency: "EUR",
      })
    );

    expect(result).toEqual({
      status: "success",
      message:
        "Cuenta creada. Te enviamos un correo de confirmacion. Abre el enlace para activar tu acceso.",
    });
  });

  it("re-sends the confirmation email without exposing whether the account exists", async () => {
    const result = await resendConfirmationAction(
      { status: "idle" },
      createFormData({ email: "user@example.com" })
    );

    expect(result).toEqual({
      status: "success",
      message:
        "Si el correo corresponde a una cuenta pendiente, te enviamos un nuevo enlace de confirmacion.",
    });
    expect(mocks.guardAuthAttempt).toHaveBeenCalledWith("fp-test", "resend");
    expect(supabaseAuth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "user@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback?next=/onboarding",
      },
    });
  });

  it("returns validation errors for invalid confirmation resend payload", async () => {
    const result = await resendConfirmationAction(
      { status: "idle" },
      createFormData({ email: "not-an-email" })
    );

    expect(result.status).toBe("error");
    expect(result.message).toBe("Revisa el correo ingresado.");
    expect(result.fieldErrors).toEqual(
      expect.objectContaining({
        email: expect.any(String),
      })
    );
    expect(supabaseAuth.resend).not.toHaveBeenCalled();
  });

  it("returns contract validation errors for invalid forgot-password payload", async () => {
    const result = await forgotPasswordAction(
      { status: "idle" },
      createFormData({ email: "not-an-email" })
    );

    expect(result.status).toBe("error");
    expect(result.message).toBe("Revisa el correo ingresado.");
    expect(result.fieldErrors).toEqual(
      expect.objectContaining({
        email: expect.any(String),
      })
    );
    expect(supabaseAuth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("returns generic infrastructure error for unexpected auth exceptions", async () => {
    supabaseAuth.signInWithPassword.mockRejectedValue(new Error("supabase-down"));

    const result = await loginAction(
      { status: "idle" },
      createFormData({ email: "user@example.com", password: "secret-123" })
    );

    expect(result).toEqual({
      status: "error",
      message: "No pudimos iniciar sesion por un error inesperado. Intentalo nuevamente.",
    });
    expect(mocks.reportUnexpectedError).toHaveBeenCalledWith(
      "auth.login.unexpected_error",
      "auth",
      expect.any(Error)
    );
  });
});
