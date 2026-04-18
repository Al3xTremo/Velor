import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CategoryForm } from "@/features/categories/components/category-form";
import { CategoriesList } from "@/features/categories/components/categories-list";
import { requireUserSession } from "@/server/application/session-service";
import { listCategoriesForUser } from "@/server/repositories/categories-repository";
import { getUserProfile } from "@/server/repositories/profile-repository";

export const dynamic = "force-dynamic";

interface CategoriesPageProps {
  searchParams: Promise<{
    edit?: string;
    notice?: string;
  }>;
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const params = await searchParams;

  const { supabase, user } = await requireUserSession();
  const [profile, categories] = await Promise.all([
    getUserProfile(supabase, user.id),
    listCategoriesForUser(supabase, user.id),
  ]);

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const allCategories = categories;
  const editCategory = allCategories.find(
    (category) => category.id === params.edit && !category.is_system
  );
  const userCategories = allCategories.filter((category) => !category.is_system);
  const systemCategories = allCategories.filter((category) => category.is_system);
  const activeUserCategories = userCategories.filter((category) => category.is_active);
  const archivedUserCategories = userCategories.filter((category) => !category.is_active);

  return (
    <AppShell
      title="Categorias"
      subtitle="Gestiona categorias personales para filtros, formularios y graficos sin mezclar datos entre usuarios."
    >
      {params.notice === "archived" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Categoria archivada. Seguira disponible en historico, pero no para nuevas selecciones.
        </p>
      ) : null}
      {params.notice === "reactivated" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Categoria reactivada correctamente.
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

      <CategoryForm
        mode={editCategory ? "edit" : "create"}
        initialValues={{
          id: editCategory?.id,
          name: editCategory?.name ?? "",
          kind: editCategory?.kind ?? "expense",
          colorHex: editCategory?.color_hex ?? "#64748B",
          icon: editCategory?.icon ?? "",
        }}
      />

      <CategoriesList
        title="Categorias personales activas"
        description="Disponibles para nuevas transacciones, filtros y analitica actual."
        items={activeUserCategories.map((item) => ({
          id: item.id,
          name: item.name,
          kind: item.kind,
          colorHex: item.color_hex,
          icon: item.icon,
          isActive: item.is_active,
          isSystem: item.is_system,
        }))}
        emptyMessage="Todavia no creaste categorias personales activas."
      />

      <CategoriesList
        title="Categorias archivadas"
        description="No aparecen por defecto en nuevos formularios, pero conservan historico y filtros."
        items={archivedUserCategories.map((item) => ({
          id: item.id,
          name: item.name,
          kind: item.kind,
          colorHex: item.color_hex,
          icon: item.icon,
          isActive: item.is_active,
          isSystem: item.is_system,
        }))}
        emptyMessage="No hay categorias archivadas por ahora."
      />

      <CategoriesList
        title="Categorias del sistema"
        description="Base global de Velor. No se pueden editar ni archivar."
        items={systemCategories.map((item) => ({
          id: item.id,
          name: item.name,
          kind: item.kind,
          colorHex: item.color_hex,
          icon: item.icon,
          isActive: item.is_active,
          isSystem: item.is_system,
        }))}
        emptyMessage="No hay categorias del sistema cargadas."
      />
    </AppShell>
  );
}
