"use client";

import { useMemo, type RefObject } from "react";
import { useTranslations } from "next-intl";
import type { LockedReviewItem } from "@/lib/types";
import { buildReviewMarkSegments } from "@/lib/review-mark-segments";

interface ContractReadonlyPaneProps {
  scrollRef: RefObject<HTMLDivElement>;
  contractSource: string;
  editableItems: LockedReviewItem[];
  focusedIndex: number | null;
  stats: { matched: number; navigable: number; editable: number; missing: number };
  locale: string;
  onMarkClick: (index: number) => void;
}

export default function ContractReadonlyPane({
  scrollRef,
  contractSource,
  editableItems,
  focusedIndex,
  stats,
  locale,
  onMarkClick,
}: ContractReadonlyPaneProps) {
  const t = useTranslations("review");

  const { segments, markedIndices } = useMemo(
    () => buildReviewMarkSegments(contractSource, editableItems),
    [contractSource, editableItems]
  );

  return (
    <div className="contract-review-pane contract-review-pane--original">
      <header className="contract-review-pane-header">
        <h3 className="contract-review-pane-title">{t("originalTitle")}</h3>
        <p className="contract-review-pane-hint">{t("originalHint")}</p>
        {stats.editable > 0 && (
          <p className="contract-review-locate-stats text-xs text-ink-muted font-sans mt-1">
            {t("marksInText", { marks: markedIndices.size, total: stats.navigable })}
            <span className="mx-1">·</span>
            {t("locatedCount", { matched: stats.matched, total: stats.editable })}
            {stats.missing > 0 && (
              <span className="ml-1 text-ink-muted/80">
                {t("missingCountNote", { count: stats.missing })}
              </span>
            )}
          </p>
        )}
      </header>
      <div ref={scrollRef} className="contract-review-pane-scroll">
        <div
          className={`contract-document-page contract-document-page--readonly contract-document-page--word ${
            locale === "en" ? "contract-document-page--en" : "contract-document-page--zh"
          }`}
        >
          <div className="contract-readonly-body">
            {segments.map((seg, i) =>
              seg.kind === "text" ? (
                <span key={`t-${i}`}>{seg.text}</span>
              ) : (
                <mark
                  key={`m-${seg.mark!.start}-${seg.mark!.pins.map((p) => p.index).join("-")}`}
                  id={`highlight-${seg.mark!.pins[0]!.index}`}
                  role="button"
                  tabIndex={0}
                  className={`preview-highlight-target preview-highlight-target--linked contract-readonly-mark contract-readonly-mark--group${
                    seg.mark!.pins.some((p) => p.index === focusedIndex)
                      ? " preview-highlight-target--focused contract-readonly-mark--focused"
                      : " contract-readonly-mark--idle"
                  }`}
                  onClick={() => {
                    const primary = seg.mark!.pins[0];
                    if (primary) onMarkClick(primary.index);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const primary = seg.mark!.pins[0];
                      if (primary) onMarkClick(primary.index);
                    }
                  }}
                >
                  <span className="contract-readonly-pin-row">
                    {seg.mark!.pins.map((pin) => (
                      <button
                        key={pin.index}
                        type="button"
                        data-pin-index={pin.index}
                        className={`contract-readonly-pin${
                          focusedIndex === pin.index
                            ? " contract-readonly-pin--focused"
                            : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkClick(pin.index);
                        }}
                      >
                        {pin.displayNum}
                      </button>
                    ))}
                  </span>
                  {seg.text}
                </mark>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
