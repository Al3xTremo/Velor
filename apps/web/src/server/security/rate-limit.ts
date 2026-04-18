import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSecretEnv } from "@/lib/env";
import { logSecurityEvent } from "@/server/security/audit-log";

interface RateLimitWindow {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
  blockMs?: number;
  policy?: RateLimitPolicy;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  reason?: "window" | "blocked";
  strategy?: "distributed" | "fallback_local" | "fail_closed" | "fail_open";
  degraded?: boolean;
}

type DistributedFailureMode = "deny" | "local" | "allow";

interface RateLimitPolicy {
  operation: string;
  sensitivity: "auth_sensitive" | "data_mutation" | "non_critical";
  onDistributedFailure?: DistributedFailureMode;
}

interface RateLimitRpcRow {
  allowed: boolean | null;
  retry_after_ms: number | null;
  reason: string | null;
}

interface DistributedRateLimitUnavailable {
  status: "unavailable";
  reason: string;
}

interface DistributedRateLimitOk {
  status: "ok";
  result: RateLimitResult;
}

type DistributedRateLimitAttempt = DistributedRateLimitUnavailable | DistributedRateLimitOk;

const DEFAULT_FAIL_CLOSED_RETRY_MS = 60_000;

const getStore = () => {
  const globalKey = "__velor_rate_limit_store__";
  const globalValue = globalThis as typeof globalThis & {
    [globalKey]?: Map<string, RateLimitWindow>;
  };

  if (!globalValue[globalKey]) {
    globalValue[globalKey] = new Map<string, RateLimitWindow>();
  }

  return globalValue[globalKey];
};

const rateLimitInMemory = (key: string, options: RateLimitOptions): RateLimitResult => {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(key);

  if (existing?.blockedUntil && existing.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterMs: existing.blockedUntil - now,
      reason: "blocked",
    };
  }

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return { allowed: true, retryAfterMs: 0 };
  }

  existing.count += 1;

  if (existing.count > options.limit) {
    if (options.blockMs && options.blockMs > 0) {
      existing.blockedUntil = now + options.blockMs;
    }

    store.set(key, existing);
    return {
      allowed: false,
      retryAfterMs: existing.blockedUntil ? existing.blockedUntil - now : existing.resetAt - now,
      reason: existing.blockedUntil ? "blocked" : "window",
    };
  }

  store.set(key, existing);
  return { allowed: true, retryAfterMs: 0 };
};

const isRateLimitReason = (value: unknown): value is "window" | "blocked" => {
  return value === "window" || value === "blocked";
};

const coerceRetryAfterMs = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
};

const keyScope = (key: string) => {
  const parts = key.split(":");
  return parts.slice(0, 2).join(":") || "unknown";
};

const resolveFailureMode = (policy?: RateLimitPolicy): DistributedFailureMode => {
  if (policy?.onDistributedFailure) {
    return policy.onDistributedFailure;
  }

  const env = getServerSecretEnv();

  if (policy?.sensitivity === "auth_sensitive") {
    return env.RATE_LIMIT_AUTH_DISTRIBUTED_FAILURE_MODE ?? "deny";
  }

  if (policy?.sensitivity === "data_mutation") {
    return env.RATE_LIMIT_MUTATION_DISTRIBUTED_FAILURE_MODE ?? "local";
  }

  return env.RATE_LIMIT_DEFAULT_DISTRIBUTED_FAILURE_MODE ?? "local";
};

const failClosedRetryAfterMs = (options: RateLimitOptions) => {
  const env = getServerSecretEnv();
  return Math.max(
    1000,
    env.RATE_LIMIT_FAIL_CLOSED_RETRY_MS ?? Math.min(options.windowMs, DEFAULT_FAIL_CLOSED_RETRY_MS)
  );
};

const logDistributedUnavailable = (key: string, options: RateLimitOptions, reason: string) => {
  const mode = resolveFailureMode(options.policy);

  logSecurityEvent({
    event: "security.rate_limit.distributed_unavailable",
    severity: "warn",
    details: {
      operation: options.policy?.operation ?? "unknown",
      sensitivity: options.policy?.sensitivity ?? "non_critical",
      failureMode: mode,
      keyScope: keyScope(key),
      reason,
    },
  });
};

const rateLimitDistributed = async (
  key: string,
  options: RateLimitOptions
): Promise<DistributedRateLimitAttempt> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("take_rate_limit", {
      p_key: key,
      p_limit: options.limit,
      p_window_ms: options.windowMs,
      p_block_ms: options.blockMs ?? 0,
    });

    if (error || !Array.isArray(data) || data.length === 0) {
      return {
        status: "unavailable",
        reason: error?.message ?? "invalid_rpc_response",
      };
    }

    const firstRow = data[0] as RateLimitRpcRow;

    return {
      status: "ok",
      result: {
        allowed: firstRow.allowed === true,
        retryAfterMs: coerceRetryAfterMs(firstRow.retry_after_ms),
        ...(isRateLimitReason(firstRow.reason) ? { reason: firstRow.reason } : {}),
        strategy: "distributed",
      },
    };
  } catch (error) {
    return {
      status: "unavailable",
      reason: error instanceof Error ? error.message : "unexpected_error",
    };
  }
};

export const rateLimit = async (
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> => {
  const distributedResult = await rateLimitDistributed(key, options);
  if (distributedResult.status === "ok") {
    return distributedResult.result;
  }

  logDistributedUnavailable(key, options, distributedResult.reason);

  const failureMode = resolveFailureMode(options.policy);

  if (failureMode === "deny") {
    const retryAfterMs = failClosedRetryAfterMs(options);
    logSecurityEvent({
      event: "security.rate_limit.fail_closed_applied",
      severity: "warn",
      details: {
        operation: options.policy?.operation ?? "unknown",
        keyScope: keyScope(key),
        retryAfterMs,
      },
    });

    return {
      allowed: false,
      retryAfterMs,
      reason: "blocked",
      strategy: "fail_closed",
      degraded: true,
    };
  }

  if (failureMode === "allow") {
    logSecurityEvent({
      event: "security.rate_limit.fail_open_applied",
      severity: "warn",
      details: {
        operation: options.policy?.operation ?? "unknown",
        keyScope: keyScope(key),
      },
    });

    return {
      allowed: true,
      retryAfterMs: 0,
      strategy: "fail_open",
      degraded: true,
    };
  }

  const fallbackResult = rateLimitInMemory(key, options);
  logSecurityEvent({
    event: "security.rate_limit.fallback_local_applied",
    severity: "warn",
    details: {
      operation: options.policy?.operation ?? "unknown",
      keyScope: keyScope(key),
      localAllowed: fallbackResult.allowed,
      localReason: fallbackResult.reason ?? "none",
    },
  });

  return {
    ...fallbackResult,
    strategy: "fallback_local",
    degraded: true,
  };
};

export const clearRateLimitKey = async (key: string) => {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("clear_rate_limit", { p_key: key });

    if (error) {
      logSecurityEvent({
        event: "security.rate_limit.distributed_clear_failed",
        severity: "warn",
        details: { reason: error.message },
      });
    }
  } catch (error) {
    logSecurityEvent({
      event: "security.rate_limit.distributed_clear_failed",
      severity: "warn",
      details: {
        reason: error instanceof Error ? error.message : "unexpected_error",
      },
    });
  }

  getStore().delete(key);
};
