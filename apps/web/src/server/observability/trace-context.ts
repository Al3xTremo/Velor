import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type HeaderReader = {
  get: (name: string) => string | null;
};

export interface TraceContext {
  requestId: string;
  correlationId: string;
  source: "inbound" | "generated";
}

const traceStore = new AsyncLocalStorage<TraceContext>();

const TRACE_ID_MAX_LENGTH = 80;

const normalizeTraceId = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, TRACE_ID_MAX_LENGTH);
};

const readHeader = (headers: HeaderReader | undefined, key: string) => {
  if (!headers) {
    return null;
  }

  return normalizeTraceId(headers.get(key));
};

const generateTraceId = (prefix: string) => {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
};

const fromHeaders = (headers?: HeaderReader): TraceContext => {
  const requestId =
    readHeader(headers, "x-request-id") ??
    readHeader(headers, "x-correlation-id") ??
    readHeader(headers, "traceparent") ??
    generateTraceId("req");
  const correlationId = readHeader(headers, "x-correlation-id") ?? requestId;

  const inbound = Boolean(
    readHeader(headers, "x-request-id") ||
    readHeader(headers, "x-correlation-id") ||
    readHeader(headers, "traceparent")
  );

  return {
    requestId,
    correlationId,
    source: inbound ? "inbound" : "generated",
  };
};

export const getTraceContext = () => {
  return traceStore.getStore();
};

export const ensureTraceContext = (headers?: HeaderReader) => {
  const existing = getTraceContext();
  if (existing) {
    return existing;
  }

  const next = fromHeaders(headers);
  traceStore.enterWith(next);
  return next;
};

export const runWithTraceContext = <T>(context: TraceContext, fn: () => T) => {
  return traceStore.run(context, fn);
};
