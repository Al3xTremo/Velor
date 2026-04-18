import { logEvent } from "@/server/observability/logger";

type SecuritySeverity = "info" | "warn";

interface SecurityLogInput {
  event: string;
  severity?: SecuritySeverity;
  actorUserId?: string;
  fingerprint?: string;
  details?: Record<string, string | number | boolean | null | undefined>;
}

const redactDetails = (details?: Record<string, string | number | boolean | null | undefined>) => {
  if (!details) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => {
      if (key.toLowerCase().includes("password") || key.toLowerCase().includes("token")) {
        return [key, "[redacted]"];
      }

      return [key, value ?? null];
    })
  );
};

export const logSecurityEvent = (input: SecurityLogInput) => {
  logEvent({
    level: input.severity === "warn" ? "warn" : "info",
    event: input.event,
    scope: "security",
    expected: input.severity !== "warn",
    meta: {
      actorUserId: input.actorUserId ?? null,
      fingerprint: input.fingerprint ?? null,
      ...redactDetails(input.details),
    },
  });
};
