import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

const getArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

const repoArg = getArg("--repo");
const jsonOutArg = getArg("--json-out");

const expectedChecks = {
  main: ["CI / validate-quality", "CI / critical-e2e", "DB RLS Integration / db-rls-check"],
  beta: ["CI / validate-quality", "CI / critical-e2e", "DB RLS Integration / db-rls-check"],
  release_pattern: [
    "CI / validate-quality",
    "CI / critical-e2e",
    "DB RLS Integration / db-rls-check",
  ],
};

const run = (command) => {
  return execSync(command, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
};

const runGhApiJson = (endpoint) => {
  const escapedEndpoint = endpoint.replaceAll('"', '\\"');
  const raw = run(`gh api "${escapedEndpoint}"`);
  return JSON.parse(raw);
};

const inferRepo = () => {
  if (repoArg) {
    return repoArg;
  }

  const fromGh = run("gh repo view --json nameWithOwner --jq .nameWithOwner");
  if (fromGh) {
    return fromGh;
  }

  throw new Error("Could not infer repo. Pass --repo owner/name.");
};

const compareChecks = (expected, actual) => {
  const missing = expected.filter((context) => !actual.includes(context));
  const extras = actual.filter((context) => !expected.includes(context));
  return {
    missing,
    extras,
    ok: missing.length === 0,
  };
};

const extractBranchContexts = (protectionResponse) => {
  const contexts = protectionResponse?.required_status_checks?.contexts;
  if (!Array.isArray(contexts)) {
    return [];
  }

  return contexts.filter((value) => typeof value === "string");
};

const extractRuleSetContexts = (ruleset) => {
  const rules = Array.isArray(ruleset?.rules) ? ruleset.rules : [];
  const requiredStatusRule = rules.find((rule) => rule?.type === "required_status_checks");
  const checks = requiredStatusRule?.parameters?.required_status_checks;

  if (!Array.isArray(checks)) {
    return [];
  }

  return checks.map((item) => item?.context).filter((value) => typeof value === "string");
};

const isReleaseRuleset = (ruleset) => {
  const include = ruleset?.conditions?.ref_name?.include;
  if (!Array.isArray(include)) {
    return false;
  }

  return include.some(
    (value) => typeof value === "string" && value.includes("refs/heads/release/")
  );
};

const main = () => {
  const repo = inferRepo();

  const report = {
    generatedAt: new Date().toISOString(),
    repo,
    expectedChecks,
    results: {
      main: null,
      beta: null,
      release_pattern: null,
    },
    overallOk: false,
    notes: [],
  };

  for (const branch of ["main", "beta"]) {
    try {
      const protection = runGhApiJson(`repos/${repo}/branches/${branch}/protection`);
      const actualChecks = extractBranchContexts(protection);
      const diff = compareChecks(expectedChecks[branch], actualChecks);
      report.results[branch] = {
        branch,
        configured: true,
        actualChecks,
        ...diff,
      };
    } catch (error) {
      report.results[branch] = {
        branch,
        configured: false,
        actualChecks: [],
        missing: [...expectedChecks[branch]],
        extras: [],
        ok: false,
        error: error instanceof Error ? error.message : "unknown_error",
      };
      report.notes.push(`Failed to read branch protection for ${branch}.`);
    }
  }

  try {
    const rulesets = runGhApiJson(`repos/${repo}/rulesets`);
    const allRulesets = Array.isArray(rulesets) ? rulesets : [];
    const releaseRulesets = allRulesets.filter(
      (ruleset) => ruleset?.target === "branch" && isReleaseRuleset(ruleset)
    );

    if (releaseRulesets.length === 0) {
      report.results.release_pattern = {
        configured: false,
        rulesetName: null,
        actualChecks: [],
        missing: [...expectedChecks.release_pattern],
        extras: [],
        ok: false,
        error: "No branch ruleset found for refs/heads/release/*",
      };
    } else {
      const selected = releaseRulesets[0];
      const actualChecks = extractRuleSetContexts(selected);
      const diff = compareChecks(expectedChecks.release_pattern, actualChecks);
      report.results.release_pattern = {
        configured: true,
        rulesetName: selected?.name ?? null,
        actualChecks,
        ...diff,
      };
    }
  } catch (error) {
    report.results.release_pattern = {
      configured: false,
      rulesetName: null,
      actualChecks: [],
      missing: [...expectedChecks.release_pattern],
      extras: [],
      ok: false,
      error: error instanceof Error ? error.message : "unknown_error",
    };
    report.notes.push("Failed to read repository rulesets for release/* policy.");
  }

  const allResults = Object.values(report.results).filter(Boolean);
  report.overallOk = allResults.every((entry) => entry.ok === true);

  console.log(`Branch protection audit for ${repo}`);
  for (const [key, value] of Object.entries(report.results)) {
    if (!value) {
      continue;
    }

    console.log(`\n[${key}] configured=${value.configured} ok=${value.ok}`);
    if (value.rulesetName) {
      console.log(`ruleset=${value.rulesetName}`);
    }
    console.log(`actual: ${value.actualChecks.join(", ") || "<none>"}`);
    console.log(`missing: ${value.missing.join(", ") || "<none>"}`);
    console.log(`extras: ${value.extras.join(", ") || "<none>"}`);
    if (value.error) {
      console.log(`error: ${value.error}`);
    }
  }

  if (jsonOutArg) {
    const outPath = path.resolve(process.cwd(), jsonOutArg);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`\nReport written to ${outPath}`);
  }

  if (!report.overallOk) {
    process.exit(1);
  }
};

try {
  main();
} catch (error) {
  console.error(
    `branch protection audit failed: ${error instanceof Error ? error.message : "unknown_error"}`
  );
  process.exit(1);
}
