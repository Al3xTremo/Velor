import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getWebEnv } from "@/lib/env";

export const createSupabaseServerClient = async () => {
  const env = getWebEnv();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>
      ) {
        try {
          for (const cookie of cookiesToSet) {
            if (cookie.options) {
              cookieStore.set({
                name: cookie.name,
                value: cookie.value,
                ...(cookie.options as Record<string, unknown>),
              });
            } else {
              cookieStore.set(cookie.name, cookie.value);
            }
          }
        } catch {
          // Route handlers and middleware handle cookie refresh.
        }
      },
    },
  });
};
