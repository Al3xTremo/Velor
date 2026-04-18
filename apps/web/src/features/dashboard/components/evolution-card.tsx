import { Card } from "@/components/ui/card";

interface EvolutionPoint {
  month: string;
  label: string;
  balance: number;
  formattedBalance: string;
}

interface EvolutionCardProps {
  points: EvolutionPoint[];
}

export const EvolutionCard = ({ points }: EvolutionCardProps) => {
  const maxValue = points.reduce((max, point) => Math.max(max, Math.abs(point.balance)), 0);

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">Evolucion temporal</h2>
      <p className="mt-1 text-sm text-velor-muted">Progreso del balance en los ultimos meses.</p>

      <div className="mt-5 space-y-2">
        {points.length > 0 ? (
          points.map((point) => {
            const width =
              maxValue > 0 ? Math.max((Math.abs(point.balance) / maxValue) * 100, 6) : 0;
            return (
              <div
                key={point.month}
                className="grid grid-cols-[64px_minmax(0,1fr)_96px] items-center gap-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-velor-muted">
                  {point.label}
                </p>
                <div className="h-2.5 rounded-full bg-velor-elevated">
                  <div
                    className={
                      point.balance >= 0
                        ? "h-2.5 rounded-full bg-velor-success"
                        : "h-2.5 rounded-full bg-velor-danger"
                    }
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="text-right text-sm font-medium text-velor-text">
                  {point.formattedBalance}
                </p>
              </div>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-velor-border px-4 py-5 text-sm text-velor-muted">
            Aun no hay historial mensual suficiente para construir la evolucion temporal.
          </p>
        )}
      </div>
    </Card>
  );
};
