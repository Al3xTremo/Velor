"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, TextInput } from "@/components/ui/field";
import { removeBudgetLimitAction, upsertBudgetLimitAction } from "@/features/budgets/actions";
import { initialBudgetFormState } from "@/features/budgets/form-state";

interface BudgetRow {
  categoryId: string;
  categoryName: string;
  colorHex: string;
  spentLabel: string;
  spentAmount: number;
  limitLabel: string;
  limitAmount: number;
  usagePct: number;
  budgetLimitId?: string;
}

interface BudgetLimitsTableProps {
  month: string;
  rows: BudgetRow[];
}

const BudgetLimitEditor = ({ month, row }: { month: string; row: BudgetRow }) => {
  const [state, formAction, isPending] = useActionState(
    upsertBudgetLimitAction,
    initialBudgetFormState
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="categoryId" value={row.categoryId} />
        <TextInput
          name="limitAmount"
          type="number"
          step="0.01"
          defaultValue={row.limitAmount > 0 ? String(row.limitAmount) : ""}
          className="w-32"
          placeholder="Limite"
        />
        <Button type="submit" disabled={isPending} className="px-3 py-2 text-xs">
          {isPending ? "..." : "Guardar"}
        </Button>
      </form>

      {row.budgetLimitId ? (
        <form action={removeBudgetLimitAction}>
          <input type="hidden" name="budgetLimitId" value={row.budgetLimitId} />
          <input type="hidden" name="month" value={month} />
          <button type="submit" className="velor-btn-ghost px-3 py-2 text-xs text-velor-danger">
            Quitar
          </button>
        </form>
      ) : null}

      {state.status === "error" && state.message ? <FieldError message={state.message} /> : null}
      {state.status === "success" && state.message ? (
        <p className="text-xs font-medium text-emerald-700">{state.message}</p>
      ) : null}
    </div>
  );
};

export const BudgetLimitsTable = ({ month, rows }: BudgetLimitsTableProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-velor-border px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-velor-text">
          Presupuesto por categoria
        </h2>
        <p className="text-sm text-velor-muted">
          Define limites mensuales y controla desviaciones en tiempo real.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="velor-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="text-right">Gastado</th>
              <th className="text-right">Limite</th>
              <th className="text-right">Uso</th>
              <th className="text-right">Accion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.categoryId}>
                <td>
                  <div className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: row.colorHex }}
                    />
                    <span className="font-medium text-velor-text">{row.categoryName}</span>
                  </div>
                </td>
                <td className="text-right">{row.spentLabel}</td>
                <td className="text-right">{row.limitLabel}</td>
                <td className="text-right text-sm text-velor-muted">{row.usagePct.toFixed(1)}%</td>
                <td>
                  <BudgetLimitEditor month={month} row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
