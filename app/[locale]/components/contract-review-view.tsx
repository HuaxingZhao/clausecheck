"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { LockedReviewItem, ScanResult } from "@/lib/types";
import { scrollChildIntoContainer } from "@/lib/scroll-container";
import { attachScrollChainToPage } from "@/lib/scroll-chain-to-page";
import { buildReviewMarkSegments } from "@/lib/review-mark-segments";
import { lockedItemsToLocated, resolveContractReview } from "@/lib/lock-suggestions";
import { acceptIdsForLevels } from "@/lib/review-to-changes";
import ContractReadonlyPane from "./contract-readonly-pane";
import ContractSuggestionsPane from "./contract-suggestions-pane";
import ContractReviewPipeline from "./contract-review-pipeline";
import ReviewActionsBar from "./review-actions-bar";
import ReviewNavigator from "./review-navigator";

interface ContractReviewViewProps {
  result: ScanResult;
  /** Fallback for demo/legacy responses without embedded contractReview */
  contractText?: string | null;
  locale: string;
  isPro: boolean;
  sourceFile: File | null;
  onUpgrade?: () => void;
  onBackToAnalysis?: () => void;
}

export default function ContractReviewView({
  result,
  contractText,
  locale,
  isPro,
  sourceFile,
  onUpgrade,
  onBackToAnalysis,
}: ContractReviewViewProps) {
  const t = useTranslations("review");
  const [mobilePane, setMobilePane] = useState<"original" | "suggestions">("original");
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const didAutoFocus = useRef(false);
  const didInitAccept = useRef(false);
  const originalScrollRef = useRef<HTMLDivElement>(null);
  const suggestionsScrollRef = useRef<HTMLDivElement>(null);

  const review = useMemo(
    () => resolveContractReview(result, contractText),
    [result, contractText]
  );

  if (!review) return null;

  const items: LockedReviewItem[] = review.items;
  const reviewSource = review.source;
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [selectedLevels, setSelectedLevels] = useState<Set<"high" | "medium" | "low">>(
    () => new Set(["high"])
  );

  useEffect(() => {
    if (didInitAccept.current || !items.length) return;
    const initialLevels = new Set<"high" | "medium" | "low">(["high"]);
    setSelectedLevels(initialLevels);
    setAcceptedIds(acceptIdsForLevels(items, initialLevels));
    didInitAccept.current = true;
  }, [items]);

  const located = useMemo(() => lockedItemsToLocated(items), [items]);
  const source = review.source;
  const editableItems = useMemo(
    () => items.filter((i) => i.kind !== "missing"),
    [items]
  );
  const navigableIndices = useMemo(
    () => editableItems.filter((i) => i.navigable).map((i) => i.index),
    [editableItems]
  );
  const displayNumByIndex = useMemo(
    () => new Map(editableItems.map((item, i) => [item.index, i + 1])),
    [editableItems]
  );
  const markedIndices = useMemo(
    () => buildReviewMarkSegments(source, editableItems).markedIndices,
    [source, editableItems]
  );

  const scrollToReviewItem = useCallback((index: number) => {
    const card = document.getElementById(`review-card-${index}`);
    if (suggestionsScrollRef.current && card) {
      scrollChildIntoContainer(suggestionsScrollRef.current, card, "top", 8);
    }

    const originalScroll = originalScrollRef.current;
    if (originalScroll) {
      window.requestAnimationFrame(() => {
        const pin = originalScroll.querySelector(`[data-pin-index="${index}"]`);
        const mark = originalScroll.querySelector(`#highlight-${index}`);
        const target = (pin ?? mark) as HTMLElement | null;
        if (target) scrollChildIntoContainer(originalScroll, target, "center");
      });
    }
  }, []);

  const handleFocus = useCallback(
    (index: number) => {
      const item = items.find((i) => i.index === index);
      if (!item || item.kind === "missing" || !item.navigable) {
        if (item?.kind === "missing") setMobilePane("suggestions");
        return;
      }
      setMobilePane("suggestions");
      setFocusedIndex(index);
      scrollToReviewItem(index);
    },
    [scrollToReviewItem, items]
  );

  useEffect(() => {
    if (didAutoFocus.current) return;
    const first = navigableIndices[0];
    if (first != null) {
      setFocusedIndex(first);
      window.setTimeout(() => scrollToReviewItem(first), 80);
      didAutoFocus.current = true;
    }
  }, [navigableIndices, scrollToReviewItem]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (navigableIndices.length === 0) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const pos =
          focusedIndex != null ? navigableIndices.indexOf(focusedIndex) : -1;
        const nextPos =
          pos < 0 || pos >= navigableIndices.length - 1 ? 0 : pos + 1;
        handleFocus(navigableIndices[nextPos]!);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const pos =
          focusedIndex != null ? navigableIndices.indexOf(focusedIndex) : 0;
        const nextPos =
          pos <= 0 ? navigableIndices.length - 1 : pos - 1;
        handleFocus(navigableIndices[nextPos]!);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigableIndices, focusedIndex, handleFocus]);

  const toggleAccept = useCallback((id: string) => {
    setAcceptedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLevelToggle = useCallback((level: "high" | "medium" | "low") => {
    setSelectedLevels((prevLevels) => {
      const nextLevels = new Set(prevLevels);
      const enabling = !nextLevels.has(level);
      if (enabling) nextLevels.add(level);
      else nextLevels.delete(level);

      setAcceptedIds((prevIds) => {
        const nextIds = new Set(prevIds);
        for (const item of items) {
          if (item.level !== level) continue;
          if (enabling) nextIds.add(item.id);
          else nextIds.delete(item.id);
        }
        return nextIds;
      });

      return nextLevels;
    });
  }, [items]);

  const clearAll = useCallback(() => {
    setAcceptedIds(new Set());
    setSelectedLevels(new Set());
  }, []);

  useEffect(() => {
    const panes = [originalScrollRef.current, suggestionsScrollRef.current].filter(
      (el): el is HTMLDivElement => el != null
    );
    if (!panes.length) return;
    const cleanups = panes.map((el) => attachScrollChainToPage(el));
    return () => cleanups.forEach((fn) => fn());
  }, [source.length, items.length]);

  return (
    <div className="space-y-4">
      <ReviewActionsBar
        items={items}
        acceptedIds={acceptedIds}
        selectedLevels={selectedLevels}
        onLevelToggle={handleLevelToggle}
        onClearAll={clearAll}
        result={result}
        contractText={reviewSource}
        locale={locale}
        isPro={isPro}
        sourceFile={sourceFile}
        onUpgrade={onUpgrade}
        onBackToAnalysis={onBackToAnalysis}
      />
      <ContractReviewPipeline
        clauseCount={review.clauseCount}
        stats={review.stats}
        locale={locale}
      />
      {navigableIndices.length > 0 && (
        <ReviewNavigator
          navigableIndices={navigableIndices}
          displayNumByIndex={displayNumByIndex}
          focusedIndex={focusedIndex}
          onNavigate={handleFocus}
        />
      )}
      <div className="contract-review-mobile-tabs lg:hidden" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === "original"}
          className={`contract-review-mobile-tab${mobilePane === "original" ? " contract-review-mobile-tab--active" : ""}`}
          onClick={() => setMobilePane("original")}
        >
          {t("mobileTabOriginal")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === "suggestions"}
          className={`contract-review-mobile-tab${mobilePane === "suggestions" ? " contract-review-mobile-tab--active" : ""}`}
          onClick={() => setMobilePane("suggestions")}
        >
          {t("mobileTabSuggestions")}
        </button>
      </div>
      <div className="contract-review-shell">
        <div
          className={
            mobilePane === "original"
              ? "min-h-0 flex flex-col lg:contents"
              : "min-h-0 hidden flex-col lg:contents"
          }
        >
          <ContractReadonlyPane
            scrollRef={originalScrollRef}
            contractSource={source}
            editableItems={editableItems}
            focusedIndex={focusedIndex}
            stats={review.stats}
            locale={locale}
            onMarkClick={(index) => {
              setMobilePane("original");
              handleFocus(index);
            }}
          />
        </div>
        <div
          className={
            mobilePane === "suggestions"
              ? "min-h-0 flex flex-col lg:contents"
              : "min-h-0 hidden flex-col lg:contents"
          }
        >
          <ContractSuggestionsPane
            ref={suggestionsScrollRef}
            items={items}
            located={located}
            markedIndices={markedIndices}
            displayNumByIndex={displayNumByIndex}
            focusedIndex={focusedIndex}
            acceptedIds={acceptedIds}
            onToggleAccept={toggleAccept}
            onFocus={handleFocus}
          />
        </div>
      </div>
    </div>
  );
}
