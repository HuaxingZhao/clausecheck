/** When an inner scroll pane hits top/bottom, pass wheel delta to the page. */

const EDGE = 2;

function scrollMetrics(el: HTMLElement) {
  const { scrollTop, scrollHeight, clientHeight } = el;
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  return {
    maxScroll,
    scrollable: maxScroll > EDGE,
    atTop: scrollTop <= EDGE,
    atBottom: scrollTop >= maxScroll - EDGE,
  };
}

function scrollPageBy(deltaY: number) {
  window.scrollBy({ top: deltaY, left: 0, behavior: "auto" });
}

/** Attach wheel listener so overscroll at pane edges chains to document scroll. */
export function attachScrollChainToPage(el: HTMLElement): () => void {
  const onWheel = (e: WheelEvent) => {
    const dy = e.deltaY;
    if (dy === 0) return;

    const { scrollable, atTop, atBottom } = scrollMetrics(el);

    if (!scrollable) {
      e.preventDefault();
      scrollPageBy(dy);
      return;
    }

    if (atBottom && dy > 0) {
      e.preventDefault();
      scrollPageBy(dy);
    } else if (atTop && dy < 0) {
      e.preventDefault();
      scrollPageBy(dy);
    }
  };

  el.addEventListener("wheel", onWheel, { passive: false });
  return () => el.removeEventListener("wheel", onWheel);
}
