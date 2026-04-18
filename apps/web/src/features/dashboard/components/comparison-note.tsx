import { Card } from "@/components/ui/card";

interface ComparisonNoteProps {
  incomeChangeLabel: string;
  expenseChangeLabel: string;
}

export const ComparisonNote = ({ incomeChangeLabel, expenseChangeLabel }: ComparisonNoteProps) => {
  return (
    <Card muted className="p-4">
      <p className="text-sm text-velor-muted">
        Comparativa mensual: ingresos {incomeChangeLabel}. Gastos {expenseChangeLabel}.
      </p>
    </Card>
  );
};
