"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label, TextInput } from "@/components/ui/field";
import { resendConfirmationAction } from "@/features/auth/actions";
import { initialAuthFormState } from "@/features/auth/form-state";

export const ResendConfirmationForm = () => {
  const [state, formAction, isPending] = useActionState(
    resendConfirmationAction,
    initialAuthFormState
  );

  return (
    <form action={formAction} className="space-y-4">
      <Card muted className="space-y-4 p-4">
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
      </Card>

      {state.status !== "idle" && state.message ? (
        <p className={`text-sm ${state.status === "error" ? "text-rose-600" : "text-emerald-600"}`}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Reenviando..." : "Reenviar correo de confirmacion"}
      </Button>
    </form>
  );
};
