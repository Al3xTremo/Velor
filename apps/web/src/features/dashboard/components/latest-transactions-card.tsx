import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";

interface LatestTransactionItem {
  id: string;
  occurredOn: string;
  kind: "income" | "expense";
  source: "manual" | "salary";
  categoryName: string;
  amount: string;
}

interface LatestTransactionsCardProps {
  items: LatestTransactionItem[];
}

export const LatestTransactionsCard = ({ items }: LatestTransactionsCardProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-velor-border px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-velor-text">
          Ultimas transacciones
        </h2>
        <p className="text-sm text-velor-muted">
          Visibilidad inmediata de la actividad mas reciente.
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Origen</th>
              <th className="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.occurredOn}</td>
                  <td>
                    <Badge variant={item.kind === "income" ? "success" : "warning"}>
                      {item.kind}
                    </Badge>
                  </td>
                  <td className="font-medium text-velor-text">{item.categoryName}</td>
                  <td className="capitalize text-velor-muted">{item.source}</td>
                  <td className="text-right font-semibold text-velor-text">{item.amount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-velor-muted">
                  Aun no tienes transacciones. Usa los accesos rapidos para registrar la primera.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </Card>
  );
};
