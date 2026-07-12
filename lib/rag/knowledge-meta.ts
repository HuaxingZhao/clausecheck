/**
 * RAG knowledge chunk metadata — jurisdiction isolation layer.
 * Works over scenario-knowledge packs today; same schema applies if/when
 * chunks move to a vector store.
 */

export const KNOWLEDGE_JURISDICTIONS = [
  "CN",
  "US-CA",
  "US-NY",
  "US",
  "UK",
  "EU",
  "INTL",
  "GENERAL",
  "UNKNOWN",
] as const;

export type KnowledgeJurisdiction = (typeof KNOWLEDGE_JURISDICTIONS)[number];

export const KNOWLEDGE_DOC_TYPES = [
  "statute",
  "regulation",
  "clause_template",
  "case_law",
  "mandatory_check",
] as const;

export type KnowledgeDocType = (typeof KNOWLEDGE_DOC_TYPES)[number];

export interface KnowledgeChunkMeta {
  jurisdiction: KnowledgeJurisdiction;
  doc_type: KnowledgeDocType;
  /** ISO date (YYYY-MM-DD); optional for future recency filters. */
  effective_date?: string;
}

export interface KnowledgeChunk {
  id: string;
  scenarioId: string;
  kind: "mandatory_check" | "statute" | "template";
  title: string;
  /** Locale-agnostic blob used for inference / search. */
  searchText: string;
  bodyZh: string;
  bodyEn: string;
  meta: KnowledgeChunkMeta;
}

/** Client / ScanResult jurisdiction → RAG filter code. */
export function toKnowledgeJurisdictionFilter(
  raw: string | null | undefined
): KnowledgeJurisdiction | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === "auto" || s === "unknown") return null;
  if (s === "china_prc" || s === "cn" || s === "china") return "CN";
  if (s === "us_california" || s === "us-ca" || s === "california") return "US-CA";
  if (s === "us_new_york" || s === "us-ny" || s === "new_york") return "US-NY";
  if (s === "us_general" || s === "us") return "US";
  if (s === "england_wales" || s === "uk" || s === "england") return "UK";
  if (s === "eu" || s === "gdpr") return "EU";
  if (
    s === "international_commercial" ||
    s === "intl" ||
    s === "international" ||
    s === "common_law_other"
  ) {
    return "INTL";
  }
  // Already a knowledge code
  const upper = String(raw).trim().toUpperCase();
  if ((KNOWLEDGE_JURISDICTIONS as readonly string[]).includes(upper)) {
    return upper as KnowledgeJurisdiction;
  }
  return null;
}

/** Allowed metadata.jurisdiction values for a review filter. */
export function allowedJurisdictionsForFilter(
  filter: KnowledgeJurisdiction
): KnowledgeJurisdiction[] {
  // Exact match + GENERAL. US-CA / US-NY also accept federal US.
  if (filter === "US-CA" || filter === "US-NY") {
    return [filter, "US", "GENERAL"];
  }
  if (filter === "US") {
    return ["US", "US-CA", "US-NY", "GENERAL"];
  }
  return [filter, "GENERAL"];
}
