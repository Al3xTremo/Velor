"use client";

import { deleteTransactionAction } from "@/features/transactions/actions";

interface DeleteTransactionFormProps {
  transactionId: string;
  returnTo: string;
}

export const DeleteTransactionForm = ({ transactionId, returnTo }: DeleteTransactionFormProps) => {
  return (
    <form
      action={deleteTransactionAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "¿Seguro que quieres eliminar esta transaccion? Esta accion no se puede deshacer."
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="transactionId" value={transactionId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className="velor-btn-ghost px-3 py-1.5 text-xs text-velor-danger">
        Eliminar
      </button>
    </form>
  );
};
