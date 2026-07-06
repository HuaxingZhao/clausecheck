import type { LockedReviewItem } from "./types";

export interface ReviewMarkPin {
  index: number;
  displayNum: number;
  matched: boolean;
}

export interface ReviewMarkSegment {
  start: number;
  end: number;
  pins: ReviewMarkPin[];
}

export interface ReviewTextSegment {
  kind: "text" | "mark";
  text: string;
  mark?: ReviewMarkSegment;
}

const PIN_BODY_MIN = 6;
const PIN_BODY_MAX = 48;
const MERGE_GAP = 24;

function pinBodyEnd(item: LockedReviewItem): number {
  const span = item.end - item.start;
  if (span <= PIN_BODY_MAX) return item.end;
  if (item.matched) {
    return Math.min(item.end, item.start + PIN_BODY_MAX);
  }
  return item.start + PIN_BODY_MIN;
}

/** Every navigable item gets a pin; nearby pins merge into one mark with multiple badges. */
export function buildReviewMarkSegments(
  source: string,
  editableItems: LockedReviewItem[]
): { segments: ReviewTextSegment[]; markedIndices: Set<number> } {
  const displayNumByIndex = new Map(
    editableItems.map((item, i) => [item.index, i + 1])
  );

  const pins = editableItems
    .filter((item) => item.navigable && item.end > item.start)
    .map((item) => ({
      index: item.index,
      displayNum: displayNumByIndex.get(item.index) ?? item.index + 1,
      matched: item.matched,
      start: item.start,
      end: pinBodyEnd(item),
    }))
    .sort((a, b) => a.start - b.start || a.index - b.index);

  const groups: ReviewMarkSegment[] = [];
  for (const pin of pins) {
    const last = groups[groups.length - 1];
    if (last && pin.start <= last.end + MERGE_GAP) {
      last.pins.push({
        index: pin.index,
        displayNum: pin.displayNum,
        matched: pin.matched,
      });
      last.end = Math.max(last.end, pin.end);
    } else {
      groups.push({
        start: pin.start,
        end: pin.end,
        pins: [
          {
            index: pin.index,
            displayNum: pin.displayNum,
            matched: pin.matched,
          },
        ],
      });
    }
  }

  const markedIndices = new Set(pins.map((p) => p.index));
  const segments: ReviewTextSegment[] = [];
  let pos = 0;

  for (const group of groups) {
    if (pos < group.start) {
      segments.push({ kind: "text", text: source.slice(pos, group.start) });
    }
    segments.push({
      kind: "mark",
      text: source.slice(group.start, group.end),
      mark: group,
    });
    pos = group.end;
  }

  if (pos < source.length) {
    segments.push({ kind: "text", text: source.slice(pos) });
  }

  return {
    segments: segments.length ? segments : [{ kind: "text", text: source }],
    markedIndices,
  };
}
