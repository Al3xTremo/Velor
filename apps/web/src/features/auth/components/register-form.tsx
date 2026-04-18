"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label, SelectInput, TextInput } from "@/components/ui/field";
import { registerAction } from "@/features/auth/actions";
import { initialAuthFormState } from "@/features/auth/form-state";

export const RegisterForm = () => {
  const [state, formAction, isPending] = useActionState(registerAction, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-4">
      <Card muted className="space-y-4 p-4">
        <div>
          <Label htmlFor="fullName">Nombre completo</Label>
          <TextInput
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Nombre Apellido"
            required
          />
          <FieldError message={state.fieldErrors?.["fullName"]} />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          <FieldError message={state.fieldErrors?.["email"]} />
        </div>

        <div>
          <Label htmlFor="password">Contrasena</Label>
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimo 8 caracteres"
            required
          />
          <FieldError message={state.fieldErrors?.["password"]} />
        </div>

        <div>
          <Label htmlFor="defaultCurrency">Moneda principal</Label>
          <SelectInput id="defaultCurrency" name="defaultCurrency" defaultValue="EUR">
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </SelectInput>
        </div>
      </Card>

      {state.status !== "idle" && state.message ? (
        <p className={`text-sm ${state.status === "error" ? "text-rose-600" : "text-emerald-600"}`}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
};
