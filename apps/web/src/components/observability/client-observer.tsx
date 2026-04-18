"use client";

import { useEffect } from "react";
import { getClientCorrelationId } from "@/components/observability/client-trace";

const sendClientError = (payload: {
  event: string;
  message: string;
  stack?: string;
  source?: string;
}) => {
  const correlationId = getClientCorrelationId();

  void fetch("/api/observability/client-error", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": correlationId,
    },
    body: JSON.stringify({
      ...payload,
      correlationId,
    }),
    keepalive: true,
  }).catch(() => {
    // noop: avoid recursive client failures in observer.
  });
};

export const ClientObserver = () => {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      sendClientError({
        event: "frontend.window_error",
        message: event.message || "window_error",
        stack: event.error?.stack,
        source: event.filename,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : String(reason ?? "unhandled_rejection");
      const stack = reason instanceof Error ? reason.stack : undefined;

      sendClientError({
        event: "frontend.unhandled_rejection",
        message,
        ...(stack ? { stack } : {}),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
};
