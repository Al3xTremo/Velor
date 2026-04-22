"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label, SelectInput, TextInput } from "@/components/ui/field";
import { updateSettingsAction } from "@/features/settings/actions";
import { initialSettingsFormState } from "@/features/settings/form-state";

interface SettingsFormProps {
  initialValues: {
    fullName: string;
    defaultCurrency: "EUR" | "USD";
    timezone: string;
    openingBalance: string;
  };
}

export const SettingsForm = ({ initialValues }: SettingsFormProps) => {
  const [state, formAction, isPending] = useActionState(
    updateSettingsAction,
    initialSettingsFormState
  );

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">Perfil y preferencias base</h2>
      <p className="mt-1 text-sm text-velor-muted">
        Edita tu nombre, moneda principal, zona horaria y saldo inicial sin salir de esta pantalla.
      </p>

      <form action={formAction} className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <TextInput
            id="fullName"
            name="fullName"
            defaultValue={initialValues.fullName}
            autoComplete="name"
            required
          />
          <FieldError message={state.fieldErrors?.["fullName"]} />
        </div>

        <div>
          <Label htmlFor="defaultCurrency">Moneda principal</Label>
          <SelectInput
            id="defaultCurrency"
            name="defaultCurrency"
            defaultValue={initialValues.defaultCurrency}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </SelectInput>
          <FieldError message={state.fieldErrors?.["defaultCurrency"]} />
        </div>

        <div>
          <Label htmlFor="timezone">Zona horaria</Label>
          <TextInput
            id="timezone"
            name="timezone"
            defaultValue={initialValues.timezone}
            placeholder="Europe/Madrid"
            required
          />
          <FieldError message={state.fieldErrors?.["timezone"]} />
        </div>

        <div>
          <Label htmlFor="openingBalance">Saldo inicial</Label>
          <TextInput
            id="openingBalance"
            name="openingBalance"
            type="number"
            step="0.01"
            defaultValue={initialValues.openingBalance}
            required
          />
          <FieldError message={state.fieldErrors?.["openingBalance"]} />
        </div>

        {state.status !== "idle" && state.message ? (
          <p
            className={`md:col-span-2 text-sm ${state.status === "error" ? "text-rose-600" : "text-emerald-600"}`}
          >
            {state.message}
          </p>
        ) : null}

        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar ajustes"}
          </Button>
        </div>
      </form>
    </Card>
  );
};
