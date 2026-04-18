"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label, SelectInput, TextInput } from "@/components/ui/field";
import { createCategoryAction, updateCategoryAction } from "@/features/categories/actions";
import { initialCategoryFormState } from "@/features/categories/form-state";
import { CATEGORY_ICON_OPTIONS } from "@/features/categories/utils";

interface CategoryFormValues {
  id?: string;
  name: string;
  kind: "income" | "expense";
  colorHex: string;
  icon: string;
}

interface CategoryFormProps {
  mode: "create" | "edit";
  initialValues: CategoryFormValues;
}

export const CategoryForm = ({ mode, initialValues }: CategoryFormProps) => {
  const action = mode === "create" ? createCategoryAction : updateCategoryAction;
  const [state, formAction, isPending] = useActionState(action, initialCategoryFormState);

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">
        {mode === "create" ? "Nueva categoria" : "Editar categoria"}
      </h2>
      <p className="mt-1 text-sm text-velor-muted">
        Crea categorias claras para mejorar filtros, reportes y graficos del dashboard.
      </p>

      <form action={formAction} className="mt-5 grid gap-4 md:grid-cols-2">
        {mode === "edit" && initialValues.id ? (
          <input type="hidden" name="categoryId" value={initialValues.id} />
        ) : null}

        <div className="md:col-span-2">
          <Label htmlFor="name">Nombre</Label>
          <TextInput
            id="name"
            name="name"
            defaultValue={initialValues.name}
            placeholder="Ej: Alimentacion"
            required
          />
          <FieldError message={state.fieldErrors?.["name"]} />
        </div>

        <div>
          <Label htmlFor="kind">Tipo</Label>
          <SelectInput id="kind" name="kind" defaultValue={initialValues.kind}>
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </SelectInput>
          <FieldError message={state.fieldErrors?.["kind"]} />
        </div>

        <div>
          <Label htmlFor="colorHex">Color</Label>
          <TextInput
            id="colorHex"
            name="colorHex"
            type="color"
            defaultValue={initialValues.colorHex}
          />
          <FieldError message={state.fieldErrors?.["colorHex"]} />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="icon">Icono</Label>
          <SelectInput id="icon" name="icon" defaultValue={initialValues.icon}>
            <option value="">Sin icono</option>
            {CATEGORY_ICON_OPTIONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </SelectInput>
          <FieldError message={state.fieldErrors?.["icon"]} />
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
                ? "Crear categoria"
                : "Guardar cambios"}
          </Button>
          {mode === "edit" ? (
            <a href="/categories" className="velor-btn-secondary">
              Cancelar edicion
            </a>
          ) : null}
        </div>
      </form>
    </Card>
  );
};
