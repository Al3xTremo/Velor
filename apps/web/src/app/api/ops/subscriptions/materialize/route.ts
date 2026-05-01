import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSecretEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { materializeDueSubscriptionRules } from "@/server/repositories/subscriptions-repository";
import { logSecurityEvent } from "@/server/security/audit-log";

const payloadSchema = z.object({
  runOn: z.string().date().optional(),
});

const unauthorizedResponse = () => {
  return NextResponse.json(
    {
      ok: false,
      error: "unauthorized",
    },
    { status: 401 }
  );
};

const getBearerToken = (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
};

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  const env = getServerSecretEnv();
  const expectedSecret = env.SUBSCRIPTION_MATERIALIZATION_CRON_SECRET ?? null;

  if (!expectedSecret) {
    logSecurityEvent({
      event: "ops.subscriptions.materialize.misconfigured",
      severity: "warn",
      details: {
        reason: "missing_cron_secret",
      },
    });
    return NextResponse.json(
      {
        ok: false,
        error: "misconfigured",
      },
      { status: 503 }
    );
  }

  const token = getBearerToken(request);
  if (!token || token !== expectedSecret) {
    logSecurityEvent({
      event: "ops.subscriptions.materialize.unauthorized",
      severity: "warn",
      details: {
        hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
      },
    });
    return unauthorizedResponse();
  }

  const rawPayload = await request.text();
  let payload: unknown = {};

  if (rawPayload.trim().length > 0) {
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_payload",
        },
        { status: 400 }
      );
    }
  }

  const parsedPayload = payloadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_payload",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const materializationInput = parsedPayload.data.runOn
      ? { runDate: parsedPayload.data.runOn }
      : {};

    const result = await materializeDueSubscriptionRules(supabase, materializationInput);

    if (result.error || !result.data) {
      logSecurityEvent({
        event: "ops.subscriptions.materialize.failed",
        severity: "warn",
        details: {
          reason: result.error?.message ?? "unknown_error",
        },
      });
      return NextResponse.json(
        {
          ok: false,
          error: "materialization_failed",
        },
        { status: 500 }
      );
    }

    logSecurityEvent({
      event: "ops.subscriptions.materialize.success",
      details: {
        runDate: result.data.runDate,
        processedRules: result.data.processedRules,
        dueOccurrences: result.data.dueOccurrences,
        createdTransactions: result.data.createdTransactions,
        skippedDuplicates: result.data.skippedDuplicates,
      },
    });

    return NextResponse.json({
      ok: true,
      summary: result.data,
    });
  } catch (error) {
    logSecurityEvent({
      event: "ops.subscriptions.materialize.unexpected_error",
      severity: "warn",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: "unexpected_error",
      },
      { status: 500 }
    );
  }
};
