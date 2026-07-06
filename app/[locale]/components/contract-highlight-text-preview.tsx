"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { isHeadingLine } from "@/lib/contract-format";
import { locateAllChanges, type LocatedChange } from "@/lib/redline";
import type { ContractChange } from "@/lib/types";

function lineSegments(
  line: string,
  lineStart: number,
  located: LocatedChange[],
  focusedIndex: number | null
): ReactNode[] {
  if (!line) return [];

  const lineEnd = lineStart + line.length;
  const active = located.filter(
    (l) => l.matched && l.start < lineEnd && l.end > lineStart
  );
  if (!active.length) return [line];

  const bounds = new Set<number>([0, line.length]);
  for (const l of active) {
    bounds.add(Math.max(0, l.start - lineStart));
    bounds.add(Math.min(line.length, l.end - lineStart));
  }
  const cuts = [...bounds].sort((a, b) => a - b);
  const nodes: ReactNode[] = [];

  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]!;
    const b = cuts[i + 1]!;
    if (a === b) continue;
    const text = line.slice(a, b);
    const absStart = lineStart + a;
    const absEnd = lineStart + b;
    const covering = active.filter((l) => l.start <= absStart && l.end >= absEnd);
    if (!covering.length) {
      nodes.push(<span key={`${lineStart}-${a}`}>{text}</span>);
    } else {
      const primary = covering[0]!;
      nodes.push(
        <mark
          key={`${lineStart}-${a}`}
          id={`highlight-${primary.index}`}
          className={`preview-highlight-target preview-highlight-target--linked${focusedIndex === primary.index ? " preview-highlight-target--focused" : ""}`}
          data-suggestion={primary.index + 1}
        >
          <sup className="highlight-badge" aria-hidden>
            {covering.map((c) => c.index + 1).join(",")}
          </sup>
          {text}
        </mark>
      );
    }
  }
  return nodes;
}

/** Text-only fallback — A4-style page with structured paragraphs. */
export default function ContractHighlightTextPreview({
  contractText,
  changes,
  focusedIndex = null,
}: {
  contractText: string;
  changes: ContractChange[];
  focusedIndex?: number | null;
}) {
  const t = useTranslations("revise");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { source, located } = useMemo(
    () => locateAllChanges(contractText, changes, { strict: true }),
    [contractText, changes]
  );

  const matchedCount = located.filter((l) => l.matched).length;
  const unmatched = changes.length - matchedCount;

  const lines = useMemo(() => {
    const out: { text: string; start: number; kind: "title" | "heading" | "body" }[] = [];
    let offset = 0;
    let titleSet = false;
    for (const part of source.split("\n")) {
      const trimmed = part.trim();
      if (!trimmed) {
        offset += part.length + 1;
        continue;
      }
      let kind: "title" | "heading" | "body" = "body";
      if (!titleSet) {
        kind = "title";
        titleSet = true;
      } else if (isHeadingLine(trimmed)) {
        kind = "heading";
      }
      out.push({ text: trimmed, start: offset + part.indexOf(trimmed), kind });
      offset += part.length + 1;
    }
    return out;
  }, [source]);

  useEffect(() => {
    if (focusedIndex == null) return;
    scrollRef.current?.querySelector(`#highlight-${focusedIndex}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [focusedIndex]);

  return (
    <div className="original-preview-box flex-1 min-h-0 flex flex-col border-0 rounded-none bg-paper-dark/30">
      <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-2 shrink-0">
        <span className="text-xs text-ink-muted font-sans">
          {t("highlightMappedCount", { matched: matchedCount, total: changes.length })}
        </span>
        {changes.length > 0 && (
          <span className="preview-highlight-target px-1.5 py-0.5 text-xs">
            {t("legendHighlightNumbered")}
          </span>
        )}
      </div>
      {unmatched > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50/80 mx-4 mb-2 rounded-lg p-2 font-sans shrink-0">
          {matchedCount > 0
            ? t("previewPartialMatch", { matched: matchedCount, total: changes.length })
            : t("highlightNoMatch")}
        </p>
      )}
      <div ref={scrollRef} className="doc-editor-scroll flex-1 min-h-0 p-3 sm:p-4">
        <div className="contract-document-page contract-document-page--text">
          {lines.map(({ text, start, kind }, li) => (
            <p key={li} className={`doc-line doc-line--${kind}`}>
              {lineSegments(text, start, located, focusedIndex)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
