import type { SupabaseServerClient } from "@/server/supabase/types";
import { measureServerOperation } from "@/server/observability/perf";

export const getAnalyticsData = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    from: string;
    to: string;
  }
) => {
  const [categoriesResult, transactionsResult] = await measureServerOperation(
    "analytics.repository.fetch",
    async () =>
      Promise.all([
        supabase
          .from("categories")
          .select("id,name,color_hex")
          .or(`user_id.eq.${input.userId},is_system.eq.true`),
        supabase
          .from("transactions")
          .select("id,kind,amount,category_id,occurred_on")
          .eq("user_id", input.userId)
          .gte("occurred_on", input.from)
          .lte("occurred_on", input.to)
          .order("occurred_on", { ascending: true }),
      ]),
    {
      userId: input.userId,
      from: input.from,
      to: input.to,
    }
  );

  return {
    categories: categoriesResult.data ?? [],
    transactions: transactionsResult.data ?? [],
  };
};
