import { expect, type Page } from "@playwright/test";

export interface E2EUserCredentials {
  fullName: string;
  email: string;
  password: string;
}

export const createE2EUser = (prefix: string): E2EUserCredentials => {
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  return {
    fullName: `E2E ${prefix}`,
    email: `e2e-${prefix}-${nonce}@velor.dev`,
    password: "VelorE2E!123",
  };
};

export const registerUser = async (page: Page, user: E2EUserCredentials) => {
  await page.goto("/auth/register");
  await page.getByLabel("Nombre completo").fill(user.fullName);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Contrasena").fill(user.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
};

export const completeOnboarding = async (page: Page, openingBalance = "1000") => {
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15_000 });
  await page.getByLabel("Zona horaria").fill("UTC");
  await page.getByLabel("Saldo inicial").fill(openingBalance);
  await page.getByRole("button", { name: "Guardar configuracion inicial" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
};

export const logout = async (page: Page) => {
  await page.getByRole("button", { name: "Cerrar sesion" }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
};

export const login = async (page: Page, user: E2EUserCredentials) => {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Contrasena").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/, { timeout: 15_000 });
};

export const registerAndOnboard = async (page: Page, prefix: string) => {
  const user = createE2EUser(prefix);
  await registerUser(page, user);
  await completeOnboarding(page);
  return user;
};
