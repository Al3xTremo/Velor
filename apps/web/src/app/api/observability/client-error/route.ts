import { NextResponse } from "next/server";
import { z } from "zod";
import { logEvent } from "@/server/observability/logger";
import { ensureTraceContext } from "@/server/observability/trace-context";

const clientErrorSchema = z.object({
  event: z.string().min(1).max(80),
  message: z.string().min(1).max(1000),
  stack: z.string().max(4000).optional(),
  source: z.string().max(500).optional(),
  correlationId: z.string().max(80).optional(),
  requestId: z.string().max(80).optional(),
});

export const POST = async (request: Request) => {
  const traceContext = ensureTraceContext(request.headers);

  try {
    const json = await request.json();
    const parsed = clientErrorSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    logEvent({
      level: "error",
      event: parsed.data.event,
      scope: "frontend",
      expected: false,
      message: parsed.data.message,
      meta: {
        source: parsed.data.source,
        stack: parsed.data.stack ? "present" : "missing",
        clientCorrelationId: parsed.data.correlationId,
        clientRequestId: parsed.data.requestId,
      },
    });

    return NextResponse.json(
      { ok: true, requestId: traceContext.requestId, correlationId: traceContext.correlationId },
      {
        headers: {
          "x-request-id": traceContext.requestId,
          "x-correlation-id": traceContext.correlationId,
        },
      }
    );
  } catch (error) {
    logEvent({
      level: "error",
      event: "frontend.client_error_ingest_failed",
      scope: "frontend",
      expected: false,
      message: error instanceof Error ? error.message : "unknown_ingest_error",
    });
    return NextResponse.json(
      { ok: false, requestId: traceContext.requestId, correlationId: traceContext.correlationId },
      {
        status: 500,
        headers: {
          "x-request-id": traceContext.requestId,
          "x-correlation-id": traceContext.correlationId,
        },
      }
    );
  }
};
