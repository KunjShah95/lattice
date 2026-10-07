/**
 * Where a reader is in an essay, as two pure functions.
 *
 * Kept out of `ReadingRail` for the usual reason on this site: the component is
 * `"use client"`, vitest runs in node, and arithmetic inside one is untested. The
 * component reads real rects and hands the numbers here; nothing below touches the
 * DOM.
 */

/**
 * Index of the section the reader is in: the last heading whose top has reached
 * `offset` (the line just under the sticky header). `-1` before the first heading,
 * so the intro does not light up a section the reader has not reached.
 *
 * `tops` are viewport-relative and in document order, as `getBoundingClientRect`
 * returns them. Scans from the end because the answer is the *last* qualifying
 * heading, and a long essay scrolls near its bottom more often than its top.
 */
export function activeIndex(tops: number[], offset: number): number {
  for (let i = tops.length - 1; i >= 0; i -= 1) {
    if (tops[i] <= offset) return i;
  }
  return -1;
}

/**
 * How far through the article the reader has scrolled, 0–1.
 *
 * 0 while the article's top is still below the viewport top, 1 once its bottom
 * reaches the viewport bottom — the point where there is nothing left to scroll to.
 * An article shorter than the viewport has no scroll range at all, so it reads 1 as
 * soon as it is in view rather than dividing by zero or by a negative.
 *
 * @param rectTop    article's top edge, viewport-relative
 * @param rectHeight article's height
 * @param viewport   viewport height
 */
export function scrollProgress(rectTop: number, rectHeight: number, viewport: number): number {
  const range = rectHeight - viewport;
  if (range <= 0) return rectTop <= 0 ? 1 : 0;
  const p = -rectTop / range;
  // `<= 0`, not `< 0`: `-0 / range` is `-0`, which is neither less than 0 nor
  // `Object.is`-equal to it, and would hand the progress fill a `scaleY(-0)`.
  return p <= 0 ? 0 : p > 1 ? 1 : p;
}
