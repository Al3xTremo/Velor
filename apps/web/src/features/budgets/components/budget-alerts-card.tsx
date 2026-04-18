import { Card } from "@/components/ui/card";

interface BudgetAlertItem {
  categoryName: string;
  spentLabel: string;
  limitLabel: string;
  usagePct: number;
}

interface BudgetAlertsCardProps {
  overBudget: BudgetAlertItem[];
  nearLimit: BudgetAlertItem[];
}

export const BudgetAlertsCard = ({ overBudget, nearLimit }: BudgetAlertsCardProps) => {
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">Alertas de gasto</h2>
      <p className="mt-1 text-sm text-velor-muted">
        Avisos tempranos para evitar sobrecostes mensuales.
      </p>

      <div className="mt-4 space-y-2">
        {overBudget.map((item) => (
          <p
            key={`over-${item.categoryName}`}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            Exceso en {item.categoryName}: {item.spentLabel} de {item.limitLabel} (
            {item.usagePct.toFixed(1)}%).
          </p>
        ))}

        {nearLimit.map((item) => (
          <p
            key={`near-${item.categoryName}`}
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
          >
            Cerca del limite en {item.categoryName}: {item.spentLabel} de {item.limitLabel} (
            {item.usagePct.toFixed(1)}%).
          </p>
        ))}

        {overBudget.length === 0 && nearLimit.length === 0 ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            No hay alertas por ahora. Tu control de gastos va por buen camino.
          </p>
        ) : null}
      </div>
    </Card>
  );
};
