/**
 * Idempotent backfill of knowledge-chunk jurisdiction metadata.
 *
 * Usage:
 *   npx tsx scripts/backfill-knowledge-jurisdiction.ts
 *   npx tsx scripts/backfill-knowledge-jurisdiction.ts --dry-run
 *
 * Writes lib/rag/jurisdiction-overrides.json (merge; never deletes keys).
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildAllKnowledgeChunks } from "../lib/rag/knowledge-chunks";
import { inferKnowledgeJurisdiction, inferDocType } from "../lib/rag/infer-jurisdiction";
import type { KnowledgeJurisdiction } from "../lib/rag/knowledge-meta";

const OUT = join(process.cwd(), "lib/rag/jurisdiction-overrides.json");

type OverrideEntry = {
  jurisdiction: KnowledgeJurisdiction;
  doc_type: string;
  effective_date?: string;
  inferredFrom?: string;
};

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const existing = existsSync(OUT)
    ? (JSON.parse(readFileSync(OUT, "utf8")) as {
        overrides?: Record<string, OverrideEntry>;
      })
    : { overrides: {} };

  const overrides: Record<string, OverrideEntry> = {
    ...(existing.overrides || {}),
  };

  const chunks = buildAllKnowledgeChunks();
  let added = 0;
  let unchanged = 0;
  const byJ: Record<string, number> = {};

  for (const c of chunks) {
    let inferred = inferKnowledgeJurisdiction(c.searchText);
    if (
      inferred === "UNKNOWN" &&
      (c.kind === "mandatory_check" || c.kind === "template")
    ) {
      inferred = "GENERAL";
    }
    const docType = inferDocType(c.kind, c.searchText);
    byJ[inferred] = (byJ[inferred] || 0) + 1;

    const prev = overrides[c.id];
    if (prev?.jurisdiction) {
      let nextJ = prev.jurisdiction;
      if (
        nextJ === "UNKNOWN" &&
        (c.kind === "mandatory_check" || c.kind === "template")
      ) {
        nextJ = "GENERAL";
      }
      if (nextJ !== prev.jurisdiction || !prev.doc_type) {
        overrides[c.id] = {
          ...prev,
          jurisdiction: nextJ,
          doc_type: prev.doc_type || docType,
        };
        added += 1;
      } else {
        unchanged += 1;
      }
      continue;
    }
    overrides[c.id] = {
      jurisdiction: inferred,
      doc_type: docType,
      inferredFrom: c.title.slice(0, 80),
    };
    added += 1;
  }

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    note: "Idempotent overrides from scripts/backfill-knowledge-jurisdiction.ts. Runtime merges these over heuristics.",
    overrides,
    stats: {
      chunkCount: chunks.length,
      added,
      unchanged,
      byJurisdiction: byJ,
    },
  };

  console.log("Chunks:", chunks.length);
  console.log("Added/updated:", added, "unchanged:", unchanged);
  console.log("By jurisdiction:", byJ);

  if (dryRun) {
    console.log("Dry-run — not writing", OUT);
    return;
  }

  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log("Wrote", OUT);
}

main();
