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

const runInherit = (command, options = {}) => {
  return execSync(command, {
    cwd: root,
    stdio: "inherit",
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

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const runWithRetry = async ({ label, command, attempts, retryDelayMs }) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      runInherit(command);
      return;
    } catch (error) {
      if (attempt === attempts) {
        const message = error instanceof Error ? error.message : "unknown_error";
        throw new Error(`[db-integration] ${label} failed after ${attempts} attempts (${message})`);
      }

      const message = error instanceof Error ? error.message : "unknown_error";
      console.warn(
        `[db-integration] ${label} attempt ${attempt}/${attempts} failed (${message}); retrying in ${retryDelayMs}ms...`
      );
      await delay(retryDelayMs);
    }
  }
};

const waitForSupabaseReady = async (baseUrl, serviceRoleKey) => {
  const timeoutMs = Number(process.env["DB_TEST_READY_TIMEOUT_MS"] ?? "180000");
  const deadline = Date.now() + timeoutMs;
  let lastStatus = "uninitialized";

  while (Date.now() < deadline) {
    try {
      const headers = {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      };

      const [rest, authAdmin] = await Promise.all([
        fetch(`${baseUrl}/rest/v1/`, { headers }),
        fetch(`${baseUrl}/auth/v1/admin/users?page=1&per_page=1`, { headers }),
      ]);

      lastStatus = `rest=${rest.status} auth=${authAdmin.status}`;
      if (rest.ok && authAdmin.ok) {
        return;
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : "unknown_error";
    }

    await delay(2000);
  }

  throw new Error(`[db-integration] Supabase readiness probe timed out (${lastStatus})`);
};

const main = async () => {
  const startAttempts = parsePositiveInt(process.env["DB_TEST_START_MAX_ATTEMPTS"], 2);
  const startRetryDelayMs = parsePositiveInt(process.env["DB_TEST_START_RETRY_DELAY_MS"], 5000);
  const resetAttempts = parsePositiveInt(process.env["DB_TEST_RESET_MAX_ATTEMPTS"], 3);
  const resetRetryDelayMs = parsePositiveInt(process.env["DB_TEST_RESET_RETRY_DELAY_MS"], 8000);

  console.log("[db-integration] starting Supabase local stack...");
  await runWithRetry({
    label: "supabase start",
    command: "corepack pnpm dlx supabase@latest start",
    attempts: startAttempts,
    retryDelayMs: startRetryDelayMs,
  });

  if (process.env["DB_TEST_SKIP_RESET"] !== "1") {
    console.log("[db-integration] resetting database for deterministic run...");
    await runWithRetry({
      label: "supabase db reset",
      command: "corepack pnpm dlx supabase@latest db reset",
      attempts: resetAttempts,
      retryDelayMs: resetRetryDelayMs,
    });
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

  console.log("[db-integration] waiting for Supabase auth/rest readiness...");
  await waitForSupabaseReady(envMap.NEXT_PUBLIC_SUPABASE_URL, envMap.SUPABASE_SERVICE_ROLE_KEY);

  const command = "corepack pnpm --filter @velor/web test:db";
  runInherit(command, {
    cwd: root,
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

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  console.error(`[db-integration] failed: ${message}`);
  process.exit(1);
});
