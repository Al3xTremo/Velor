import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteTransactionForm } from "@/features/transactions/components/delete-transaction-form";

interface TransactionRow {
  id: string;
  occurredOn: string;
  name: string;
  kind: "income" | "expense";
  source: "manual" | "salary";
  categoryName: string;
  amountFormatted: string;
  isRecurring: boolean;
  description: string;
  editHref: string;
  returnTo: string;
}

interface TransactionsTableProps {
  rows: TransactionRow[];
}

export const TransactionsTable = ({ rows }: TransactionsTableProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-velor-border px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-velor-text">
          Listado de transacciones
        </h2>
        <p className="text-sm text-velor-muted">
          Gestion completa con edicion, eliminacion y trazabilidad.
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Flags</th>
              <th className="text-right">Importe</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.occurredOn}</td>
                  <td>
                    <p className="font-medium text-velor-text">{row.name}</p>
                    <p className="text-xs text-velor-muted">{row.description || "Sin concepto"}</p>
                  </td>
                  <td>
                    <Badge variant={row.kind === "income" ? "success" : "warning"}>
                      {row.kind}
                    </Badge>
                  </td>
                  <td>{row.categoryName}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {row.source === "salary" ? <Badge variant="success">Nomina</Badge> : null}
                      {row.isRecurring ? <Badge variant="warning">Recurrente</Badge> : null}
                    </div>
                  </td>
                  <td className="text-right font-semibold text-velor-text">
                    {row.amountFormatted}
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <a href={row.editHref} className="velor-btn-secondary px-3 py-1.5 text-xs">
                        Editar
                      </a>
                      <DeleteTransactionForm transactionId={row.id} returnTo={row.returnTo} />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-10 text-center text-velor-muted">
                  No hay transacciones para los filtros actuales. Prueba ajustando fechas, categoria
                  o texto.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </Card>
  );
};
