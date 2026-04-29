"use server";

import { profileSetupSchema, subscriptionRuleFormSchema } from "@velor/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRedirectPath, zodFieldErrors } from "@/features/auth/utils";
import { requireUserSession } from "@/server/application/session-service";
import {
  getPrimaryAccount,
  updatePrimaryAccount,
  updateUserProfileSettings,
} from "@/server/repositories/profile-repository";
import {
  createSubscriptionRule,
  toggleSubscriptionRuleActiveStatus,
  updateSubscriptionRule,
} from "@/server/repositories/subscriptions-repository";
import { logSecurityEvent } from "@/server/security/audit-log";
import { isUuid } from "@/server/security/input-guards";
import { guardUserMutation } from "@/server/security/mutation-guard";
import { isTrustedActionOrigin } from "@/server/security/origin-guard";
import type { SettingsFormState, SubscriptionRuleFormState } from "./form-state";

const revalidateSettingsViews = () => {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/analytics");
  revalidatePath("/budgets");
  revalidatePath("/goals");
};

const revalidateSubscriptionRulesViews = () => {
  revalidatePath("/settings");
};

const resolveSettingsReturnPath = (formData: FormData) => {
  const rawPath = String(formData.get("returnTo") ?? "");
  const safePath = safeRedirectPath(rawPath, "/settings") ?? "/settings";

  if (safePath === "/settings" || safePath.startsWith("/settings?")) {
    return safePath;
  }

  return "/settings";
};

const withNotice = (
  path: string,
  notice: "subscription_toggled" | "subscription_error" | "subscription_rate_limited"
) => {
  const [rawPathname = "/settings", queryString = ""] = path.split("?");
  const pathname = rawPathname || "/settings";
  const params = new URLSearchParams(queryString);
  params.delete("editSubscription");
  params.set("notice", notice);

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
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

export const upsertSubscriptionRuleAction = async (
  _state: SubscriptionRuleFormState,
  formData: FormData
): Promise<SubscriptionRuleFormState> => {
  const trustedOrigin = await isTrustedActionOrigin();
  if (!trustedOrigin) {
    return {
      status: "error",
      message: "No pudimos validar el origen de la solicitud.",
    };
  }

  const subscriptionId = String(formData.get("subscriptionId") ?? "").trim();

  if (subscriptionId && !isUuid(subscriptionId)) {
    return {
      status: "error",
      message: "No pudimos identificar la regla recurrente a editar.",
    };
  }

  const payload = {
    name: String(formData.get("name") ?? ""),
    amount: formData.get("amount"),
    categoryId: String(formData.get("categoryId") ?? ""),
    interval: String(formData.get("interval") ?? "monthly"),
    nextChargeOn: String(formData.get("nextChargeOn") ?? ""),
    isActive: formData.get("isActive") === "on",
  };

  const parsedPayload = subscriptionRuleFormSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return {
      status: "error",
      message: "Revisa los campos de la regla recurrente.",
      fieldErrors: zodFieldErrors(parsedPayload.error),
    };
  }

  const { supabase, user } = await requireUserSession();
  const mutationGuard = await guardUserMutation(user.id, "settings.subscriptions.upsert");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "settings.subscriptions.upsert.rate_limited",
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

  if (subscriptionId) {
    const updateResult = await updateSubscriptionRule(supabase, {
      subscriptionId,
      userId: user.id,
      values: parsedPayload.data,
    });

    if (updateResult.error) {
      logSecurityEvent({
        event: "settings.subscriptions.update.failed",
        severity: "warn",
        actorUserId: user.id,
        details: { reason: updateResult.error.message },
      });
      return {
        status: "error",
        message: "No pudimos actualizar la regla recurrente.",
      };
    }

    revalidateSubscriptionRulesViews();
    logSecurityEvent({ event: "settings.subscriptions.update.success", actorUserId: user.id });

    return {
      status: "success",
      message: "Regla recurrente actualizada correctamente.",
    };
  }

  const account = await getPrimaryAccount(supabase, user.id);
  if (!account) {
    logSecurityEvent({
      event: "settings.subscriptions.account_missing",
      severity: "warn",
      actorUserId: user.id,
    });
    return {
      status: "error",
      message: "No pudimos encontrar la cuenta principal para crear la regla recurrente.",
    };
  }

  const createResult = await createSubscriptionRule(supabase, {
    userId: user.id,
    accountId: account.id,
    values: parsedPayload.data,
  });

  if (createResult.error) {
    logSecurityEvent({
      event: "settings.subscriptions.create.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: createResult.error.message },
    });
    return {
      status: "error",
      message: "No pudimos crear la regla recurrente.",
    };
  }

  revalidateSubscriptionRulesViews();
  logSecurityEvent({ event: "settings.subscriptions.create.success", actorUserId: user.id });

  return {
    status: "success",
    message: "Regla recurrente creada correctamente.",
  };
};

export const toggleSubscriptionRuleAction = async (formData: FormData) => {
  const returnTo = resolveSettingsReturnPath(formData);

  const trustedOrigin = await isTrustedActionOrigin();
  if (!trustedOrigin) {
    redirect(withNotice(returnTo, "subscription_error"));
  }

  const subscriptionId = String(formData.get("subscriptionId") ?? "").trim();
  if (!subscriptionId || !isUuid(subscriptionId)) {
    redirect(withNotice(returnTo, "subscription_error"));
  }

  const nextIsActive = String(formData.get("nextIsActive") ?? "") === "true";

  const { supabase, user } = await requireUserSession();
  const mutationGuard = await guardUserMutation(user.id, "settings.subscriptions.toggle");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "settings.subscriptions.toggle.rate_limited",
      severity: "warn",
      actorUserId: user.id,
      details: {
        strategy: mutationGuard.strategy ?? "unknown",
        degraded: mutationGuard.degraded ?? false,
        retryAfterMs: mutationGuard.retryAfterMs,
      },
    });
    redirect(withNotice(returnTo, "subscription_rate_limited"));
  }

  const toggleResult = await toggleSubscriptionRuleActiveStatus(supabase, {
    subscriptionId,
    userId: user.id,
    isActive: nextIsActive,
  });

  revalidateSubscriptionRulesViews();

  if (toggleResult.error) {
    logSecurityEvent({
      event: "settings.subscriptions.toggle.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: toggleResult.error.message },
    });
    redirect(withNotice(returnTo, "subscription_error"));
  }

  logSecurityEvent({ event: "settings.subscriptions.toggle.success", actorUserId: user.id });
  redirect(withNotice(returnTo, "subscription_toggled"));
};
