"use server";

import { profileSetupSchema } from "@velor/contracts";
import { revalidatePath } from "next/cache";
import { zodFieldErrors } from "@/features/auth/utils";
import { requireUserSession } from "@/server/application/session-service";
import {
  getPrimaryAccount,
  updatePrimaryAccount,
  updateUserProfileSettings,
} from "@/server/repositories/profile-repository";
import { logSecurityEvent } from "@/server/security/audit-log";
import { guardUserMutation } from "@/server/security/mutation-guard";
import { isTrustedActionOrigin } from "@/server/security/origin-guard";
import type { SettingsFormState } from "./form-state";

const revalidateSettingsViews = () => {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/analytics");
  revalidatePath("/budgets");
  revalidatePath("/goals");
};

export const updateSettingsAction = async (
  _state: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> => {
  const trustedOrigin = await isTrustedActionOrigin();
  if (!trustedOrigin) {
    return {
      status: "error",
      message: "No pudimos validar el origen de la solicitud.",
    };
  }

  const payload = {
    fullName: String(formData.get("fullName") ?? ""),
    defaultCurrency: String(formData.get("defaultCurrency") ?? "EUR"),
    timezone: String(formData.get("timezone") ?? "UTC"),
    openingBalance: formData.get("openingBalance"),
  };

  const parsedPayload = profileSetupSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return {
      status: "error",
      message: "Revisa los campos del formulario.",
      fieldErrors: zodFieldErrors(parsedPayload.error),
    };
  }

  const { supabase, user } = await requireUserSession();
  const mutationGuard = await guardUserMutation(user.id, "settings.update");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "settings.update.rate_limited",
      severity: "warn",
      actorUserId: user.id,
      details: {
        strategy: mutationGuard.strategy ?? "unknown",
        degraded: mutationGuard.degraded ?? false,
        retryAfterMs: mutationGuard.retryAfterMs,
      },
    });
    return {
      status: "error",
      message: "Demasiados intentos en poco tiempo. Espera un momento y reintenta.",
    };
  }

  const profileUpdate = await updateUserProfileSettings(supabase, {
    userId: user.id,
    fullName: parsedPayload.data.fullName,
    defaultCurrency: parsedPayload.data.defaultCurrency,
    timezone: parsedPayload.data.timezone,
  });

  if (profileUpdate.error) {
    logSecurityEvent({
      event: "settings.profile_update.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: profileUpdate.error.message },
    });
    return {
      status: "error",
      message: "No pudimos guardar el perfil en ajustes.",
    };
  }

  const account = await getPrimaryAccount(supabase, user.id);
  if (!account) {
    logSecurityEvent({
      event: "settings.account_missing",
      severity: "warn",
      actorUserId: user.id,
    });
    return {
      status: "error",
      message: "No pudimos encontrar tu cuenta principal para actualizar el saldo inicial.",
    };
  }

  const accountUpdate = await updatePrimaryAccount(supabase, {
    accountId: account.id,
    userId: user.id,
    defaultCurrency: parsedPayload.data.defaultCurrency,
    openingBalance: parsedPayload.data.openingBalance,
  });

  if (accountUpdate.error) {
    logSecurityEvent({
      event: "settings.account_update.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: accountUpdate.error.message },
    });
    return {
      status: "error",
      message: "No pudimos actualizar la cuenta principal en ajustes.",
    };
  }

  revalidateSettingsViews();
  logSecurityEvent({ event: "settings.update.success", actorUserId: user.id });

  return {
    status: "success",
    message: "Ajustes guardados correctamente.",
  };
};
