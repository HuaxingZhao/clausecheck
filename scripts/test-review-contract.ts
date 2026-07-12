/**
 * Manual / CI helper to verify the AI review workflow against fixtures.
 *
 * Usage:
 *   npx tsx scripts/test-review-contract.ts --dry-run
 *   npx tsx scripts/test-review-contract.ts
 *   npx tsx scripts/test-review-contract.ts --fixture=saas-ca
 *   npx tsx scripts/test-review-contract.ts --raw
 *
 * Loads .env.local if present (does not print the API key).
 */

import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildReviewMessagesPreview,
  reviewContract,
  reviewContractRawLlm,
} from "../lib/ai/review-contract";
import { validateReviewOutput } from "../lib/ai/validate-review-output";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function summarizeFlags(
  flags: Array<{
    level?: string;
    category?: string;
    text?: string;
    legalBasis?: string;
    riskRationale?: string;
    suggestion?: string;
    quote?: string;
  }>
) {
  return flags.slice(0, 8).map((f, i) => ({
    i: i + 1,
    level: f.level,
    category: f.category,
    text: (f.text || "").slice(0, 80),
    legalBasis: f.legalBasis,
    riskRationale: f.riskRationale,
    hasQuote: Boolean(f.quote),
    hasSuggestion: Boolean(f.suggestion),
  }));
}

type FixtureKey = "nda" | "saas-ca" | "saas-ca-reasonable";

function resolveFixture(args: string[]): {
  key: FixtureKey;
  path: string;
  locale: "zh" | "en";
  scenarioId: "nda" | "tech_saas";
  outName: string;
} {
  const fixtureArg = args.find((a) => a.startsWith("--fixture="));
  const key = (fixtureArg?.split("=")[1] || "nda") as FixtureKey;
  if (key === "saas-ca") {
    return {
      key,
      path: join(process.cwd(), "fixtures/contracts/saas-ca-risky-en.txt"),
      locale: "en",
      scenarioId: "tech_saas",
      outName: "saas-ca-review-full.json",
    };
  }
  if (key === "saas-ca-reasonable") {
    const jsonPath = join(process.cwd(), "fixtures/saas-ca-reasonable.json");
    const txtPath = join(
      process.cwd(),
      "fixtures/contracts/saas-ca-reasonable-en.txt"
    );
    return {
      key,
      path: existsSync(txtPath) ? txtPath : jsonPath,
      locale: "en",
      scenarioId: "tech_saas",
      outName: "saas-ca-reasonable-review-full.json",
    };
  }
  return {
    key: "nda",
    path: join(process.cwd(), "fixtures/contracts/nda-risky-zh.txt"),
    locale: "zh",
    scenarioId: "nda",
    outName: "nda-review-full.json",
  };
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const argSet = new Set(args);
  const dryRun = argSet.has("--dry-run");
  const raw = argSet.has("--raw");
  const fixture = resolveFixture(args);
  let text = readFileSync(fixture.path, "utf8");
  if (fixture.path.endsWith(".json")) {
    const parsed = JSON.parse(text) as { contractText?: string };
    if (!parsed.contractText) {
      throw new Error("JSON fixture missing contractText");
    }
    text = parsed.contractText;
  }

  console.log("Fixture:", fixture.path);
  console.log("Chars:", text.length);
  console.log("locale/scenario:", fixture.locale, fixture.scenarioId);

  if (dryRun) {
    const preview = buildReviewMessagesPreview(text, {
      locale: fixture.locale,
      scenarioId: fixture.scenarioId,
    });
    console.log("\n=== Retrieval (top rules) ===");
    for (const r of preview.retrieval.rules.slice(0, 8)) {
      console.log(`- [${r.kind}] score=${r.score.toFixed(2)} ${r.title}`);
    }
    console.log("\n=== System prompt (head) ===");
    console.log(preview.system.slice(0, 800) + "…");
    console.log("\n=== User prompt (head) ===");
    console.log(preview.user.slice(0, 500) + "…");
    console.log("Dry-run OK — no OpenAI call.");
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY missing. Use --dry-run or set the env var.");
    process.exit(1);
  }

  if (raw) {
    console.log(`Calling reviewContractRawLlm (${fixture.key})…`);
    const { raw: json } = await reviewContractRawLlm(text, {
      locale: fixture.locale,
      scenarioId: fixture.scenarioId,
      refine: false,
    });
    const parsed = JSON.parse(json) as {
      flags?: unknown[];
      scoreText?: string;
      detectedJurisdiction?: string;
    };
    console.log("detectedJurisdiction:", parsed.detectedJurisdiction);
    console.log("scoreText:", parsed.scoreText);
    console.log("flags:", parsed.flags?.length ?? 0);
    console.log(JSON.stringify(summarizeFlags((parsed.flags as never[]) || []), null, 2));
    return;
  }

  console.log(`Calling reviewContract (${fixture.key}, refine=false)…`);
  const out = await reviewContract(text, {
    locale: fixture.locale,
    scenarioId: fixture.scenarioId,
    refine: false,
  });

  mkdirSync(join(process.cwd(), "tmp"), { recursive: true });
  const outPath = join(process.cwd(), "tmp", fixture.outName);
  writeFileSync(
    outPath,
    JSON.stringify({ ...out, contractText: text }, null, 2),
    "utf8"
  );
  console.log("Wrote:", outPath);

  console.log("\n=== Meta ===");
  console.log(out.meta);
  console.log("\n=== Jurisdiction ===");
  console.log({
    detectedJurisdiction: out.result.detectedJurisdiction,
    governingLawQuote: out.result.governingLawQuote,
    disputeResolutionQuote: out.result.disputeResolutionQuote,
  });
  console.log("\n=== Retrieval top ===");
  for (const r of out.retrieval.rules.slice(0, 6)) {
    console.log(`- [${r.kind}] ${r.title}`);
  }
  console.log("\n=== Result summary ===");
  console.log({
    contractType: out.result.contractType,
    scoreText: out.result.scoreText,
    scoreNum: out.result.scoreNum,
    signingRecommendation: out.result.signingRecommendation,
    signingRationale: out.result.signingRationale,
    flagCount: out.result.flags.length,
    missingClauses: (out.result.missingClauses || []).map((m) => m.name),
  });
  if (out.result.signingRecommendation === "do_not_sign") {
    console.log(
      "\n[do_not_sign] Rationale:",
      out.result.signingRationale || "(missing signingRationale)"
    );
  }
  console.log("\n=== Flags (sample) ===");
  console.log(JSON.stringify(summarizeFlags(out.result.flags), null, 2));

  const withBasis = out.result.flags.filter(
    (f) => f.legalBasis?.trim() || f.riskRationale?.trim()
  );
  const withSuggestion = out.result.flags.filter((f) => f.suggestion?.trim());
  console.log(
    `\nlegalBasis/riskRationale coverage: ${withBasis.length}/${out.result.flags.length}`
  );
  console.log(
    `suggestion coverage: ${withSuggestion.length}/${out.result.flags.length}`
  );

  const joined = out.result.flags
    .map((f) => `${f.legalBasis || ""} ${f.riskRationale || ""}`)
    .join("\n");
  if (fixture.key === "saas-ca") {
    if (/民法典|Civil Code|第\s*\d+\s*条/i.test(joined)) {
      console.warn("WARN: non-China fixture still cites PRC Civil Code — inspect.");
    } else if (
      /general principles|market practice|unconscionab|California|CPRA|GDPR/i.test(
        joined
      )
    ) {
      console.log("OK: international/common-law safe rationale style detected.");
    }
  } else if (!/民法典|商业惯例|Civil Code|commercial practice/i.test(joined)) {
    console.warn(
      "WARN: flags may lack Civil Code / commercial-practice legalBasis — inspect output."
    );
  } else {
    console.log("OK: at least one flag cites Civil Code or commercial practice.");
  }

  const report = validateReviewOutput({ ...out, contractText: text });
  console.log("\n=== validateReviewOutput ===");
  console.log(report.summary);
  for (const issue of report.issues) {
    console.log(`  [${issue.severity}] ${issue.code} — ${issue.message}`);
  }
  console.log(report.ok ? "RESULT: PASS" : "RESULT: FAIL");
  if (!report.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
