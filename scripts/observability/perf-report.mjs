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
const prefixArg = getArg("--prefix");

if (!fileArg) {
  console.error(
    "Usage: node scripts/observability/perf-report.mjs --file <log.ndjson> [--prefix <eventPrefix>]"
  );
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), fileArg);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const metricsByEvent = new Map();

const pushMetric = (event, value) => {
  const list = metricsByEvent.get(event) ?? [];
  list.push(value);
  metricsByEvent.set(event, list);
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
    const value = Number(raw);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
};

const run = async () => {
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

    if (typeof payload?.event !== "string") {
      continue;
    }

    if (prefixArg && !payload.event.startsWith(prefixArg)) {
      continue;
    }

    const duration = parseDuration(payload.meta);
    if (duration === null) {
      continue;
    }

    pushMetric(payload.event, duration);
  }

  if (metricsByEvent.size === 0) {
    console.log("No performance events with durationMs found.");
    return;
  }

  const rows = Array.from(metricsByEvent.entries())
    .map(([event, samples]) => {
      const sorted = [...samples].sort((a, b) => a - b);
      const p50 = percentile(sorted, 50);
      const p95 = percentile(sorted, 95);
      const p99 = percentile(sorted, 99);
      return {
        event,
        count: sorted.length,
        p50: p50 === null ? "-" : p50.toFixed(2),
        p95: p95 === null ? "-" : p95.toFixed(2),
        p99: p99 === null ? "-" : p99.toFixed(2),
        max: sorted[sorted.length - 1].toFixed(2),
      };
    })
    .sort((a, b) => a.event.localeCompare(b.event));

  console.table(rows);
};

void run();
