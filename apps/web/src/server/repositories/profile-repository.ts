import type { SupabaseServerClient } from "@/server/supabase/types";
import { measureServerOperation } from "@/server/observability/perf";

export const getUserProfile = async (supabase: SupabaseServerClient, userId: string) => {
  const { data } = await measureServerOperation(
    "profile.repository.get_user_profile",
    async () =>
      supabase
        .from("profiles")
        .select("full_name,default_currency,timezone,onboarding_completed_at")
        .eq("user_id", userId)
        .maybeSingle(),
    { userId }
  );

  return data;
};

export const getPrimaryAccount = async (supabase: SupabaseServerClient, userId: string) => {
  const { data } = await measureServerOperation(
    "profile.repository.get_primary_account",
    async () =>
      supabase
        .from("accounts")
        .select("id,currency,opening_balance")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .maybeSingle(),
    { userId }
  );

  return data;
};

export const upsertOnboardingProfile = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    fullName: string;
    defaultCurrency: "EUR" | "USD";
    timezone: string;
  }
) => {
  return measureServerOperation(
    "profile.repository.upsert_onboarding_profile",
    async () =>
      supabase
        .from("profiles")
        .update({
          full_name: input.fullName,
          default_currency: input.defaultCurrency,
          timezone: input.timezone,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("user_id", input.userId),
    { userId: input.userId }
  );
};

export const updateUserProfileSettings = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    fullName: string;
    defaultCurrency: "EUR" | "USD";
    timezone: string;
  }
) => {
  return measureServerOperation(
    "profile.repository.update_user_profile_settings",
    async () =>
      supabase
        .from("profiles")
        .update({
          full_name: input.fullName,
          default_currency: input.defaultCurrency,
          timezone: input.timezone,
        })
        .eq("user_id", input.userId),
    { userId: input.userId }
  );
};

export const createPrimaryAccount = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    defaultCurrency: "EUR" | "USD";
    openingBalance: number;
  }
) => {
  return measureServerOperation(
    "profile.repository.create_primary_account",
    async () =>
      supabase.from("accounts").insert({
        user_id: input.userId,
        name: "Principal",
        currency: input.defaultCurrency,
        opening_balance: input.openingBalance,
        is_primary: true,
      }),
    { userId: input.userId }
  );
};

export const updatePrimaryAccount = async (
  supabase: SupabaseServerClient,
  input: {
    accountId: string;
    userId: string;
    defaultCurrency: "EUR" | "USD";
    openingBalance: number;
  }
) => {
  return measureServerOperation(
    "profile.repository.update_primary_account",
    async () =>
      supabase
        .from("accounts")
        .update({
          currency: input.defaultCurrency,
          opening_balance: input.openingBalance,
        })
        .eq("id", input.accountId)
        .eq("user_id", input.userId),
    { userId: input.userId }
  );
};
