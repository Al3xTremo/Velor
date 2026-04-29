import { expect, type Page, test } from "@playwright/test";
import { registerAndOnboard } from "./helpers/auth";

const today = new Date().toISOString().slice(0, 10);

const createTransaction = async (
  page: Page,
  input: {
    name: string;
    kind: "income" | "expense";
    source: "manual" | "salary";
    amount: string;
    categoryLabel: string;
  }
) => {
  await page.goto("/transactions");
  await page.getByLabel("Nombre").fill(input.name);
  await page.getByLabel("Tipo").selectOption(input.kind);
  await page.getByLabel("Origen").selectOption(input.source);
  await page.getByLabel("Importe").fill(input.amount);
  await page.getByLabel("Fecha").fill(today);
  await page.getByLabel("Categoria").selectOption({ label: input.categoryLabel });
  await page.getByLabel("Concepto / descripcion").fill(`E2E ${input.name}`);
  await page.getByRole("button", { name: "Crear transaccion" }).click();

  await expect(page.getByText("Transaccion creada correctamente.")).toBeVisible();
};

test.describe("critical transaction, dashboard and analytics flows", () => {
  test("creates expense and income transactions and reflects them on dashboard and analytics", async ({
    page,
  }) => {
    const nonce = `${Date.now()}`;
    await registerAndOnboard(page, `tx-${nonce}`);

    const expenseName = `E2E Expense ${nonce}`;
    const salaryName = `E2E Salary ${nonce}`;

    await createTransaction(page, {
      name: expenseName,
      kind: "expense",
      source: "manual",
      amount: "300",
      categoryLabel: "Rent",
    });

    await expect(page.locator("tr", { hasText: expenseName })).toBeVisible();

    await createTransaction(page, {
      name: salaryName,
      kind: "income",
      source: "salary",
      amount: "1500",
      categoryLabel: "Salary",
    });

    await expect(page.locator("tr", { hasText: salaryName })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Hola,/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ultimas transacciones" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "€1,500.00" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "€300.00" })).toBeVisible();

    await page.goto("/analytics");
    await expect(page).toHaveURL(/\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /Analitica visual/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gasto por categoria" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Insights autom/i })).toBeVisible();

    const rentDistributionRow = page
      .locator("li", { hasText: "Rent" })
      .filter({ hasText: "€300.00" });
    await expect(rentDistributionRow).toBeVisible();
    await expect(page.getByText(/Tu mayor gasto del periodo esta en Rent/i)).toBeVisible();

    await expect(page.getByRole("heading", { name: "Barras mensuales" })).toBeVisible();
    await expect(page.getByText("€1,500.00")).toBeVisible();
  });

  test("edits and deletes a transaction with visible feedback", async ({ page }) => {
    const nonce = `${Date.now()}`;
    await registerAndOnboard(page, `edit-${nonce}`);

    const transactionName = `E2E Editable ${nonce}`;
    await createTransaction(page, {
      name: transactionName,
      kind: "expense",
      source: "manual",
      amount: "120",
      categoryLabel: "Groceries",
    });

    const row = page.locator("tr", { hasText: transactionName });
    await row.getByRole("link", { name: "Editar" }).click();
    await expect(page.getByRole("heading", { name: "Editar transaccion" })).toBeVisible();

    await page.getByLabel("Importe").fill("240");
    await page.getByLabel("Concepto / descripcion").fill("E2E edited");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Transaccion actualizada correctamente.")).toBeVisible();
    await expect(page.locator("tr", { hasText: "€240.00" })).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page
      .locator("tr", { hasText: transactionName })
      .getByRole("button", { name: "Eliminar" })
      .click();

    await expect(page).toHaveURL(/notice=deleted/);
    await expect(page.getByText("Transaccion eliminada correctamente.")).toBeVisible();
    await expect(page.locator("tr", { hasText: transactionName })).toHaveCount(0);
  });
});
