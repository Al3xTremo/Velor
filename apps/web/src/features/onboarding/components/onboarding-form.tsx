"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label, SelectInput, TextInput } from "@/components/ui/field";
import { onboardingSetupAction } from "@/features/onboarding/actions";
import { initialOnboardingFormState } from "@/features/onboarding/form-state";

interface OnboardingFormProps {
  initialValues: {
    fullName: string;
    defaultCurrency: "EUR" | "USD";
    timezone: string;
    openingBalance: string;
  };
}

export const OnboardingForm = ({ initialValues }: OnboardingFormProps) => {
  const [state, formAction, isPending] = useActionState(
    onboardingSetupAction,
    initialOnboardingFormState
  );

  return (
    <form action={formAction} className="space-y-5">
      <Card className="space-y-4 p-4 md:p-5">
        <div>
          <Label htmlFor="fullName">Nombre completo</Label>
          <TextInput
            id="fullName"
            name="fullName"
            type="text"
            defaultValue={initialValues.fullName}
            autoComplete="name"
            required
          />
          <FieldError message={state.fieldErrors?.["fullName"]} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
              type="text"
              defaultValue={initialValues.timezone}
              placeholder="Europe/Madrid"
              required
            />
            <FieldError message={state.fieldErrors?.["timezone"]} />
          </div>
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
      </Card>

      {state.status !== "idle" && state.message ? (
        <p className={`text-sm ${state.status === "error" ? "text-rose-600" : "text-emerald-600"}`}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full md:w-auto">
        {isPending ? "Guardando..." : "Guardar configuracion inicial"}
      </Button>
    </form>
  );
};
