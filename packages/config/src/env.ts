import { z } from "zod";

export const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

export const serverSecretEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OBS_ALERTS_ENABLED: z.enum(["0", "1"]).optional(),
  OBS_ALERT_WEBHOOK_URL: z.string().url().optional(),
  OBS_ALERT_HEALTH_WEBHOOK_URL: z.string().url().optional(),
  OBS_ALERT_ENV: z.string().min(1).max(40).optional(),
  OBS_ALERT_COOLDOWN_MS: z.coerce.number().int().positive().max(3600000).optional(),
  OBS_ALERT_HEALTH_COOLDOWN_MS: z.coerce.number().int().positive().max(3600000).optional(),
  OBS_ALERT_DEDUPE_FAILURE_MODE: z.enum(["local", "drop"]).optional(),
  RATE_LIMIT_AUTH_DISTRIBUTED_FAILURE_MODE: z.enum(["deny", "local"]).optional(),
  RATE_LIMIT_MUTATION_DISTRIBUTED_FAILURE_MODE: z.enum(["deny", "local", "allow"]).optional(),
  RATE_LIMIT_DEFAULT_DISTRIBUTED_FAILURE_MODE: z.enum(["deny", "local", "allow"]).optional(),
  RATE_LIMIT_FAIL_CLOSED_RETRY_MS: z.coerce.number().int().min(1000).max(600000).optional(),
});

export type ServerSecretEnv = z.infer<typeof serverSecretEnvSchema>;
