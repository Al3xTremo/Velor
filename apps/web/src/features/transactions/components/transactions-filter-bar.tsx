import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, SelectInput, TextInput } from "@/components/ui/field";

interface FilterCategory {
  id: string;
  name: string;
}

interface TransactionsFilterBarProps {
  categories: FilterCategory[];
  values: {
    query: string | undefined;
    kind: "income" | "expense" | undefined;
    categoryId: string | undefined;
    from: string | undefined;
    to: string | undefined;
  };
}

export const TransactionsFilterBar = ({ categories, values }: TransactionsFilterBarProps) => {
  return (
    <Card className="p-5">
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" method="get">
        <input type="hidden" name="page" value="1" />
        <div className="xl:col-span-2">
          <Label htmlFor="query">Buscar</Label>
          <TextInput
            id="query"
            name="query"
            defaultValue={values.query ?? ""}
            placeholder="Nombre, concepto o nota"
          />
        </div>

        <div>
          <Label htmlFor="kind">Tipo</Label>
          <SelectInput id="kind" name="kind" defaultValue={values.kind ?? ""}>
            <option value="">Todos</option>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
          </SelectInput>
        </div>

        <div>
          <Label htmlFor="categoryId">Categoria</Label>
          <SelectInput id="categoryId" name="categoryId" defaultValue={values.categoryId ?? ""}>
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </div>

        <div>
          <Label htmlFor="from">Desde</Label>
          <TextInput id="from" name="from" type="date" defaultValue={values.from ?? ""} />
        </div>

        <div>
          <Label htmlFor="to">Hasta</Label>
          <TextInput id="to" name="to" type="date" defaultValue={values.to ?? ""} />
        </div>

        <div className="xl:col-span-6 flex flex-wrap gap-2 pt-1">
          <Button type="submit">Aplicar filtros</Button>
          <a href="/transactions" className="velor-btn-secondary">
            Limpiar
          </a>
        </div>
      </form>
    </Card>
  );
};
