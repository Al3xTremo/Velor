import { Card } from "@/components/ui/card";

interface InsightsCardProps {
  insights: string[];
}

export const InsightsCard = ({ insights }: InsightsCardProps) => {
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">Insights automáticos</h2>
      <p className="mt-1 text-sm text-velor-muted">
        Lectura rápida de comportamientos financieros relevantes.
      </p>

      <ul className="mt-4 space-y-2">
        {insights.length > 0 ? (
          insights.map((insight) => (
            <li
              key={insight}
              className="rounded-xl border border-velor-border bg-velor-elevated px-3 py-2 text-sm text-velor-text"
            >
              {insight}
            </li>
          ))
        ) : (
          <li className="rounded-xl border border-dashed border-velor-border px-3 py-4 text-sm text-velor-muted">
            Aun no hay datos suficientes para generar insights. Registra movimientos y vuelve aqui.
          </li>
        )}
      </ul>
    </Card>
  );
};
