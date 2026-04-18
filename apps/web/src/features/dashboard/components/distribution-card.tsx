import { Card } from "@/components/ui/card";

interface DistributionItem {
  categoryId: string;
  categoryName: string;
  amount: string;
  pct: number;
}

interface DistributionCardProps {
  items: DistributionItem[];
}

export const DistributionCard = ({ items }: DistributionCardProps) => {
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">
        Distribucion por categorias
      </h2>
      <p className="mt-1 text-sm text-velor-muted">Composicion de gastos del mes actual.</p>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.categoryId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-medium text-velor-text">{item.categoryName}</p>
                <p className="text-velor-muted">
                  {item.amount} · {item.pct.toFixed(1)}%
                </p>
              </div>
              <div className="h-2.5 rounded-full bg-velor-elevated">
                <div
                  className="h-2.5 rounded-full bg-velor-primary"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-velor-border px-4 py-5 text-sm text-velor-muted">
            Sin datos de gastos para este mes. Cuando registres movimientos, veras la distribucion
            automaticamente.
          </p>
        )}
      </div>
    </Card>
  );
};
