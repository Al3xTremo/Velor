import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { ensureTraceContext } from "@/server/observability/trace-context";

const hashValue = (value: string) => {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
};

export const getRequestFingerprint = async () => {
  const requestHeaders = await headers();
  ensureTraceContext(requestHeaders);
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown-ip";
  const userAgent = requestHeaders.get("user-agent") ?? "unknown-agent";

  return hashValue(`${forwardedFor}:${userAgent}`);
};
