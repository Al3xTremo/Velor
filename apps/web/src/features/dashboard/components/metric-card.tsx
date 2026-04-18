import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DashboardMetric } from "@/features/dashboard/types";

interface MetricCardProps {
  metric: DashboardMetric;
}

export const MetricCard = ({ metric }: MetricCardProps) => {
  const badgeVariant =
    metric.trend?.tone === "positive"
      ? "success"
      : metric.trend?.tone === "negative"
        ? "danger"
        : "warning";

  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-velor-muted">
        {metric.label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-velor-text">{metric.value}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm text-velor-muted">{metric.helper}</p>
        {metric.trend ? <Badge variant={badgeVariant}>{metric.trend.label}</Badge> : null}
      </div>
    </Card>
  );
};
