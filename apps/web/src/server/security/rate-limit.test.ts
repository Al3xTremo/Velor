import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getServerSecretEnv: vi.fn(),
  logSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@/lib/env", () => ({
  getServerSecretEnv: mocks.getServerSecretEnv,
}));

vi.mock("@/server/security/audit-log", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
}));

import { rateLimit } from "./rate-limit";

const createRpcClient = (rpc: ReturnType<typeof vi.fn>) => ({ rpc });

describe("rate-limit distributed fallback policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSecretEnv.mockReturnValue({
      RATE_LIMIT_AUTH_DISTRIBUTED_FAILURE_MODE: "deny",
      RATE_LIMIT_MUTATION_DISTRIBUTED_FAILURE_MODE: "local",
      RATE_LIMIT_DEFAULT_DISTRIBUTED_FAILURE_MODE: "local",
      RATE_LIMIT_FAIL_CLOSED_RETRY_MS: 60_000,
    });
  });

  it("uses distributed limiter when RPC succeeds", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: true, retry_after_ms: 0, reason: null }],
      error: null,
    });
    mocks.createSupabaseServerClient.mockResolvedValue(createRpcClient(rpc));

    const result = await rateLimit("mutation:transactions.create:user-1", {
      limit: 5,
      windowMs: 60_000,
      policy: {
        operation: "mutation.transactions.create",
        sensitivity: "data_mutation",
      },
    });

    expect(result).toEqual({
      allowed: true,
      retryAfterMs: 0,
      strategy: "distributed",
    });
    expect(mocks.logSecurityEvent).not.toHaveBeenCalled();
  });

  it("applies fail-closed policy for auth-sensitive operations", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "rpc_unavailable" },
    });
    mocks.createSupabaseServerClient.mockResolvedValue(createRpcClient(rpc));
    mocks.getServerSecretEnv.mockReturnValue({
      RATE_LIMIT_AUTH_DISTRIBUTED_FAILURE_MODE: "deny",
      RATE_LIMIT_MUTATION_DISTRIBUTED_FAILURE_MODE: "local",
      RATE_LIMIT_DEFAULT_DISTRIBUTED_FAILURE_MODE: "local",
      RATE_LIMIT_FAIL_CLOSED_RETRY_MS: 45_000,
    });

    const result = await rateLimit(`auth:login:${Date.now()}`, {
      limit: 12,
      windowMs: 10 * 60 * 1000,
      policy: {
        operation: "auth.login",
        sensitivity: "auth_sensitive",
      },
    });

    expect(result).toEqual({
      allowed: false,
      retryAfterMs: 45_000,
      reason: "blocked",
      strategy: "fail_closed",
      degraded: true,
    });
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "security.rate_limit.distributed_unavailable" })
    );
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "security.rate_limit.fail_closed_applied" })
    );
  });

  it("falls back to local limiter for data mutation operations", async () => {
    const rpc = vi.fn().mockRejectedValue(new Error("network_down"));
    mocks.createSupabaseServerClient.mockResolvedValue(createRpcClient(rpc));

    const key = `mutation:goals.update:user-${Date.now()}`;

    const first = await rateLimit(key, {
      limit: 1,
      windowMs: 10_000,
      policy: {
        operation: "mutation.goals.update",
        sensitivity: "data_mutation",
      },
    });
    const second = await rateLimit(key, {
      limit: 1,
      windowMs: 10_000,
      policy: {
        operation: "mutation.goals.update",
        sensitivity: "data_mutation",
      },
    });

    expect(first).toEqual(
      expect.objectContaining({ allowed: true, strategy: "fallback_local", degraded: true })
    );
    expect(second).toEqual(
      expect.objectContaining({ allowed: false, strategy: "fallback_local", degraded: true })
    );
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "security.rate_limit.fallback_local_applied" })
    );
  });

  it("can be configured to fail-open on distributed outages", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    mocks.createSupabaseServerClient.mockResolvedValue(createRpcClient(rpc));
    mocks.getServerSecretEnv.mockReturnValue({
      RATE_LIMIT_AUTH_DISTRIBUTED_FAILURE_MODE: "deny",
      RATE_LIMIT_MUTATION_DISTRIBUTED_FAILURE_MODE: "allow",
      RATE_LIMIT_DEFAULT_DISTRIBUTED_FAILURE_MODE: "local",
      RATE_LIMIT_FAIL_CLOSED_RETRY_MS: 60_000,
    });

    const result = await rateLimit(`mutation:budgets.upsert_limit:user-${Date.now()}`, {
      limit: 10,
      windowMs: 30_000,
      policy: {
        operation: "mutation.budgets.upsert_limit",
        sensitivity: "data_mutation",
      },
    });

    expect(result).toEqual({
      allowed: true,
      retryAfterMs: 0,
      strategy: "fail_open",
      degraded: true,
    });
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "security.rate_limit.fail_open_applied" })
    );
  });

  it("allows explicit per-operation override of distributed failure mode", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "timeout" } });
    mocks.createSupabaseServerClient.mockResolvedValue(createRpcClient(rpc));

    const result = await rateLimit(`mutation:transactions.delete:user-${Date.now()}`, {
      limit: 5,
      windowMs: 60_000,
      policy: {
        operation: "mutation.transactions.delete",
        sensitivity: "data_mutation",
        onDistributedFailure: "deny",
      },
    });

    expect(result.strategy).toBe("fail_closed");
    expect(result.allowed).toBe(false);
  });
});
