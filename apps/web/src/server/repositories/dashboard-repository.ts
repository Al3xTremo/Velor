import type { SupabaseServerClient } from "@/server/supabase/types";
import { measureServerOperation } from "@/server/observability/perf";

export const getDashboardData = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    fromDate: string;
  }
) => {
  const [windowTransactionsResult, recentTransactionsResult, categoriesResult, totalsResult] =
    await measureServerOperation(
      "dashboard.repository.fetch",
      async () =>
        Promise.all([
          supabase
            .from("transactions")
            .select("id,kind,source,amount,category_id,occurred_on,description")
            .eq("user_id", input.userId)
            .gte("occurred_on", input.fromDate)
            .order("occurred_on", { ascending: true }),
          supabase
            .from("transactions")
            .select("id,kind,source,amount,category_id,occurred_on")
            .eq("user_id", input.userId)
            .order("occurred_on", { ascending: false })
            .order("id", { ascending: false })
            .limit(8),
          supabase
            .from("categories")
            .select("id,name")
            .or(`user_id.eq.${input.userId},is_system.eq.true`),
          supabase.rpc("user_transaction_totals", { p_user_id: input.userId }),
        ]),
      {
        userId: input.userId,
      }
    );

  const totalsRow = totalsResult.data?.[0] ?? {
    income_total: 0,
    expense_total: 0,
    net_total: 0,
  };

  return {
    windowTransactions: windowTransactionsResult.data ?? [],
    recentTransactions: recentTransactionsResult.data ?? [],
    categories: categoriesResult.data ?? [],
    totals: {
      income: Number(totalsRow.income_total ?? 0),
      expense: Number(totalsRow.expense_total ?? 0),
      net: Number(totalsRow.net_total ?? 0),
    },
  };
};
