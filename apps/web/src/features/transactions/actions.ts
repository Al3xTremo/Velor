"use server";

import { transactionFormSchema } from "@velor/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserSession } from "@/server/application/session-service";
import { isNextNavigationError, reportUnexpectedError } from "@/server/observability/errors";
import { getPrimaryAccount } from "@/server/repositories/profile-repository";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/server/repositories/transactions-repository";
import { logSecurityEvent } from "@/server/security/audit-log";
import { isUuid } from "@/server/security/input-guards";
import { guardUserMutation } from "@/server/security/mutation-guard";
import { isTrustedActionOrigin } from "@/server/security/origin-guard";
import type { TransactionFormState } from "./form-state";
import { toOccurredMonth, zodFieldErrors } from "./utils";

const revalidateTransactionViews = () => {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
};

export const createTransactionAction = async (
  _state: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> => {
  try {
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
      source: String(formData.get("source") ?? "manual"),
      amount: formData.get("amount"),
      categoryId: String(formData.get("categoryId") ?? ""),
      occurredOn: String(formData.get("occurredOn") ?? ""),
      description: String(formData.get("description") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      isRecurring: formData.get("isRecurring") === "on",
    };

    const parsed = transactionFormSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Revisa los campos del formulario.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { supabase, user } = await requireUserSession();
    const mutationGuard = await guardUserMutation(user.id, "transactions.create");
    if (!mutationGuard.allowed) {
      logSecurityEvent({
        event: "transactions.create.rate_limited",
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
    const account = await getPrimaryAccount(supabase, user.id);

    if (!account) {
      return {
        status: "error",
        message: "No pudimos obtener la cuenta principal para guardar la transaccion.",
      };
    }

    const { error } = await createTransaction(supabase, {
      userId: user.id,
      accountId: account.id,
      values: parsed.data,
      occurredMonth: toOccurredMonth(parsed.data.occurredOn),
    });

    if (error) {
      logSecurityEvent({
        event: "transactions.create.failed",
        severity: "warn",
        actorUserId: user.id,
        details: { reason: error.message },
      });
      return {
        status: "error",
        message: "No pudimos guardar la transaccion. Intentalo nuevamente.",
      };
    }

    revalidateTransactionViews();
    logSecurityEvent({ event: "transactions.create.success", actorUserId: user.id });

    return {
      status: "success",
      message: "Transaccion creada correctamente.",
    };
  } catch (error) {
    if (isNextNavigationError(error)) {
      throw error;
    }

    reportUnexpectedError("transactions.create.unexpected_error", "transactions", error);
    return {
      status: "error",
      message: "No pudimos crear la transaccion por un error inesperado.",
    };
  }
};

export const updateTransactionAction = async (
  _state: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> => {
  try {
    const trustedOrigin = await isTrustedActionOrigin();
    if (!trustedOrigin) {
      return {
        status: "error",
        message: "No pudimos validar el origen de la solicitud.",
      };
    }

    const transactionId = String(formData.get("transactionId") ?? "");

    if (!transactionId) {
      return {
        status: "error",
        message: "No pudimos identificar la transaccion a editar.",
      };
    }

    if (!isUuid(transactionId)) {
      return {
        status: "error",
        message: "No pudimos identificar la transaccion a editar.",
      };
    }

    const payload = {
      name: String(formData.get("name") ?? ""),
      kind: String(formData.get("kind") ?? "expense"),
      source: String(formData.get("source") ?? "manual"),
      amount: formData.get("amount"),
      categoryId: String(formData.get("categoryId") ?? ""),
      occurredOn: String(formData.get("occurredOn") ?? ""),
      description: String(formData.get("description") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      isRecurring: formData.get("isRecurring") === "on",
    };

    const parsed = transactionFormSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        status: "error",
        message: "Revisa los campos del formulario.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const { supabase, user } = await requireUserSession();
    const mutationGuard = await guardUserMutation(user.id, "transactions.update");
    if (!mutationGuard.allowed) {
      logSecurityEvent({
        event: "transactions.update.rate_limited",
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

    const { error } = await updateTransaction(supabase, {
      transactionId,
      userId: user.id,
      values: parsed.data,
      occurredMonth: toOccurredMonth(parsed.data.occurredOn),
    });

    if (error) {
      logSecurityEvent({
        event: "transactions.update.failed",
        severity: "warn",
        actorUserId: user.id,
        details: { reason: error.message },
      });
      return {
        status: "error",
        message: "No pudimos actualizar la transaccion.",
      };
    }

    revalidateTransactionViews();
    logSecurityEvent({ event: "transactions.update.success", actorUserId: user.id });

    return {
      status: "success",
      message: "Transaccion actualizada correctamente.",
    };
  } catch (error) {
    if (isNextNavigationError(error)) {
      throw error;
    }

    reportUnexpectedError("transactions.update.unexpected_error", "transactions", error);
    return {
      status: "error",
      message: "No pudimos actualizar la transaccion por un error inesperado.",
    };
  }
};

export const deleteTransactionAction = async (formData: FormData) => {
  try {
    const trustedOrigin = await isTrustedActionOrigin();
    if (!trustedOrigin) {
      redirect("/transactions?notice=error");
    }

    const transactionId = String(formData.get("transactionId") ?? "");

    if (!transactionId) {
      redirect("/transactions?notice=error");
    }

    if (!isUuid(transactionId)) {
      redirect("/transactions?notice=error");
    }

    const { supabase, user } = await requireUserSession();
    const mutationGuard = await guardUserMutation(user.id, "transactions.delete");
    if (!mutationGuard.allowed) {
      logSecurityEvent({
        event: "transactions.delete.rate_limited",
        severity: "warn",
        actorUserId: user.id,
        details: {
          strategy: mutationGuard.strategy ?? "unknown",
          degraded: mutationGuard.degraded ?? false,
          retryAfterMs: mutationGuard.retryAfterMs,
        },
      });
      redirect("/transactions?notice=rate_limited");
    }
    const { error } = await deleteTransaction(supabase, { transactionId, userId: user.id });

    revalidateTransactionViews();

    if (error) {
      logSecurityEvent({
        event: "transactions.delete.failed",
        severity: "warn",
        actorUserId: user.id,
        details: { reason: error.message },
      });
      redirect("/transactions?notice=error");
    }

    logSecurityEvent({ event: "transactions.delete.success", actorUserId: user.id });

    redirect("/transactions?notice=deleted");
  } catch (error) {
    if (isNextNavigationError(error)) {
      throw error;
    }

    reportUnexpectedError("transactions.delete.unexpected_error", "transactions", error);
    redirect("/transactions?notice=error");
  }
};
