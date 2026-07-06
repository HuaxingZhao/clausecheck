import { locateAllChangesOrdered } from "./locate-changes-ordered";
import { snapChangesToSource } from "./redline";
import { extractSectionHint, passageFromFlag } from "./review-items";
import type { ContractChange } from "./types";
import type { NegotiationPoint, RiskFlag, ScanResult } from "./types";

/** Align AI quotes/summaries to verbatim passages in extracted contract text. */
export function snapScanResultToSource(
  contractText: string,
  result: ScanResult
): ScanResult {
  if (!contractText?.trim()) return result;

  const flags = snapFlags(contractText, result.flags);
  const negotiations = snapNegotiations(contractText, result.negotiations ?? []);

  return { ...result, flags, negotiations };
}

function snapFlags(contractText: string, flags: RiskFlag[]): RiskFlag[] {
  if (!flags.length) return flags;

  const changes: ContractChange[] = flags.map((flag) => ({
    section: extractSectionHint(flag.text, flag.category, flag.quote),
    original: passageFromFlag(flag),
    revised: flag.suggestion || "",
  }));

  const snapped = snapChangesToSource(contractText, changes);
  const { located, source } = locateAllChangesOrdered(contractText, snapped, {
    strict: false,
    format: true,
  });

  return flags.map((flag, i) => {
    const loc = located[i];
    const verbatim =
      loc?.matched && source
        ? source.slice(loc.start, loc.end).trim()
        : snapped[i]?.original?.trim();
    return verbatim ? { ...flag, quote: verbatim } : flag;
  });
}

function snapNegotiations(
  contractText: string,
  negotiations: NegotiationPoint[]
): NegotiationPoint[] {
  if (!negotiations.length) return negotiations;

  const changes: ContractChange[] = negotiations.map((nego) => {
    const quote = (nego as NegotiationPoint & { quote?: string }).quote?.trim();
    return {
      section: extractSectionHint(nego.clause, quote, nego.current),
      original: quote || nego.current?.trim() || nego.clause?.trim() || "",
      revised: nego.suggested || "",
    };
  });

  const snapped = snapChangesToSource(contractText, changes);
  const { located, source } = locateAllChangesOrdered(contractText, snapped, {
    strict: false,
    format: true,
  });

  return negotiations.map((nego, i) => {
    const loc = located[i];
    const verbatim =
      loc?.matched && source
        ? source.slice(loc.start, loc.end).trim()
        : snapped[i]?.original?.trim();
    if (!verbatim) return nego;
    return { ...nego, quote: verbatim, current: verbatim };
  });
}
