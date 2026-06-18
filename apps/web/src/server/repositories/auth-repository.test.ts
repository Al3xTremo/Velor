import { describe, expect, it, vi } from "vitest";
import {
  resendSignUpConfirmation,
  sendPasswordRecovery,
  signInWithPassword,
  signUpUser,
  signOutUser,
  updateUserPassword,
} from "./auth-repository";

describe("auth-repository integration", () => {
  it("maps sign-up payload into Supabase auth options contract", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const supabase = { auth: { signUp } };

    await signUpUser(supabase as never, {
      email: "user@example.com",
      password: "secure-pass",
      fullName: "Ada",
      defaultCurrency: "EUR",
      redirectTo: "http://localhost:3000/auth/callback?next=/onboarding",
    });

    expect(signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secure-pass",
      options: {
        data: {
          full_name: "Ada",
          default_currency: "EUR",
        },
        emailRedirectTo: "http://localhost:3000/auth/callback?next=/onboarding",
      },
    });
  });

  it("delegates login, recovery, confirmation resend, password update and signout to auth adapter", async () => {
    const signInWithPasswordMock = vi.fn().mockResolvedValue({ error: null });
    const resetPasswordForEmailMock = vi.fn().mockResolvedValue({ error: null });
    const resendMock = vi.fn().mockResolvedValue({ error: null });
    const updateUserMock = vi.fn().mockResolvedValue({ error: null });
    const signOutMock = vi.fn().mockResolvedValue({ error: null });

    const supabase = {
      auth: {
        signInWithPassword: signInWithPasswordMock,
        resetPasswordForEmail: resetPasswordForEmailMock,
        resend: resendMock,
        updateUser: updateUserMock,
        signOut: signOutMock,
      },
    };

    await signInWithPassword(supabase as never, {
      email: "user@example.com",
      password: "secure-pass",
    });
    await sendPasswordRecovery(supabase as never, {
      email: "user@example.com",
      redirectTo: "http://localhost:3000/auth/callback",
    });
    await resendSignUpConfirmation(supabase as never, {
      email: "user@example.com",
      redirectTo: "http://localhost:3000/auth/callback?next=/onboarding",
    });
    await updateUserPassword(supabase as never, { password: "new-pass" });
    await signOutUser(supabase as never);

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secure-pass",
    });
    expect(resetPasswordForEmailMock).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "http://localhost:3000/auth/callback",
    });
    expect(resendMock).toHaveBeenCalledWith({
      type: "signup",
      email: "user@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback?next=/onboarding",
      },
    });
    expect(updateUserMock).toHaveBeenCalledWith({ password: "new-pass" });
    expect(signOutMock).toHaveBeenCalled();
  });
});
