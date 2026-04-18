import { execSync } from "node:child_process";

const root = process.cwd();

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

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const main = () => {
  console.log("[db-integration] starting Supabase local stack...");
  execSync("corepack pnpm dlx supabase@latest start", { cwd: root, stdio: "inherit" });

  if (process.env["DB_TEST_SKIP_RESET"] !== "1") {
    console.log("[db-integration] resetting database for deterministic run...");
    execSync("corepack pnpm dlx supabase@latest db reset", { cwd: root, stdio: "inherit" });
  } else {
    console.log("[db-integration] skipping db reset due to DB_TEST_SKIP_RESET=1");
  }

  const rawStatus = run(
    "corepack pnpm dlx supabase@latest status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY"
  );

  const envMap = parseEnvOutput(rawStatus);
  for (const key of requiredKeys) {
    if (!envMap[key]) {
      throw new Error(`[db-integration] missing required key from supabase status: ${key}`);
    }
  }

  const command = "corepack pnpm --filter @velor/web test:db";
  execSync(command, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "test",
      NEXT_PUBLIC_SUPABASE_URL: envMap.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: envMap.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: envMap.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SITE_URL: process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://127.0.0.1:3000",
      OBS_ALERT_ENV: process.env["OBS_ALERT_ENV"] ?? "test",
      OBS_ALERTS_ENABLED: process.env["OBS_ALERTS_ENABLED"] ?? "0",
    },
  });
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown_error";
  console.error(`[db-integration] failed: ${message}`);
  process.exit(1);
}
