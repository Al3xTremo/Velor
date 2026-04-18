import { createBrowserClient } from "@supabase/ssr";
import { getWebEnv } from "@/lib/env";

export const createSupabaseBrowserClient = () => {
  const env = getWebEnv();

  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};
