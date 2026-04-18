"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label, SelectInput, TextInput } from "@/components/ui/field";
import { createTransactionAction, updateTransactionAction } from "@/features/transactions/actions";
import { initialTransactionFormState } from "@/features/transactions/form-state";

interface CategoryOption {
  id: string;
  name: string;
}

interface TransactionFormValues {
  id?: string;
  name: string;
  kind: "income" | "expense";
  source: "manual" | "salary";
  amount: string;
  categoryId: string;
  occurredOn: string;
  description: string;
  notes: string;
  isRecurring: boolean;
}

interface TransactionFormProps {
  mode: "create" | "edit";
  categories: CategoryOption[];
  initialValues: TransactionFormValues;
}

export const TransactionForm = ({ mode, categories, initialValues }: TransactionFormProps) => {
  const action = mode === "create" ? createTransactionAction : updateTransactionAction;
  const [state, formAction, isPending] = useActionState(action, initialTransactionFormState);

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">
        {mode === "create" ? "Nueva transaccion" : "Editar transaccion"}
      </h2>
      <p className="mt-1 text-sm text-velor-muted">
        Registra ingresos, gastos o nominas con una estructura consistente para analitica.
      </p>

      <form action={formAction} className="mt-5 grid gap-4 md:grid-cols-2">
        {mode === "edit" && initialValues.id ? (
          <input type="hidden" name="transactionId" value={initialValues.id} />
        ) : null}

        <div className="md:col-span-2">
          <Label htmlFor="name">Nombre</Label>
          <TextInput
            id="name"
            name="name"
            defaultValue={initialValues.name}
            placeholder="Ej: Supermercado semanal"
            required
          />
          <FieldError message={state.fieldErrors?.["name"]} />
        </div>

        <div>
          <Label htmlFor="kind">Tipo</Label>
          <SelectInput id="kind" name="kind" defaultValue={initialValues.kind}>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
          </SelectInput>
          <FieldError message={state.fieldErrors?.["kind"]} />
        </div>

        <div>
          <Label htmlFor="source">Origen</Label>
          <SelectInput id="source" name="source" defaultValue={initialValues.source}>
            <option value="manual">Manual</option>
            <option value="salary">Nomina</option>
          </SelectInput>
          <FieldError message={state.fieldErrors?.["source"]} />
        </div>

        <div>
          <Label htmlFor="amount">Importe</Label>
          <TextInput
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            defaultValue={initialValues.amount}
            required
          />
          <FieldError message={state.fieldErrors?.["amount"]} />
        </div>

        <div>
          <Label htmlFor="occurredOn">Fecha</Label>
          <TextInput
            id="occurredOn"
            name="occurredOn"
            type="date"
            defaultValue={initialValues.occurredOn}
            required
          />
          <FieldError message={state.fieldErrors?.["occurredOn"]} />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="categoryId">Categoria</Label>
          <SelectInput id="categoryId" name="categoryId" defaultValue={initialValues.categoryId}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
          <FieldError message={state.fieldErrors?.["categoryId"]} />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="description">Concepto / descripcion</Label>
          <TextInput
            id="description"
            name="description"
            defaultValue={initialValues.description}
            placeholder="Detalle breve del movimiento"
          />
          <FieldError message={state.fieldErrors?.["description"]} />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <textarea
            id="notes"
            name="notes"
            defaultValue={initialValues.notes}
            className="velor-input min-h-[92px]"
            placeholder="Informacion adicional para contexto futuro"
          />
          <FieldError message={state.fieldErrors?.["notes"]} />
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <input
            id="isRecurring"
            name="isRecurring"
            type="checkbox"
            defaultChecked={initialValues.isRecurring}
          />
          <Label htmlFor="isRecurring" className="mb-0 text-sm normal-case tracking-normal">
            Marcar como recurrente
          </Label>
        </div>

        {state.status !== "idle" && state.message ? (
          <p
            className={`md:col-span-2 text-sm ${state.status === "error" ? "text-rose-600" : "text-emerald-600"}`}
          >
            {state.message}
          </p>
        ) : null}

        <div className="md:col-span-2 flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? mode === "create"
                ? "Guardando..."
                : "Actualizando..."
              : mode === "create"
                ? "Crear transaccion"
                : "Guardar cambios"}
          </Button>
          {mode === "edit" ? (
            <a href="/transactions" className="velor-btn-secondary">
              Cancelar edicion
            </a>
          ) : null}
        </div>
      </form>
    </Card>
  );
};
