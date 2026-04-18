import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const args = process.argv.slice(2);

const getArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

const fileArg = getArg("--file");
const jsonOutArg = getArg("--json-out");
const failOnArg = getArg("--fail-on") ?? "hard";
const windowMinutesArg = Number(getArg("--window-minutes") ?? "15");
const profileArg = getArg("--profile") ?? "beta";

if (!fileArg) {
  console.error(
    "Usage: node scripts/observability/slo-check.mjs --file <observability.ndjson> [--json-out <report.json>] [--fail-on never|warning|hard] [--window-minutes 15] [--profile local|beta|staging]"
  );
  process.exit(1);
}

if (!Number.isFinite(windowMinutesArg) || windowMinutesArg < 5 || windowMinutesArg > 120) {
  console.error("Invalid --window-minutes. Expected value between 5 and 120.");
  process.exit(1);
}

if (!["never", "warning", "hard"].includes(failOnArg)) {
  console.error("Invalid --fail-on value. Expected never|warning|hard.");
  process.exit(1);
}

if (!["local", "beta", "staging"].includes(profileArg)) {
  console.error("Invalid --profile value. Expected local|beta|staging.");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), fileArg);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const windowMs = windowMinutesArg * 60 * 1000;

const latencyMetrics = [
  {
    id: "dashboard_read",
    events: ["dashboard.page.load", "dashboard.repository.fetch"],
    p95Target: 900,
    p99Target: 1400,
    minSamples: 20,
    enforcement: "enforced",
  },
  {
    id: "transactions_read",
    events: ["transactions.page.load", "transactions.repository.list_page"],
    p95Target: 850,
    p99Target: 1300,
    minSamples: 20,
    enforcement: "enforced",
  },
  {
    id: "analytics_read",
    events: ["analytics.page.load", "analytics.repository.fetch"],
    p95Target: 1100,
    p99Target: 1700,
    minSamples: 16,
    enforcement: "enforced",
  },
  {
    id: "auth_sign_in",
    events: ["auth.repository.sign_in"],
    p95Target: 650,
    p99Target: null,
    minSamples: 10,
    enforcement: "observational",
  },
  {
    id: "auth_sign_up",
    events: ["auth.repository.sign_up"],
    p95Target: 850,
    p99Target: null,
    minSamples: 8,
    enforcement: "observational",
  },
];

const errorRateDomains = [
  { id: "auth", enforcement: "enforced" },
  { id: "transactions", enforcement: "enforced" },
  { id: "dashboard", enforcement: "enforced" },
  { id: "analytics", enforcement: "enforced" },
  { id: "budgets", enforcement: "observational" },
  { id: "goals", enforcement: "observational" },
];

const severityRank = {
  ok: 0,
  info: 0,
  warning: 1,
  hard: 2,
};

const maxSeverity = (a, b) => {
  return severityRank[b] > severityRank[a] ? b : a;
};

const percentile = (sortedValues, p) => {
  if (sortedValues.length === 0) {
    return null;
  }

  const rank = Math.ceil((p / 100) * sortedValues.length) - 1;
  const index = Math.max(0, Math.min(sortedValues.length - 1, rank));
  return sortedValues[index];
};

const parseDuration = (meta) => {
  const raw = meta?.durationMs;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const parseTimestamp = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const startOfWindow = (ts) => {
  return Math.floor(ts / windowMs) * windowMs;
};

const metricByEvent = new Map();
for (const metric of latencyMetrics) {
  for (const event of metric.events) {
    metricByEvent.set(event, metric.id);
  }
}

const latencySamples = new Map();
const domainTotals = new Map();
const domainErrors = new Map();

const pushWindowValue = (bucket, key, value) => {
  const existing = bucket.get(key) ?? [];
  existing.push(value);
  bucket.set(key, existing);
};

const incrementWindow = (bucket, key) => {
  bucket.set(key, (bucket.get(key) ?? 0) + 1);
};

const domainFromEvent = (event) => {
  if (typeof event !== "string") {
    return null;
  }

  const first = event.split(".")[0];
  return errorRateDomains.some((domain) => domain.id === first) ? first : null;
};

const run = async () => {
  let totalObservabilityEvents = 0;

  const reader = readline.createInterface({
    input: fs.createReadStream(filePath, "utf8"),
    crlfDelay: Infinity,
  });

  for await (const line of reader) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) {
      continue;
    }

    let payload;
    try {
      payload = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (payload?.kind !== "observability") {
      continue;
    }

    totalObservabilityEvents += 1;

    const ts = parseTimestamp(payload.ts);
    if (ts === null) {
      continue;
    }

    const windowStart = startOfWindow(ts);

    if (payload.scope === "performance") {
      const metricId = metricByEvent.get(payload.event);
      const duration = parseDuration(payload.meta);

      if (metricId && duration !== null) {
        const key = `${metricId}:${windowStart}`;
        pushWindowValue(latencySamples, key, duration);
      }
    }

    const domain = domainFromEvent(payload.event);
    if (domain) {
      const key = `${domain}:${windowStart}`;
      incrementWindow(domainTotals, key);

      if (payload.level === "error" && payload.expected === false) {
        incrementWindow(domainErrors, key);
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    windowMinutes: windowMinutesArg,
    profile: profileArg,
    latency: [],
    errorRate: [],
    dataQuality: {
      totalObservabilityEvents: 0,
      insufficientChecks: [],
    },
    summary: {
      severity: "ok",
      warnings: 0,
      hardBreaches: 0,
    },
  };

  let overallSeverity = "ok";
  const insufficientEnforcedLatency = [];
  const insufficientEnforcedErrors = [];

  for (const metric of latencyMetrics) {
    const matchingKeys = Array.from(latencySamples.keys())
      .filter((key) => key.startsWith(`${metric.id}:`))
      .sort((a, b) => Number(a.split(":")[1]) - Number(b.split(":")[1]));

    let consecutiveBreaches = 0;
    let metricSeverity = "ok";
    const windows = [];

    for (const key of matchingKeys) {
      const windowStart = Number(key.split(":")[1]);
      const samples = [...(latencySamples.get(key) ?? [])].sort((a, b) => a - b);

      if (samples.length < metric.minSamples) {
        windows.push({
          windowStart,
          samples: samples.length,
          status: "insufficient_samples",
        });
        continue;
      }

      const p95 = percentile(samples, 95);
      const p99 = percentile(samples, 99);
      const p95Breached = p95 !== null && p95 > metric.p95Target;
      const p99Breached =
        metric.p99Target !== null && p99 !== null ? p99 > metric.p99Target : false;
      const breached = p95Breached || p99Breached;

      let windowSeverity = "ok";
      if (breached) {
        consecutiveBreaches += 1;
        windowSeverity = "warning";
      } else {
        consecutiveBreaches = 0;
      }

      const severeP95 = p95 !== null && p95 > metric.p95Target * 1.4;
      const severeP99 = metric.p99Target !== null && p99 !== null && p99 > metric.p99Target * 1.4;

      if ((consecutiveBreaches >= 2 && breached) || severeP95 || severeP99) {
        windowSeverity = "hard";
      }

      metricSeverity = maxSeverity(metricSeverity, windowSeverity);

      windows.push({
        windowStart,
        samples: samples.length,
        p95,
        p99,
        p95Target: metric.p95Target,
        p99Target: metric.p99Target,
        status: breached ? "breach" : "ok",
        severity: windowSeverity,
      });
    }

    const allSamples = matchingKeys.flatMap((key) => latencySamples.get(key) ?? []);
    const sortedAll = [...allSamples].sort((a, b) => a - b);

    report.latency.push({
      metricId: metric.id,
      events: metric.events,
      enforcement: metric.enforcement,
      samples: sortedAll.length,
      p95: percentile(sortedAll, 95),
      p99: percentile(sortedAll, 99),
      p95Target: metric.p95Target,
      p99Target: metric.p99Target,
      severity: metricSeverity,
      windows,
    });

    const evaluatedWindows = windows.filter((window) => window.status !== "insufficient_samples");
    if (
      profileArg !== "local" &&
      metric.enforcement === "enforced" &&
      evaluatedWindows.length === 0
    ) {
      insufficientEnforcedLatency.push(metric.id);
      report.dataQuality.insufficientChecks.push({
        kind: "latency",
        target: metric.id,
        reason: "no_window_with_min_samples",
      });
    }

    overallSeverity = maxSeverity(overallSeverity, metricSeverity);
  }

  for (const domain of errorRateDomains) {
    const keys = Array.from(domainTotals.keys())
      .filter((key) => key.startsWith(`${domain.id}:`))
      .sort((a, b) => Number(a.split(":")[1]) - Number(b.split(":")[1]));

    let domainSeverity = "ok";
    let consecutiveBreaches = 0;
    const windows = [];

    for (const key of keys) {
      const windowStart = Number(key.split(":")[1]);
      const total = domainTotals.get(key) ?? 0;
      const errors = domainErrors.get(key) ?? 0;
      const ratio = total > 0 ? (errors / total) * 100 : 0;

      if (total < 20) {
        windows.push({
          windowStart,
          total,
          errors,
          ratio,
          status: "insufficient_samples",
        });
        continue;
      }

      const breached = ratio > 3;
      let windowSeverity = "ok";
      if (breached) {
        windowSeverity = "warning";
        consecutiveBreaches += 1;
      } else {
        consecutiveBreaches = 0;
      }

      if (ratio > 8 || (breached && consecutiveBreaches >= 2)) {
        windowSeverity = "hard";
      }

      domainSeverity = maxSeverity(domainSeverity, windowSeverity);

      windows.push({
        windowStart,
        total,
        errors,
        ratio,
        status: breached ? "breach" : "ok",
        severity: windowSeverity,
      });
    }

    report.errorRate.push({
      domain: domain.id,
      enforcement: domain.enforcement,
      severity: domainSeverity,
      windows,
    });

    const evaluatedWindows = windows.filter((window) => window.status !== "insufficient_samples");
    if (
      profileArg !== "local" &&
      domain.enforcement === "enforced" &&
      evaluatedWindows.length === 0
    ) {
      insufficientEnforcedErrors.push(domain.id);
      report.dataQuality.insufficientChecks.push({
        kind: "error_rate",
        target: domain.id,
        reason: "no_window_with_min_samples",
      });
    }

    overallSeverity = maxSeverity(overallSeverity, domainSeverity);
  }

  if (profileArg !== "local") {
    if (totalObservabilityEvents === 0) {
      overallSeverity = maxSeverity(overallSeverity, "hard");
      report.dataQuality.insufficientChecks.push({
        kind: "telemetry",
        target: "observability_stream",
        reason: "no_observability_events",
      });
    } else {
      if (insufficientEnforcedLatency.length === 3) {
        overallSeverity = maxSeverity(overallSeverity, "hard");
      } else if (insufficientEnforcedLatency.length > 0 || insufficientEnforcedErrors.length > 0) {
        overallSeverity = maxSeverity(overallSeverity, "warning");
      }
    }
  }

  report.summary.severity = overallSeverity;
  report.dataQuality.totalObservabilityEvents = totalObservabilityEvents;
  report.summary.warnings =
    report.latency.filter((metric) => metric.severity === "warning").length +
    report.errorRate.filter((domain) => domain.severity === "warning").length;
  report.summary.hardBreaches =
    report.latency.filter((metric) => metric.severity === "hard").length +
    report.errorRate.filter((domain) => domain.severity === "hard").length;

  const latencyRows = report.latency.map((metric) => ({
    metric: metric.metricId,
    samples: metric.samples,
    p95: metric.p95 === null ? "-" : metric.p95.toFixed(2),
    p99: metric.p99 === null ? "-" : metric.p99.toFixed(2),
    p95Target: metric.p95Target,
    p99Target: metric.p99Target ?? "-",
    severity: metric.severity,
  }));

  const errorRows = report.errorRate.map((domain) => {
    const evaluated = domain.windows.filter((w) => w.status !== "insufficient_samples");
    const last = evaluated[evaluated.length - 1];

    return {
      domain: domain.domain,
      windows: domain.windows.length,
      lastRatioPct: last ? last.ratio.toFixed(2) : "-",
      severity: domain.severity,
    };
  });

  console.log("\nSLO latency summary");
  console.table(latencyRows);

  console.log("\nUnexpected error-rate summary");
  console.table(errorRows);

  if (report.dataQuality.insufficientChecks.length > 0) {
    console.log("\nData quality / insufficient samples");
    console.table(report.dataQuality.insufficientChecks);
  }

  console.log(`\nOverall severity: ${report.summary.severity}`);

  if (jsonOutArg) {
    const jsonPath = path.resolve(process.cwd(), jsonOutArg);
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`Report written to ${jsonPath}`);
  }

  if (failOnArg === "warning" && report.summary.severity !== "ok") {
    process.exit(1);
  }

  if (failOnArg === "hard" && report.summary.severity === "hard") {
    process.exit(1);
  }
};

void run();
