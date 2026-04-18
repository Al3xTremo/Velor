import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logEvent } from "@/server/observability/logger";
import { runWithTraceContext } from "@/server/observability/trace-context";

vi.mock("@/server/observability/alerts", () => ({
  observeLogForAlerts: vi.fn(),
}));

describe("observability logger trace correlation", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects request/correlation ids from trace context", () => {
    runWithTraceContext(
      {
        requestId: "req_test_123",
        correlationId: "corr_test_456",
        source: "inbound",
      },
      () => {
        logEvent({
          event: "trace.test.event",
          scope: "test",
          meta: { custom: "value" },
        });
      }
    );

    const serialized = infoSpy.mock.calls[0]?.[0];
    const payload = JSON.parse(String(serialized));

    expect(payload.meta).toEqual(
      expect.objectContaining({
        custom: "value",
        requestId: "req_test_123",
        correlationId: "corr_test_456",
        traceSource: "inbound",
      })
    );
  });

  it("keeps trace fields present even without active context", () => {
    logEvent({ event: "trace.test.no_context", scope: "test" });

    const serialized = infoSpy.mock.calls[0]?.[0];
    const payload = JSON.parse(String(serialized));

    expect(payload.meta).toEqual(
      expect.objectContaining({
        requestId: null,
        correlationId: null,
        traceSource: null,
      })
    );
  });
});
