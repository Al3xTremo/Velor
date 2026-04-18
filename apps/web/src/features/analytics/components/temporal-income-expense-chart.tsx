import { Card } from "@/components/ui/card";

interface TemporalPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
}

interface TemporalIncomeExpenseChartProps {
  points: TemporalPoint[];
}

const buildPolyline = (values: number[], maxValue: number, height: number) => {
  if (values.length === 0 || maxValue <= 0) {
    return "";
  }

  const step = values.length > 1 ? 100 / (values.length - 1) : 100;
  return values
    .map((value, index) => {
      const x = step * index;
      const y = height - (value / maxValue) * height;
      return `${x},${y}`;
    })
    .join(" ");
};

export const TemporalIncomeExpenseChart = ({ points }: TemporalIncomeExpenseChartProps) => {
  const maxValue = points.reduce((max, point) => Math.max(max, point.income, point.expense), 0);
  const incomePolyline = buildPolyline(
    points.map((point) => point.income),
    maxValue,
    80
  );
  const expensePolyline = buildPolyline(
    points.map((point) => point.expense),
    maxValue,
    80
  );

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">
        Evolucion de ingresos y gastos
      </h2>
      <p className="mt-1 text-sm text-velor-muted">
        Lectura temporal para detectar estabilidad o desviaciones.
      </p>

      {points.length > 1 && incomePolyline && expensePolyline ? (
        <div className="mt-5 space-y-3">
          <svg
            viewBox="0 0 100 80"
            className="h-44 w-full rounded-xl border border-velor-border bg-velor-elevated p-3"
          >
            <polyline
              fill="none"
              stroke="var(--velor-success)"
              strokeWidth="1.8"
              points={incomePolyline}
            />
            <polyline
              fill="none"
              stroke="var(--velor-danger)"
              strokeWidth="1.8"
              points={expensePolyline}
            />
          </svg>
          <div className="flex flex-wrap gap-3 text-xs text-velor-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-velor-success" />
              Ingresos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-velor-danger" />
              Gastos
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-velor-border px-4 py-5 text-sm text-velor-muted">
          Necesitas al menos dos meses con movimientos para visualizar la tendencia temporal.
        </p>
      )}
    </Card>
  );
};
