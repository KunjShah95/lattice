"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { sendSignal } from "@/lib/beacon";
import type { HeroStack } from "@/lib/hero-stacks";

/**
 * The home page's mini Stack Builder.
 *
 * ## What changed, and the number it is for
 *
 * The hero used to carry a "Build my stack" button and a diagram of the nine
 * layers. Over thirty days, 304 people saw that page and 25 reached the
 * builder: the product was one click away, and nine in ten never took the
 * click. So the click is gone. The reader says what they are building, here,
 * and the diagram beside them answers: the layers that workload needs light
 * up, each with the tool the engine picks for it.
 *
 * ## The shape: a provider and four leaves
 *
 * The picker sits in the left column and the diagram in the right, so the
 * choice has to cross the page. A context carries it. The diagram itself stays
 * a server component (`stack-diagram.tsx`), rendered once and passed through
 * as children; only the four small pieces below read the choice, so picking a
 * workload re-renders nine list items and a caption, not the page.
 *
 * ## No engine in the browser
 *
 * Every stack arrives finished, in props (`lib/hero-stacks.ts`). This file
 * holds a string and looks things up.
 *
 * ## Motion
 *
 * One animation, and it is the explanation: picks land substrate-first, in
 * the order a request meets them, which is the claim the nine-layer ordering
 * makes. Nothing else in the hero moves in response to a choice. The stagger
 * is CSS (`.hero-pick` in `globals.css`), keyed on the row's `--i`, and the
 * reduced-motion block there removes it.
 */

type HeroContext = {
  stacks: HeroStack[];
  active: HeroStack | null;
  toggle: (id: HeroStack["id"]) => void;
};

const Ctx = createContext<HeroContext | null>(null);

/** Null outside a `HeroBuilder`, so the diagram still renders on its own. */
function useHero() {
  return useContext(Ctx);
}

export function HeroBuilder({ stacks, children }: { stacks: HeroStack[]; children: ReactNode }) {
  const [id, setId] = useState<HeroStack["id"] | null>(null);

  const toggle = useCallback((next: HeroStack["id"]) => {
    setId((prev) => {
      if (prev === next) return null;
      // A step short of a conversion: interest in one workload. `to` is that
      // workload's own stack page, the same convention `stack-built` uses, so
      // the two events line up by workload. Sent on select, not on deselect.
      sendSignal("hero-stack", `/stack/${next}`);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ stacks, active: stacks.find((s) => s.id === id) ?? null, toggle }),
    [stacks, id, toggle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function Arrow() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="nudge shrink-0"
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * The question, the answer in one line, and the one primary action.
 *
 * The button is always there and always the same size, so choosing a workload
 * changes its label and destination rather than making it appear: nothing
 * below it moves. Before a choice it opens the blank builder; after, it opens
 * the builder on the stack being shown, where the questions the hero skipped
 * (volume, filtering, constraints) are waiting.
 *
 * The answer line repeats the picks as text, directly under the chips. On a
 * phone the diagram is below the fold, and a choice whose only result is
 * off-screen looks like a button that did nothing.
 */
export function HeroPicker({ volume, browse }: { volume: string; browse: ReactNode }) {
  const hero = useHero();
  if (!hero) return null;
  const { stacks, active, toggle } = hero;

  return (
    <div className="mt-8">
      <p id="hero-question" className="text-[15px] font-medium">
        What are you building?
      </p>
      <div role="group" aria-labelledby="hero-question" className="mt-3 flex flex-wrap gap-2">
        {stacks.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={active?.id === s.id}
            title={s.detail}
            onClick={() => toggle(s.id)}
            className="chip min-h-10 px-3.5 text-[14.5px]"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Polite, so a screen-reader user hears the stack they asked for
          without losing their place in the chip group. The min-height holds
          two lines on a phone, so the button under it does not jump. */}
      <p
        aria-live="polite"
        className="mt-4 min-h-[4.5rem] max-w-[52ch] text-pretty text-[14.5px] leading-relaxed text-fg-muted sm:min-h-[3rem]"
      >
        {active ? (
          <>
            <span className="font-medium text-fg">{active.tools.join(", ")}.</span>{" "}
            About {active.cost} at {volume}, as a heuristic.
          </>
        ) : (
          <>Pick one and the stack fills in with a tool for each layer it needs. No sign-up.</>
        )}
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <Link
          href={active ? active.href : "/stack-builder"}
          className="btn-ink group inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-control)] px-5 text-[16px] font-medium"
        >
          {active ? "Tune this stack" : "Build my stack"}
          <Arrow />
        </Link>
        {browse}
      </div>
    </div>
  );
}

/**
 * One layer's row in the diagram. Marks it `in` or `out` of the chosen stack;
 * the styling for both lives in `globals.css` under `[data-hero]`.
 *
 * A row that is out is not dimmed. Its text stays at full contrast and its
 * link keeps working: the layer still exists, this workload just does not
 * start there. It loses its tint and its meter, which is enough to read as
 * "not this one" without failing a contrast check.
 */
export function HeroRow({ slug, children }: { slug: string; children: ReactNode }) {
  const active = useHero()?.active;
  const state = active ? (active.picks[slug] ? "in" : "out") : undefined;
  return <li data-hero={state}>{children}</li>;
}

/**
 * The second line of a row: the layer's responsibility at rest (`children`,
 * server-rendered), the picked tool once a workload is chosen.
 *
 * Keyed on the workload so switching from one to another replays the entrance,
 * which is what makes a second choice read as a new stack rather than a few
 * words changing.
 */
export function HeroPick({ slug, children }: { slug: string; children: ReactNode }) {
  const active = useHero()?.active;
  const pick = active?.picks[slug];
  if (!active || !pick) return <>{children}</>;
  return (
    <span className="mt-0.5 block overflow-hidden">
      <span key={active.id} className="hero-pick flex flex-wrap items-baseline gap-x-2">
        <span className="text-[14.5px] font-medium text-fg">{pick.tool}</span>
        <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-fg-muted">
          {pick.fit}
        </span>
      </span>
    </span>
  );
}

/** The diagram's caption: what the drawing is, then what it is showing. */
export function HeroCaption({ total, children }: { total: number; children: ReactNode }) {
  const active = useHero()?.active;
  if (!active) return <>{children}</>;
  return (
    <>
      {active.label} · {Object.keys(active.picks).length} of {total} layers
    </>
  );
}
