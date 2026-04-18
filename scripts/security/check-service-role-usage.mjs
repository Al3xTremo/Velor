import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();

const scanFileExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".sql",
  ".yml",
  ".yaml",
  ".json",
  ".sh",
]);

const skipDirs = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "tmp",
  ".turbo",
  ".pnpm-store",
]);

const serviceRoleAllowedPaths = [
  ".env.example",
  "apps/web/src/lib/env.ts",
  "apps/web/src/lib/supabase/admin.ts",
  "packages/config/src/env.ts",
  "scripts/security/check-service-role-usage.mjs",
  "scripts/testing/prepare-e2e-env.mjs",
  "scripts/testing/run-db-integration-tests.mjs",
  "apps/web/scripts/run-rls-cross-user-drill.mjs",
];

const serviceRoleAllowedPathPrefixes = ["supabase/migrations/", "supabase/tests/"];

const serviceRoleReferencePattern = /\bSUPABASE_SERVICE_ROLE_KEY\b|\bservice_role\b/g;

const dangerousLiteralPatterns = [
  {
    id: "supabase_service_role_literal",
    pattern:
      /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!your-|\$\{|<|change-me|example|test_|dummy)[^"'\n]{16,}["']/g,
  },
  {
    id: "supabase_service_secret_literal",
    pattern: /sb_secret_[A-Za-z0-9_\-]{16,}/g,
  },
  {
    id: "hardcoded_webhook_url",
    pattern: /OBS_ALERT_(?:HEALTH_)?WEBHOOK_URL\s*[:=]\s*["']https?:\/\/[^"]+["']/g,
  },
];

const dangerousLiteralAllowedFiles = new Set([".env.example"]);

const publicSecretPattern =
  /NEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|WEBHOOK|TOKEN|PASSWORD|PRIVATE)[A-Z0-9_]*/g;
const publicSecretAllowed = new Set(["NEXT_PUBLIC_SUPABASE_ANON_KEY"]);

const toUnix = (value) => value.replaceAll("\\", "/");

const getTrackedFiles = () => {
  try {
    const output = execSync("git ls-files -z", {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    const files = output
      .split("\u0000")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => toUnix(item));

    if (files.length > 0) {
      return {
        files,
        fromGit: true,
      };
    }
  } catch {
    // fallback below
  }

  const results = [];

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) {
          continue;
        }
        walk(fullPath);
        continue;
      }

      const relative = toUnix(path.relative(rootDir, fullPath));
      results.push(relative);
    }
  };

  walk(rootDir);
  return {
    files: results,
    fromGit: false,
  };
};

const shouldScanFile = (relativePath) => {
  const ext = path.extname(relativePath).toLowerCase();
  if (scanFileExtensions.has(ext)) {
    return true;
  }

  const base = path.basename(relativePath).toLowerCase();
  return base === ".env" || base.startsWith(".env.");
};

const isServiceRoleAllowedPath = (relativePath) => {
  if (serviceRoleAllowedPaths.includes(relativePath)) {
    return true;
  }

  return serviceRoleAllowedPathPrefixes.some((prefix) => relativePath.startsWith(prefix));
};

const readFile = (relativePath) => {
  const absolute = path.join(rootDir, relativePath);
  return fs.readFileSync(absolute, "utf8");
};

const findings = {
  forbiddenServiceRoleRefs: [],
  dangerousLiteralSecrets: [],
  forbiddenPublicSecretNames: [],
};

const tracked = getTrackedFiles();

const shouldSkipInFallback = (relativePath) => {
  if (tracked.fromGit) {
    return false;
  }

  const normalized = relativePath.toLowerCase();
  if (normalized === ".env.local" || normalized === "apps/web/.env.local") {
    return true;
  }

  if (normalized === "apps/web/.env.e2e.local") {
    return true;
  }

  if (normalized.startsWith("tmp/")) {
    return true;
  }

  return false;
};

const files = tracked.files.filter((relativePath) => {
  if (shouldSkipInFallback(relativePath)) {
    return false;
  }

  return shouldScanFile(relativePath);
});

for (const relativePath of files) {
  let content;
  try {
    content = readFile(relativePath);
  } catch {
    continue;
  }

  if (!isServiceRoleAllowedPath(relativePath)) {
    const matches = content.match(serviceRoleReferencePattern);
    if (matches?.length) {
      findings.forbiddenServiceRoleRefs.push(relativePath);
    }
  }

  const isTestFile = /(?:\.test\.|\.spec\.|__tests__)/.test(relativePath);

  if (!dangerousLiteralAllowedFiles.has(relativePath)) {
    for (const rule of dangerousLiteralPatterns) {
      if (rule.id === "hardcoded_webhook_url" && isTestFile) {
        continue;
      }
      const matches = content.match(rule.pattern);
      if (matches?.length) {
        findings.dangerousLiteralSecrets.push({
          file: relativePath,
          rule: rule.id,
          sample: matches[0],
        });
      }
    }
  }

  const publicSecretMatches = content.match(publicSecretPattern) ?? [];
  const violations = Array.from(new Set(publicSecretMatches)).filter(
    (value) => !publicSecretAllowed.has(value)
  );
  if (violations.length > 0) {
    findings.forbiddenPublicSecretNames.push({
      file: relativePath,
      names: violations,
    });
  }
}

const hasFindings =
  findings.forbiddenServiceRoleRefs.length > 0 ||
  findings.dangerousLiteralSecrets.length > 0 ||
  findings.forbiddenPublicSecretNames.length > 0;

if (hasFindings) {
  console.error("Security policy violations detected (repo-wide):");

  if (findings.forbiddenServiceRoleRefs.length > 0) {
    console.error("\n- Forbidden service role references outside allowlist:");
    for (const file of findings.forbiddenServiceRoleRefs) {
      console.error(`  - ${file}`);
    }
  }

  if (findings.dangerousLiteralSecrets.length > 0) {
    console.error("\n- Dangerous hardcoded secret patterns:");
    for (const finding of findings.dangerousLiteralSecrets) {
      console.error(`  - ${finding.file} (${finding.rule}) sample=${finding.sample}`);
    }
  }

  if (findings.forbiddenPublicSecretNames.length > 0) {
    console.error("\n- Forbidden NEXT_PUBLIC_* secret-like names:");
    for (const finding of findings.forbiddenPublicSecretNames) {
      console.error(`  - ${finding.file} names=${finding.names.join(", ")}`);
    }
  }

  console.error("\nSee policy: docs/security/service-role-secrets-policy.md");
  process.exit(1);
}

console.log("Service role and secret usage check passed (repo-wide).");
