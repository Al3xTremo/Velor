import { calculateDistributionPercentages, calculateTotalsByMonth } from "@velor/core";

interface AnalyticsTransaction {
  kind: "income" | "expense";
  amount: number;
  categoryId: string;
  occurredOn: string;
}

export const monthKey = (isoDate: string) => isoDate.slice(0, 7);

export const previousMonthKey = (currentMonth: string) => {
  const [yearRaw, monthRaw] = currentMonth.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

export const buildInsights = (params: {
  transactions: AnalyticsTransaction[];
  categoryNameById: Map<string, string>;
  currentMonth: string;
}) => {
  const { transactions, categoryNameById, currentMonth } = params;
  const prevMonth = previousMonthKey(currentMonth);
  const monthly = calculateTotalsByMonth(transactions);
  const current = monthly.find((item) => item.month === currentMonth);
  const previous = monthly.find((item) => item.month === prevMonth);

  const expensesDistribution = calculateDistributionPercentages(transactions, "expense");
  const topExpense = expensesDistribution[0];

  const insights: string[] = [];

  if (topExpense) {
    const category = categoryNameById.get(topExpense.categoryId) ?? "Sin categoria";
    insights.push(
      `Tu mayor gasto del periodo esta en ${category} (${topExpense.pct.toFixed(1)}%).`
    );
  }

  if (current && previous) {
    const currentIncome = current.income;
    const previousIncome = previous.income;
    const currentNet = current.net;
    const previousNet = previous.net;

    if (previousIncome > 0) {
      const incomeDeltaPct = ((currentIncome - previousIncome) / previousIncome) * 100;
      if (Math.abs(incomeDeltaPct) <= 5) {
        insights.push("Tus ingresos se han mantenido estables respecto al mes anterior.");
      } else if (incomeDeltaPct > 0) {
        insights.push(
          `Tus ingresos crecieron ${incomeDeltaPct.toFixed(1)}% frente al mes anterior.`
        );
      } else {
        insights.push(
          `Tus ingresos cayeron ${Math.abs(incomeDeltaPct).toFixed(1)}% frente al mes anterior.`
        );
      }
    }

    if (currentNet < previousNet) {
      insights.push("Has ahorrado menos que el mes pasado. Revisa tus categorias de mayor peso.");
    } else if (currentNet > previousNet) {
      insights.push(
        "Tu ahorro neto mejoro frente al mes pasado. Mantienes una tendencia positiva."
      );
    }
  }

  return insights.slice(0, 4);
};
