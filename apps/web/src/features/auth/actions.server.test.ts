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

import { forgotPasswordAction, loginAction } from "./actions";

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
