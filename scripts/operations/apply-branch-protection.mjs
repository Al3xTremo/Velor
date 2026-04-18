import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);

const getArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

const expectedChecks = [
  "CI / validate-quality",
  "CI / critical-e2e",
  "DB RLS Integration / db-rls-check",
];

const rulesetName = "Velor Release Branch Protection";

const run = (command) => {
  return execSync(command, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
};

const runJson = (command) => {
  const raw = run(command);
  return JSON.parse(raw);
};

const inferRepo = () => {
  const explicit = getArg("--repo");
  if (explicit) {
    return explicit;
  }

  return run("gh repo view --json nameWithOwner --jq .nameWithOwner");
};

const writeTempJson = (payload) => {
  const tmpFile = path.join(os.tmpdir(), `velor-branch-protection-${Date.now()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), "utf8");
  return tmpFile;
};

const ghApiWithInput = (method, endpoint, payload) => {
  const tmpFile = writeTempJson(payload);
  try {
    return run(`gh api -X ${method} "${endpoint}" --input "${tmpFile}"`);
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // ignore cleanup error
    }
  }
};

const branchProtectionPayload = {
  required_status_checks: {
    strict: true,
    contexts: expectedChecks,
  },
  enforce_admins: true,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: false,
    required_approving_review_count: 1,
    require_last_push_approval: false,
  },
  restrictions: null,
  required_linear_history: false,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: true,
  lock_branch: false,
  allow_fork_syncing: false,
};

const releaseRulesetPayload = {
  name: rulesetName,
  target: "branch",
  enforcement: "active",
  conditions: {
    ref_name: {
      include: ["refs/heads/release/*"],
      exclude: [],
    },
  },
  rules: [
    {
      type: "required_status_checks",
      parameters: {
        strict_required_status_checks_policy: true,
        required_status_checks: expectedChecks.map((context) => ({
          context,
          integration_id: null,
        })),
      },
    },
    {
      type: "pull_request",
      parameters: {
        required_approving_review_count: 1,
        dismiss_stale_reviews_on_push: true,
        require_code_owner_review: false,
        require_last_push_approval: false,
        required_review_thread_resolution: true,
      },
    },
    {
      type: "non_fast_forward",
    },
    {
      type: "deletion",
    },
  ],
};

const assertBranchExists = (repo, branch) => {
  run(`gh api "repos/${repo}/branches/${branch}"`);
};

const assertRulesetCapability = (repo) => {
  try {
    run(`gh api "repos/${repo}/rulesets"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    if (message.includes("HTTP 403")) {
      throw new Error("rulesets_feature_unavailable_or_forbidden_http_403");
    }
    throw error;
  }
};

const main = () => {
  const repo = inferRepo();

  console.log(`Applying branch protection to ${repo}`);

  const repoInfo = runJson(`gh api "repos/${repo}"`);
  const hasAdmin = Boolean(repoInfo?.permissions?.admin);
  if (!hasAdmin) {
    throw new Error("admin_permission_required_for_branch_protection");
  }

  assertRulesetCapability(repo);

  assertBranchExists(repo, "main");
  assertBranchExists(repo, "beta");

  ghApiWithInput("PUT", `repos/${repo}/branches/main/protection`, branchProtectionPayload);
  console.log("- main branch protection applied");

  ghApiWithInput("PUT", `repos/${repo}/branches/beta/protection`, branchProtectionPayload);
  console.log("- beta branch protection applied");

  const rulesets = runJson(`gh api "repos/${repo}/rulesets"`);
  const existing = (Array.isArray(rulesets) ? rulesets : []).find(
    (item) => item?.name === rulesetName && item?.target === "branch"
  );

  if (existing?.id) {
    ghApiWithInput("PUT", `repos/${repo}/rulesets/${existing.id}`, releaseRulesetPayload);
    console.log(`- release ruleset updated (${existing.id})`);
  } else {
    ghApiWithInput("POST", `repos/${repo}/rulesets`, releaseRulesetPayload);
    console.log("- release ruleset created");
  }

  console.log("Branch protection/rulesets apply completed.");
};

try {
  main();
} catch (error) {
  console.error(
    `apply branch protection failed: ${error instanceof Error ? error.message : "unknown_error"}`
  );
  process.exit(1);
}
