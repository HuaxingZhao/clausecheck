"use client";

import { forwardRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { LockedReviewItem } from "@/lib/types";
import type { LocatedReviewItem } from "@/lib/review-locate";
import SuggestionDiffDisplay from "./suggestion-diff-display";
import { ConfidenceBadge } from "./analysis-quality-banner";

interface ContractSuggestionsPaneProps {
  items: LockedReviewItem[];
  located: LocatedReviewItem[];
  markedIndices: Set<number>;
  displayNumByIndex: Map<number, number>;
  focusedIndex: number | null;
  acceptedIds: Set<string>;
  onToggleAccept: (id: string) => void;
  onFocus: (index: number) => void;
}

function levelClass(level?: string): string {
  if (level === "high") return "review-card--high";
  if (level === "medium") return "review-card--medium";
  if (level === "low") return "review-card--low";
  return "";
}

function kindLabel(
  kind: LockedReviewItem["kind"],
  t: ReturnType<typeof useTranslations<"review">>
): string {
  if (kind === "negotiation") return t("kindNegotiation");
  if (kind === "missing") return t("kindMissing");
  return t("kindRisk");
}

function EditableCard({
  item,
  displayNum,
  located,
  markedIndices,
  focused,
  accepted,
  onToggleAccept,
  onFocus,
  t,
  tQuality,
}: {
  item: LockedReviewItem;
  displayNum: number;
  located: LocatedReviewItem[];
  markedIndices: Set<number>;
  focused: boolean;
  accepted: boolean;
  onToggleAccept: (id: string) => void;
  onFocus: (index: number) => void;
  t: ReturnType<typeof useTranslations<"review">>;
  tQuality: ReturnType<typeof useTranslations<"quality">>;
}) {
  const loc = located.find((l) => l.index === item.index);
  const sectionOnly = loc?.navigable && !loc?.matched;
  const hasMark = markedIndices.has(item.index);

  return (
    <article
      id={`review-card-${item.index}`}
      className={`review-suggestion-card ${levelClass(item.level)} ${
        focused ? "review-suggestion-card--focused" : ""
      } ${sectionOnly ? "review-suggestion-card--section" : ""}`}
    >
      <button
        type="button"
        className="review-suggestion-card-header w-full text-left"
        onClick={() => onFocus(item.index)}
      >
        <span
          className={`review-suggestion-number ${
            focused ? "review-suggestion-number--focused" : ""
          }`}
        >
          {displayNum}
        </span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="review-suggestion-kind">{kindLabel(item.kind, t)}</span>
            {item.level && (
              <span className={`review-level-badge review-level-badge--${item.level}`}>
                {t(`level_${item.level}`)}
              </span>
            )}
            <ConfidenceBadge confidence={item.confidence} t={tQuality} />
          </div>
          <p className="review-suggestion-title font-sans font-semibold text-sm text-ink">
            {item.clauseLabel || item.title}
          </p>
          <SuggestionDiffDisplay
            original={item.originalText}
            revised={item.suggestionText}
          />
          {item.reason && (
            <p className="text-xs text-ink-muted font-sans leading-relaxed">{item.reason}</p>
          )}
          {sectionOnly && (
            <p className="text-xs text-amber-800/90 font-sans bg-amber-50/80 rounded px-2 py-1 leading-relaxed">
              {t("sectionOnlyLocated")}
            </p>
          )}
          {loc?.navigable && hasMark && (
            <p className="text-xs text-green-800/90 font-sans">{t("linkedToMark", { num: displayNum })}</p>
          )}
        </div>
      </button>
      <label className="review-accept-row">
        <input
          type="checkbox"
          checked={accepted}
          onChange={() => onToggleAccept(item.id)}
        />
        <span>{t("acceptSuggestion")}</span>
      </label>
    </article>
  );
}

function UnlocatedCard({
  item,
  displayNum,
  accepted,
  onToggleAccept,
  t,
  tQuality,
}: {
  item: LockedReviewItem;
  displayNum: number;
  accepted: boolean;
  onToggleAccept: (id: string) => void;
  t: ReturnType<typeof useTranslations<"review">>;
  tQuality: ReturnType<typeof useTranslations<"quality">>;
}) {
  return (
    <article
      id={`review-card-${item.index}`}
      className="review-suggestion-card review-suggestion-card--unlocated"
    >
      <div className="review-suggestion-card-header p-3">
        <span className="review-suggestion-number review-suggestion-number--unlocated">
          {displayNum}
        </span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="review-suggestion-kind">{kindLabel(item.kind, t)}</span>
            {item.level && (
              <span className={`review-level-badge review-level-badge--${item.level}`}>
                {t(`level_${item.level}`)}
              </span>
            )}
            <ConfidenceBadge confidence={item.confidence} t={tQuality} />
          </div>
          <p className="review-suggestion-title font-sans font-semibold text-sm text-ink">
            {item.clauseLabel || item.title}
          </p>
          <SuggestionDiffDisplay
            original={item.originalText}
            revised={item.suggestionText}
          />
          {item.reason && (
            <p className="text-xs text-ink-muted font-sans leading-relaxed">{item.reason}</p>
          )}
          <p className="text-xs text-amber-800 font-sans bg-amber-50 rounded px-2 py-1.5 leading-relaxed">
            {t("notLocated")}
          </p>
          <p className="text-xs text-ink-muted font-sans leading-relaxed">{t("unlocatedNote")}</p>
        </div>
      </div>
      <label className="review-accept-row">
        <input
          type="checkbox"
          checked={accepted}
          onChange={() => onToggleAccept(item.id)}
        />
        <span>{t("acceptUnlocated")}</span>
      </label>
    </article>
  );
}

function MissingCard({
  item,
  accepted,
  onToggleAccept,
  t,
}: {
  item: LockedReviewItem;
  accepted: boolean;
  onToggleAccept: (id: string) => void;
  t: ReturnType<typeof useTranslations<"review">>;
}) {
  return (
    <article className="review-suggestion-card review-suggestion-card--missing">
      <div className="review-suggestion-card-header p-3">
        <span className="review-suggestion-number review-suggestion-number--missing">+</span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="review-suggestion-kind">{kindLabel(item.kind, t)}</span>
            {item.level && (
              <span className={`review-level-badge review-level-badge--${item.level}`}>
                {t(`level_${item.level}`)}
              </span>
            )}
          </div>
          <p className="review-suggestion-title font-sans font-semibold text-sm text-ink">
            {item.title}
          </p>
          <div className="review-missing-block">
            <span className="suggestion-context-label">{t("suggestedAddition")}</span>
            <p className="text-sm text-ink leading-relaxed">{item.suggestionText}</p>
          </div>
          {item.reason && (
            <p className="text-xs text-ink-muted font-sans leading-relaxed">{item.reason}</p>
          )}
          <p className="text-xs text-blue-800/90 font-sans bg-blue-50/80 rounded px-2 py-1.5 leading-relaxed">
            {t("missingClauseNote")}
          </p>
        </div>
      </div>
      <label className="review-accept-row">
        <input
          type="checkbox"
          checked={accepted}
          onChange={() => onToggleAccept(item.id)}
        />
        <span>{t("acceptMissing")}</span>
      </label>
    </article>
  );
}

function SuggestionGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="review-suggestions-group">
      <h4 className="review-suggestions-group-title">{title}</h4>
      <p className="review-suggestions-group-hint">{hint}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

const ContractSuggestionsPane = forwardRef<HTMLDivElement, ContractSuggestionsPaneProps>(
  function ContractSuggestionsPane(
    {
      items,
      located,
      markedIndices,
      displayNumByIndex,
      focusedIndex,
      acceptedIds,
      onToggleAccept,
      onFocus,
    },
    ref
  ) {
    const t = useTranslations("review");
    const tQuality = useTranslations("quality");

    const editableItems = items.filter((i) => i.kind !== "missing");
    const missingItems = items.filter((i) => i.kind === "missing");

    const matchedItems = editableItems.filter(
      (i) => i.navigable && i.matched
    );
    const sectionItems = editableItems.filter(
      (i) => i.navigable && !i.matched
    );
    const unlocatedItems = editableItems.filter((i) => !i.navigable);

    if (!items.length) {
      return (
        <div className="contract-review-pane contract-review-pane--suggestions">
          <header className="contract-review-pane-header">
            <h3 className="contract-review-pane-title">{t("suggestionsTitle")}</h3>
          </header>
          <p className="text-sm text-ink-muted font-sans p-4">{t("noSuggestions")}</p>
        </div>
      );
    }

    const renderEditable = (groupItems: LockedReviewItem[]) =>
      groupItems.map((item) => (
        <EditableCard
          key={item.id}
          item={item}
          displayNum={displayNumByIndex.get(item.index) ?? item.index + 1}
          located={located}
          markedIndices={markedIndices}
          focused={focusedIndex === item.index}
          accepted={acceptedIds.has(item.id)}
          onToggleAccept={onToggleAccept}
          onFocus={onFocus}
          t={t}
          tQuality={tQuality}
        />
      ));

    return (
      <div className="contract-review-pane contract-review-pane--suggestions">
        <header className="contract-review-pane-header">
          <h3 className="contract-review-pane-title">{t("suggestionsTitle")}</h3>
          <p className="contract-review-pane-hint">{t("suggestionsHint")}</p>
        </header>
        <div ref={ref} className="contract-review-suggestions-list">
          {matchedItems.length > 0 && (
            <SuggestionGroup title={t("matchedGroupTitle")} hint={t("matchedGroupHint")}>
              {renderEditable(matchedItems)}
            </SuggestionGroup>
          )}

          {sectionItems.length > 0 && (
            <SuggestionGroup
              title={t("sectionGroupTitle")}
              hint={t("sectionGroupHint")}
            >
              {renderEditable(sectionItems)}
            </SuggestionGroup>
          )}

          {unlocatedItems.length > 0 && (
            <SuggestionGroup
              title={t("unlocatedGroupTitle")}
              hint={t("unlocatedGroupHint")}
            >
              {unlocatedItems.map((item) => (
                <UnlocatedCard
                  key={item.id}
                  item={item}
                  displayNum={displayNumByIndex.get(item.index) ?? item.index + 1}
                  accepted={acceptedIds.has(item.id)}
                  onToggleAccept={onToggleAccept}
                  t={t}
                  tQuality={tQuality}
                />
              ))}
            </SuggestionGroup>
          )}

          {missingItems.length > 0 && (
            <SuggestionGroup
              title={t("missingGroupTitle")}
              hint={t("missingGroupHint")}
            >
              {missingItems.map((item) => (
                <MissingCard
                  key={item.id}
                  item={item}
                  accepted={acceptedIds.has(item.id)}
                  onToggleAccept={onToggleAccept}
                  t={t}
                />
              ))}
            </SuggestionGroup>
          )}
        </div>
      </div>
    );
  }
);

export default ContractSuggestionsPane;
