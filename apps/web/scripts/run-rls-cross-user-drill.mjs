import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const currentFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFile);
const root = path.resolve(scriptsDir, "..", "..", "..");

const startedAt = new Date();
const startedAtMs = Date.now();
const incidentId = `DRILL-${startedAt.toISOString().slice(0, 10)}-RLS-CROSS-USER-E2E`;
const correlationId = `corr_${startedAtMs.toString(36)}`;

const tmpDir = path.join(root, "tmp", "drills", incidentId);
fs.mkdirSync(tmpDir, { recursive: true });

const drillLogPath = path.join(tmpDir, "rls-cross-user-drill.log");
const observabilityLogPath = path.join(tmpDir, "rls-cross-user-observability.ndjson");
const summaryPath = path.join(tmpDir, "summary.json");

const appendLine = (targetPath, line) => {
  fs.appendFileSync(targetPath, `${line}\n`, "utf8");
};

const nowIso = () => new Date().toISOString();

const writeStep = (message) => {
  const line = `[${nowIso()}] ${message}`;
  console.log(line);
  appendLine(drillLogPath, line);
};

let requestCounter = 0;
const nextRequestId = () => {
  requestCounter += 1;
  return `req_drill_${String(requestCounter).padStart(4, "0")}`;
};

const logObservability = ({ level = "info", event, scope, expected, message, meta, requestId }) => {
  const payload = {
    ts: nowIso(),
    kind: "observability",
    level,
    event,
    scope,
    expected,
    message,
    meta: {
      ...(meta ?? {}),
      requestId,
      correlationId,
      traceSource: "generated",
    },
  };

  appendLine(observabilityLogPath, JSON.stringify(payload));
};

const run = (command, stdio = "pipe") => {
  return execSync(command, {
    cwd: root,
    encoding: "utf8",
    stdio,
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

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const randomEmail = (prefix) => {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@velor.test`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForPrimaryAccount = async (client, userId) => {
  const timeoutMs = 15000;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data, error } = await client
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) {
      return data.id;
    }

    await sleep(500);
  }

  throw new Error("timeout_waiting_for_primary_account");
};

const createDrillUser = async (adminClient, prefix) => {
  const email = randomEmail(prefix);
  const password = `P4ss-${Math.random().toString(36).slice(2, 10)}!`;
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Drill ${prefix}`,
      default_currency: "EUR",
    },
  });

  if (error || !data.user) {
    throw new Error(`create_user_failed:${error?.message ?? "unknown_error"}`);
  }

  return {
    id: data.user.id,
    email,
    password,
  };
};

const loginAsUser = async (url, anonKey, email, password) => {
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`login_failed:${error.message}`);
  }

  return client;
};

const assertTrue = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const main = async () => {
  fs.writeFileSync(drillLogPath, "", "utf8");
  fs.writeFileSync(observabilityLogPath, "", "utf8");

  const summary = {
    incidentId,
    correlationId,
    startedAt: startedAt.toISOString(),
    completedAt: null,
    durationMs: null,
    status: "running",
    requestIds: [],
    users: {},
    checks: [],
    paths: {
      drillLogPath,
      observabilityLogPath,
      summaryPath,
    },
  };

  let ownerUser;
  let outsiderUser;
  let adminClient;

  try {
    writeStep("Starting Supabase local stack for drill.");
    run("corepack pnpm dlx supabase@latest start", "inherit");

    writeStep("Resetting local database for deterministic drill.");
    run("corepack pnpm dlx supabase@latest db reset", "inherit");

    writeStep("Reading local Supabase env values from CLI status.");
    const statusRaw = run(
      "corepack pnpm dlx supabase@latest status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY"
    );
    const envMap = parseEnvOutput(statusRaw);

    for (const key of requiredEnvKeys) {
      assertTrue(Boolean(envMap[key]), `missing_env_key:${key}`);
    }

    const url = envMap.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = envMap.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = envMap.SUPABASE_SERVICE_ROLE_KEY;

    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    writeStep("Creating integration users A(owner) and B(outsider).");
    ownerUser = await createDrillUser(adminClient, "owner");
    outsiderUser = await createDrillUser(adminClient, "outsider");
    summary.users = {
      ownerUserId: ownerUser.id,
      outsiderUserId: outsiderUser.id,
    };

    const reqLoginOwner = nextRequestId();
    summary.requestIds.push(reqLoginOwner);
    logObservability({
      level: "info",
      event: "drill.rls.owner.login.start",
      scope: "security",
      expected: true,
      message: "Owner login for drill started",
      requestId: reqLoginOwner,
      meta: { userRole: "owner" },
    });
    const ownerClient = await loginAsUser(url, anonKey, ownerUser.email, ownerUser.password);
    logObservability({
      level: "info",
      event: "drill.rls.owner.login.success",
      scope: "security",
      expected: true,
      message: "Owner login succeeded",
      requestId: reqLoginOwner,
      meta: { userId: ownerUser.id },
    });

    const reqLoginOutsider = nextRequestId();
    summary.requestIds.push(reqLoginOutsider);
    logObservability({
      level: "info",
      event: "drill.rls.outsider.login.start",
      scope: "security",
      expected: true,
      message: "Outsider login for drill started",
      requestId: reqLoginOutsider,
      meta: { userRole: "outsider" },
    });
    const outsiderClient = await loginAsUser(
      url,
      anonKey,
      outsiderUser.email,
      outsiderUser.password
    );
    logObservability({
      level: "info",
      event: "drill.rls.outsider.login.success",
      scope: "security",
      expected: true,
      message: "Outsider login succeeded",
      requestId: reqLoginOutsider,
      meta: { userId: outsiderUser.id },
    });

    writeStep("Fetching owner account and category for controlled data insert.");
    const ownerAccountId = await waitForPrimaryAccount(ownerClient, ownerUser.id);
    const ownerExpenseCategory = await ownerClient
      .from("categories")
      .select("id")
      .eq("is_system", true)
      .eq("kind", "expense")
      .limit(1)
      .single();
    assertTrue(
      !ownerExpenseCategory.error && ownerExpenseCategory.data?.id,
      "missing_expense_category"
    );

    const reqCreate = nextRequestId();
    summary.requestIds.push(reqCreate);
    logObservability({
      level: "info",
      event: "drill.rls.transaction.create.start",
      scope: "transactions",
      expected: true,
      message: "Creating owner transaction for RLS drill",
      requestId: reqCreate,
      meta: { ownerUserId: ownerUser.id },
    });

    const transactionName = `Drill expense ${startedAtMs}`;
    const createResult = await ownerClient.from("transactions").insert({
      user_id: ownerUser.id,
      account_id: ownerAccountId,
      category_id: ownerExpenseCategory.data.id,
      kind: "expense",
      source: "manual",
      name: transactionName,
      amount: 19.99,
      description: "RLS cross-user drill seed transaction",
      notes: "drill",
      is_recurring: false,
      occurred_on: "2026-04-17",
      occurred_month: "2026-04-01",
    });

    assertTrue(
      !createResult.error,
      `owner_transaction_create_failed:${createResult.error?.message ?? "unknown"}`
    );

    const ownerTransaction = await ownerClient
      .from("transactions")
      .select("id,name,user_id")
      .eq("user_id", ownerUser.id)
      .eq("name", transactionName)
      .limit(1)
      .single();
    assertTrue(
      !ownerTransaction.error && ownerTransaction.data?.id,
      "owner_transaction_lookup_failed"
    );

    const transactionId = ownerTransaction.data.id;
    logObservability({
      level: "info",
      event: "drill.rls.transaction.create.success",
      scope: "transactions",
      expected: true,
      message: "Owner transaction created",
      requestId: reqCreate,
      meta: { transactionId, ownerUserId: ownerUser.id },
    });

    const reqRead = nextRequestId();
    summary.requestIds.push(reqRead);
    const outsiderRead = await outsiderClient
      .from("transactions")
      .select("id,name,user_id")
      .eq("id", transactionId);

    const outsiderReadRows = outsiderRead.data ?? [];
    const outsiderReadBlocked = !outsiderRead.error && outsiderReadRows.length === 0;
    summary.checks.push({
      check: "outsider_cannot_read_owner_transaction",
      passed: outsiderReadBlocked,
      details: {
        error: outsiderRead.error?.message ?? null,
        rowCount: outsiderReadRows.length,
      },
    });

    logObservability({
      level: outsiderReadBlocked ? "info" : "error",
      event: outsiderReadBlocked
        ? "drill.rls.cross_user_read.blocked"
        : "drill.rls.cross_user_read.leak_detected",
      scope: "security",
      expected: outsiderReadBlocked,
      message: outsiderReadBlocked
        ? "RLS blocked outsider read as expected"
        : "Potential data leak: outsider could read owner transaction",
      requestId: reqRead,
      meta: {
        transactionId,
        outsiderUserId: outsiderUser.id,
        ownerUserId: ownerUser.id,
        rowCount: outsiderReadRows.length,
      },
    });
    assertTrue(outsiderReadBlocked, "cross_user_read_not_blocked");

    const reqUpdate = nextRequestId();
    summary.requestIds.push(reqUpdate);
    const outsiderUpdate = await outsiderClient
      .from("transactions")
      .update({ name: "drill-hijack-attempt" })
      .eq("id", transactionId);

    const ownerAfterUpdateAttempt = await ownerClient
      .from("transactions")
      .select("name")
      .eq("id", transactionId)
      .single();

    const outsiderUpdateBlocked =
      !outsiderUpdate.error && ownerAfterUpdateAttempt.data?.name === transactionName;
    summary.checks.push({
      check: "outsider_cannot_update_owner_transaction",
      passed: outsiderUpdateBlocked,
      details: {
        error: outsiderUpdate.error?.message ?? null,
        ownerNameAfterAttempt: ownerAfterUpdateAttempt.data?.name ?? null,
      },
    });

    logObservability({
      level: outsiderUpdateBlocked ? "info" : "error",
      event: outsiderUpdateBlocked
        ? "drill.rls.cross_user_update.blocked"
        : "drill.rls.cross_user_update.leak_detected",
      scope: "security",
      expected: outsiderUpdateBlocked,
      message: outsiderUpdateBlocked
        ? "RLS blocked outsider update as expected"
        : "Potential integrity breach: outsider changed owner transaction",
      requestId: reqUpdate,
      meta: {
        transactionId,
        ownerNameAfterAttempt: ownerAfterUpdateAttempt.data?.name ?? null,
      },
    });
    assertTrue(outsiderUpdateBlocked, "cross_user_update_not_blocked");

    const reqProfileRead = nextRequestId();
    summary.requestIds.push(reqProfileRead);
    const outsiderProfileRead = await outsiderClient
      .from("profiles")
      .select("user_id")
      .eq("user_id", ownerUser.id);

    const profileReadBlocked =
      !outsiderProfileRead.error && (outsiderProfileRead.data ?? []).length === 0;
    summary.checks.push({
      check: "outsider_cannot_read_owner_profile",
      passed: profileReadBlocked,
      details: {
        error: outsiderProfileRead.error?.message ?? null,
        rowCount: (outsiderProfileRead.data ?? []).length,
      },
    });

    logObservability({
      level: profileReadBlocked ? "info" : "error",
      event: profileReadBlocked
        ? "drill.rls.cross_user_profile_read.blocked"
        : "drill.rls.cross_user_profile_read.leak_detected",
      scope: "security",
      expected: profileReadBlocked,
      message: profileReadBlocked
        ? "RLS blocked outsider profile read as expected"
        : "Potential data leak: outsider could read owner profile",
      requestId: reqProfileRead,
      meta: {
        ownerUserId: ownerUser.id,
        outsiderUserId: outsiderUser.id,
      },
    });
    assertTrue(profileReadBlocked, "cross_user_profile_read_not_blocked");

    writeStep("All cross-user isolation checks passed.");
    summary.status = "passed";
  } finally {
    if (adminClient && ownerUser?.id) {
      try {
        await adminClient.auth.admin.deleteUser(ownerUser.id);
        writeStep("Deleted owner drill user.");
      } catch {
        writeStep("Warning: failed deleting owner drill user.");
      }
    }
    if (adminClient && outsiderUser?.id) {
      try {
        await adminClient.auth.admin.deleteUser(outsiderUser.id);
        writeStep("Deleted outsider drill user.");
      } catch {
        writeStep("Warning: failed deleting outsider drill user.");
      }
    }

    const completedAt = new Date();
    summary.completedAt = completedAt.toISOString();
    summary.durationMs = completedAt.getTime() - startedAtMs;

    if (summary.status === "running") {
      summary.status = "failed";
    }

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
    writeStep(`Summary written to ${summaryPath}`);
    writeStep(`Observability log written to ${observabilityLogPath}`);
    writeStep(`Drill log written to ${drillLogPath}`);
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  writeStep(`Drill failed: ${message}`);
  process.exit(1);
});
