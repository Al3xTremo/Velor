import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const webEnvPath = path.join(root, "apps", "web", ".env.e2e.local");

const run = (command, options = {}) => {
  return execSync(command, {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  });
};

const parseEnvOutput = (raw) => {
  const output = {};
  const lines = raw.split(/\r?\n/).map((line) => line.trim());

  for (const line of lines) {
    if (!line || !line.includes("=")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    const key = line.slice(0, eqIndex).trim();
    const value = line
      .slice(eqIndex + 1)
      .trim()
      .replace(/^"|"$/g, "");
    output[key] = value;
  }

  return output;
};

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

const prepare = () => {
  console.log("[e2e] starting Supabase local stack...");
  execSync("corepack pnpm dlx supabase@latest start", { cwd: root, stdio: "inherit" });

  if (process.env["E2E_SKIP_DB_RESET"] !== "1") {
    console.log("[e2e] resetting local database for deterministic state...");
    execSync("corepack pnpm dlx supabase@latest db reset", { cwd: root, stdio: "inherit" });
  } else {
    console.log("[e2e] skipping db reset due to E2E_SKIP_DB_RESET=1");
  }

  const rawStatus = run(
    "corepack pnpm dlx supabase@latest status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY"
  );

  const envMap = parseEnvOutput(rawStatus);
  for (const key of required) {
    if (!envMap[key]) {
      throw new Error(`[e2e] missing required key from supabase status: ${key}`);
    }
  }

  const envLines = [
    "NODE_ENV=development",
    "NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000",
    `NEXT_PUBLIC_SUPABASE_URL=${envMap.NEXT_PUBLIC_SUPABASE_URL}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${envMap.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  ];

  if (envMap.SUPABASE_SERVICE_ROLE_KEY) {
    envLines.push(`SUPABASE_SERVICE_ROLE_KEY=${envMap.SUPABASE_SERVICE_ROLE_KEY}`);
  }

  fs.writeFileSync(webEnvPath, `${envLines.join("\n")}\n`, "utf8");
  console.log(`[e2e] wrote deterministic env file: ${path.relative(root, webEnvPath)}`);
};

try {
  prepare();
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown_error";
  console.error(`[e2e] prepare failed: ${message}`);
  process.exit(1);
}
