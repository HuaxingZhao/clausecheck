import type { ContractChange } from "./types";
import { locateAllChangesOrdered } from "./locate-changes-ordered";
import { snapChangesToSource } from "./redline";

export type LocateTextOptions = {
  /** When false, do not re-run formatContractText (use for TipTap/editor plain text). */
  format?: boolean;
  strict?: boolean;
};

/** Snap suggestions to verbatim passages in the given source text. */
export function refineChangesForSource(
  sourceText: string,
  changes: ContractChange[],
  opts?: LocateTextOptions
): ContractChange[] {
  const format = opts?.format !== false;
  const snapped = snapChangesToSource(sourceText, changes.map((c) => ({ ...c })), {
    format,
  });
  const { located, source } = locateAllChangesOrdered(sourceText, snapped, {
    strict: opts?.strict ?? false,
    format,
  });

  return snapped.map((change, i) => {
    const loc = located[i];
    if (loc?.matched && source) {
      return { ...change, original: source.slice(loc.start, loc.end) };
    }
    return change;
  });
}
