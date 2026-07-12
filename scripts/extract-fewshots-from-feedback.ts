#!/usr/bin/env tsx
/**
 * Extract few-shot candidates from structured review feedback.
 *
 * Usage:
 *   npm run extract:fewshots -- --jurisdiction=us_california --feedbackType=false_positive
 *   npm run extract:fewshots -- --jurisdiction=us-ca --feedbackType=missed_issue,false_positive --minFrequency=2 --dry-run
 *   npm run extract:fewshots -- --jurisdiction=us_california --local-json
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { createHash } from "crypto";
import { listFeedback } from "../lib/db/feedback-queries";
import type { FeedbackRecord, FeedbackType } from "../lib/feedback/types";
import { packIdFromJurisdiction } from "../lib/prompts/jurisdiction-packs";
import {
  fewshotsAutoPath,
  type FewshotAutoFile,
  type FewshotExample,
} from "../lib/prompts/jurisdiction-packs/fewshots";
import { estimateTokenCount } from "../lib/prompts/jurisdiction-packs/pack-limits";

const VALID_TYPES: FeedbackType[] = [
  "accurate",
  "missed_issue",
  "false_positive",
];

function parseArgs(argv: string[]) {
  let jurisdiction = "";
  let feedbackTypes: FeedbackType[] = ["missed_issue", "false_positive"];
  let minFrequency = 3;
  let dryRun = false;
  let localJson = false;
  let forceEmpty = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") dryRun = true;
    if (a === "--local-json") localJson = true;
    if (a === "--force-empty") forceEmpty = true;
    if (a === "--jurisdiction" && argv[i + 1]) jurisdiction = argv[++i];
    if (a.startsWith("--jurisdiction=")) jurisdiction = a.slice("--jurisdiction=".length);
    if (a === "--feedbackType" && argv[i + 1]) {
      feedbackTypes = argv[++i].split(",").map((s) => s.trim()) as FeedbackType[];
    }
    if (a.startsWith("--feedbackType=")) {
      feedbackTypes = a
        .slice("--feedbackType=".length)
        .split(",")
        .map((s) => s.trim()) as FeedbackType[];
    }
    if (a === "--minFrequency" && argv[i + 1]) minFrequency = Number(argv[++i]);
    if (a.startsWith("--minFrequency=")) {
      minFrequency = Number(a.slice("--minFrequency=".length));
    }
  }
  if (!jurisdiction) {
    console.error(
      "Usage: npm run extract:fewshots -- --jurisdiction=us_california [--feedbackType=false_positive,missed_issue] [--minFrequency=3] [--dry-run] [--local-json]"
    );
    process.exit(1);
  }
  for (const t of feedbackTypes) {
    if (!VALID_TYPES.includes(t)) {
      console.error("feedbackType must be accurate | missed_issue | false_positive");
      process.exit(1);
    }
  }
  return { jurisdiction, feedbackTypes, minFrequency, dryRun, localJson, forceEmpty };
}

function resolvePackId(jurisdiction: string): string {
  if (/^[a-z]{2}(-[a-z0-9]+)*$/.test(jurisdiction) && !jurisdiction.includes("_")) {
    return jurisdiction;
  }
  const mapped = packIdFromJurisdiction(
    jurisdiction as Parameters<typeof packIdFromJurisdiction>[0]
  );
  return mapped || jurisdiction.toLowerCase().replace(/_/g, "-");
}

/** Normalize for clustering — deterministic. */
export function normalizeClusterText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(normalizeClusterText(s).split(" ").filter((t) => t.length > 1));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Primary cluster: feedbackType + targetId (frequency on same risk code).
 * Secondary: merge only when comments are dissimilar enough to stay separate —
 * we start with one bucket per target and only split if needed later.
 */
function clusterByTarget(rows: FeedbackRecord[]): Map<string, FeedbackRecord[]> {
  const byTarget = new Map<string, FeedbackRecord[]>();
  for (const r of rows) {
    const key = `${r.feedbackType}::${r.targetId}`;
    const list = byTarget.get(key) || [];
    list.push(r);
    byTarget.set(key, list);
  }
  return byTarget;
}

/** Optional soft split: if a target cluster has clearly distinct comment themes. */
function maybeSplitByComment(
  groups: Map<string, FeedbackRecord[]>
): Map<string, FeedbackRecord[]> {
  const out = new Map<string, FeedbackRecord[]>();
  for (const [key, list] of [...groups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    if (list.length < 4) {
      out.set(key, list);
      continue;
    }
    // Greedy: attach each row to first centroid with jaccard >= 0.35, else new
    const centroids: FeedbackRecord[][] = [];
    const sorted = [...list].sort(
      (a, b) => a.id.localeCompare(b.id) || a.createdAt.localeCompare(b.createdAt)
    );
    for (const r of sorted) {
      const tokens = tokenSet(r.comment || r.targetId);
      let placed = false;
      for (const c of centroids) {
        const sim = jaccard(tokens, tokenSet(c[0].comment || c[0].targetId));
        if (sim >= 0.35) {
          c.push(r);
          placed = true;
          break;
        }
      }
      if (!placed) centroids.push([r]);
    }
    if (centroids.length === 1) {
      out.set(key, list);
    } else {
      centroids.forEach((c, i) => out.set(`${key}::${i}`, c));
    }
  }
  return out;
}

function toExample(list: FeedbackRecord[], feedbackType: FeedbackType): FewshotExample {
  const sorted = [...list].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  );
  const primary = sorted[0];
  const comment = primary.comment?.trim() || primary.targetId;
  const inputSnippet = `[${primary.targetType}:${primary.targetId}] ${comment}`.slice(
    0,
    280
  );

  if (feedbackType === "false_positive") {
    return {
      inputSnippet,
      expectedBehavior:
        "Do not raise this as a high/medium risk unless the contract text clearly supports a material, non-market-standard harm. Prefer sign_with_changes for industry-standard unfavorable terms.",
      reasoning:
        "Users marked this pattern as a false positive / over-warning. Calibrate severity downward when facts match.",
    };
  }
  if (feedbackType === "missed_issue") {
    return {
      inputSnippet,
      expectedBehavior:
        "Actively scan for this risk class and emit a flag or missingClause with paste-ready suggestion when the contract is silent or one-sided.",
      reasoning:
        "Users marked this pattern as a missed issue. Ensure the pack checklist covers it.",
    };
  }
  return {
    inputSnippet,
    expectedBehavior: "Keep current detection posture for this pattern.",
    reasoning: "Users confirmed accuracy for this pattern.",
  };
}

async function main() {
  const {
    jurisdiction,
    feedbackTypes,
    minFrequency,
    dryRun,
    localJson,
    forceEmpty,
  } = parseArgs(process.argv.slice(2));
  const packId = resolvePackId(jurisdiction);

  const rows = await listFeedback({
    feedbackTypes,
    sinceDays: 365,
    preferLocalJson: localJson || !process.env.DATABASE_URL,
  });

  // When DATABASE_URL is set without --local-json, still allow PG; force local if empty
  let working = rows;
  if (!localJson && process.env.DATABASE_URL && rows.length === 0) {
    working = await listFeedback({
      feedbackTypes,
      sinceDays: 365,
      preferLocalJson: true,
    });
  }

  const filtered = working.filter((r) => {
    const j = r.jurisdiction.toLowerCase();
    const pack = r.ragMetadata?.packId?.toLowerCase() || "";
    const want = jurisdiction.toLowerCase();
    return (
      j === want ||
      pack === packId.toLowerCase() ||
      j.replace(/_/g, "-") === packId ||
      pack === want
    );
  });

  const merged = maybeSplitByComment(clusterByTarget(filtered));

  const eligible = [...merged.entries()]
    .map(([key, list]) => ({
      key,
      list,
      feedbackType: list[0].feedbackType as FeedbackType,
    }))
    .filter((g) => g.list.length >= minFrequency)
    .sort(
      (a, b) =>
        b.list.length - a.list.length ||
        a.key.localeCompare(b.key)
    );

  const examples: FewshotExample[] = [];
  for (const g of eligible) {
    examples.push(toExample(g.list, g.feedbackType));
    const sorted = [...g.list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const last = sorted[sorted.length - 1];
    if (
      last &&
      examples.length < 6 &&
      normalizeClusterText(last.comment || "") !==
        normalizeClusterText(sorted[0].comment || "")
    ) {
      examples.push(toExample([last], g.feedbackType));
    }
    if (examples.length >= 6) break;
  }

  // Stable sort for idempotency
  examples.sort((a, b) => a.inputSnippet.localeCompare(b.inputSnippet));

  const feedbackTypeLabel = feedbackTypes.slice().sort().join(",");
  const payload: FewshotAutoFile = {
    jurisdiction,
    packId,
    feedbackType: feedbackTypeLabel,
    generatedAt: "",
    examples,
  };

  const contentHash = createHash("sha256")
    .update(JSON.stringify({ jurisdiction, packId, feedbackType: feedbackTypeLabel, examples }))
    .digest("hex")
    .slice(0, 8);
  payload.generatedAt = `content:${contentHash}`;

  const outPath = fewshotsAutoPath(packId);
  console.log(
    JSON.stringify(
      {
        packId,
        feedbackType: feedbackTypeLabel,
        clusters: eligible.length,
        examples: examples.length,
        approxTokens: estimateTokenCount(JSON.stringify(examples)),
        dryRun,
        outPath: path.relative(process.cwd(), outPath),
      },
      null,
      2
    )
  );

  if (dryRun) {
    console.log("\n--- dry-run payload ---\n");
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (examples.length === 0 && !forceEmpty) {
    console.warn(
      "No examples met minFrequency — refusing to overwrite existing fewshots-auto.json (pass --force-empty to write empty)."
    );
    process.exitCode = 2;
    return;
  }

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
