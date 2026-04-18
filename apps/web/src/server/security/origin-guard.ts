import { headers } from "next/headers";
import { getWebEnv } from "@/lib/env";
import { ensureTraceContext } from "@/server/observability/trace-context";

const toOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const isTrustedActionOrigin = async () => {
  const requestHeaders = await headers();
  ensureTraceContext(requestHeaders);
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const env = getWebEnv();

  if (!origin || !host) {
    return false;
  }

  const requestOrigin = toOrigin(origin);
  const hostOrigin = toOrigin(`${proto}://${host}`);
  const siteOrigin = env.NEXT_PUBLIC_SITE_URL ? toOrigin(env.NEXT_PUBLIC_SITE_URL) : null;

  if (!requestOrigin || !hostOrigin) {
    return false;
  }

  if (requestOrigin === hostOrigin) {
    return true;
  }

  if (siteOrigin && requestOrigin === siteOrigin) {
    return true;
  }

  return false;
};
