import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureTraceContext } from "@/server/observability/trace-context";

export const requireUserSession = async () => {
  const requestHeaders = await headers();
  ensureTraceContext(requestHeaders);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return { supabase, user };
};
