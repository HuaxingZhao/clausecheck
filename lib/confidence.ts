import { buildNormIndex, findRangeWithFallbacks } from "./redline";
import { isAdvisoryRevision } from "./revision-export";
import type {
  AnalysisQualityStats,
  ConfidenceLevel,
  NegotiationPoint,
  RiskFlag,
  ScanResult,
} from "./types";

export type { ConfidenceLevel, AnalysisQualityStats };

function quoteVerifiedInText(source: string, quote?: string): boolean {
  if (!quote?.trim() || !source.trim()) return false;
  if (source.includes(quote.trim())) return true;
  const ni = buildNormIndex(source);
  return !!findRangeWithFallbacks(ni, quote);
}

export function scoreFlagConfidence(
  flag: RiskFlag,
  source: string
): ConfidenceLevel {
  const hasQuote = !!flag.quote?.trim();
  const verified = hasQuote && quoteVerifiedInText(source, flag.quote);
  const hasClauseId = !!flag.clauseId?.trim();
  const advisory = hasQuote && flag.suggestion
    ? isAdvisoryRevision(flag.quote!, flag.suggestion)
    : !flag.suggestion?.trim() || flag.suggestion.length < 12;

  if (verified && hasClauseId && !advisory && flag.legalBasis?.trim()) {
    return "high";
  }
  if (verified && !advisory) return "medium";
  if (hasQuote && hasClauseId) return "medium";
  return "low";
}

export function scoreNegotiationConfidence(
  nego: NegotiationPoint,
  source: string
): ConfidenceLevel {
  const verified = quoteVerifiedInText(source, nego.quote);
  const advisory = nego.quote && nego.suggested
    ? isAdvisoryRevision(nego.quote, nego.suggested)
    : true;
  if (verified && nego.clauseId && !advisory) return "high";
  if (verified && !advisory) return "medium";
  return "low";
}

export function annotateScanConfidence(
  result: ScanResult,
  source: string
): ScanResult {
  const flags = result.flags.map((f) => ({
    ...f,
    confidence: scoreFlagConfidence(f, source),
  }));
  const negotiations = (result.negotiations ?? []).map((n) => ({
    ...n,
    confidence: scoreNegotiationConfidence(n, source),
  }));

  return { ...result, flags, negotiations };
}

export function computeQualityStats(result: ScanResult): AnalysisQualityStats {
  const flags = result.flags;
  const highConfidence = flags.filter((f) => f.confidence === "high").length;
  const needsReview = flags.filter((f) => f.confidence === "low").length;
  const quoteVerified = flags.filter((f) => f.quote?.trim()).length;
  const clauseReadySuggestions = flags.filter(
    (f) =>
      f.suggestion?.trim() &&
      f.quote?.trim() &&
      !isAdvisoryRevision(f.quote, f.suggestion)
  ).length;

  return {
    totalFlags: flags.length,
    highConfidence,
    needsReview,
    quoteVerified,
    clauseReadySuggestions,
  };
}
