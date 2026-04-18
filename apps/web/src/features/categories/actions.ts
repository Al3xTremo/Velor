"use server";

import { categoryFormSchema } from "@velor/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserSession } from "@/server/application/session-service";
import {
  createCategory,
  toggleCategoryActiveStatus,
  updateCategory,
} from "@/server/repositories/categories-repository";
import { logSecurityEvent } from "@/server/security/audit-log";
import { isUuid } from "@/server/security/input-guards";
import { guardUserMutation } from "@/server/security/mutation-guard";
import { isTrustedActionOrigin } from "@/server/security/origin-guard";
import type { CategoryFormState } from "./form-state";
import { zodFieldErrors } from "./utils";

const revalidateCategoryViews = () => {
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
};

export const createCategoryAction = async (
  _state: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> => {
  const trustedOrigin = await isTrustedActionOrigin();
  if (!trustedOrigin) {
    return {
      status: "error",
      message: "No pudimos validar el origen de la solicitud.",
    };
  }

  const payload = {
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? "expense"),
    colorHex: String(formData.get("colorHex") ?? "#64748B"),
    icon: String(formData.get("icon") ?? ""),
  };

  const parsed = categoryFormSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la categoria.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const { supabase, user } = await requireUserSession();
  const mutationGuard = await guardUserMutation(user.id, "categories.create");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "categories.create.rate_limited",
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

  const { error } = await createCategory(supabase, {
    userId: user.id,
    name: parsed.data.name,
    kind: parsed.data.kind,
    colorHex: parsed.data.colorHex,
    ...(parsed.data.icon ? { icon: parsed.data.icon } : {}),
  });

  if (error) {
    logSecurityEvent({
      event: "categories.create.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: error.message },
    });
    return {
      status: "error",
      message: "No pudimos crear la categoria. Si ya existe con ese tipo, usa otro nombre.",
    };
  }

  revalidateCategoryViews();
  logSecurityEvent({ event: "categories.create.success", actorUserId: user.id });
  return {
    status: "success",
    message: "Categoria creada correctamente.",
  };
};

export const updateCategoryAction = async (
  _state: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> => {
  const trustedOrigin = await isTrustedActionOrigin();
  if (!trustedOrigin) {
    return {
      status: "error",
      message: "No pudimos validar el origen de la solicitud.",
    };
  }

  const categoryId = String(formData.get("categoryId") ?? "");
  if (!categoryId) {
    return {
      status: "error",
      message: "No se pudo identificar la categoria a editar.",
    };
  }

  if (!isUuid(categoryId)) {
    return {
      status: "error",
      message: "No se pudo identificar la categoria a editar.",
    };
  }

  const payload = {
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? "expense"),
    colorHex: String(formData.get("colorHex") ?? "#64748B"),
    icon: String(formData.get("icon") ?? ""),
  };

  const parsed = categoryFormSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la categoria.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const { supabase, user } = await requireUserSession();
  const mutationGuard = await guardUserMutation(user.id, "categories.update");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "categories.update.rate_limited",
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

  const { error } = await updateCategory(supabase, {
    categoryId,
    userId: user.id,
    name: parsed.data.name,
    kind: parsed.data.kind,
    colorHex: parsed.data.colorHex,
    ...(parsed.data.icon ? { icon: parsed.data.icon } : {}),
  });

  if (error) {
    logSecurityEvent({
      event: "categories.update.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: error.message },
    });
    return {
      status: "error",
      message: "No pudimos actualizar la categoria.",
    };
  }

  revalidateCategoryViews();
  logSecurityEvent({ event: "categories.update.success", actorUserId: user.id });
  return {
    status: "success",
    message: "Categoria actualizada correctamente.",
  };
};

export const toggleCategoryStatusAction = async (formData: FormData) => {
  const trustedOrigin = await isTrustedActionOrigin();
  if (!trustedOrigin) {
    redirect("/categories?notice=error");
  }

  const categoryId = String(formData.get("categoryId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "inactive");

  if (!categoryId || !["active", "inactive"].includes(nextStatus)) {
    redirect("/categories?notice=error");
  }

  if (!isUuid(categoryId)) {
    redirect("/categories?notice=error");
  }

  const { supabase, user } = await requireUserSession();
  const mutationGuard = await guardUserMutation(user.id, "categories.toggle_status");
  if (!mutationGuard.allowed) {
    logSecurityEvent({
      event: "categories.toggle_status.rate_limited",
      severity: "warn",
      actorUserId: user.id,
      details: {
        strategy: mutationGuard.strategy ?? "unknown",
        degraded: mutationGuard.degraded ?? false,
        retryAfterMs: mutationGuard.retryAfterMs,
      },
    });
    redirect("/categories?notice=rate_limited");
  }

  const { error } = await toggleCategoryActiveStatus(supabase, {
    categoryId,
    userId: user.id,
    isActive: nextStatus === "active",
  });

  revalidateCategoryViews();

  if (error) {
    logSecurityEvent({
      event: "categories.toggle_status.failed",
      severity: "warn",
      actorUserId: user.id,
      details: { reason: error.message },
    });
    redirect("/categories?notice=error");
  }

  logSecurityEvent({
    event: "categories.toggle_status.success",
    actorUserId: user.id,
    details: { nextStatus },
  });

  redirect(`/categories?notice=${nextStatus === "active" ? "reactivated" : "archived"}`);
};
