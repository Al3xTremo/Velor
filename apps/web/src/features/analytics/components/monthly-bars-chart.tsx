import { Card } from "@/components/ui/card";

interface MonthlyBarItem {
  month: string;
  label: string;
  income: number;
  expense: number;
  incomeLabel: string;
  expenseLabel: string;
}

interface MonthlyBarsChartProps {
  items: MonthlyBarItem[];
}

export const MonthlyBarsChart = ({ items }: MonthlyBarsChartProps) => {
  const maxValue = items.reduce((max, item) => Math.max(max, item.income, item.expense), 0);

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">Barras mensuales</h2>
      <p className="mt-1 text-sm text-velor-muted">Comparativa de ingresos y gastos por mes.</p>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const incomeWidth = maxValue > 0 ? (item.income / maxValue) * 100 : 0;
            const expenseWidth = maxValue > 0 ? (item.expense / maxValue) * 100 : 0;

            return (
              <div key={item.month} className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-velor-muted">
                  {item.label}
                </p>

                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-velor-muted">Ingreso</span>
                  <div className="h-2.5 flex-1 rounded-full bg-velor-elevated">
                    <div
                      className="h-2.5 rounded-full bg-velor-success"
                      style={{ width: `${incomeWidth}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-xs text-velor-muted">
                    {item.incomeLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-velor-muted">Gasto</span>
                  <div className="h-2.5 flex-1 rounded-full bg-velor-elevated">
                    <div
                      className="h-2.5 rounded-full bg-velor-danger"
                      style={{ width: `${expenseWidth}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-xs text-velor-muted">
                    {item.expenseLabel}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-velor-border px-4 py-5 text-sm text-velor-muted">
            Aun no hay historial mensual suficiente para mostrar barras comparativas.
          </p>
        )}
      </div>
    </Card>
  );
};
