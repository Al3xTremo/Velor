"use server";

import { profileSetupSchema } from "@velor/contracts";
import { redirect } from "next/navigation";
import { zodFieldErrors } from "@/features/auth/utils";
import { requireUserSession } from "@/server/application/session-service";
import {
  createPrimaryAccount,
  getPrimaryAccount,
  updatePrimaryAccount,
  upsertOnboardingProfile,
} from "@/server/repositories/profile-repository";
import { logSecurityEvent } from "@/server/security/audit-log";
import { guardUserMutation } from "@/server/security/mutation-guard";
import { isTrustedActionOrigin } from "@/server/security/origin-guard";
import type { OnboardingFormState } from "./form-state";

export const onboardingSetupAction = async (
  _state: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> => {
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
  const mutationGuard = await guardUserMutation(user.id, "onboarding.setup");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "onboarding.setup.rate_limited",
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

  const profileUpdate = await upsertOnboardingProfile(supabase, {
    userId: user.id,
    fullName: parsedPayload.data.fullName,
    defaultCurrency: parsedPayload.data.defaultCurrency,
    timezone: parsedPayload.data.timezone,
  });

  if (profileUpdate.error) {
    logSecurityEvent({
      event: "onboarding.profile_update.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: profileUpdate.error.message },
    });
    return {
      status: "error",
      message: "No pudimos guardar tu perfil inicial.",
    };
  }

  const primaryAccount = await getPrimaryAccount(supabase, user.id);

  if (!primaryAccount) {
    const accountInsert = await createPrimaryAccount(supabase, {
      userId: user.id,
      defaultCurrency: parsedPayload.data.defaultCurrency,
      openingBalance: parsedPayload.data.openingBalance,
    });

    if (accountInsert.error) {
      logSecurityEvent({
        event: "onboarding.account_create.failed",
        severity: "warn",
        actorUserId: user.id,
        details: { reason: accountInsert.error.message },
      });
      return {
        status: "error",
        message: "No pudimos crear tu cuenta principal.",
      };
    }
  } else {
    const accountUpdate = await updatePrimaryAccount(supabase, {
      accountId: primaryAccount.id,
      userId: user.id,
      defaultCurrency: parsedPayload.data.defaultCurrency,
      openingBalance: parsedPayload.data.openingBalance,
    });

    if (accountUpdate.error) {
      logSecurityEvent({
        event: "onboarding.account_update.failed",
        severity: "warn",
        actorUserId: user.id,
        details: { reason: accountUpdate.error.message },
      });
      return {
        status: "error",
        message: "No pudimos actualizar tu saldo inicial.",
      };
    }
  }

  logSecurityEvent({ event: "onboarding.setup.success", actorUserId: user.id });
  redirect("/dashboard");
};
