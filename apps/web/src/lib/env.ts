import { runtimeEnvSchema, serverSecretEnvSchema } from "@velor/config";

let cachedWebEnv: ReturnType<typeof runtimeEnvSchema.parse> | undefined;
let cachedSecretEnv: ReturnType<typeof serverSecretEnvSchema.parse> | undefined;

export const getWebEnv = () => {
  if (cachedWebEnv) {
    return cachedWebEnv;
  }

  cachedWebEnv = runtimeEnvSchema.parse({
    NODE_ENV: process.env["NODE_ENV"],
    NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    NEXT_PUBLIC_SITE_URL: process.env["NEXT_PUBLIC_SITE_URL"],
  });

  return cachedWebEnv;
};

export const getServerSecretEnv = () => {
  if (cachedSecretEnv) {
    return cachedSecretEnv;
  }

  cachedSecretEnv = serverSecretEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
    SUBSCRIPTION_MATERIALIZATION_CRON_SECRET:
      process.env["SUBSCRIPTION_MATERIALIZATION_CRON_SECRET"],
    OBS_ALERTS_ENABLED: process.env["OBS_ALERTS_ENABLED"],
    OBS_ALERT_WEBHOOK_URL: process.env["OBS_ALERT_WEBHOOK_URL"],
    OBS_ALERT_HEALTH_WEBHOOK_URL: process.env["OBS_ALERT_HEALTH_WEBHOOK_URL"],
    OBS_ALERT_ENV: process.env["OBS_ALERT_ENV"],
    OBS_ALERT_COOLDOWN_MS: process.env["OBS_ALERT_COOLDOWN_MS"],
    OBS_ALERT_HEALTH_COOLDOWN_MS: process.env["OBS_ALERT_HEALTH_COOLDOWN_MS"],
    OBS_ALERT_DEDUPE_FAILURE_MODE: process.env["OBS_ALERT_DEDUPE_FAILURE_MODE"],
    RATE_LIMIT_AUTH_DISTRIBUTED_FAILURE_MODE:
      process.env["RATE_LIMIT_AUTH_DISTRIBUTED_FAILURE_MODE"],
    RATE_LIMIT_MUTATION_DISTRIBUTED_FAILURE_MODE:
      process.env["RATE_LIMIT_MUTATION_DISTRIBUTED_FAILURE_MODE"],
    RATE_LIMIT_DEFAULT_DISTRIBUTED_FAILURE_MODE:
      process.env["RATE_LIMIT_DEFAULT_DISTRIBUTED_FAILURE_MODE"],
    RATE_LIMIT_FAIL_CLOSED_RETRY_MS: process.env["RATE_LIMIT_FAIL_CLOSED_RETRY_MS"],
  });

  return cachedSecretEnv;
};

export const getSupabaseAdminKeyOrThrow = () => {
  const env = getServerSecretEnv();

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing server admin key for Supabase integration tests.");
  }

  return env.SUPABASE_SERVICE_ROLE_KEY;
};

export const hasSupabaseAdminKey = () => {
  return Boolean(getServerSecretEnv().SUPABASE_SERVICE_ROLE_KEY);
};
