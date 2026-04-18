import { logEvent } from "@/server/observability/logger";

export class ExpectedActionError extends Error {
  public readonly userMessage: string;

  constructor(userMessage: string, message?: string) {
    super(message ?? userMessage);
    this.userMessage = userMessage;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const isNextNavigationError = (error: unknown) => {
  if (!isObject(error)) {
    return false;
  }

  const digest = typeof error["digest"] === "string" ? error["digest"] : "";
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
};

export const normalizeErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "unknown_error";
};

export const reportExpectedError = (event: string, scope: string, error: unknown) => {
  logEvent({
    level: "warn",
    event,
    scope,
    expected: true,
    message: normalizeErrorMessage(error),
  });
};

export const reportUnexpectedError = (
  event: string,
  scope: string,
  error: unknown,
  meta?: Record<string, string | number | boolean | null | undefined>
) => {
  logEvent({
    level: "error",
    event,
    scope,
    expected: false,
    message: normalizeErrorMessage(error),
    ...(meta ? { meta } : {}),
  });
};
