import { clearRateLimitKey, rateLimit } from "@/server/security/rate-limit";

const loginLockKey = (fingerprint: string, email: string) => {
  return `auth:login:lock:${fingerprint}:${email.toLowerCase()}`;
};

export const guardAuthAttempt = (
  fingerprint: string,
  action: "login" | "register" | "forgot" | "reset"
) => {
  return rateLimit(`auth:${action}:${fingerprint}`, {
    limit: 12,
    windowMs: 10 * 60 * 1000,
    policy: {
      operation: `auth.${action}`,
      sensitivity: "auth_sensitive",
    },
  });
};

export const guardLoginLock = (fingerprint: string, email: string) => {
  return rateLimit(loginLockKey(fingerprint, email), {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    blockMs: 15 * 60 * 1000,
    policy: {
      operation: "auth.login_lock",
      sensitivity: "auth_sensitive",
    },
  });
};

export const clearLoginLock = (fingerprint: string, email: string) => {
  return clearRateLimitKey(loginLockKey(fingerprint, email));
};
