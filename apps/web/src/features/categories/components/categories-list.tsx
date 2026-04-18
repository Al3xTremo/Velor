import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toggleCategoryStatusAction } from "@/features/categories/actions";

interface CategoryItem {
  id: string;
  name: string;
  kind: "income" | "expense";
  colorHex: string;
  icon?: string | null;
  isActive: boolean;
  isSystem: boolean;
}

interface CategoriesListProps {
  title: string;
  description: string;
  items: CategoryItem[];
  emptyMessage: string;
}

export const CategoriesList = ({
  title,
  description,
  items,
  emptyMessage,
}: CategoriesListProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-velor-border px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-velor-text">{title}</h2>
        <p className="text-sm text-velor-muted">{description}</p>
      </div>

      <div className="divide-y divide-velor-border">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <p className="font-medium text-velor-text">
                    {item.icon ? `${item.icon} · ` : ""}
                    {item.name}
                  </p>
                  <Badge variant={item.kind === "income" ? "success" : "warning"}>
                    {item.kind}
                  </Badge>
                  {!item.isActive ? <Badge variant="danger">Archivada</Badge> : null}
                </div>
              </div>

              {item.isSystem ? (
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-velor-muted">
                  Sistema
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/categories?edit=${item.id}`}
                    className="velor-btn-secondary px-3 py-1.5 text-xs"
                  >
                    Editar
                  </a>
                  <form action={toggleCategoryStatusAction}>
                    <input type="hidden" name="categoryId" value={item.id} />
                    <input
                      type="hidden"
                      name="nextStatus"
                      value={item.isActive ? "inactive" : "active"}
                    />
                    <button type="submit" className="velor-btn-ghost px-3 py-1.5 text-xs">
                      {item.isActive ? "Archivar" : "Reactivar"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="px-5 py-8 text-sm text-velor-muted">{emptyMessage}</p>
        )}
      </div>
    </Card>
  );
};
