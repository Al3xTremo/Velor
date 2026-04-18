import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isTrustedActionOrigin: vi.fn(),
  requireUserSession: vi.fn(),
  guardUserMutation: vi.fn(),
  getPrimaryAccount: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  revalidatePath: vi.fn(),
  reportUnexpectedError: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/server/security/origin-guard", () => ({
  isTrustedActionOrigin: mocks.isTrustedActionOrigin,
}));

vi.mock("@/server/application/session-service", () => ({
  requireUserSession: mocks.requireUserSession,
}));

vi.mock("@/server/security/mutation-guard", () => ({
  guardUserMutation: mocks.guardUserMutation,
}));

vi.mock("@/server/repositories/profile-repository", () => ({
  getPrimaryAccount: mocks.getPrimaryAccount,
}));

vi.mock("@/server/repositories/transactions-repository", () => ({
  createTransaction: mocks.createTransaction,
  updateTransaction: mocks.updateTransaction,
  deleteTransaction: vi.fn(),
}));

vi.mock("@/server/observability/errors", async () => {
  const actual = await vi.importActual("@/server/observability/errors");

  return {
    ...(actual as Record<string, unknown>),
    reportUnexpectedError: mocks.reportUnexpectedError,
  };
});

import { createTransactionAction, updateTransactionAction } from "./actions";

const createFormData = (entries: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
};

const validTransaction = {
  name: "Cafe",
  kind: "expense",
  source: "manual",
  amount: "12.50",
  categoryId: "11111111-1111-4111-8111-111111111111",
  occurredOn: "2026-04-12",
  description: "Desayuno",
  notes: "",
};

describe("transactions/actions server integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTrustedActionOrigin.mockResolvedValue(true);
    mocks.requireUserSession.mockResolvedValue({
      user: { id: "user-1" },
      supabase: { from: vi.fn() },
    });
    mocks.guardUserMutation.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    mocks.getPrimaryAccount.mockResolvedValue({ id: "acc-1" });
    mocks.createTransaction.mockResolvedValue({ error: null });
    mocks.updateTransaction.mockResolvedValue({ error: null });
  });

  it("creates transaction and revalidates key views", async () => {
    const result = await createTransactionAction(
      { status: "idle" },
      createFormData({ ...validTransaction, isRecurring: "on" })
    );

    expect(result).toEqual({
      status: "success",
      message: "Transaccion creada correctamente.",
    });
    expect(mocks.createTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-1",
        accountId: "acc-1",
        occurredMonth: "2026-04-01",
      })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/transactions");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("returns validation error for invalid transaction id on update", async () => {
    const result = await updateTransactionAction(
      { status: "idle" },
      createFormData({ ...validTransaction, transactionId: "invalid-id" })
    );

    expect(result).toEqual({
      status: "error",
      message: "No pudimos identificar la transaccion a editar.",
    });
    expect(mocks.updateTransaction).not.toHaveBeenCalled();
  });

  it("returns rate-limit response when mutation guard blocks", async () => {
    mocks.guardUserMutation.mockResolvedValue({ allowed: false, retryAfterMs: 3000 });

    const result = await createTransactionAction(
      { status: "idle" },
      createFormData(validTransaction)
    );

    expect(result).toEqual({
      status: "error",
      message: "Demasiados intentos en poco tiempo. Espera un momento y reintenta.",
    });
    expect(mocks.getPrimaryAccount).not.toHaveBeenCalled();
  });

  it("surfaces infrastructure errors with stable user message", async () => {
    mocks.createTransaction.mockRejectedValue(new Error("write-timeout"));

    const result = await createTransactionAction(
      { status: "idle" },
      createFormData(validTransaction)
    );

    expect(result).toEqual({
      status: "error",
      message: "No pudimos crear la transaccion por un error inesperado.",
    });
    expect(mocks.reportUnexpectedError).toHaveBeenCalledWith(
      "transactions.create.unexpected_error",
      "transactions",
      expect.any(Error)
    );
  });
});
