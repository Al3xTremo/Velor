import { formatCurrency } from "@velor/core";
import { transactionFiltersSchema } from "@velor/contracts";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { TransactionForm } from "@/features/transactions/components/transaction-form";
import { TransactionsFilterBar } from "@/features/transactions/components/transactions-filter-bar";
import { TransactionsTable } from "@/features/transactions/components/transactions-table";
import { reportUnexpectedError } from "@/server/observability/errors";
import { logEvent } from "@/server/observability/logger";
import { measureServerOperation } from "@/server/observability/perf";
import { requireUserSession } from "@/server/application/session-service";
import { listCategoryOptionsForUser } from "@/server/repositories/categories-repository";
import { getPrimaryAccount, getUserProfile } from "@/server/repositories/profile-repository";
import {
  getTransactionByIdForUser,
  listTransactionsPageForUser,
} from "@/server/repositories/transactions-repository";

export const dynamic = "force-dynamic";
const TRANSACTIONS_PAGE_SIZE = 30;

interface TransactionsPageProps {
  searchParams: Promise<{
    query?: string;
    kind?: "income" | "expense";
    categoryId?: string;
    from?: string;
    to?: string;
    edit?: string;
    intent?: "income" | "expense";
    notice?: string;
    page?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  return measureServerOperation("transactions.page.load", async () => {
    try {
      const params = await searchParams;
      const parsedFilters = transactionFiltersSchema.safeParse(params);
      const filters = parsedFilters.success ? parsedFilters.data : {};
      const page = Math.max(1, Number(params.page ?? "1") || 1);

      const { supabase, user } = await requireUserSession();

      const [profile, account, categories] = await Promise.all([
        getUserProfile(supabase, user.id),
        getPrimaryAccount(supabase, user.id),
        listCategoryOptionsForUser(supabase, user.id),
      ]);

      if (!profile?.onboarding_completed_at) {
        redirect("/onboarding");
      }

      const transactionsPage = await listTransactionsPageForUser(supabase, {
        userId: user.id,
        filters,
        page,
        pageSize: TRANSACTIONS_PAGE_SIZE,
      });
      const transactions = transactionsPage.rows;

      logEvent({
        level: "info",
        event: "transactions.data.shape",
        scope: "performance",
        expected: true,
        meta: {
          rows: transactions.length,
          totalCount: transactionsPage.totalCount,
          page: transactionsPage.page,
        },
      });

      const categoryList = categories;
      const activeCategoryList = categoryList.filter((item) => item.is_system || item.is_active);
      const categoryNameById = new Map(categoryList.map((item) => [item.id, item.name]));
      const currency = account?.currency ?? profile.default_currency;

      const buildPreservedTransactionsPath = (input?: { editId?: string }) => {
        const query = new URLSearchParams();
        if (filters.query) query.set("query", filters.query);
        if (filters.kind) query.set("kind", filters.kind);
        if (filters.categoryId) query.set("categoryId", filters.categoryId);
        if (filters.from) query.set("from", filters.from);
        if (filters.to) query.set("to", filters.to);
        query.set("page", String(transactionsPage.page));
        if (input?.editId) query.set("edit", input.editId);
        return `/transactions?${query.toString()}`;
      };

      const preservedContextPath = buildPreservedTransactionsPath();
      const rows = transactions.map((item) => ({
        id: item.id,
        occurredOn: item.occurred_on,
        name: item.name,
        kind: item.kind,
        source: item.source,
        categoryName: categoryNameById.get(item.category_id ?? "") ?? "Sin categoria",
        amountFormatted: formatCurrency(item.amount, currency),
        isRecurring: item.is_recurring,
        description: item.description,
        editHref: buildPreservedTransactionsPath({ editId: item.id }),
        returnTo: preservedContextPath,
      }));

      const defaultCategoryId = activeCategoryList[0]?.id ?? categoryList[0]?.id ?? "";
      const editTransactionFromPage = transactions.find((item) => item.id === params.edit);
      const editTransaction =
        editTransactionFromPage ||
        (params.edit
          ? await getTransactionByIdForUser(supabase, {
              userId: user.id,
              transactionId: params.edit,
            })
          : null);
      const formMode = editTransaction ? "edit" : "create";
      const initialKind = params.intent === "income" ? "income" : "expense";
      const formCategories = editTransaction
        ? categoryList.filter((item) =>
            item.id === editTransaction.category_id ? true : item.is_system || item.is_active
          )
        : activeCategoryList;

      const totalPages = Math.max(
        1,
        Math.ceil(transactionsPage.totalCount / transactionsPage.pageSize)
      );
      const hasPrevious = transactionsPage.page > 1;
      const hasNext = transactionsPage.page < totalPages;
      const buildPageLink = (targetPage: number) => {
        const query = new URLSearchParams();
        if (filters.query) query.set("query", filters.query);
        if (filters.kind) query.set("kind", filters.kind);
        if (filters.categoryId) query.set("categoryId", filters.categoryId);
        if (filters.from) query.set("from", filters.from);
        if (filters.to) query.set("to", filters.to);
        if (params.intent) query.set("intent", params.intent);
        if (params.notice) query.set("notice", params.notice);
        query.set("page", String(targetPage));
        return `/transactions?${query.toString()}`;
      };

      return (
        <AppShell
          title="Transacciones"
          subtitle="Registra, filtra y ajusta ingresos o gastos con una experiencia clara y trazable."
        >
          {params.notice === "deleted" ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Transaccion eliminada correctamente.
            </p>
          ) : null}
          {params.notice === "error" ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              No pudimos completar la operacion solicitada.
            </p>
          ) : null}
          {params.notice === "rate_limited" ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Demasiados intentos en poco tiempo. Espera un momento y vuelve a intentarlo.
            </p>
          ) : null}

          {formCategories.length === 0 ? (
            <EmptyState
              title="No hay categorias disponibles"
              description="Necesitas al menos una categoria para registrar transacciones. Crea una categoria y vuelve aqui."
              action={
                <a className="velor-btn-primary" href="/categories">
                  Ir a categorias
                </a>
              }
            />
          ) : (
            <TransactionForm
              mode={formMode}
              categories={formCategories}
              cancelHref={preservedContextPath}
              initialValues={{
                ...(editTransaction?.id ? { id: editTransaction.id } : {}),
                name: editTransaction?.name ?? "",
                kind: editTransaction?.kind ?? initialKind,
                source: editTransaction?.source ?? "manual",
                amount: editTransaction ? String(editTransaction.amount) : "",
                categoryId: editTransaction?.category_id ?? defaultCategoryId,
                occurredOn: editTransaction?.occurred_on ?? new Date().toISOString().slice(0, 10),
                description: editTransaction?.description ?? "",
                notes: editTransaction?.notes ?? "",
                isRecurring: editTransaction?.is_recurring ?? false,
              }}
            />
          )}

          <TransactionsFilterBar
            categories={categoryList.map((item) => ({
              id: item.id,
              name: `${item.name}${item.is_active ? "" : " (archivada)"}`,
            }))}
            values={{
              query: filters.query,
              kind: filters.kind,
              categoryId: filters.categoryId,
              from: filters.from,
              to: filters.to,
            }}
          />

          <TransactionsTable rows={rows} />

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-velor-border bg-velor-elevated px-4 py-3 text-sm">
            <p className="text-velor-muted">
              Pagina {transactionsPage.page} de {totalPages} · {transactionsPage.totalCount}{" "}
              resultados
            </p>
            <div className="flex gap-2">
              {hasPrevious ? (
                <a
                  className="velor-btn-secondary px-3 py-1.5 text-xs"
                  href={buildPageLink(page - 1)}
                >
                  Anterior
                </a>
              ) : (
                <span className="velor-btn-secondary cursor-not-allowed px-3 py-1.5 text-xs opacity-60">
                  Anterior
                </span>
              )}
              {hasNext ? (
                <a
                  className="velor-btn-secondary px-3 py-1.5 text-xs"
                  href={buildPageLink(page + 1)}
                >
                  Siguiente
                </a>
              ) : (
                <span className="velor-btn-secondary cursor-not-allowed px-3 py-1.5 text-xs opacity-60">
                  Siguiente
                </span>
              )}
            </div>
          </div>
        </AppShell>
      );
    } catch (error) {
      reportUnexpectedError("transactions.page.unexpected_error", "transactions", error);
      throw error;
    }
  });
}
