import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { GoalForm } from "@/features/goals/components/goal-form";
import { GoalsList } from "@/features/goals/components/goals-list";
import { requireUserSession } from "@/server/application/session-service";
import { listGoalsForUser } from "@/server/repositories/goals-repository";
import { getPrimaryAccount, getUserProfile } from "@/server/repositories/profile-repository";

export const dynamic = "force-dynamic";

interface GoalsPageProps {
  searchParams: Promise<{
    edit?: string;
    notice?: string;
  }>;
}

export default async function GoalsPage({ searchParams }: GoalsPageProps) {
  const params = await searchParams;

  const { supabase, user } = await requireUserSession();

  const [profile, account, goals] = await Promise.all([
    getUserProfile(supabase, user.id),
    getPrimaryAccount(supabase, user.id),
    listGoalsForUser(supabase, user.id),
  ]);

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const editGoal = goals.find((goal) => goal.id === params.edit);
  const activeGoals = goals.filter((goal) => goal.status !== "archived");
  const archivedGoals = goals.filter((goal) => goal.status === "archived");
  const currency = account?.currency ?? profile.default_currency;

  return (
    <AppShell
      title="Objetivos de ahorro"
      subtitle="Define metas concretas y sigue su avance con una lectura clara, motivadora y orientada a resultado."
    >
      {params.notice === "archived" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Objetivo archivado. Puedes reactivarlo cuando quieras.
        </p>
      ) : null}
      {params.notice === "reactivated" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Objetivo reactivado correctamente.
        </p>
      ) : null}
      {params.notice === "error" ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No pudimos completar la accion solicitada.
        </p>
      ) : null}
      {params.notice === "rate_limited" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Demasiados intentos en poco tiempo. Espera un momento y vuelve a intentarlo.
        </p>
      ) : null}

      <GoalForm
        mode={editGoal ? "edit" : "create"}
        initialValues={{
          id: editGoal?.id,
          name: editGoal?.name ?? "",
          targetAmount: editGoal ? String(editGoal.target_amount) : "",
          currentAmount: editGoal ? String(editGoal.current_amount) : "0",
          targetDate: editGoal?.target_date ?? "",
        }}
      />

      <GoalsList
        title="Objetivos activos"
        description="Metas en curso y completadas con progreso visible para enfocar tu ahorro."
        currency={currency}
        items={activeGoals.map((goal) => ({
          id: goal.id,
          name: goal.name,
          targetAmount: goal.target_amount,
          currentAmount: goal.current_amount,
          targetDate: goal.target_date,
          status: goal.status,
        }))}
        emptyMessage="Aun no tienes objetivos activos. Crea uno para empezar a medir avances."
      />

      <GoalsList
        title="Objetivos archivados"
        description="Historial de metas pausadas para reactivarlas cuando vuelvan a ser prioridad."
        currency={currency}
        items={archivedGoals.map((goal) => ({
          id: goal.id,
          name: goal.name,
          targetAmount: goal.target_amount,
          currentAmount: goal.current_amount,
          targetDate: goal.target_date,
          status: goal.status,
        }))}
        emptyMessage="No hay objetivos archivados por ahora."
      />
    </AppShell>
  );
}
