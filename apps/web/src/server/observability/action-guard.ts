import { isNextNavigationError, reportUnexpectedError } from "@/server/observability/errors";

export const guardUnexpectedActionError = <T>(event: string, scope: string, fallback: T) => {
  return (error: unknown): T => {
    if (isNextNavigationError(error)) {
      throw error;
    }

    reportUnexpectedError(event, scope, error);
    return fallback;
  };
};
