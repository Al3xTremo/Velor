import { Card } from "@/components/ui/card";

interface DonutItem {
  categoryId: string;
  categoryName: string;
  amountLabel: string;
  pct: number;
  colorHex: string;
}

interface DonutExpenseChartProps {
  items: DonutItem[];
  totalLabel: string;
}

const toGradient = (items: DonutItem[]) => {
  let start = 0;
  const chunks = items.map((item) => {
    const end = start + item.pct;
    const chunk = `${item.colorHex} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    start = end;
    return chunk;
  });

  return `conic-gradient(${chunks.join(",")})`;
};

export const DonutExpenseChart = ({ items, totalLabel }: DonutExpenseChartProps) => {
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">Gasto por categoria</h2>
      <p className="mt-1 text-sm text-velor-muted">
        Distribucion porcentual del rango seleccionado.
      </p>

      {items.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
          <div
            className="relative mx-auto h-44 w-44 rounded-full"
            style={{ background: toGradient(items) }}
          >
            <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-velor-surface">
              <p className="text-xs uppercase tracking-[0.08em] text-velor-muted">Total</p>
              <p className="mt-1 text-center text-sm font-semibold text-velor-text">{totalLabel}</p>
            </div>
          </div>

          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.categoryId}
                className="flex items-center justify-between gap-3 rounded-lg border border-velor-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <p className="text-sm font-medium text-velor-text">{item.categoryName}</p>
                </div>
                <p className="text-sm text-velor-muted">
                  {item.amountLabel} · {item.pct.toFixed(1)}%
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-velor-border px-4 py-5 text-sm text-velor-muted">
          No hay gastos para construir el grafico donut en este rango.
        </p>
      )}
    </Card>
  );
};
