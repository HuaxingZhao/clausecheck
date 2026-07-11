/**
 * Validate AI review JSON against expert-prompt quality gates.
 *
 * Usage:
 *   npx tsx scripts/validate-review-output.ts tmp/nda-review-full.json
 *
 * Exit codes: 0 = no FAIL issues (WARN allowed); 1 = FAIL or I/O error.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateReviewOutput } from "../lib/ai/validate-review-output";

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npx tsx scripts/validate-review-output.ts <path-to-json>");
    process.exit(1);
  }

  const abs = resolve(process.cwd(), file);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(abs, "utf8"));
  } catch (err) {
    console.error("Failed to read/parse JSON:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const report = validateReviewOutput(raw);
  console.log("=== Review output validation ===");
  console.log("File:", abs);
  console.log("Summary:", report.summary);
  if (!report.issues.length) {
    console.log("Issues: none");
  } else {
    console.log("Issues:");
    for (const issue of report.issues) {
      console.log(`  [${issue.severity}] ${issue.code} ${issue.path || ""} — ${issue.message}`);
    }
  }
  console.log(report.ok ? "RESULT: PASS" : "RESULT: FAIL");
  process.exit(report.exitCode);
}

main();
