import { Card } from "@/components/ui/card";

interface HighlightedGoal {
  id: string;
  name: string;
  progressPct: number;
  remainingLabel: string;
}

interface HighlightedGoalsCardProps {
  goals: HighlightedGoal[];
}

export const HighlightedGoalsCard = ({ goals }: HighlightedGoalsCardProps) => {
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">Objetivos destacados</h2>
      <p className="mt-1 text-sm text-velor-muted">Tu foco de ahorro para las proximas semanas.</p>

      <div className="mt-4 space-y-3">
        {goals.length > 0 ? (
          goals.map((goal) => (
            <div key={goal.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-velor-text">{goal.name}</p>
                <p className="text-sm text-velor-muted">{goal.progressPct}%</p>
              </div>
              <div className="h-2.5 rounded-full bg-velor-elevated">
                <div
                  className="h-2.5 rounded-full bg-velor-primary"
                  style={{ width: `${goal.progressPct}%` }}
                />
              </div>
              <p className="text-xs text-velor-muted">Falta {goal.remainingLabel}</p>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-velor-border px-4 py-5 text-sm text-velor-muted">
            Todavia no tienes objetivos activos. Crear uno te ayudara a sostener disciplina de
            ahorro.
          </p>
        )}
      </div>
    </Card>
  );
};
