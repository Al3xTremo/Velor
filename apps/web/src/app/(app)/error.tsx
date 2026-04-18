"use client";

import { useEffect } from "react";
import { getClientCorrelationId } from "@/components/observability/client-trace";

interface PrivateErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PrivateError({ error, reset }: PrivateErrorProps) {
  useEffect(() => {
    const correlationId = getClientCorrelationId();

    void fetch("/api/observability/client-error", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify({
        event: "frontend.private_error_boundary",
        message: error.message,
        stack: error.stack,
        correlationId,
      }),
      keepalive: true,
    }).catch(() => {
      // noop
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-velor-text">
        No pudimos cargar esta vista
      </h1>
      <p className="text-sm text-velor-muted">
        El equipo ya puede diagnosticar este error desde los logs. Intenta de nuevo en unos
        segundos.
      </p>
      <button className="velor-btn-primary" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
