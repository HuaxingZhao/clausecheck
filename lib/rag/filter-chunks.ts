import type { KnowledgeChunk, KnowledgeJurisdiction } from "./knowledge-meta";
import { allowedJurisdictionsForFilter } from "./knowledge-meta";

export function filterKnowledgeChunks(
  chunks: KnowledgeChunk[],
  filter: KnowledgeJurisdiction | null
): { kept: KnowledgeChunk[]; excludedCount: number; degraded: boolean } {
  const withoutUnknown = chunks.filter((c) => c.meta.jurisdiction !== "UNKNOWN");
  const excludedUnknown = chunks.length - withoutUnknown.length;

  if (!filter) {
    return {
      kept: withoutUnknown,
      excludedCount: excludedUnknown,
      degraded: false,
    };
  }

  const allowed = new Set(allowedJurisdictionsForFilter(filter));
  const primary = withoutUnknown.filter((c) => allowed.has(c.meta.jurisdiction));
  if (primary.length > 0) {
    return {
      kept: primary,
      excludedCount: chunks.length - primary.length,
      degraded: false,
    };
  }

  const general = withoutUnknown.filter((c) => c.meta.jurisdiction === "GENERAL");
  return {
    kept: general,
    excludedCount: chunks.length - general.length,
    degraded: true,
  };
}
