import { NextResponse } from "next/server";
import { z } from "zod";
import { logEvent } from "@/server/observability/logger";
import { ensureTraceContext } from "@/server/observability/trace-context";

const clientTraceSchema = z.object({
  event: z.literal("frontend.route_view"),
  pathname: z.string().min(1).max(200),
  routeArea: z.enum(["auth", "dashboard", "transactions", "onboarding", "other"]),
  correlationId: z.string().max(80).optional(),
});

export const POST = async (request: Request) => {
  const traceContext = ensureTraceContext(request.headers);

  try {
    const json = await request.json();
    const parsed = clientTraceSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    logEvent({
      level: "info",
      event: parsed.data.event,
      scope: "frontend",
      expected: true,
      message: "client_route_view",
      meta: {
        pathname: parsed.data.pathname,
        routeArea: parsed.data.routeArea,
        clientCorrelationId: parsed.data.correlationId,
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
      level: "warn",
      event: "frontend.client_trace_ingest_failed",
      scope: "frontend",
      expected: false,
      message: error instanceof Error ? error.message : "unknown_trace_ingest_error",
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
