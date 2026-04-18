import { getServerSecretEnv, hasSupabaseAdminKey } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface ObservabilityPayload {
  ts: string;
  kind: "observability";
  level: "info" | "warn" | "error";
  event: string;
  scope: string;
  expected: boolean;
  message: string | null;
  meta: Record<string, string | number | boolean | null | undefined>;
}

interface AlertRule {
  id: string;
  mandatory: boolean;
  owner: string;
  severity: "P1" | "P2" | "P3";
  threshold: number;
  windowMs: number;
  description: string;
  matches: (payload: ObservabilityPayload) => boolean;
}

interface RuleState {
  hits: number[];
  lastAlertAt?: number;
}

interface AlertDecision {
  shouldAlert: boolean;
  hitCount: number;
  windowMs: number;
  cooldownMs: number;
  payload: ObservabilityPayload;
  decision: "sent" | "suppressed_cooldown" | "suppressed_threshold";
  cooldownRemainingMs: number;
  decisionSource: "distributed" | "fallback_local";
}

interface DistributedAlertDecisionRow {
  should_alert: boolean | null;
  hit_count: number | null;
  cooldown_remaining_ms: number | null;
  decision: string | null;
}

interface AlertingConfigState {
  checked: boolean;
  error: string | null;
}

interface AlertingHealthState {
  lastSignals: Map<string, number>;
}

const getStore = () => {
  const key = "__velor_alerting_store__";
  const globalRef = globalThis as typeof globalThis & {
    [key]?: Map<string, RuleState>;
  };

  if (!globalRef[key]) {
    globalRef[key] = new Map<string, RuleState>();
  }

  return globalRef[key];
};

const getConfigState = () => {
  const key = "__velor_alerting_config_state__";
  const globalRef = globalThis as typeof globalThis & {
    [key]?: AlertingConfigState;
  };

  if (!globalRef[key]) {
    globalRef[key] = {
      checked: false,
      error: null,
    };
  }

  return globalRef[key];
};

const getHealthState = () => {
  const key = "__velor_alerting_health_state__";
  const globalRef = globalThis as typeof globalThis & {
    [key]?: AlertingHealthState;
  };

  if (!globalRef[key]) {
    globalRef[key] = {
      lastSignals: new Map<string, number>(),
    };
  }

  return globalRef[key];
};

const getObservabilitySupabaseClient = () => {
  return createSupabaseAdminClient();
};

const getDurationMs = (payload: ObservabilityPayload) => {
  const raw = payload.meta["durationMs"];
  const duration = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(duration) ? duration : null;
};

const latencyThresholdByEvent: Record<string, number> = {
  "dashboard.page.load": 1200,
  "transactions.page.load": 1200,
  "analytics.page.load": 1400,
  "dashboard.repository.fetch": 700,
  "transactions.repository.list_page": 650,
  "analytics.repository.fetch": 850,
  "auth.repository.sign_in": 700,
  "auth.repository.sign_up": 900,
};

const rules: AlertRule[] = [
  {
    id: "unexpected_frontend_errors",
    mandatory: true,
    owner: "frontend-oncall",
    severity: "P2",
    threshold: 3,
    windowMs: 5 * 60 * 1000,
    description: "Unexpected frontend errors spike",
    matches: (payload) =>
      payload.level === "error" && !payload.expected && payload.scope === "frontend",
  },
  {
    id: "unexpected_backend_errors",
    mandatory: true,
    owner: "platform-oncall",
    severity: "P1",
    threshold: 3,
    windowMs: 5 * 60 * 1000,
    description: "Unexpected backend/server action errors spike",
    matches: (payload) =>
      payload.level === "error" && !payload.expected && payload.scope !== "frontend",
  },
  {
    id: "auth_anomaly",
    mandatory: true,
    owner: "security-oncall",
    severity: "P1",
    threshold: 8,
    windowMs: 10 * 60 * 1000,
    description: "Auth anomaly (failed/locked/rate-limited logins)",
    matches: (payload) =>
      payload.event === "auth.login.failed" ||
      payload.event === "auth.login.locked" ||
      payload.event === "auth.login.rate_limited",
  },
  {
    id: "critical_ops_failures",
    mandatory: true,
    owner: "data-oncall",
    severity: "P1",
    threshold: 5,
    windowMs: 10 * 60 * 1000,
    description: "Critical operation failures spike",
    matches: (payload) =>
      /^(transactions|budgets|goals|categories)\..*failed$/.test(payload.event) ||
      /^(transactions|budgets|goals|categories)\..*unexpected_error$/.test(payload.event),
  },
  {
    id: "latency_degradation",
    mandatory: true,
    owner: "platform-oncall",
    severity: "P2",
    threshold: 10,
    windowMs: 10 * 60 * 1000,
    description: "Latency degradation on key page/repository operations",
    matches: (payload) => {
      if (payload.scope !== "performance") {
        return false;
      }

      const duration = getDurationMs(payload);
      if (duration === null) {
        return false;
      }

      const threshold = latencyThresholdByEvent[payload.event];
      if (!threshold) {
        return false;
      }

      return duration >= threshold;
    },
  },
];

const shouldSendInMemory = (
  rule: AlertRule,
  payload: ObservabilityPayload,
  now: number
): AlertDecision => {
  const env = getServerSecretEnv();
  const cooldownMs = env.OBS_ALERT_COOLDOWN_MS ?? 5 * 60 * 1000;
  const store = getStore();
  const state = store.get(rule.id) ?? { hits: [] };

  state.hits = state.hits.filter((timestamp) => now - timestamp <= rule.windowMs);
  state.hits.push(now);

  const thresholdReached = state.hits.length >= rule.threshold;
  const cooldownPassed = !state.lastAlertAt || now - state.lastAlertAt >= cooldownMs;

  if (thresholdReached && cooldownPassed) {
    state.lastAlertAt = now;
    store.set(rule.id, state);

    return {
      shouldAlert: true,
      hitCount: state.hits.length,
      windowMs: rule.windowMs,
      cooldownMs,
      payload,
      decision: "sent",
      cooldownRemainingMs: 0,
      decisionSource: "fallback_local",
    };
  }

  store.set(rule.id, state);

  const cooldownRemainingMs = state.lastAlertAt
    ? Math.max(0, cooldownMs - (now - state.lastAlertAt))
    : 0;

  const decision: AlertDecision["decision"] = thresholdReached
    ? "suppressed_cooldown"
    : "suppressed_threshold";

  return {
    shouldAlert: false,
    hitCount: state.hits.length,
    windowMs: rule.windowMs,
    cooldownMs,
    payload,
    decision,
    cooldownRemainingMs,
    decisionSource: "fallback_local",
  };
};

const toPositiveInt = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
};

const takeDistributedAlertDecision = async (
  rule: AlertRule,
  payload: ObservabilityPayload
): Promise<AlertDecision> => {
  const env = getServerSecretEnv();
  const cooldownMs = env.OBS_ALERT_COOLDOWN_MS ?? 5 * 60 * 1000;
  const retentionMs = Math.max(rule.windowMs, cooldownMs) * 4;
  const supabase = getObservabilitySupabaseClient();

  const { data, error } = await supabase.rpc("take_alert_decision", {
    p_rule_id: rule.id,
    p_threshold: rule.threshold,
    p_window_ms: rule.windowMs,
    p_cooldown_ms: cooldownMs,
    p_retention_ms: Math.min(retentionMs, 14 * 24 * 60 * 60 * 1000),
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    throw new Error(error?.message ?? "invalid_alert_decision_response");
  }

  const row = data[0] as DistributedAlertDecisionRow;
  const decision =
    row.decision === "sent" ||
    row.decision === "suppressed_cooldown" ||
    row.decision === "suppressed_threshold"
      ? row.decision
      : "suppressed_threshold";

  return {
    shouldAlert: row.should_alert === true,
    hitCount: toPositiveInt(row.hit_count, 0),
    windowMs: rule.windowMs,
    cooldownMs,
    payload,
    decision,
    cooldownRemainingMs: toPositiveInt(row.cooldown_remaining_ms, 0),
    decisionSource: "distributed",
  };
};

const dedupeFailureMode = () => {
  const env = getServerSecretEnv();
  return env.OBS_ALERT_DEDUPE_FAILURE_MODE ?? "local";
};

const getAlertHealthCooldownMs = () => {
  const env = getServerSecretEnv();
  return env.OBS_ALERT_HEALTH_COOLDOWN_MS ?? 10 * 60 * 1000;
};

const getAlertingHealthChannels = () => {
  const env = getServerSecretEnv();
  const primary = env.OBS_ALERT_WEBHOOK_URL ?? null;
  const secondary = env.OBS_ALERT_HEALTH_WEBHOOK_URL ?? null;
  return {
    primary,
    secondary,
  };
};

const postAlertingHealthPayload = async (webhook: string, body: Record<string, unknown>) => {
  const response = await fetch(webhook, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`webhook_response_${response.status}`);
  }
};

const emitAlertingHealthSignal = async (
  signalId: string,
  severity: "P1" | "P2" | "P3",
  message: string,
  meta: Record<string, string | number | boolean | null | undefined>
) => {
  const now = Date.now();
  const cooldownMs = getAlertHealthCooldownMs();
  const state = getHealthState();
  const lastAt = state.lastSignals.get(signalId);

  if (lastAt && now - lastAt < cooldownMs) {
    return;
  }

  state.lastSignals.set(signalId, now);

  const env = getServerSecretEnv();
  const targetEnv = env.OBS_ALERT_ENV ?? process.env["NODE_ENV"] ?? "development";
  const channels = getAlertingHealthChannels();
  const owner = "platform-oncall";
  const metaText = Object.entries(meta)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");
  const text =
    `[VELOR ALERT HEALTH][${targetEnv}] ${signalId} - ${message}\n` +
    `owner=${owner} severity=${severity} cooldownMs=${cooldownMs}\n` +
    `meta=${metaText || "none"}`;

  if (severity === "P1") {
    console.error(text);
  } else {
    console.warn(text);
  }

  if (!channels.primary && !channels.secondary) {
    console.error(
      `[VELOR ALERT HEALTH DEGRADED] ${signalId} reason=no_health_channels_configured owner=${owner}`
    );
    return;
  }

  const healthPayload = {
    text,
    alertingHealth: {
      kind: "alerting_health",
      signalId,
      owner,
      severity,
      message,
      cooldownMs,
      meta,
      ts: new Date(now).toISOString(),
    },
  };

  let primaryDelivered = false;
  let secondaryDelivered = false;

  if (channels.primary) {
    try {
      await postAlertingHealthPayload(channels.primary, healthPayload);
      primaryDelivered = true;
    } catch (error) {
      console.error(
        `[VELOR ALERT HEALTH DISPATCH FAILED] ${signalId} channel=primary ${
          error instanceof Error ? error.message : "unknown_error"
        }`
      );
    }
  }

  if (channels.secondary) {
    try {
      await postAlertingHealthPayload(channels.secondary, healthPayload);
      secondaryDelivered = true;
    } catch (error) {
      console.error(
        `[VELOR ALERT HEALTH DISPATCH FAILED] ${signalId} channel=secondary ${
          error instanceof Error ? error.message : "unknown_error"
        }`
      );
    }
  }

  if (!primaryDelivered && !secondaryDelivered) {
    console.error(
      `[VELOR ALERT HEALTH DEGRADED] ${signalId} reason=no_health_channel_delivery owner=${owner}`
    );
    return;
  }

  if (!primaryDelivered && secondaryDelivered) {
    console.error(
      `[VELOR ALERT HEALTH DEGRADED] ${signalId} reason=primary_channel_unavailable owner=${owner}`
    );
  }

  if (primaryDelivered && channels.secondary && !secondaryDelivered) {
    console.warn(
      `[VELOR ALERT HEALTH DEGRADED] ${signalId} reason=secondary_channel_unavailable owner=${owner}`
    );
  }
};

const isBetaInternalEnv = (targetEnv: string) => {
  const normalized = targetEnv.trim().toLowerCase();
  return normalized === "beta" || normalized === "beta-internal" || normalized.startsWith("beta-");
};

const assertBetaAlertingRequirements = () => {
  const state = getConfigState();
  if (state.checked) {
    if (state.error) {
      throw new Error(state.error);
    }
    return;
  }

  const env = getServerSecretEnv();
  const targetEnv = env.OBS_ALERT_ENV ?? process.env["NODE_ENV"] ?? "development";
  const isBeta = isBetaInternalEnv(targetEnv);

  if (!isBeta) {
    state.checked = true;
    state.error = null;
    return;
  }

  if (env.OBS_ALERTS_ENABLED !== "1") {
    state.checked = true;
    state.error =
      "[VELOR ALERT CONFIG] OBS_ALERTS_ENABLED must be 1 for beta-internal environments.";
    void emitAlertingHealthSignal(
      "alerting_config_invalid",
      "P1",
      "Alerting misconfigured in beta environment",
      {
        reason: "alerts_disabled",
        targetEnv,
      }
    );
    throw new Error(state.error);
  }

  if (!env.OBS_ALERT_WEBHOOK_URL) {
    state.checked = true;
    state.error =
      "[VELOR ALERT CONFIG] OBS_ALERT_WEBHOOK_URL is required for beta-internal environments.";
    void emitAlertingHealthSignal(
      "alerting_config_invalid",
      "P1",
      "Alerting misconfigured in beta environment",
      {
        reason: "missing_webhook",
        targetEnv,
      }
    );
    throw new Error(state.error);
  }

  if (!hasSupabaseAdminKey()) {
    state.checked = true;
    state.error =
      "[VELOR ALERT CONFIG] Supabase admin key is required for distributed alert dedupe in beta-internal environments.";
    void emitAlertingHealthSignal(
      "alerting_config_invalid",
      "P1",
      "Alerting misconfigured in beta environment",
      {
        reason: "missing_supabase_admin_key",
        targetEnv,
      }
    );
    throw new Error(state.error);
  }

  state.checked = true;
  state.error = null;
};

const dispatchAlert = async (rule: AlertRule, detail: AlertDecision) => {
  const env = getServerSecretEnv();
  const targetEnv = env.OBS_ALERT_ENV ?? process.env["NODE_ENV"] ?? "development";
  const webhook = env.OBS_ALERT_WEBHOOK_URL;
  const text =
    `[VELOR ALERT][${targetEnv}] ${rule.id} - ${rule.description}\n` +
    `owner=${rule.owner} severity=${rule.severity} mandatory=${rule.mandatory}\n` +
    `decision=${detail.decision} source=${detail.decisionSource}\n` +
    `event=${detail.payload.event} scope=${detail.payload.scope} level=${detail.payload.level} expected=${detail.payload.expected}\n` +
    `hits=${detail.hitCount} windowMs=${detail.windowMs} cooldownMs=${detail.cooldownMs}\n` +
    `message=${detail.payload.message ?? "none"}`;

  console.warn(text);

  if (!webhook) {
    return;
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        alert: {
          ruleId: rule.id,
          mandatory: rule.mandatory,
          owner: rule.owner,
          severity: rule.severity,
          decisionSource: detail.decisionSource,
          decision: detail.decision,
          threshold: rule.threshold,
          hitCount: detail.hitCount,
          windowMs: detail.windowMs,
          cooldownMs: detail.cooldownMs,
          payload: detail.payload,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`webhook_response_${response.status}`);
    }
  } catch (error) {
    console.error(
      `[VELOR ALERT DISPATCH FAILED] ${rule.id} ${
        error instanceof Error ? error.message : "unknown_error"
      }`
    );

    void emitAlertingHealthSignal(
      "alerting_primary_channel_unavailable",
      "P1",
      "Primary alert webhook delivery failed",
      {
        ruleId: rule.id,
      }
    );
  }
};

export const observeLogForAlerts = (payload: ObservabilityPayload) => {
  assertBetaAlertingRequirements();

  const env = getServerSecretEnv();
  const enabled = env.OBS_ALERTS_ENABLED === "1";
  if (!enabled) {
    return;
  }

  const now = Date.now();

  for (const rule of rules) {
    if (!rule.matches(payload)) {
      continue;
    }

    void (async () => {
      let decision: AlertDecision;

      try {
        decision = await takeDistributedAlertDecision(rule, payload);
      } catch (error) {
        const mode = dedupeFailureMode();
        const reason = error instanceof Error ? error.message : "unknown_error";
        console.error(`[VELOR ALERT STATE FAILED] ${rule.id} ${reason} mode=${mode}`);

        void emitAlertingHealthSignal(
          "alerting_state_backend_unavailable",
          "P1",
          "Distributed alert-state backend is unavailable",
          {
            ruleId: rule.id,
            mode,
            reason,
          }
        );

        if (mode === "drop") {
          void emitAlertingHealthSignal(
            "alerting_drop_mode_active",
            "P2",
            "Alerting is suppressing notifications due to distributed backend degradation",
            {
              ruleId: rule.id,
              mode,
            }
          );
          return;
        }

        decision = shouldSendInMemory(rule, payload, now);
        void emitAlertingHealthSignal(
          "alerting_fallback_local",
          "P2",
          "Alerting is using per-instance in-memory fallback dedupe",
          {
            ruleId: rule.id,
            mode,
          }
        );
      }

      if (!decision.shouldAlert) {
        if (decision.decision === "suppressed_cooldown") {
          console.info(
            `[VELOR ALERT SUPPRESSED] ${rule.id} reason=cooldown remainingMs=${decision.cooldownRemainingMs} source=${decision.decisionSource}`
          );
        }
        return;
      }

      await dispatchAlert(rule, decision);
    })();
  }
};
