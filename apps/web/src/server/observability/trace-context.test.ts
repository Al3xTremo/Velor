import { describe, expect, it } from "vitest";
import { ensureTraceContext, runWithTraceContext } from "@/server/observability/trace-context";

describe("trace context", () => {
  it("reuses inbound request id from headers", () => {
    const context = runWithTraceContext(
      {
        requestId: "req_existing",
        correlationId: "corr_existing",
        source: "inbound",
      },
      () => ensureTraceContext()
    );

    expect(context).toEqual({
      requestId: "req_existing",
      correlationId: "corr_existing",
      source: "inbound",
    });
  });

  it("creates context from x-request-id when absent", () => {
    const context = runWithTraceContext(
      {
        requestId: "req_outer",
        correlationId: "corr_outer",
        source: "generated",
      },
      () => {
        // new isolated async store for this assertion
        return null;
      }
    );

    expect(context).toBeNull();

    const generated = ensureTraceContext({
      get: (name: string) => {
        if (name === "x-request-id") {
          return "incoming_req_001";
        }
        return null;
      },
    });

    expect(generated.requestId).toBe("incoming_req_001");
    expect(generated.correlationId).toBe("incoming_req_001");
    expect(generated.source).toBe("inbound");
  });

  it("prefers correlation header and trims oversized values", () => {
    const oversized = "corr_" + "x".repeat(200);
    const generated = ensureTraceContext({
      get: (name: string) => {
        if (name === "x-correlation-id") {
          return oversized;
        }
        return null;
      },
    });

    expect(generated.requestId.startsWith("corr_")).toBe(true);
    expect(generated.requestId.length).toBeLessThanOrEqual(80);
    expect(generated.correlationId).toBe(generated.requestId);
    expect(generated.source).toBe("inbound");
  });
});
