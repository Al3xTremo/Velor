import { calculateGoalProgress, formatCurrency } from "@velor/core";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toggleGoalArchiveAction } from "@/features/goals/actions";

interface GoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  status: "active" | "completed" | "paused" | "archived";
}

interface GoalsListProps {
  title: string;
  description: string;
  currency: "EUR" | "USD";
  items: GoalItem[];
  emptyMessage: string;
}

export const GoalsList = ({
  title,
  description,
  currency,
  items,
  emptyMessage,
}: GoalsListProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-velor-border px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-velor-text">{title}</h2>
        <p className="text-sm text-velor-muted">{description}</p>
      </div>

      <div className="divide-y divide-velor-border">
        {items.length > 0 ? (
          items.map((item) => {
            const progressBase = {
              id: item.id,
              name: item.name,
              targetAmount: item.targetAmount,
              currentAmount: item.currentAmount,
              status: item.status,
            };

            const progress = calculateGoalProgress(
              item.targetDate ? { ...progressBase, targetDate: item.targetDate } : progressBase
            );

            return (
              <div key={item.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-velor-text">{item.name}</p>
                    <p className="text-sm text-velor-muted">
                      Objetivo: {formatCurrency(item.targetAmount, currency)} · Actual:{" "}
                      {formatCurrency(item.currentAmount, currency)}
                    </p>
                    <p className="text-sm text-velor-muted">
                      Falta: {formatCurrency(progress.remainingAmount, currency)}
                      {item.targetDate ? ` · Fecha: ${item.targetDate}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={progress.progressPct >= 100 ? "success" : "warning"}>
                      {progress.progressPct}%
                    </Badge>
                    <a
                      href={`/goals?edit=${item.id}`}
                      className="velor-btn-secondary px-3 py-1.5 text-xs"
                    >
                      Editar
                    </a>
                    <form action={toggleGoalArchiveAction}>
                      <input type="hidden" name="goalId" value={item.id} />
                      <input
                        type="hidden"
                        name="nextStatus"
                        value={item.status === "archived" ? "active" : "archived"}
                      />
                      <button type="submit" className="velor-btn-ghost px-3 py-1.5 text-xs">
                        {item.status === "archived" ? "Reactivar" : "Archivar"}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="h-2.5 rounded-full bg-velor-elevated">
                  <div
                    className="h-2.5 rounded-full bg-velor-primary"
                    style={{ width: `${Math.min(progress.progressPct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="px-5 py-8 text-sm text-velor-muted">{emptyMessage}</p>
        )}
      </div>
    </Card>
  );
};
