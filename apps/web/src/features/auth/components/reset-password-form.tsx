"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label, TextInput } from "@/components/ui/field";
import { resetPasswordAction } from "@/features/auth/actions";
import { initialAuthFormState } from "@/features/auth/form-state";

export const ResetPasswordForm = () => {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-4">
      <Card muted className="space-y-4 p-4">
        <div>
          <Label htmlFor="password">Nueva contrasena</Label>
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
          <Label htmlFor="confirmPassword">Repetir contrasena</Label>
          <TextInput
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repite la contrasena"
            required
          />
          <FieldError message={state.fieldErrors?.["confirmPassword"]} />
        </div>
      </Card>

      {state.status !== "idle" && state.message ? (
        <p className={`text-sm ${state.status === "error" ? "text-rose-600" : "text-emerald-600"}`}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Actualizando..." : "Actualizar contrasena"}
      </Button>
    </form>
  );
};
