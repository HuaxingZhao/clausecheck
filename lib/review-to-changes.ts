import type { ContractChange, LockedReviewItem } from "./types";

/** Re-export for export callers that already import from this module. */
export { getAiDisclaimerExport } from "./ai-disclaimer";

/** 将已采纳的审阅项转为可导出/修订的 ContractChange 列表 */
export function lockedItemsToChanges(
  items: LockedReviewItem[],
  acceptedIds: Set<string>
): ContractChange[] {
  const changes: ContractChange[] = [];
  for (const item of items) {
    if (!acceptedIds.has(item.id)) continue;
    if (item.kind === "missing") {
      changes.push({
        section: item.clauseLabel || item.title,
        original: "",
        revised: item.suggestionText,
        reason: item.reason || item.title,
      });
      continue;
    }
    if (!item.originalText?.trim() || !item.suggestionText?.trim()) continue;
    changes.push({
      section: item.clauseLabel || item.title,
      original: item.originalText,
      revised: item.suggestionText,
      reason: item.reason,
    });
  }
  return changes;
}

/** 按风险等级批量采纳 */
export function acceptIdsForLevels(
  items: LockedReviewItem[],
  levels: Set<"high" | "medium" | "low">
): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.level && levels.has(item.level)) ids.add(item.id);
  }
  return ids;
}

/** 默认采纳：高置信 + 高风险；或高风险且可定位 */
export function defaultAcceptedIds(items: LockedReviewItem[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.kind === "missing") {
      if (item.level === "high") ids.add(item.id);
      continue;
    }
    if (item.confidence === "high") {
      ids.add(item.id);
      continue;
    }
    if (item.level === "high" && item.navigable && item.confidence !== "low") {
      ids.add(item.id);
    }
  }
  return ids;
}
