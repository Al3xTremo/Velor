import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  path.join(root, "packages", "core", "src"),
  path.join(root, "packages", "contracts", "src"),
];

const forbidden = [
  'from "next',
  "from 'next",
  'from "react',
  "from 'react",
  'from "@/',
  "from '@/",
  "@supabase/",
];

const failures = [];

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!fullPath.endsWith(".ts") && !fullPath.endsWith(".tsx")) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    for (const pattern of forbidden) {
      if (content.includes(pattern)) {
        failures.push(`${path.relative(root, fullPath)} contains forbidden pattern: ${pattern}`);
      }
    }
  }
};

for (const target of targets) {
  if (fs.existsSync(target)) {
    walk(target);
  }
}

if (failures.length > 0) {
  console.error("Shared layer boundary check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Shared layer boundary check passed.");
