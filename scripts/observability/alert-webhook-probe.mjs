const primaryWebhook = process.env["OBS_ALERT_WEBHOOK_URL"];
const secondaryWebhook = process.env["OBS_ALERT_HEALTH_WEBHOOK_URL"];
const targetEnv = process.env["OBS_ALERT_ENV"] ?? process.env["NODE_ENV"] ?? "development";

if (!primaryWebhook && !secondaryWebhook) {
  console.error(
    "[alert-probe] at least one channel is required: OBS_ALERT_WEBHOOK_URL or OBS_ALERT_HEALTH_WEBHOOK_URL."
  );
  process.exit(1);
}

const probeId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sendProbe = async (channelName, webhook) => {
  if (!webhook) {
    return {
      configured: false,
      delivered: false,
      error: null,
    };
  }

  const payload = {
    text: `[VELOR ALERT PROBE][${targetEnv}] channel=${channelName} probe_id=${probeId} (connectivity check)`,
    alertingHealthProbe: {
      kind: "alerting_health_probe",
      channel: channelName,
      probeId,
      env: targetEnv,
      generatedAt: new Date().toISOString(),
    },
  };

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        configured: true,
        delivered: false,
        error: `status_${response.status}`,
      };
    }

    return {
      configured: true,
      delivered: true,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      delivered: false,
      error: error instanceof Error ? error.message : "unknown_error",
    };
  }
};

const primaryResult = await sendProbe("primary", primaryWebhook);
const secondaryResult = await sendProbe("secondary", secondaryWebhook);

console.log(
  `[alert-probe] probe_id=${probeId} primary=${primaryResult.configured ? (primaryResult.delivered ? "ok" : `failed:${primaryResult.error}`) : "not_configured"} secondary=${secondaryResult.configured ? (secondaryResult.delivered ? "ok" : `failed:${secondaryResult.error}`) : "not_configured"}`
);

if (!primaryResult.delivered && !secondaryResult.delivered) {
  console.error("[alert-probe] all configured channels failed.");
  process.exit(1);
}

if (primaryResult.configured && !primaryResult.delivered) {
  console.error("[alert-probe] degraded: primary channel unavailable.");
  process.exit(1);
}

if (secondaryResult.configured && !secondaryResult.delivered) {
  console.warn("[alert-probe] degraded: secondary health channel unavailable.");
}
