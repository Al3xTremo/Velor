import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, TextInput } from "@/components/ui/field";

interface DateRangeFilterProps {
  from: string;
  to: string;
}

export const DateRangeFilter = ({ from, to }: DateRangeFilterProps) => {
  return (
    <Card className="p-5">
      <form method="get" className="grid gap-3 sm:grid-cols-3">
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
