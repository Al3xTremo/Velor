import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const TRACE_ID_MAX_LENGTH = 80;

const normalizeTraceId = (value: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, TRACE_ID_MAX_LENGTH);
};

const generatedRequestId = () => {
  return `req_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
};

export function middleware(request: NextRequest) {
  const inboundRequestId = normalizeTraceId(request.headers.get("x-request-id"));
  const inboundCorrelationId = normalizeTraceId(request.headers.get("x-correlation-id"));
  const requestId = inboundRequestId ?? inboundCorrelationId ?? generatedRequestId();
  const correlationId = inboundCorrelationId ?? requestId;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-correlation-id", correlationId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", requestId);
  response.headers.set("x-correlation-id", correlationId);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
