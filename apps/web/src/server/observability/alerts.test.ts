import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSecretEnv: vi.fn(),
  hasSupabaseAdminKey: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getServerSecretEnv: mocks.getServerSecretEnv,
  hasSupabaseAdminKey: mocks.hasSupabaseAdminKey,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import { observeLogForAlerts, type ObservabilityPayload } from "./alerts";

const payload = (partial: Partial<ObservabilityPayload>): ObservabilityPayload => ({
  ts: new Date().toISOString(),
  kind: "observability",
  level: "error",
  event: "transactions.create.unexpected_error",
  scope: "transactions",
  expected: false,
  message: "boom",
  meta: {},
  ...partial,
});

describe("observability alerts operational requirements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      })
    );

    delete (globalThis as typeof globalThis & { __velor_alerting_store__?: unknown })[
      "__velor_alerting_store__"
    ];
    delete (globalThis as typeof globalThis & { __velor_alerting_config_state__?: unknown })[
      "__velor_alerting_config_state__"
    ];
    delete (globalThis as typeof globalThis & { __velor_alerting_health_state__?: unknown })[
      "__velor_alerting_health_state__"
    ];

    mocks.hasSupabaseAdminKey.mockReturnValue(true);
  });

  it("fails fast in beta when alerts are disabled", () => {
    mocks.getServerSecretEnv.mockReturnValue({
      OBS_ALERT_ENV: "beta-internal",
      OBS_ALERTS_ENABLED: "0",
    });

    expect(() => observeLogForAlerts(payload({}))).toThrow(
      "OBS_ALERTS_ENABLED must be 1 for beta-internal environments"
    );
  });

  it("emits health signal when beta config is invalid", async () => {
    mocks.getServerSecretEnv.mockReturnValue({
      OBS_ALERT_ENV: "beta-internal",
      OBS_ALERTS_ENABLED: "0",
      OBS_ALERT_WEBHOOK_URL: "https://alerts.example.com/hook",
      OBS_ALERT_HEALTH_COOLDOWN_MS: 300000,
    });

    expect(() => observeLogForAlerts(payload({}))).toThrow(
      "OBS_ALERTS_ENABLED must be 1 for beta-internal environments"
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { body: string },
    ];
    const body = JSON.parse(requestInit.body);
    expect(body.alertingHealth).toEqual(
      expect.objectContaining({
        signalId: "alerting_config_invalid",
        severity: "P1",
      })
    );
  });

  it("uses secondary health channel when primary webhook is unavailable", async () => {
    mocks.getServerSecretEnv.mockReturnValue({
      OBS_ALERT_ENV: "beta-internal",
      OBS_ALERTS_ENABLED: "0",
      OBS_ALERT_HEALTH_WEBHOOK_URL: "https://alerts-health.example.com/hook",
      OBS_ALERT_HEALTH_COOLDOWN_MS: 300000,
    });

    expect(() => observeLogForAlerts(payload({}))).toThrow(
      "OBS_ALERTS_ENABLED must be 1 for beta-internal environments"
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://alerts-health.example.com/hook",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("fails fast in beta when webhook is missing", () => {
    mocks.getServerSecretEnv.mockReturnValue({
      OBS_ALERT_ENV: "beta-internal",
      OBS_ALERTS_ENABLED: "1",
      OBS_ALERT_WEBHOOK_URL: undefined,
    });

    expect(() => observeLogForAlerts(payload({}))).toThrow(
      "OBS_ALERT_WEBHOOK_URL is required for beta-internal environments"
    );
  });

  it("fails fast in beta when admin key is missing", () => {
    mocks.getServerSecretEnv.mockReturnValue({
      OBS_ALERT_ENV: "beta-internal",
      OBS_ALERTS_ENABLED: "1",
      OBS_ALERT_WEBHOOK_URL: "https://alerts.example.com/hook",
    });
    mocks.hasSupabaseAdminKey.mockReturnValue(false);

    expect(() => observeLogForAlerts(payload({}))).toThrow(
      "Supabase admin key is required for distributed alert dedupe"
    );
  });

  it("dispatches critical backend alert with owner metadata", async () => {
    let backendHits = 0;
    const rpc = vi.fn().mockImplementation((_fn: string, args: Record<string, unknown>) => {
      if (args["p_rule_id"] === "unexpected_backend_errors") {
        backendHits += 1;
        return Promise.resolve({
          data: [
            {
              should_alert: backendHits >= 3,
              hit_count: backendHits,
              cooldown_remaining_ms: 0,
              decision: backendHits >= 3 ? "sent" : "suppressed_threshold",
            },
          ],
          error: null,
        });
      }

      return Promise.resolve({
        data: [
          {
            should_alert: false,
            hit_count: 1,
            cooldown_remaining_ms: 0,
            decision: "suppressed_threshold",
          },
        ],
        error: null,
      });
    });

    mocks.createSupabaseAdminClient.mockReturnValue({
      rpc,
    });

    mocks.getServerSecretEnv.mockReturnValue({
      OBS_ALERT_ENV: "beta-internal",
      OBS_ALERTS_ENABLED: "1",
      OBS_ALERT_WEBHOOK_URL: "https://alerts.example.com/hook",
      OBS_ALERT_COOLDOWN_MS: 300000,
    });

    observeLogForAlerts(payload({ event: "transactions.create.unexpected_error" }));
    observeLogForAlerts(payload({ event: "transactions.update.unexpected_error" }));
    observeLogForAlerts(payload({ event: "transactions.delete.unexpected_error" }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://alerts.example.com/hook",
      expect.objectContaining({
        method: "POST",
      })
    );

    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { body: string },
    ];
    const body = JSON.parse(requestInit.body);

    expect(body.text).toContain("owner=platform-oncall");
    expect(body.text).toContain("severity=P1");
    expect(body.alert).toEqual(
      expect.objectContaining({
        ruleId: "unexpected_backend_errors",
        owner: "platform-oncall",
      })
    );
  });

  it("falls back to local dedupe when distributed state backend fails", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue({
      rpc: vi.fn().mockRejectedValue(new Error("rpc_unavailable")),
    });

    mocks.getServerSecretEnv.mockReturnValue({
      OBS_ALERT_ENV: "beta-internal",
      OBS_ALERTS_ENABLED: "1",
      OBS_ALERT_WEBHOOK_URL: "https://alerts.example.com/hook",
      OBS_ALERT_COOLDOWN_MS: 300000,
      OBS_ALERT_DEDUPE_FAILURE_MODE: "local",
    });

    observeLogForAlerts(payload({ event: "transactions.create.unexpected_error" }));
    observeLogForAlerts(payload({ event: "transactions.update.unexpected_error" }));
    observeLogForAlerts(payload({ event: "transactions.delete.unexpected_error" }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(3);
    const requestBodies = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => {
      const [, requestInit] = call as [string, { body: string }];
      return JSON.parse(requestInit.body) as Record<string, unknown>;
    });
    const signalIds = requestBodies
      .map((body) => (body["alertingHealth"] as { signalId?: string } | undefined)?.signalId)
      .filter((value): value is string => typeof value === "string");

    expect(signalIds).toContain("alerting_state_backend_unavailable");
    expect(signalIds).toContain("alerting_fallback_local");
    expect(
      signalIds.filter((signalId) => signalId === "alerting_state_backend_unavailable")
    ).toHaveLength(1);
    expect(signalIds.filter((signalId) => signalId === "alerting_fallback_local")).toHaveLength(1);
  });

  it("drops alerts when distributed state backend fails and mode=drop", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue({
      rpc: vi.fn().mockRejectedValue(new Error("rpc_unavailable")),
    });

    mocks.getServerSecretEnv.mockReturnValue({
      OBS_ALERT_ENV: "beta-internal",
      OBS_ALERTS_ENABLED: "1",
      OBS_ALERT_WEBHOOK_URL: "https://alerts.example.com/hook",
      OBS_ALERT_COOLDOWN_MS: 300000,
      OBS_ALERT_DEDUPE_FAILURE_MODE: "drop",
    });

    observeLogForAlerts(payload({ event: "transactions.create.unexpected_error" }));
    observeLogForAlerts(payload({ event: "transactions.update.unexpected_error" }));
    observeLogForAlerts(payload({ event: "transactions.delete.unexpected_error" }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const requestBodies = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => {
      const [, requestInit] = call as [string, { body: string }];
      return JSON.parse(requestInit.body) as Record<string, unknown>;
    });
    const signalIds = requestBodies
      .map((body) => (body["alertingHealth"] as { signalId?: string } | undefined)?.signalId)
      .filter((value): value is string => typeof value === "string");

    expect(signalIds).toContain("alerting_state_backend_unavailable");
    expect(signalIds).toContain("alerting_drop_mode_active");
  });

  it("emits health degradation signal when primary alert webhook fails", async () => {
    let backendHits = 0;
    const rpc = vi.fn().mockImplementation((_fn: string, args: Record<string, unknown>) => {
      if (args["p_rule_id"] === "unexpected_backend_errors") {
        backendHits += 1;
        return Promise.resolve({
          data: [
            {
              should_alert: backendHits >= 3,
              hit_count: backendHits,
              cooldown_remaining_ms: 0,
              decision: backendHits >= 3 ? "sent" : "suppressed_threshold",
            },
          ],
          error: null,
        });
      }

      return Promise.resolve({
        data: [
          {
            should_alert: false,
            hit_count: 1,
            cooldown_remaining_ms: 0,
            decision: "suppressed_threshold",
          },
        ],
        error: null,
      });
    });
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc });

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("primary_down"))
      .mockRejectedValueOnce(new Error("primary_down"))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    mocks.getServerSecretEnv.mockReturnValue({
      OBS_ALERT_ENV: "beta-internal",
      OBS_ALERTS_ENABLED: "1",
      OBS_ALERT_WEBHOOK_URL: "https://alerts.example.com/hook",
      OBS_ALERT_HEALTH_WEBHOOK_URL: "https://alerts-health.example.com/hook",
      OBS_ALERT_COOLDOWN_MS: 300000,
      OBS_ALERT_HEALTH_COOLDOWN_MS: 300000,
    });

    observeLogForAlerts(payload({ event: "transactions.create.unexpected_error" }));
    observeLogForAlerts(payload({ event: "transactions.update.unexpected_error" }));
    observeLogForAlerts(payload({ event: "transactions.delete.unexpected_error" }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const requestBodies = fetchMock.mock.calls.map((call) => {
      const [, requestInit] = call as [string, { body: string }];
      return JSON.parse(requestInit.body) as Record<string, unknown>;
    });
    const healthBodies = requestBodies.filter((body) => Boolean(body["alertingHealth"]));
    expect(healthBodies).toHaveLength(2);
    const signalIds = healthBodies
      .map((body) => (body["alertingHealth"] as { signalId?: string }).signalId)
      .filter((value): value is string => typeof value === "string");
    expect(signalIds).toContain("alerting_primary_channel_unavailable");
  });
});
