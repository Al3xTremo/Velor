import Link from "next/link";
import { Card } from "@/components/ui/card";

export const QuickActionsCard = () => {
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-velor-text">Accesos rapidos</h2>
      <p className="mt-1 text-sm text-velor-muted">
        Registra movimientos y organiza categorias sin perder ritmo.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link href="/transactions?intent=income" className="velor-btn-primary text-center">
          Anadir ingreso
        </Link>
        <Link href="/transactions?intent=expense" className="velor-btn-secondary text-center">
          Anadir gasto
        </Link>
        <Link href="/categories?intent=create" className="velor-btn-secondary text-center">
          Nueva categoria
        </Link>
      </div>
    </Card>
  );
};
