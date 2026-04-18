import type { SupabaseServerClient } from "@/server/supabase/types";
import { measureServerOperation } from "@/server/observability/perf";

export const signInWithPassword = async (
  supabase: SupabaseServerClient,
  payload: { email: string; password: string }
) => {
  return measureServerOperation("auth.repository.sign_in", async () => {
    return supabase.auth.signInWithPassword(payload);
  });
};

export const signUpUser = async (
  supabase: SupabaseServerClient,
  payload: {
    email: string;
    password: string;
    fullName: string;
    defaultCurrency: string;
    redirectTo: string;
  }
) => {
  return measureServerOperation(
    "auth.repository.sign_up",
    async () => {
      return supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            full_name: payload.fullName,
            default_currency: payload.defaultCurrency,
          },
          emailRedirectTo: payload.redirectTo,
        },
      });
    },
    {
      hasRedirectTo: Boolean(payload.redirectTo),
    }
  );
};

export const sendPasswordRecovery = async (
  supabase: SupabaseServerClient,
  payload: { email: string; redirectTo: string }
) => {
  return measureServerOperation(
    "auth.repository.password_recovery",
    async () => {
      return supabase.auth.resetPasswordForEmail(payload.email, {
        redirectTo: payload.redirectTo,
      });
    },
    {
      hasRedirectTo: Boolean(payload.redirectTo),
    }
  );
};

export const updateUserPassword = async (
  supabase: SupabaseServerClient,
  payload: { password: string }
) => {
  return measureServerOperation("auth.repository.password_update", async () => {
    return supabase.auth.updateUser(payload);
  });
};

export const signOutUser = async (supabase: SupabaseServerClient) => {
  return measureServerOperation("auth.repository.sign_out", async () => {
    return supabase.auth.signOut();
  });
};
