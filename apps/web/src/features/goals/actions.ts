"use server";

import { savingsGoalFormSchema } from "@velor/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserSession } from "@/server/application/session-service";
import { createGoal, setGoalStatus, updateGoal } from "@/server/repositories/goals-repository";
import { logSecurityEvent } from "@/server/security/audit-log";
import { isUuid } from "@/server/security/input-guards";
import { guardUserMutation } from "@/server/security/mutation-guard";
import { isTrustedActionOrigin } from "@/server/security/origin-guard";
import type { GoalFormState } from "./form-state";
import { zodFieldErrors } from "./utils";

const revalidateGoalViews = () => {
  revalidatePath("/goals");
  revalidatePath("/dashboard");
};

export const createGoalAction = async (
  _state: GoalFormState,
  formData: FormData
): Promise<GoalFormState> => {
  const trustedOrigin = await isTrustedActionOrigin();
  if (!trustedOrigin) {
    return {
      status: "error",
      message: "No pudimos validar el origen de la solicitud.",
    };
  }

  const payload = {
    name: String(formData.get("name") ?? ""),
    targetAmount: formData.get("targetAmount"),
    currentAmount: formData.get("currentAmount"),
    targetDate: String(formData.get("targetDate") ?? "") || undefined,
  };

  const parsed = savingsGoalFormSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos del objetivo.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const { supabase, user } = await requireUserSession();
  const mutationGuard = await guardUserMutation(user.id, "goals.create");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "goals.create.rate_limited",
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

  const { error } = await createGoal(supabase, {
    userId: user.id,
    values: parsed.data,
  });

  if (error) {
    logSecurityEvent({
      event: "goals.create.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: error.message },
    });
    return {
      status: "error",
      message: "No pudimos crear el objetivo. Si ya existe uno con ese nombre, usa otro nombre.",
    };
  }

  revalidateGoalViews();
  logSecurityEvent({ event: "goals.create.success", actorUserId: user.id });
  return {
    status: "success",
    message: "Objetivo creado correctamente.",
  };
};

export const updateGoalAction = async (
  _state: GoalFormState,
  formData: FormData
): Promise<GoalFormState> => {
  const trustedOrigin = await isTrustedActionOrigin();
  if (!trustedOrigin) {
    return {
      status: "error",
      message: "No pudimos validar el origen de la solicitud.",
    };
  }

  const goalId = String(formData.get("goalId") ?? "");

  if (!goalId) {
    return {
      status: "error",
      message: "No se pudo identificar el objetivo a editar.",
    };
  }

  if (!isUuid(goalId)) {
    return {
      status: "error",
      message: "No se pudo identificar el objetivo a editar.",
    };
  }

  const payload = {
    name: String(formData.get("name") ?? ""),
    targetAmount: formData.get("targetAmount"),
    currentAmount: formData.get("currentAmount"),
    targetDate: String(formData.get("targetDate") ?? "") || undefined,
  };

  const parsed = savingsGoalFormSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos del objetivo.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const { supabase, user } = await requireUserSession();
  const mutationGuard = await guardUserMutation(user.id, "goals.update");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "goals.update.rate_limited",
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

  const nextStatus = parsed.data.currentAmount >= parsed.data.targetAmount ? "completed" : "active";

  const { error } = await updateGoal(supabase, {
    goalId,
    userId: user.id,
    values: parsed.data,
    status: nextStatus,
  });

  if (error) {
    logSecurityEvent({
      event: "goals.update.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: error.message },
    });
    return {
      status: "error",
      message: "No pudimos actualizar el objetivo.",
    };
  }

  revalidateGoalViews();
  logSecurityEvent({ event: "goals.update.success", actorUserId: user.id });
  return {
    status: "success",
    message: "Objetivo actualizado correctamente.",
  };
};

export const toggleGoalArchiveAction = async (formData: FormData) => {
  const trustedOrigin = await isTrustedActionOrigin();
  if (!trustedOrigin) {
    redirect("/goals?notice=error");
  }

  const goalId = String(formData.get("goalId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "archived");

  if (!goalId || !["active", "archived"].includes(nextStatus)) {
    redirect("/goals?notice=error");
  }

  if (!isUuid(goalId)) {
    redirect("/goals?notice=error");
  }

  const { supabase, user } = await requireUserSession();
  const mutationGuard = await guardUserMutation(user.id, "goals.toggle_archive");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "goals.toggle_archive.rate_limited",
      severity: "warn",
      actorUserId: user.id,
      details: {
        strategy: mutationGuard.strategy ?? "unknown",
        degraded: mutationGuard.degraded ?? false,
        retryAfterMs: mutationGuard.retryAfterMs,
      },
    });
    redirect("/goals?notice=rate_limited");
  }

  const { error } = await setGoalStatus(supabase, {
    goalId,
    userId: user.id,
    status: nextStatus === "archived" ? "archived" : "active",
  });

  revalidateGoalViews();

  if (error) {
    logSecurityEvent({
      event: "goals.toggle_archive.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: error.message },
    });
    redirect("/goals?notice=error");
  }

  logSecurityEvent({
    event: "goals.toggle_archive.success",
    actorUserId: user.id,
    details: { nextStatus },
  });

  redirect(`/goals?notice=${nextStatus === "archived" ? "archived" : "reactivated"}`);
};
