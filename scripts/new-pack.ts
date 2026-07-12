#!/usr/bin/env tsx
/**
 * Scaffold a new Jurisdiction Pack for community contribution.
 *
 * Usage:
 *   npm run new-pack -- --id=sg --name="Singapore"
 *   npm run new-pack -- --id=ae-dubai --name="Dubai, UAE"
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = process.cwd();
const PACKS_DIR = path.join(ROOT, "lib/prompts/jurisdiction-packs/packs");
const REGISTRY = path.join(
  ROOT,
  "lib/prompts/jurisdiction-packs/pack-registry.ts"
);
const TESTS_DIR = path.join(ROOT, "tests/packs");

function parseArgs(argv: string[]): { id: string; name: string } {
  let id = "";
  let name = "";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id" && argv[i + 1]) {
      id = argv[++i];
      continue;
    }
    if (a.startsWith("--id=")) {
      id = a.slice("--id=".length);
      continue;
    }
    if (a === "--name" && argv[i + 1]) {
      name = argv[++i];
      continue;
    }
    if (a.startsWith("--name=")) {
      name = a.slice("--name=".length).replace(/^["']|["']$/g, "");
      continue;
    }
  }
  if (!id || !name) {
    console.error(
      'Usage: npm run new-pack -- --id=sg --name="Singapore"\n' +
        "  id: lowercase kebab-case ({iso}-{subdivision?}), e.g. sg, us-tx, ae-dubai\n" +
        '  name: display name, e.g. "Singapore" or "Texas, US"'
    );
    process.exit(1);
  }
  return { id: id.trim().toLowerCase(), name: name.trim() };
}

function assertValidId(id: string) {
  if (!/^[a-z]{2}(-[a-z0-9]+)*$/.test(id)) {
    console.error(
      `Invalid id "${id}". Use lowercase kebab-case: xx or xx-yyy (e.g. sg, us-tx, ae-dubai).`
    );
    process.exit(1);
  }
  if (["cn", "us-ca", "us-ny", "uk", "intl"].includes(id)) {
    console.error(`Pack id "${id}" is a built-in pack — choose another id.`);
    process.exit(1);
  }
}

function toPascal(id: string): string {
  return id
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function packSource(id: string, displayName: string): string {
  const fn = `get${toPascal(id)}Pack`;
  const patternSeed = id.split("-")[0];
  return `/**
 * Jurisdiction Pack: ${id} — ${displayName}
 *
 * Community contribution scaffold. Replace placeholders with jurisdiction-specific rules.
 * See docs/contributing-jurisdiction-packs.md
 */

import type { JurisdictionPack, PromptLocale } from "../types";

/**
 * Factory for the "${id}" pack.
 * Write ONLY rules unique to ${displayName} — do not repeat Base checklist / persona.
 */
export function ${fn}(locale: PromptLocale): JurisdictionPack {
  const focus =
    locale === "zh"
      ? \`
【Jurisdiction Pack: ${id} — ${displayName}】
审查重点：仅写入本辖区特有规则（例如本地强制条款、监管要求、争议解决惯例）。
禁止重复 Base 已有的 12 类通用风险清单。
商业数字与谈判事项用 [TO BE NEGOTIATED] 占位；禁止编造判例名称或虚假法条编号。
输出仅为决策支持，不构成法律意见。\`
      : \`
【Jurisdiction Pack: ${id} — ${displayName}】
Focus: jurisdiction-specific rules only (local mandatory clauses, regulatory expectations, dispute-resolution norms).
Do NOT repeat the Base 12-category checklist.
Use [TO BE NEGOTIATED] for commercial figures; never invent case names or fabricated statute sections.
Output is decision support only — not legal advice.\`;

  return {
    id: "${id}",
    displayName: ${JSON.stringify(displayName)},
    governingLawPatterns: [
      // Cover common governing-law variants (substring or simple regex with .*)
      "${displayName.toLowerCase()}",
      "laws of ${patternSeed}",
      "governing law.*${patternSeed}",
      "${patternSeed} law",
    ],
    systemPromptAddon: focus.trim(),
    /**
     * Jurisdiction-specific mandatory clauses only.
     * Do not restate Base 12-category titles.
     * Example format: "Clause Name (Legal basis cite)"
     */
    boilerplateRequirements: [
      // e.g. "Personal Data Protection Act notice (PDPA ${displayName})"
    ],
    defaultSigningThresholds: {
      signWithChangesScore: 55,
      doNotSignScore: 75,
    },
  };
}
`;
}

function testSource(id: string, displayName: string): string {
  const fn = `get${toPascal(id)}Pack`;
  const seed = id.split("-")[0];
  return `/**
 * Pack tests for ${id} (${displayName}).
 * Required: ≥1 positive governing-law match + ≥1 negative non-match.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ${fn} } from "../../lib/prompts/jurisdiction-packs/packs/${id}";
import { detectPackIdFromText } from "../../lib/prompts/jurisdiction-packs";

describe("pack ${id}", () => {
  it("exposes required JurisdictionPack fields", () => {
    const pack = ${fn}("en");
    assert.equal(pack.id, "${id}");
    assert.equal(pack.displayName, ${JSON.stringify(displayName)});
    assert.ok(pack.governingLawPatterns.length >= 1);
    assert.ok(pack.systemPromptAddon.length > 0);
    assert.ok(Array.isArray(pack.boilerplateRequirements));
  });

  it("positive: detects governing-law language for ${displayName}", () => {
    const sample =
      "This Agreement shall be governed by the laws of ${seed}, without regard to conflict of laws.";
    // Prefer pack-local patterns; full registry detect may need stronger patterns after you expand them.
    const pack = ${fn}("en");
    const hit = pack.governingLawPatterns.some((p) => {
      const lower = sample.toLowerCase();
      if (p.includes(".*")) {
        try {
          return new RegExp(p, "i").test(sample);
        } catch {
          return false;
        }
      }
      return lower.includes(p.toLowerCase());
    });
    assert.equal(hit, true);
  });

  it("negative: does not claim match on unrelated PRC governing law", () => {
    const sample = "本协议适用中华人民共和国法律。";
    const pack = ${fn}("en");
    const hit = pack.governingLawPatterns.some((p) => {
      const lower = sample.toLowerCase();
      if (p.includes(".*")) {
        try {
          return new RegExp(p, "i").test(sample);
        } catch {
          return false;
        }
      }
      return lower.includes(p.toLowerCase());
    });
    assert.equal(hit, false);
    // When registered, PRC text should resolve to cn — not this pack.
    assert.notEqual(detectPackIdFromText(sample), "${id}");
  });
});
`;
}

function registerInRegistry(id: string): void {
  let src = readFileSync(REGISTRY, "utf8");
  const fn = `get${toPascal(id)}Pack`;
  const importLine = `import { ${fn} } from "./packs/${id}";\n`;

  if (src.includes(`"./packs/${id}"`)) {
    console.error(`Pack "${id}" already imported in pack-registry.ts`);
    process.exit(1);
  }

  // Insert import after last packs/ import
  const importBlock = src.match(
    /((?:import \{ get\w+Pack \} from "\.\/packs\/[^"]+";\n)+)/
  );
  if (!importBlock) {
    console.error("Could not find pack imports in pack-registry.ts");
    process.exit(1);
  }
  src = src.replace(importBlock[1], importBlock[1] + importLine);

  // Insert factory entry before closing of PACK_FACTORIES
  if (src.includes(`"${id}":`) || src.includes(`${id}:`)) {
    console.error(`Pack "${id}" already in PACK_FACTORIES`);
    process.exit(1);
  }
  const entry = `  "${id}": ${fn},\n`;
  src = src.replace(
    /(export const PACK_FACTORIES: Record<string, PackFactory> = \{[\s\S]*?)(\n\};)/,
    `$1${entry}$2`
  );

  // Normalize accidental inline "}  " formatting if any
  src = src.replace(/intl: getIntlPack,\s+"/g, 'intl: getIntlPack,\n  "');

  writeFileSync(REGISTRY, src, "utf8");
}

function main() {
  const { id, name } = parseArgs(process.argv.slice(2));
  assertValidId(id);

  const packPath = path.join(PACKS_DIR, `${id}.ts`);
  const testPath = path.join(TESTS_DIR, `${id}.test.ts`);

  if (existsSync(packPath)) {
    console.error(`File already exists: ${packPath}`);
    process.exit(1);
  }

  mkdirSync(PACKS_DIR, { recursive: true });
  mkdirSync(TESTS_DIR, { recursive: true });

  writeFileSync(packPath, packSource(id, name), "utf8");
  writeFileSync(testPath, testSource(id, name), "utf8");
  registerInRegistry(id);

  console.log(`
✅ Created Jurisdiction Pack scaffold

  Pack:  ${path.relative(ROOT, packPath)}
  Test:  ${path.relative(ROOT, testPath)}
  Registry: lib/prompts/jurisdiction-packs/pack-registry.ts (updated)

Next steps:
  1. Edit systemPromptAddon — jurisdiction-specific rules only
  2. Expand governingLawPatterns (cover common phrasing variants)
  3. Fill boilerplateRequirements as "Clause Name (legal cite)" if needed
  4. Run:  npm run validate:pack -- --id=${id}
  5. Run:  node --import tsx --test tests/packs/${id}.test.ts
  6. Open a PR — see docs/contributing-jurisdiction-packs.md
`);
}

main();
