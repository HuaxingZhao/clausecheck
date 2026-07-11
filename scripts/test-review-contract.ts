/**
 * Manual / CI helper to verify the AI review workflow against the NDA fixture.
 *
 * Usage:
 *   npx tsx scripts/test-review-contract.ts --dry-run
 *   npx tsx scripts/test-review-contract.ts              # calls OpenAI (needs OPENAI_API_KEY)
 *   npx tsx scripts/test-review-contract.ts --raw        # raw LLM JSON only (no full pipeline)
 *
 * Loads .env.local if present (does not print the API key).
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  buildReviewMessagesPreview,
  reviewContract,
  reviewContractRawLlm,
} from "../lib/ai/review-contract";

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
    hasQuote: Boolean(f.quote),
    hasSuggestion: Boolean(f.suggestion),
  }));
}

async function main() {
  loadEnvLocal();
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const raw = args.has("--raw");
  const fixture = join(process.cwd(), "fixtures/contracts/nda-risky-zh.txt");
  const text = readFileSync(fixture, "utf8");

  console.log("Fixture:", fixture);
  console.log("Chars:", text.length);

  if (dryRun) {
    const preview = buildReviewMessagesPreview(text, {
      locale: "zh",
      scenarioId: "nda",
    });
    console.log("\n=== Retrieval (top rules) ===");
    for (const r of preview.retrieval.rules.slice(0, 8)) {
      console.log(`- [${r.kind}] score=${r.score.toFixed(2)} ${r.title}`);
    }
    console.log("\n=== System prompt (head) ===");
    console.log(preview.system.slice(0, 600) + "…");
    console.log("\n=== User prompt (head) ===");
    console.log(preview.user.slice(0, 500) + "…");
    console.log("\nDry-run OK — no OpenAI call.");
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY missing. Use --dry-run or set the env var.");
    process.exit(1);
  }

  if (raw) {
    console.log("Calling reviewContractRawLlm (nda)…");
    const { raw: json } = await reviewContractRawLlm(text, {
      locale: "zh",
      scenarioId: "nda",
      refine: false,
    });
    const parsed = JSON.parse(json) as {
      flags?: unknown[];
      scoreText?: string;
    };
    console.log("scoreText:", parsed.scoreText);
    console.log("flags:", parsed.flags?.length ?? 0);
    console.log(JSON.stringify(summarizeFlags((parsed.flags as never[]) || []), null, 2));
    return;
  }

  console.log("Calling reviewContract (nda, refine=false for speed)…");
  const out = await reviewContract(text, {
    locale: "zh",
    scenarioId: "nda",
    refine: false,
  });

  console.log("\n=== Meta ===");
  console.log(out.meta);
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
    flagCount: out.result.flags.length,
  });
  console.log("\n=== Flags (sample) ===");
  console.log(JSON.stringify(summarizeFlags(out.result.flags), null, 2));

  const withBasis = out.result.flags.filter((f) => f.legalBasis?.trim());
  const withSuggestion = out.result.flags.filter((f) => f.suggestion?.trim());
  console.log(
    `\nlegalBasis coverage: ${withBasis.length}/${out.result.flags.length}`
  );
  console.log(
    `suggestion coverage: ${withSuggestion.length}/${out.result.flags.length}`
  );

  const joined = out.result.flags.map((f) => f.legalBasis || "").join("\n");
  if (!/民法典|商业惯例|Civil Code|commercial practice/i.test(joined)) {
    console.warn(
      "WARN: flags may lack Civil Code / commercial-practice legalBasis — inspect output."
    );
  } else {
    console.log("OK: at least one flag cites Civil Code or commercial practice.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
