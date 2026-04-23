"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label, SelectInput, TextInput } from "@/components/ui/field";
import { Table } from "@/components/ui/table";
import { toggleSubscriptionRuleAction, upsertSubscriptionRuleAction } from "@/features/settings/actions";
import { initialSubscriptionRuleFormState } from "@/features/settings/form-state";

interface SubscriptionCategoryOption {
  id: string;
  name: string;
}

interface SubscriptionRuleRow {
  id: string;
  name: string;
  amountFormatted: string;
  categoryName: string;
  intervalLabel: string;
  nextChargeOn: string;
  isActive: boolean;
  editHref: string;
}

interface EditingSubscriptionRule {
  id: string;
  name: string;
  amount: string;
  categoryId: string;
  interval: "weekly" | "monthly" | "yearly";
  nextChargeOn: string;
  isActive: boolean;
}

interface SubscriptionRulesSectionProps {
  categories: SubscriptionCategoryOption[];
  rows: SubscriptionRuleRow[];
  editingRule: EditingSubscriptionRule | null;
}

export const SubscriptionRulesSection = ({
  categories,
  rows,
  editingRule,
}: SubscriptionRulesSectionProps) => {
  const [state, formAction, isPending] = useActionState(
    upsertSubscriptionRuleAction,
    initialSubscriptionRuleFormState
  );

  const mode = editingRule ? "edit" : "create";
  const defaultCategoryId = editingRule?.categoryId ?? categories[0]?.id ?? "";

  return (
    <section id="recurrencias" className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold text-velor-text">Recurrencias v1</h2>
        <p className="mt-1 text-sm text-velor-muted">
          Gestiona reglas recurrentes sobre subscriptions sin automatizacion de materializacion.
        </p>

        {categories.length === 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Necesitas al menos una categoria de gasto activa para crear reglas recurrentes. Ve a
            <a href="/categories" className="ml-1 underline">
              categorias
            </a>
            .
          </div>
        ) : (
          <form action={formAction} className="mt-5 grid gap-4 md:grid-cols-2">
            {mode === "edit" && editingRule ? (
              <input type="hidden" name="subscriptionId" value={editingRule.id} />
            ) : null}

            <div className="md:col-span-2">
              <Label htmlFor="ruleName">Nombre</Label>
              <TextInput
                id="ruleName"
                name="name"
                defaultValue={editingRule?.name ?? ""}
                placeholder="Ej: Internet hogar"
                required
              />
              <FieldError message={state.fieldErrors?.["name"]} />
            </div>

            <div>
              <Label htmlFor="ruleAmount">Importe</Label>
              <TextInput
                id="ruleAmount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={editingRule?.amount ?? ""}
                required
              />
              <FieldError message={state.fieldErrors?.["amount"]} />
            </div>

            <div>
              <Label htmlFor="ruleInterval">Intervalo</Label>
              <SelectInput
                id="ruleInterval"
                name="interval"
                defaultValue={editingRule?.interval ?? "monthly"}
              >
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </SelectInput>
              <FieldError message={state.fieldErrors?.["interval"]} />
            </div>

            <div>
              <Label htmlFor="ruleCategory">Categoria</Label>
              <SelectInput id="ruleCategory" name="categoryId" defaultValue={defaultCategoryId}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectInput>
              <FieldError message={state.fieldErrors?.["categoryId"]} />
            </div>

            <div>
              <Label htmlFor="nextChargeOn">Proximo cobro</Label>
              <TextInput
                id="nextChargeOn"
                name="nextChargeOn"
                type="date"
                defaultValue={editingRule?.nextChargeOn ?? new Date().toISOString().slice(0, 10)}
                required
              />
              <FieldError message={state.fieldErrors?.["nextChargeOn"]} />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="ruleIsActive"
                name="isActive"
                type="checkbox"
                defaultChecked={editingRule?.isActive ?? true}
              />
              <Label htmlFor="ruleIsActive" className="mb-0 text-sm normal-case tracking-normal">
                Regla activa
              </Label>
            </div>

            <p className="md:col-span-2 text-xs text-velor-muted">
              Esta seccion no crea transacciones automaticas en este sprint.
            </p>

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
                    ? "Crear regla"
                    : "Guardar cambios"}
              </Button>
              {mode === "edit" ? (
                <a href="/settings#recurrencias" className="velor-btn-secondary">
                  Cancelar edicion
                </a>
              ) : null}
            </div>
          </form>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-velor-border px-5 py-4">
          <h3 className="font-display text-lg font-semibold text-velor-text">Reglas actuales</h3>
          <p className="text-sm text-velor-muted">
            Revisa proxima fecha, estado y ajusta cada regla sin borrado duro.
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoria</th>
                <th>Intervalo</th>
                <th>Proxima fecha</th>
                <th>Estado</th>
                <th className="text-right">Importe</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium text-velor-text">{row.name}</td>
                    <td>{row.categoryName}</td>
                    <td>{row.intervalLabel}</td>
                    <td>{row.nextChargeOn}</td>
                    <td>
                      <Badge variant={row.isActive ? "success" : "warning"}>
                        {row.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                    </td>
                    <td className="text-right font-semibold text-velor-text">{row.amountFormatted}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <a href={row.editHref} className="velor-btn-secondary px-3 py-1.5 text-xs">
                          Editar
                        </a>
                        <form action={toggleSubscriptionRuleAction}>
                          <input type="hidden" name="subscriptionId" value={row.id} />
                          <input
                            type="hidden"
                            name="nextIsActive"
                            value={row.isActive ? "false" : "true"}
                          />
                          <input type="hidden" name="returnTo" value="/settings" />
                          <button
                            type="submit"
                            className={`velor-btn-ghost px-3 py-1.5 text-xs ${
                              row.isActive ? "text-velor-danger" : "text-emerald-700"
                            }`}
                          >
                            {row.isActive ? "Desactivar" : "Activar"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-velor-muted">
                    Todavia no tienes reglas recurrentes configuradas.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </section>
  );
};
