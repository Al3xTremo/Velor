"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  getClientCorrelationId,
  getTraceRouteArea,
  isHighValueTracePath,
} from "@/components/observability/client-trace";

export const ClientFlowObserver = () => {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    if (lastTrackedPathRef.current === pathname) {
      return;
    }

    if (!isHighValueTracePath(pathname)) {
      return;
    }

    lastTrackedPathRef.current = pathname;
    const correlationId = getClientCorrelationId();
    const routeArea = getTraceRouteArea(pathname);

    void fetch("/api/observability/client-trace", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify({
        event: "frontend.route_view",
        pathname,
        routeArea,
        correlationId,
      }),
      keepalive: true,
    }).catch(() => {
      // noop: avoid client-observability recursion.
    });
  }, [pathname]);

  return null;
};
