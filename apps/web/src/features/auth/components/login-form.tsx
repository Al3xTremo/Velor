"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Label, TextInput } from "@/components/ui/field";
import { loginAction } from "@/features/auth/actions";
import { initialAuthFormState } from "@/features/auth/form-state";

interface LoginFormProps {
  nextPath: string;
}

export const LoginForm = ({ nextPath }: LoginFormProps) => {
  const [state, formAction, isPending] = useActionState(loginAction, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />

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

        <div>
          <Label htmlFor="password">Contrasena</Label>
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="********"
            required
          />
          <FieldError message={state.fieldErrors?.["password"]} />
        </div>
      </Card>

      {state.status !== "idle" && state.message ? (
        <p className={`text-sm ${state.status === "error" ? "text-rose-600" : "text-emerald-600"}`}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
};
