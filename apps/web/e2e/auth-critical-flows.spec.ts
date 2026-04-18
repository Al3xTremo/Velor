import { expect, test } from "@playwright/test";
import {
  createE2EUser,
  completeOnboarding,
  login,
  logout,
  registerAndOnboard,
  registerUser,
} from "./helpers/auth";

test.describe("critical auth and protected route flows", () => {
  test("redirects unauthenticated users from private routes", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/login(?:\?next=%2Fdashboard)?$/);
    await expect(page.getByRole("heading", { name: "Iniciar sesion" })).toBeVisible();
  });

  test("registers user, completes onboarding, logs out and logs in again", async ({ page }) => {
    const user = createE2EUser("auth");

    await registerUser(page, user);
    await completeOnboarding(page, "1500");

    await expect(page.getByRole("heading", { name: /Hola,/ })).toBeVisible();

    await logout(page);
    await login(page, user);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: /Hola,/ })).toBeVisible();
  });

  test("shows visible error feedback on invalid login", async ({ page }) => {
    const user = await registerAndOnboard(page, "invalid-login");
    await logout(page);

    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Contrasena").fill("WrongPassword!999");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(
      page.getByText("No pudimos iniciar sesion. Verifica tus credenciales.")
    ).toBeVisible();
  });
});
