"use client";

import { useEffect } from "react";
import { getClientCorrelationId } from "@/components/observability/client-trace";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    const correlationId = getClientCorrelationId();

    void fetch("/api/observability/client-error", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify({
        event: "frontend.global_error_boundary",
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
    <html lang="en">
      <body className="bg-velor-surface text-velor-text">
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="font-display text-2xl font-semibold">Algo salio mal</h1>
          <p className="text-sm text-velor-muted">
            Ocurrio un error inesperado. Puedes intentar recargar la vista.
          </p>
          <button className="velor-btn-primary" onClick={reset}>
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
