#!/usr/bin/env tsx
/**
 * Local AI / CI pre-check for Jurisdiction Packs.
 * No network — validates structure, patterns, token budget, boilerplate, and tests.
 *
 * Usage:
 *   npm run validate:pack
 *   npm run validate:pack -- --id=sg
 *   npm run validate:pack -- --all
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import {
  getJurisdictionPack,
  listRegisteredPackIds,
  COMMON_LAW_BOILERPLATE,
  BASE_RESERVED_BOILERPLATE_NAMES,
  MAX_PACK_ADDON_TOKENS,
  estimateTokenCount,
  isRegisteredPackId,
} from "../lib/prompts/jurisdiction-packs";

const ROOT = process.cwd();
const PACKS_DIR = path.join(ROOT, "lib/prompts/jurisdiction-packs/packs");
const TESTS_DIR = path.join(ROOT, "tests/packs");

interface Issue {
  level: "FAIL" | "WARN";
  code: string;
  message: string;
  fix: string;
}

function parseIds(argv: string[]): string[] {
  const ids: string[] = [];
  let all = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") all = true;
    if (a === "--id" && argv[i + 1]) ids.push(argv[++i]);
    if (a.startsWith("--id=")) ids.push(a.slice("--id=".length));
  }
  if (all || ids.length === 0) {
    // Validate every .ts pack file that is registered (skip index-like)
    return listRegisteredPackIds();
  }
  return ids.map((id) => id.trim().toLowerCase());
}

function uniqueStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const s of arr) {
    const k = s.toLowerCase().trim();
    if (seen.has(k)) dups.push(s);
    else seen.add(k);
  }
  return dups;
}

function testHasPositiveAndNegative(testSrc: string): {
  positive: boolean;
  negative: boolean;
} {
  const lower = testSrc.toLowerCase();
  const positive =
    /\bpositive\b/.test(lower) ||
    /detects governing-law/.test(lower) ||
    /should match/.test(lower);
  const negative =
    /\bnegative\b/.test(lower) ||
    /does not claim match/.test(lower) ||
    /should not match/.test(lower) ||
    /unrelated/.test(lower);
  return { positive, negative };
}

function validatePackId(id: string): Issue[] {
  const issues: Issue[] = [];

  if (!isRegisteredPackId(id)) {
    issues.push({
      level: "FAIL",
      code: "NOT_REGISTERED",
      message: `Pack "${id}" is not in PACK_FACTORIES`,
      fix: `Run npm run new-pack or add the factory to lib/prompts/jurisdiction-packs/pack-registry.ts`,
    });
    return issues;
  }

  const packFile = path.join(PACKS_DIR, `${id}.ts`);
  if (!existsSync(packFile)) {
    issues.push({
      level: "FAIL",
      code: "MISSING_FILE",
      message: `Expected pack file at ${path.relative(ROOT, packFile)}`,
      fix: `Create packs/${id}.ts or fix the id`,
    });
    return issues;
  }

  let pack;
  try {
    pack = getJurisdictionPack(id, "en");
  } catch (e) {
    issues.push({
      level: "FAIL",
      code: "LOAD_ERROR",
      message: `Failed to load pack: ${e instanceof Error ? e.message : String(e)}`,
      fix: "Fix TypeScript / runtime errors in the pack factory",
    });
    return issues;
  }

  // Interface shape
  if (pack.id !== id) {
    issues.push({
      level: "FAIL",
      code: "ID_MISMATCH",
      message: `pack.id is "${pack.id}" but file/registry id is "${id}"`,
      fix: `Set id: "${id}" in the pack factory return value`,
    });
  }
  if (!pack.displayName?.trim()) {
    issues.push({
      level: "FAIL",
      code: "DISPLAY_NAME",
      message: "displayName is empty",
      fix: 'Set a human-readable displayName, e.g. "Singapore"',
    });
  }
  if (!Array.isArray(pack.governingLawPatterns)) {
    issues.push({
      level: "FAIL",
      code: "PATTERNS_TYPE",
      message: "governingLawPatterns must be a string array",
      fix: "Provide governingLawPatterns: string[]",
    });
  } else {
    if (pack.governingLawPatterns.length === 0) {
      issues.push({
        level: "FAIL",
        code: "PATTERNS_EMPTY",
        message: "governingLawPatterns is empty",
        fix: "Add at least one governing-law phrase variant",
      });
    }
    const emptyPat = pack.governingLawPatterns.filter((p) => !String(p).trim());
    if (emptyPat.length) {
      issues.push({
        level: "FAIL",
        code: "PATTERNS_BLANK",
        message: "governingLawPatterns contains blank entries",
        fix: "Remove empty strings from governingLawPatterns",
      });
    }
    const dups = uniqueStrings(pack.governingLawPatterns.map(String));
    if (dups.length) {
      issues.push({
        level: "FAIL",
        code: "PATTERNS_DUP",
        message: `Duplicate governingLawPatterns: ${dups.join(", ")}`,
        fix: "Keep each pattern unique (case-insensitive)",
      });
    }
  }

  if (!pack.systemPromptAddon?.trim()) {
    issues.push({
      level: "FAIL",
      code: "ADDON_EMPTY",
      message: "systemPromptAddon is empty",
      fix: "Write jurisdiction-specific review instructions",
    });
  } else {
    const tokens = estimateTokenCount(pack.systemPromptAddon);
    if (tokens > MAX_PACK_ADDON_TOKENS) {
      issues.push({
        level: "FAIL",
        code: "ADDON_TOO_LARGE",
        message: `systemPromptAddon ≈ ${tokens} tokens (limit ${MAX_PACK_ADDON_TOKENS})`,
        fix: "Shorten the addon — keep only jurisdiction-specific rules; reuse Base for shared checklist",
      });
    }
  }

  if (!Array.isArray(pack.boilerplateRequirements)) {
    issues.push({
      level: "FAIL",
      code: "BOILERPLATE_TYPE",
      message: "boilerplateRequirements must be a string array",
      fix: "Use boilerplateRequirements: string[] (may be empty)",
    });
  } else {
    const allowedCommon = new Set(
      COMMON_LAW_BOILERPLATE.map((s) => s.toLowerCase())
    );
    const reserved = new Set(
      BASE_RESERVED_BOILERPLATE_NAMES.map((s) => s.toLowerCase())
    );
    for (const b of pack.boilerplateRequirements) {
      const key = String(b).toLowerCase().trim();
      if (!key) {
        issues.push({
          level: "FAIL",
          code: "BOILERPLATE_BLANK",
          message: "boilerplateRequirements contains a blank entry",
          fix: 'Use "Clause Name (legal cite)" or remove the entry',
        });
        continue;
      }
      if (reserved.has(key) && !allowedCommon.has(key)) {
        issues.push({
          level: "FAIL",
          code: "BOILERPLATE_BASE_DUP",
          message: `boilerplateRequirements overlaps Base checklist: "${b}"`,
          fix: "Remove Base 12-category titles; list only jurisdiction-specific mandatory clauses",
        });
      }
    }
    const bpDups = uniqueStrings(pack.boilerplateRequirements.map(String));
    if (bpDups.length) {
      issues.push({
        level: "FAIL",
        code: "BOILERPLATE_DUP",
        message: `Duplicate boilerplateRequirements: ${bpDups.join(", ")}`,
        fix: "Deduplicate the list",
      });
    }
  }

  // Unit test presence + positive/negative
  const testFile = path.join(TESTS_DIR, `${id}.test.ts`);
  const legacyTest = path.join(
    ROOT,
    "lib/prompts/jurisdiction-packs/jurisdiction-packs.test.ts"
  );
  const isBuiltin = ["cn", "us-ca", "us-ny", "uk", "intl"].includes(id);

  if (!existsSync(testFile)) {
    if (isBuiltin && existsSync(legacyTest)) {
      issues.push({
        level: "WARN",
        code: "TEST_LEGACY",
        message: `No tests/packs/${id}.test.ts (built-in covered by jurisdiction-packs.test.ts)`,
        fix: `Optional: add tests/packs/${id}.test.ts with positive + negative cases`,
      });
    } else {
      issues.push({
        level: "FAIL",
        code: "TEST_MISSING",
        message: `Missing unit test file tests/packs/${id}.test.ts`,
        fix: `Add tests/packs/${id}.test.ts with at least 1 positive and 1 negative case (or run npm run new-pack)`,
      });
    }
  } else {
    const testSrc = readFileSync(testFile, "utf8");
    const { positive, negative } = testHasPositiveAndNegative(testSrc);
    if (!positive) {
      issues.push({
        level: "FAIL",
        code: "TEST_NO_POSITIVE",
        message: `tests/packs/${id}.test.ts lacks a positive governing-law case`,
        fix: 'Add an it("positive: …") case that expects a pattern match',
      });
    }
    if (!negative) {
      issues.push({
        level: "FAIL",
        code: "TEST_NO_NEGATIVE",
        message: `tests/packs/${id}.test.ts lacks a negative non-match case`,
        fix: 'Add an it("negative: …") case that expects no false match',
      });
    }
  }

  return issues;
}

function main() {
  const ids = parseIds(process.argv.slice(2));
  let failCount = 0;
  let warnCount = 0;

  console.log(`Validating ${ids.length} pack(s): ${ids.join(", ")}\n`);

  for (const id of ids) {
    const issues = validatePackId(id);
    const fails = issues.filter((i) => i.level === "FAIL");
    const warns = issues.filter((i) => i.level === "WARN");
    failCount += fails.length;
    warnCount += warns.length;

    if (issues.length === 0) {
      console.log(`✅ ${id}: PASS`);
      continue;
    }

    console.log(`${fails.length ? "❌" : "⚠️"} ${id}: ${fails.length ? "FAIL" : "PASS with warnings"}`);
    for (const issue of issues) {
      console.log(`   [${issue.level}] ${issue.code} — ${issue.message}`);
      console.log(`      Fix: ${issue.fix}`);
    }
    console.log("");
  }

  console.log("—".repeat(40));
  if (failCount === 0) {
    console.log(`RESULT: PASS (${warnCount} warning(s))`);
    process.exit(0);
  }
  console.log(`RESULT: FAIL (${failCount} error(s), ${warnCount} warning(s))`);
  process.exit(1);
}

main();
