const TRACE_KEY = "velor_trace_correlation_id";

const TRACE_ROUTE_PREFIXES: Array<{ prefix: string; area: string }> = [
  { prefix: "/auth", area: "auth" },
  { prefix: "/dashboard", area: "dashboard" },
  { prefix: "/transactions", area: "transactions" },
  { prefix: "/onboarding", area: "onboarding" },
];

const randomSuffix = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
};

const generatedCorrelationId = () => {
  return `corr_${randomSuffix()}`;
};

export const getClientCorrelationId = () => {
  if (typeof window === "undefined") {
    return generatedCorrelationId();
  }

  try {
    const existing = window.sessionStorage.getItem(TRACE_KEY);
    if (existing) {
      return existing;
    }

    const created = generatedCorrelationId();
    window.sessionStorage.setItem(TRACE_KEY, created);
    return created;
  } catch {
    return generatedCorrelationId();
  }
};

export const getTraceRouteArea = (pathname: string) => {
  for (const item of TRACE_ROUTE_PREFIXES) {
    if (pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)) {
      return item.area;
    }
  }

  return "other";
};

export const isHighValueTracePath = (pathname: string) => {
  return getTraceRouteArea(pathname) !== "other";
};
