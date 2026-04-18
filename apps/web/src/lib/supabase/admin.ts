import { createClient } from "@supabase/supabase-js";
import { getServerSecretEnv, getWebEnv } from "@/lib/env";

export const createSupabaseAdminClient = () => {
  const webEnv = getWebEnv();
  const secretEnv = getServerSecretEnv();

  if (!secretEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin Supabase client.");
  }

  return createClient(webEnv.NEXT_PUBLIC_SUPABASE_URL, secretEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};
