import type { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
