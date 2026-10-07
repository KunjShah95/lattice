"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/headings";
import { activeIndex, scrollProgress } from "@/lib/reading-position";

/**
 * The essay's contents as a rail in the right margin, with a reading-progress line.
 *
 * Borrowed mechanic: Aceternity's Tracing Beam — a line that tracks your scroll down
 * a long page. Not borrowed: the beam itself. There is no glow, no gradient and no
 * spring; the "beam" is a one-pixel rule that fills as you read, in the same ink as
 * every other rule on the site, and the thing it tracks is *which section you are
 * in*, which is the information a reader of a long argument actually wants.
 *
 * ## Progressive enhancement, in layers
 *
 * - The headings have ids from the rehype plugin at compile time, so a `#section`
 *   link works with JavaScript off.
 * - This rail's links are real anchors, server-rendered into the HTML.
 * - Only the *highlighting* and the progress fill need JavaScript. Without it the
 *   rail is a plain contents list, which is still useful.
 *
 * Hidden below `xl`; `EssayContents` serves the narrower screens. The rail hangs off
 * the right of the article column rather than reflowing the page, so the essay's
 * measure — the line length that makes it readable — is untouched by it.
 *
 * ## Why scroll position, not IntersectionObserver
 *
 * "The last heading above the line" is a function of scroll position, and an
 * observer reports *crossings*, which makes the active section depend on the order
 * events arrived in. Reading the tops directly gives the same answer on first paint,
 * after a jump to an anchor, and after a resize, with no state to get out of step.
 * The handler is rAF-throttled and only writes state when a value changes, so a
 * scroll is not a render per frame.
 *
 * Reduced motion: the progress fill is a transform with no transition, and
 * `globals.css` turns transitions off under `prefers-reduced-motion` regardless.
 */

/**
 * The line, in px from the viewport top, that counts as "reading this section".
 *
 * Must sit *below* where an anchor jump lands a heading. `html` sets
 * `scroll-padding-top: 6rem` (96px) in `globals.css`, so a contents link puts its
 * heading at 96px; a line at or above that would leave the section you just clicked
 * un-highlighted and the previous one lit. An earlier version added its own
 * `scroll-margin-top` on top of that padding, which landed headings at 176px —
 * past this line — and was caught by the browser test, not by reading the code.
 */
const READING_LINE = 120;

export function ReadingRail({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(-1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const article = document.querySelector("article");
    const targets = headings.map((h) => document.getElementById(h.id));
    let frame = 0;

    const measure = () => {
      frame = 0;
      const tops = targets.map((el) => (el ? el.getBoundingClientRect().top : Number.POSITIVE_INFINITY));
      const next = activeIndex(tops, READING_LINE);
      setActive((prev) => (prev === next ? prev : next));

      if (article) {
        const r = article.getBoundingClientRect();
        // Quantised to 1%: a smoother value would re-render on every scroll event
        // for a change nobody can see on a rule a few hundred pixels tall.
        const p = Math.round(scrollProgress(r.top, r.height, window.innerHeight) * 100) / 100;
        setProgress((prev) => (prev === p ? prev : p));
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <aside className="pointer-events-none absolute left-full top-0 ml-8 hidden h-full w-44 xl:block">
      <nav aria-label="On this page" className="pointer-events-auto sticky top-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">On this page</p>

        <div className="relative mt-3">
          {/* The track, and the fill that records how far through the essay you are. */}
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border" />
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-px origin-top bg-accent transition-transform duration-150 ease-out"
            style={{ transform: `scaleY(${progress})` }}
          />
          <ol className="space-y-2 pl-3.5">
            {headings.map((h, i) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  aria-current={i === active ? "location" : undefined}
                  className={`block text-pretty text-[12.5px] leading-snug transition-colors ${
                    i === active ? "font-medium text-fg" : "text-fg-subtle hover:text-fg-muted"
                  }`}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </aside>
  );
}
