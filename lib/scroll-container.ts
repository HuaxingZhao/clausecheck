/** Scroll a child element into view within a scroll container (not the page). */
export function scrollChildIntoContainer(
  scrollEl: HTMLElement,
  child: HTMLElement,
  align: "center" | "top" = "center",
  offset = 16
) {
  const childRect = child.getBoundingClientRect();
  const containerRect = scrollEl.getBoundingClientRect();
  const relativeTop = childRect.top - containerRect.top + scrollEl.scrollTop;

  let targetTop: number;
  if (align === "top") {
    targetTop = relativeTop - offset;
  } else {
    targetTop = relativeTop - scrollEl.clientHeight * 0.32;
  }

  scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
}
