import { logEvent } from "@/server/observability/logger";

export const measureServerOperation = async <T>(
  event: string,
  operation: () => Promise<T>,
  meta?: Record<string, string | number | boolean | null | undefined>
) => {
  const startedAt = performance.now();
  try {
    const result = await operation();
    const durationMs = Number((performance.now() - startedAt).toFixed(2));

    logEvent({
      level: "info",
      event,
      scope: "performance",
      expected: true,
      meta: {
        durationMs,
        ...meta,
      },
    });

    return result;
  } catch (error) {
    const durationMs = Number((performance.now() - startedAt).toFixed(2));
    logEvent({
      level: "error",
      event: `${event}.failed`,
      scope: "performance",
      expected: false,
      message: error instanceof Error ? error.message : "unknown_error",
      meta: {
        durationMs,
        ...meta,
      },
    });
    throw error;
  }
};
