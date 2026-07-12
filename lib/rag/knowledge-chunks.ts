/**
 * Flatten scenario knowledge packs into jurisdiction-tagged chunks.
 * Merges optional overrides JSON (from backfill script) then heuristics.
 */

import {
  CONTRACT_SCENARIOS,
  type ContractScenarioId,
} from "@/lib/contract-scenarios";
import { getScenarioKnowledge } from "@/lib/scenario-knowledge";
import {
  inferDocType,
  inferKnowledgeJurisdiction,
} from "./infer-jurisdiction";
import type {
  KnowledgeChunk,
  KnowledgeChunkMeta,
  KnowledgeJurisdiction,
} from "./knowledge-meta";
import overridesJson from "./jurisdiction-overrides.json";

type OverrideMap = Record<
  string,
  {
    jurisdiction?: KnowledgeJurisdiction;
    doc_type?: KnowledgeChunkMeta["doc_type"];
    effective_date?: string;
  }
>;

const OVERRIDES = (overridesJson as { overrides?: OverrideMap }).overrides || {};

function chunkId(
  scenarioId: string,
  kind: string,
  index: number,
  title: string
): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .slice(0, 48);
  return `${scenarioId}:${kind}:${index}:${slug}`;
}

function resolveMeta(
  id: string,
  kind: KnowledgeChunk["kind"],
  searchText: string,
  explicit?: Partial<KnowledgeChunkMeta>
): KnowledgeChunkMeta {
  const ov = OVERRIDES[id];
  let jurisdiction =
    explicit?.jurisdiction ||
    ov?.jurisdiction ||
    inferKnowledgeJurisdiction(searchText);
  // Checks/templates without a clear statute cue are portable commercial guidance.
  if (
    jurisdiction === "UNKNOWN" &&
    (kind === "mandatory_check" || kind === "template")
  ) {
    jurisdiction = "GENERAL";
  }
  const doc_type =
    explicit?.doc_type || ov?.doc_type || inferDocType(kind, searchText);
  const effective_date = explicit?.effective_date || ov?.effective_date;
  return { jurisdiction, doc_type, effective_date };
}

/** Build all chunks for one scenario (COMMON fallback included via getScenarioKnowledge). */
export function buildKnowledgeChunksForScenario(
  scenarioId: ContractScenarioId
): KnowledgeChunk[] {
  const pack = getScenarioKnowledge(scenarioId);
  const chunks: KnowledgeChunk[] = [];

  pack.mandatoryChecksZh.forEach((zh, i) => {
    const en = pack.mandatoryChecksEn[i] || zh;
    const searchText = `${zh} ${en}`;
    const id = chunkId(scenarioId, "check", i, zh);
    chunks.push({
      id,
      scenarioId,
      kind: "mandatory_check",
      title: zh,
      searchText,
      bodyZh: zh,
      bodyEn: en,
      meta: resolveMeta(id, "mandatory_check", searchText),
    });
  });

  pack.statutes.forEach((s, i) => {
    const searchText = `${s.title} ${s.summaryZh} ${s.summaryEn}`;
    const id = chunkId(scenarioId, "statute", i, s.title);
    const explicit = (s as { jurisdiction?: KnowledgeJurisdiction }).jurisdiction
      ? {
          jurisdiction: (s as { jurisdiction?: KnowledgeJurisdiction }).jurisdiction,
          doc_type: (s as { docType?: KnowledgeChunkMeta["doc_type"] }).docType,
          effective_date: (s as { effectiveDate?: string }).effectiveDate,
        }
      : undefined;
    chunks.push({
      id,
      scenarioId,
      kind: "statute",
      title: s.title,
      searchText,
      bodyZh: s.summaryZh,
      bodyEn: s.summaryEn,
      meta: resolveMeta(id, "statute", searchText, explicit),
    });
  });

  pack.templates.forEach((t, i) => {
    const searchText = `${t.nameZh} ${t.nameEn} ${t.textZh} ${t.textEn}`;
    const id = chunkId(scenarioId, "template", i, t.nameEn || t.nameZh);
    chunks.push({
      id,
      scenarioId,
      kind: "template",
      title: t.nameZh,
      searchText,
      bodyZh: `${t.nameZh}\n${t.textZh}`,
      bodyEn: `${t.nameEn}\n${t.textEn}`,
      meta: resolveMeta(id, "template", searchText, {
        jurisdiction: (t as { jurisdiction?: KnowledgeJurisdiction }).jurisdiction,
        doc_type: "clause_template",
        effective_date: (t as { effectiveDate?: string }).effectiveDate,
      }),
    });
  });

  return chunks;
}

/** All scenarios' chunks (for backfill / audits). */
export function buildAllKnowledgeChunks(): KnowledgeChunk[] {
  const ids = CONTRACT_SCENARIOS.map((s) => s.id);
  // Also ensure COMMON is represented under a synthetic id if unused —
  // getScenarioKnowledge already falls back per scenario.
  return ids.flatMap((id) => buildKnowledgeChunksForScenario(id));
}

export function getOverrideCount(): number {
  return Object.keys(OVERRIDES).length;
}
