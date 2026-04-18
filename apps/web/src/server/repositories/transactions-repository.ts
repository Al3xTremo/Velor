import type { TransactionFiltersInput, TransactionFormInput } from "@velor/contracts";
import { measureServerOperation } from "@/server/observability/perf";
import { sanitizeSearchText } from "@/server/security/input-guards";
import type { SupabaseServerClient } from "@/server/supabase/types";

type TransactionRow = {
  id: string;
  name: string;
  kind: "income" | "expense";
  source: "manual" | "salary";
  amount: number;
  description: string;
  notes: string | null;
  is_recurring: boolean;
  occurred_on: string;
  category_id: string | null;
};

const applyFiltersToQuery = (
  query: {
    eq: (column: string, value: string) => unknown;
    gte: (column: string, value: string) => unknown;
    lte: (column: string, value: string) => unknown;
    or: (value: string) => unknown;
  },
  filters: TransactionFiltersInput
) => {
  if (filters.kind) {
    query.eq("kind", filters.kind);
  }

  if (filters.categoryId) {
    query.eq("category_id", filters.categoryId);
  }

  if (filters.from) {
    query.gte("occurred_on", filters.from);
  }

  if (filters.to) {
    query.lte("occurred_on", filters.to);
  }

  if (filters.query) {
    const escaped = sanitizeSearchText(filters.query);
    query.or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%,notes.ilike.%${escaped}%`);
  }
};

export const listTransactionsForUser = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    filters: TransactionFiltersInput;
  }
) => {
  const baseQuery = supabase
    .from("transactions")
    .select("id,name,kind,source,amount,description,notes,is_recurring,occurred_on,category_id")
    .eq("user_id", input.userId)
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false });

  applyFiltersToQuery(baseQuery, input.filters);

  const result = await measureServerOperation(
    "transactions.repository.list_all",
    async () => baseQuery,
    { userId: input.userId }
  );

  return (result.data ?? []) as TransactionRow[];
};

export const listTransactionsPageForUser = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    filters: TransactionFiltersInput;
    page: number;
    pageSize: number;
  }
) => {
  const safePage = Math.max(1, input.page);
  const safePageSize = Math.min(100, Math.max(10, input.pageSize));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const dataQuery = supabase
    .from("transactions")
    .select("id,name,kind,source,amount,description,notes,is_recurring,occurred_on,category_id")
    .eq("user_id", input.userId)
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  applyFiltersToQuery(dataQuery, input.filters);

  const countQuery = supabase
    .from("transactions")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", input.userId);
  applyFiltersToQuery(countQuery, input.filters);

  const [dataResult, countResult] = await measureServerOperation(
    "transactions.repository.list_page",
    async () => Promise.all([dataQuery, countQuery]),
    {
      userId: input.userId,
      page: safePage,
      pageSize: safePageSize,
    }
  );

  return {
    rows: (dataResult.data ?? []) as TransactionRow[],
    totalCount: countResult.count ?? 0,
    page: safePage,
    pageSize: safePageSize,
  };
};

export const getTransactionByIdForUser = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    transactionId: string;
  }
) => {
  const result = await measureServerOperation(
    "transactions.repository.get_by_id",
    async () =>
      supabase
        .from("transactions")
        .select("id,name,kind,source,amount,description,notes,is_recurring,occurred_on,category_id")
        .eq("id", input.transactionId)
        .eq("user_id", input.userId)
        .maybeSingle(),
    {
      userId: input.userId,
    }
  );

  return result.data as TransactionRow | null;
};

export const createTransaction = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    accountId: string;
    values: TransactionFormInput;
    occurredMonth: string;
  }
) => {
  return measureServerOperation(
    "transactions.repository.create",
    async () =>
      supabase.from("transactions").insert({
        user_id: input.userId,
        account_id: input.accountId,
        category_id: input.values.categoryId,
        kind: input.values.kind,
        source: input.values.source,
        name: input.values.name,
        amount: input.values.amount,
        description: input.values.description ?? "",
        notes: input.values.notes ?? null,
        is_recurring: input.values.isRecurring,
        occurred_on: input.values.occurredOn,
        occurred_month: input.occurredMonth,
      }),
    { userId: input.userId }
  );
};

export const updateTransaction = async (
  supabase: SupabaseServerClient,
  input: {
    transactionId: string;
    userId: string;
    values: TransactionFormInput;
    occurredMonth: string;
  }
) => {
  return measureServerOperation(
    "transactions.repository.update",
    async () =>
      supabase
        .from("transactions")
        .update({
          category_id: input.values.categoryId,
          kind: input.values.kind,
          source: input.values.source,
          name: input.values.name,
          amount: input.values.amount,
          description: input.values.description ?? "",
          notes: input.values.notes ?? null,
          is_recurring: input.values.isRecurring,
          occurred_on: input.values.occurredOn,
          occurred_month: input.occurredMonth,
        })
        .eq("id", input.transactionId)
        .eq("user_id", input.userId),
    { userId: input.userId }
  );
};

export const deleteTransaction = async (
  supabase: SupabaseServerClient,
  input: {
    transactionId: string;
    userId: string;
  }
) => {
  return measureServerOperation(
    "transactions.repository.delete",
    async () =>
      supabase
        .from("transactions")
        .delete()
        .eq("id", input.transactionId)
        .eq("user_id", input.userId),
    { userId: input.userId }
  );
};
