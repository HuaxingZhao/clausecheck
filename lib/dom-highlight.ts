import type { LocatedChange } from "@/lib/redline";

interface TextSegment {
  node: Text;
  start: number;
  end: number;
}

function buildTextNodeMap(root: HTMLElement): { segments: TextSegment[]; length: number } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const segments: TextSegment[] = [];
  let offset = 0;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.data.length;
    if (len > 0) {
      segments.push({ node, start: offset, end: offset + len });
      offset += len;
    }
    node = walker.nextNode() as Text | null;
  }
  return { segments, length: offset };
}

function positionToPoint(
  segments: TextSegment[],
  offset: number
): { node: Text; nodeOffset: number } | null {
  for (const seg of segments) {
    if (offset >= seg.start && offset <= seg.end) {
      return { node: seg.node, nodeOffset: offset - seg.start };
    }
  }
  return null;
}

/** Remove highlight marks from a rendered HTML container. */
export function clearDomHighlights(root: HTMLElement) {
  root.querySelectorAll("mark.preview-highlight-target").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  root.normalize();
}

/** Wrap a single highlight range (review pane — one focused suggestion at a time). */
export function wrapSingleHighlight(
  root: HTMLElement,
  start: number,
  end: number,
  index: number,
  focused: boolean
) {
  wrapTextRange(root, start, end, index, focused);
}

/** Wrap located suggestion ranges with numbered red highlight marks (end → start). */
export function applyDomHighlights(
  root: HTMLElement,
  located: LocatedChange[],
  focusedIndex: number | null
) {
  clearDomHighlights(root);

  const matched = located
    .filter((l) => l.matched && l.end > l.start)
    .sort((a, b) => b.start - a.start);

  for (const loc of matched) {
    try {
      wrapTextRange(root, loc.start, loc.end, loc.index, focusedIndex === loc.index);
    } catch {
      /* overlapping or invalid range — skip */
    }
  }
}

/** Scroll a highlighted mark into view inside a scroll container (not the page). */
export function scrollHighlightIntoContainer(
  scrollEl: HTMLElement,
  root: HTMLElement,
  index: number
) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const mark = root.querySelector(`#highlight-${index}`);
      if (!mark || !scrollEl) return;

      const markRect = mark.getBoundingClientRect();
      const containerRect = scrollEl.getBoundingClientRect();
      const targetTop =
        markRect.top - containerRect.top + scrollEl.scrollTop - containerRect.height * 0.32;
      scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    });
  });
}

/** Scroll an element to the top third of its scroll container. */
export function scrollElementInContainer(
  scrollEl: HTMLElement,
  el: HTMLElement,
  offset = 12
) {
  window.requestAnimationFrame(() => {
    const elRect = el.getBoundingClientRect();
    const containerRect = scrollEl.getBoundingClientRect();
    const targetTop = elRect.top - containerRect.top + scrollEl.scrollTop - offset;
    scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  });
}

function wrapTextRange(
  root: HTMLElement,
  start: number,
  end: number,
  index: number,
  focused: boolean
) {
  const { segments } = buildTextNodeMap(root);
  const startPt = positionToPoint(segments, start);
  const endPt = positionToPoint(segments, end);
  if (!startPt || !endPt) return;

  const range = document.createRange();
  range.setStart(startPt.node, startPt.nodeOffset);
  range.setEnd(endPt.node, endPt.nodeOffset);

  const mark = document.createElement("mark");
  mark.className = `preview-highlight-target preview-highlight-target--linked${
    focused ? " preview-highlight-target--focused" : ""
  }`;
  mark.id = `highlight-${index}`;
  mark.dataset.suggestion = String(index + 1);

  const badge = document.createElement("sup");
  badge.className = "highlight-badge";
  badge.setAttribute("aria-hidden", "true");
  badge.textContent = String(index + 1);

  const contents = range.extractContents();
  mark.appendChild(badge);
  mark.appendChild(contents);
  range.insertNode(mark);
}
