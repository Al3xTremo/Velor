"use server";

import { budgetLimitFormSchema } from "@velor/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserSession } from "@/server/application/session-service";
import {
  createMonthlyBudget,
  findMonthlyBudget,
  removeBudgetLimit,
  upsertBudgetLimit,
} from "@/server/repositories/budgets-repository";
import { logSecurityEvent } from "@/server/security/audit-log";
import { isUuid } from "@/server/security/input-guards";
import { guardUserMutation } from "@/server/security/mutation-guard";
import { isTrustedActionOrigin } from "@/server/security/origin-guard";
import type { BudgetFormState } from "./form-state";
import { monthToRange, zodFieldErrors } from "./utils";

const revalidateBudgetViews = () => {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
};

const ensureMonthlyBudget = async (
  supabase: Awaited<ReturnType<typeof requireUserSession>>["supabase"],
  userId: string,
  month: string
) => {
  const { startsOn, endsOn } = monthToRange(month);
  const existing = await findMonthlyBudget(supabase, { userId, startsOn });

  if (existing?.id) {
    return { supabase, budgetId: existing.id };
  }

  const { data: created, error } = await createMonthlyBudget(supabase, {
    userId,
    month,
    startsOn,
    endsOn,
  });

  if (error || !created) {
    throw new Error("Failed to create monthly budget");
  }

  return { supabase, budgetId: created.id };
};

export const upsertBudgetLimitAction = async (
  _state: BudgetFormState,
  formData: FormData
): Promise<BudgetFormState> => {
  const trustedOrigin = await isTrustedActionOrigin();
  if (!trustedOrigin) {
    return {
      status: "error",
      message: "No pudimos validar el origen de la solicitud.",
    };
  }

  const payload = {
    month: String(formData.get("month") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    limitAmount: formData.get("limitAmount"),
  };

  const parsed = budgetLimitFormSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos del presupuesto.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const { supabase: supabaseSession, user } = await requireUserSession();
  const mutationGuard = await guardUserMutation(user.id, "budgets.upsert_limit");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "budgets.upsert_limit.rate_limited",
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

  try {
    const { supabase, budgetId } = await ensureMonthlyBudget(
      supabaseSession,
      user.id,
      parsed.data.month
    );
    const { error } = await upsertBudgetLimit(supabase, {
      userId: user.id,
      budgetId,
      categoryId: parsed.data.categoryId,
      limitAmount: parsed.data.limitAmount,
    });

    if (error) {
      logSecurityEvent({
        event: "budgets.upsert_limit.failed",
        severity: "warn",
        actorUserId: user.id,
        details: { reason: error.message },
      });
      return {
        status: "error",
        message: "No pudimos guardar el limite de presupuesto.",
      };
    }

    revalidateBudgetViews();
    logSecurityEvent({ event: "budgets.upsert_limit.success", actorUserId: user.id });
    return {
      status: "success",
      message: "Limite de presupuesto guardado.",
    };
  } catch {
    return {
      status: "error",
      message: "No pudimos preparar el presupuesto mensual.",
    };
  }
};

export const removeBudgetLimitAction = async (formData: FormData) => {
  const trustedOrigin = await isTrustedActionOrigin();
  if (!trustedOrigin) {
    redirect("/budgets?notice=error");
  }

  const budgetLimitId = String(formData.get("budgetLimitId") ?? "");
  const month = String(formData.get("month") ?? "");
  const monthQuery = /^\d{4}-\d{2}$/.test(month) ? `month=${month}&` : "";

  if (!budgetLimitId) {
    redirect(`/budgets?${monthQuery}notice=error`);
  }

  if (!isUuid(budgetLimitId)) {
    redirect(`/budgets?${monthQuery}notice=error`);
  }

  const { supabase, user } = await requireUserSession();
  const mutationGuard = await guardUserMutation(user.id, "budgets.remove_limit");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "budgets.remove_limit.rate_limited",
      severity: "warn",
      actorUserId: user.id,
      details: {
        strategy: mutationGuard.strategy ?? "unknown",
        degraded: mutationGuard.degraded ?? false,
        retryAfterMs: mutationGuard.retryAfterMs,
      },
    });
    redirect(`/budgets?${monthQuery}notice=rate_limited`);
  }

  const { error } = await removeBudgetLimit(supabase, {
    budgetLimitId,
    userId: user.id,
  });

  revalidateBudgetViews();

  if (error) {
    logSecurityEvent({
      event: "budgets.remove_limit.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: error.message },
    });
    redirect(`/budgets?${monthQuery}notice=error`);
  }

  logSecurityEvent({ event: "budgets.remove_limit.success", actorUserId: user.id });
  redirect(`/budgets?${monthQuery}notice=removed`);
};
