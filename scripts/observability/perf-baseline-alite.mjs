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
const markdownOutArg = getArg("--markdown-out");
const failOnArg = getArg("--fail-on") ?? "never";

if (!fileArg) {
  console.error(
    "Usage: node scripts/observability/perf-baseline-alite.mjs --file <observability.ndjson> [--json-out <report.json>] [--markdown-out <summary.md>] [--fail-on never|warning]"
  );
  process.exit(1);
}

if (!["never", "warning"].includes(failOnArg)) {
  console.error("Invalid --fail-on value. Expected never|warning.");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), fileArg);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const metrics = [
  {
    id: "dashboard_page_load_p95",
    label: "Dashboard page load p95",
    event: "dashboard.page.load",
    warningMs: 1200,
    minSamples: 20,
  },
  {
    id: "analytics_page_load_p95",
    label: "Analytics page load p95",
    event: "analytics.page.load",
    warningMs: 1400,
    minSamples: 16,
  },
  {
    id: "analytics_repository_fetch_p95",
    label: "Analytics repository fetch p95",
    event: "analytics.repository.fetch",
    warningMs: 850,
    minSamples: 16,
  },
];

const parseDuration = (meta) => {
  const raw = meta?.durationMs;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === "string") {
    const value = Number(raw);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
};

const percentile = (sortedValues, p) => {
  if (sortedValues.length === 0) {
    return null;
  }

  const rank = Math.ceil((p / 100) * sortedValues.length) - 1;
  const index = Math.max(0, Math.min(sortedValues.length - 1, rank));
  return sortedValues[index];
};

const formatMs = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return value.toFixed(2);
};

const toSummaryMarkdown = (report) => {
  const lines = [
    "## Performance Baseline A-lite",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Source: ${report.sourceFile}`,
    `- Status: ${report.summary.status}`,
    `- Metrics in warning: ${report.summary.warningCount}`,
    "",
    "| Metric | Event | Samples | P50 (ms) | P95 (ms) | Max (ms) | Warning if P95 > (ms) | Status |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const metric of report.metrics) {
    lines.push(
      `| ${metric.label} | \`${metric.event}\` | ${metric.samples} | ${formatMs(metric.p50)} | ${formatMs(metric.p95)} | ${formatMs(metric.max)} | ${metric.warningMs} | ${metric.status} |`
    );
  }

  lines.push("");

  if (report.warnings.length === 0) {
    lines.push("No warnings in current baseline.");
  } else {
    lines.push("### Warnings");
    lines.push("");
    for (const warning of report.warnings) {
      lines.push(`- ${warning.message}`);
    }
  }

  return lines.join("\n");
};

const run = async () => {
  const samplesByEvent = new Map(metrics.map((metric) => [metric.event, []]));

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

    if (payload?.kind !== "observability" || payload?.scope !== "performance") {
      continue;
    }

    const bucket = samplesByEvent.get(payload.event);
    if (!bucket) {
      continue;
    }

    const duration = parseDuration(payload.meta);
    if (duration === null) {
      continue;
    }

    bucket.push(duration);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceFile: fileArg,
    metrics: [],
    warnings: [],
    summary: {
      status: "ok",
      warningCount: 0,
    },
  };

  for (const metric of metrics) {
    const samples = [...(samplesByEvent.get(metric.event) ?? [])].sort((a, b) => a - b);
    const p50 = percentile(samples, 50);
    const p95 = percentile(samples, 95);
    const max = samples.length > 0 ? samples[samples.length - 1] : null;

    let status = "ok";

    if (samples.length === 0) {
      status = "warning";
      report.warnings.push({
        metricId: metric.id,
        event: metric.event,
        code: "no_samples",
        message: `${metric.label}: no samples found in observability stream (${metric.event}).`,
      });
    } else if (samples.length < metric.minSamples) {
      status = "warning";
      report.warnings.push({
        metricId: metric.id,
        event: metric.event,
        code: "insufficient_samples",
        message: `${metric.label}: insufficient samples (${samples.length}/${metric.minSamples}).`,
      });
    } else if (p95 !== null && p95 > metric.warningMs) {
      status = "warning";
      report.warnings.push({
        metricId: metric.id,
        event: metric.event,
        code: "p95_warning_threshold_exceeded",
        message: `${metric.label}: p95 ${p95.toFixed(2)}ms exceeds warning threshold ${metric.warningMs}ms.`,
      });
    }

    if (status === "warning") {
      report.summary.status = "warning";
    }

    report.metrics.push({
      id: metric.id,
      label: metric.label,
      event: metric.event,
      samples: samples.length,
      minSamples: metric.minSamples,
      p50,
      p95,
      max,
      warningMs: metric.warningMs,
      status,
    });
  }

  report.summary.warningCount = report.warnings.length;

  const rows = report.metrics.map((metric) => ({
    metric: metric.label,
    event: metric.event,
    samples: metric.samples,
    minSamples: metric.minSamples,
    p50: formatMs(metric.p50),
    p95: formatMs(metric.p95),
    max: formatMs(metric.max),
    p95WarningMs: metric.warningMs,
    status: metric.status,
  }));

  console.log("\nPerformance baseline A-lite");
  console.table(rows);
  console.log(`Overall status: ${report.summary.status}`);

  if (report.warnings.length > 0) {
    console.log("\nWarnings");
    for (const warning of report.warnings) {
      console.log(`- ${warning.message}`);
    }
  }

  if (jsonOutArg) {
    const jsonPath = path.resolve(process.cwd(), jsonOutArg);
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`JSON report written to ${jsonPath}`);
  }

  if (markdownOutArg) {
    const markdownPath = path.resolve(process.cwd(), markdownOutArg);
    fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
    fs.writeFileSync(markdownPath, toSummaryMarkdown(report), "utf8");
    console.log(`Markdown summary written to ${markdownPath}`);
  }

  if (failOnArg === "warning" && report.summary.status === "warning") {
    process.exit(1);
  }
};

void run();
