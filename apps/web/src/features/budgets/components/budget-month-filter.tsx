import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, TextInput } from "@/components/ui/field";

interface BudgetMonthFilterProps {
  month: string;
}

export const BudgetMonthFilter = ({ month }: BudgetMonthFilterProps) => {
  return (
    <Card className="p-5">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="month">Mes</Label>
          <TextInput id="month" name="month" type="month" defaultValue={month} />
        </div>
        <Button type="submit">Ver presupuesto</Button>
      </form>
    </Card>
  );
};
