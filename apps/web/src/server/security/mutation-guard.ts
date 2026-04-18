import { rateLimit } from "@/server/security/rate-limit";

export const guardUserMutation = (userId: string, scope: string) => {
  return rateLimit(`mutation:${scope}:${userId}`, {
    limit: 40,
    windowMs: 60 * 1000,
    policy: {
      operation: `mutation.${scope}`,
      sensitivity: "data_mutation",
    },
  });
};
