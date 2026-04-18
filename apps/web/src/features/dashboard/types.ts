export interface DashboardMetric {
  label: string;
  value: string;
  helper?: string;
  trend?: {
    label: string;
    tone: "positive" | "neutral" | "negative" | "warning";
  };
}
