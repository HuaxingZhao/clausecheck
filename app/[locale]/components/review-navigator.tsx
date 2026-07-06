"use client";

import { useTranslations } from "next-intl";

interface ReviewNavigatorProps {
  navigableIndices: number[];
  displayNumByIndex: Map<number, number>;
  focusedIndex: number | null;
  onNavigate: (index: number) => void;
}

export default function ReviewNavigator({
  navigableIndices,
  displayNumByIndex,
  focusedIndex,
  onNavigate,
}: ReviewNavigatorProps) {
  const t = useTranslations("review");

  if (navigableIndices.length === 0) return null;

  const pos =
    focusedIndex != null ? navigableIndices.indexOf(focusedIndex) : -1;
  const currentPos = pos >= 0 ? pos : 0;
  const displayNum =
    focusedIndex != null
      ? displayNumByIndex.get(focusedIndex) ?? currentPos + 1
      : displayNumByIndex.get(navigableIndices[0]!) ?? 1;

  const goPrev = () => {
    const nextPos =
      currentPos <= 0 ? navigableIndices.length - 1 : currentPos - 1;
    onNavigate(navigableIndices[nextPos]!);
  };

  const goNext = () => {
    const nextPos =
      currentPos >= navigableIndices.length - 1 ? 0 : currentPos + 1;
    onNavigate(navigableIndices[nextPos]!);
  };

  return (
    <div className="review-navigator" role="navigation" aria-label={t("navigatorLabel")}>
      <button
        type="button"
        className="review-navigator-btn"
        onClick={goPrev}
        aria-label={t("navigatorPrev")}
      >
        ← {t("navigatorPrev")}
      </button>
      <span className="review-navigator-counter">
        {t("navigatorPosition", {
          current: displayNum,
          total: navigableIndices.length,
        })}
      </span>
      <button
        type="button"
        className="review-navigator-btn"
        onClick={goNext}
        aria-label={t("navigatorNext")}
      >
        {t("navigatorNext")} →
      </button>
    </div>
  );
}
