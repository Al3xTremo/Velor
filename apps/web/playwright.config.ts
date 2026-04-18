import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const parseEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    return {} as Record<string, string>;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const entries = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      if (idx === -1) {
        return null;
      }
      return [line.slice(0, idx), line.slice(idx + 1)] as const;
    })
    .filter((item): item is readonly [string, string] => item !== null);

  return Object.fromEntries(entries);
};

const e2eEnvFile = path.resolve(process.cwd(), ".env.e2e.local");
const e2eFileEnv = parseEnvFile(e2eEnvFile);

const webServerEnv = {
  ...process.env,
  ...e2eFileEnv,
  NODE_ENV: "development",
  NEXT_PUBLIC_SITE_URL:
    process.env["NEXT_PUBLIC_SITE_URL"] ??
    e2eFileEnv["NEXT_PUBLIC_SITE_URL"] ??
    "http://127.0.0.1:3000",
};

if (!webServerEnv.NEXT_PUBLIC_SUPABASE_URL || !webServerEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    "E2E env is missing Supabase keys. Run `corepack pnpm e2e:web:prepare` before Playwright."
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  workers: 1,
  reporter: process.env["CI"] ? "line" : "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "corepack pnpm dev --port 3000",
    port: 3000,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
    env: webServerEnv,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
