"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label, TextInput } from "@/components/ui/field";
import { createGoalAction, updateGoalAction } from "@/features/goals/actions";
import { initialGoalFormState } from "@/features/goals/form-state";

interface GoalFormValues {
  id?: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
}

interface GoalFormProps {
  mode: "create" | "edit";
  initialValues: GoalFormValues;
}

export const GoalForm = ({ mode, initialValues }: GoalFormProps) => {
  const action = mode === "create" ? createGoalAction : updateGoalAction;
  const [state, formAction, isPending] = useActionState(action, initialGoalFormState);

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">
        {mode === "create" ? "Nuevo objetivo de ahorro" : "Editar objetivo"}
      </h2>
      <p className="mt-1 text-sm text-velor-muted">
        Define una meta concreta, mide tu progreso y visualiza cuanto falta para lograrla.
      </p>

      <form action={formAction} className="mt-5 grid gap-4 md:grid-cols-2">
        {mode === "edit" && initialValues.id ? (
          <input type="hidden" name="goalId" value={initialValues.id} />
        ) : null}

        <div className="md:col-span-2">
          <Label htmlFor="name">Nombre del objetivo</Label>
          <TextInput
            id="name"
            name="name"
            defaultValue={initialValues.name}
            placeholder="Ej: Fondo de emergencia"
            required
          />
          <FieldError message={state.fieldErrors?.["name"]} />
        </div>

        <div>
          <Label htmlFor="targetAmount">Importe objetivo</Label>
          <TextInput
            id="targetAmount"
            name="targetAmount"
            type="number"
            step="0.01"
            defaultValue={initialValues.targetAmount}
            required
          />
          <FieldError message={state.fieldErrors?.["targetAmount"]} />
        </div>

        <div>
          <Label htmlFor="currentAmount">Progreso actual</Label>
          <TextInput
            id="currentAmount"
            name="currentAmount"
            type="number"
            step="0.01"
            defaultValue={initialValues.currentAmount}
            required
          />
          <FieldError message={state.fieldErrors?.["currentAmount"]} />
        </div>

        <div>
          <Label htmlFor="targetDate">Fecha objetivo (opcional)</Label>
          <TextInput
            id="targetDate"
            name="targetDate"
            type="date"
            defaultValue={initialValues.targetDate}
          />
          <FieldError message={state.fieldErrors?.["targetDate"]} />
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
                ? "Crear objetivo"
                : "Guardar cambios"}
          </Button>
          {mode === "edit" ? (
            <a href="/goals" className="velor-btn-secondary">
              Cancelar edicion
            </a>
          ) : null}
        </div>
      </form>
    </Card>
  );
};
