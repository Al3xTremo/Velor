import { observeLogForAlerts, type ObservabilityPayload } from "@/server/observability/alerts";
import { getTraceContext } from "@/server/observability/trace-context";

export type LogLevel = "info" | "warn" | "error";

export interface LogInput {
  level?: LogLevel;
  event: string;
  scope?: string;
  expected?: boolean;
  message?: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
}

const toPayload = (input: LogInput): ObservabilityPayload => {
  const traceContext = getTraceContext();

  return {
    ts: new Date().toISOString(),
    kind: "observability",
    level: input.level ?? "info",
    event: input.event,
    scope: input.scope ?? "web",
    expected: input.expected ?? true,
    message: input.message ?? null,
    meta: {
      ...(input.meta ?? {}),
      requestId: traceContext?.requestId ?? null,
      correlationId: traceContext?.correlationId ?? null,
      traceSource: traceContext?.source ?? null,
    },
  };
};

export const logEvent = (input: LogInput) => {
  const payload = toPayload(input);
  const serialized = JSON.stringify(payload);

  if ((input.level ?? "info") === "error") {
    console.error(serialized);
  } else if ((input.level ?? "info") === "warn") {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }

  observeLogForAlerts(payload);
};
