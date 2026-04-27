import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, TextInput } from "@/components/ui/field";
import type { AnalyticsRangePreset } from "@/features/analytics/range";
import { cn } from "@/lib/cn";

interface DateRangeFilterProps {
  from: string;
  to: string;
  presets: AnalyticsRangePreset[];
  clampNotice?: {
    requestedFrom: string;
    requestedTo: string;
    appliedFrom: string;
    appliedTo: string;
    maxDays: number;
  };
}

const presetHref = (preset: AnalyticsRangePreset) => {
  return `/analytics?${new URLSearchParams({ from: preset.from, to: preset.to }).toString()}`;
};

export const DateRangeFilter = ({ from, to, presets, clampNotice }: DateRangeFilterProps) => {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-velor-muted">
          Rangos rapidos
        </p>

        {presets.map((preset) => {
          const isActive = preset.from === from && preset.to === to;
          return (
            <a
              key={preset.key}
              href={presetHref(preset)}
              className={cn(
                isActive ? "velor-btn-primary" : "velor-btn-secondary",
                "px-3 py-1.5 text-xs"
              )}
              aria-current={isActive ? "true" : undefined}
            >
              {preset.label}
            </a>
          );
        })}
      </div>

      {clampNotice ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Recortamos el rango solicitado ({clampNotice.requestedFrom} a {clampNotice.requestedTo})
          para mantener lecturas claras y estables. Aplicamos {clampNotice.appliedFrom} a{" "}
          {clampNotice.appliedTo} (maximo {clampNotice.maxDays} dias).
        </p>
      ) : null}

      <form method="get" className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="from">Desde</Label>
          <TextInput id="from" name="from" type="date" defaultValue={from} />
        </div>
        <div>
          <Label htmlFor="to">Hasta</Label>
          <TextInput id="to" name="to" type="date" defaultValue={to} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">Aplicar</Button>
          <a href="/analytics" className="velor-btn-secondary">
            Reset
          </a>
        </div>
      </form>
    </Card>
  );
};
