/**
 * Aceternity motion primitives.
 *
 * Every component here is self-contained and depends on nothing but the
 * tokens and keyframes in `app/globals.css` under the `[data-canvas="aurora"]`
 * scope. Drop one into any Next.js + Tailwind v4 project, add that scope to a
 * parent, and it works.
 *
 * ## Why there is no `framer-motion` here
 *
 * The reference implementations are all Framer Motion. That is the right call
 * for a component library shipping to people who have not yet chosen a
 * animation strategy, but this is not that: `scripts/check-bundle-budget.mjs`
 * sets a hard 28 KB ceiling on the homepage's own JS, and the App Router
 * runtime is already 127 KB of every figure it reports.
 *
 * Every effect below is expressible as a composited CSS animation or as two
 * custom properties written from one listener. That is the same visual
 * result at zero shipped bytes, and it keeps every one of these effects off
 * the main thread — which is the reason `framer-motion` is not free even when
 * you have already paid for React.
 *
 * Where a pointer effect is needed, the pattern is always identical: listen
 * once, write `--mx`/`--my`, never `setState`. A `mousemove` that calls
 * `setState` re-renders the subtree on every frame; one that writes a custom
 * property does not re-render at all.
 */

/**
 * Blurred colour blooms behind a hero.
 *
 * Two crosses on opposed drift phases. Their composite has no repeat period a
 * reader will sit through, which is the only reason to run ambient motion at
 * all — a single blob looping visibly reads as a screensaver.
 */
export function Aurora({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`ac-aurora ${className}`}>
      <span />
      <span />
    </div>
  );
}

/**
 * Thin gradient streaks falling across a dark field.
 *
 * `count` beams, each with its own duration and delay inline so no two are ever
 * in step. Four reads as weather; eight reads as decoration, so that is the
 * ceiling rather than a floor.
 */
export function Beams({
  count = 4,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`ac-beams ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          style={
            {
              left: `${8 + i * 26}%`,
              "--beam-dur": `${9 + ((i * 37) % 7)}s`,
              "--beam-delay": `${(i * 2.7).toFixed(1)}s`,
              "--beam-color": i % 2 === 0 ? "var(--aurora-1)" : "var(--aurora-3)",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * A rim of light travelling around a surface.
 *
 * The one loud idea on any given card. It is `::before` on a parent that owns
 * `position: relative` — no wrapper element, no extra node in the DOM, and
 * nothing to keep in sync.
 */
export function MovingBorder({
  children,
  className = "",
  radius = "1rem",
}: {
  children: React.ReactNode;
  className?: string;
  radius?: string;
}) {
  return (
    <div
      className={`ac-moving-border ${className}`}
      style={{ borderRadius: radius }}
    >
      {children}
    </div>
  );
}

/**
 * The gradient band that travels across text.
 *
 * `background-clip: text` with `color: transparent` rather than a moving
 * gradient element behind the glyphs: the band is a background on the text
 * box, so the text itself never reflows and never needs a second layer to stay
 * aligned with.
 */
export function ShinyText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`ac-shiny ${className}`}>{children}</span>;
}

/**
 * Words rise out of their own masks, staggered.
 *
 * Every word is its own mask so nothing is clipped at the block level, and the
 * spaces stay as text nodes between the masks — which is what lets the heading
 * still read as one sentence to a screen reader and still copy as one string.
 *
 * Transform only. An element that starts transparent is invisible to LCP until
 * it lands, and mid-fade text fails a contrast audit taken at the wrong moment.
 * Here the glyphs are at full ink from the first frame; they are simply below
 * the line.
 */
export function TextGenerate({
  words,
  className = "",
  accentIndex,
}: {
  words: readonly string[];
  className?: string;
  /** Index of the word that should carry the accent gradient rather than the
      canvas text colour. Defaults to none — the headline stays uninflected,
      which is the right default for any headline that is not on the money page. */
  accentIndex?: number;
}) {
  // Static. The staggered rise used to leave words parked below their mask
  // whenever the animation did not run to completion (background tabs,
  // throttled devices, screenshots), so the headline could render clipped.
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className={i === accentIndex ? "ac-shiny" : undefined}>{word}</span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}

/**
 * A bento cell. Lift on hover, rim brightens, pointer wash fades in.
 *
 * The cell is the grid primitive, not a grid: uneven spans come from the
 * caller's `className`, so the same component serves a 2×2 and a 3×2 with
 * different cell proportions and no branching here.
 */
export function Bento({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "article" | "section" | "li";
}) {
  return <Tag className={`ac-bento ${className}`}>{children}</Tag>;
}

/**
 * The one large fill of the accent gradient on the page.
 *
 * `span` inside is required rather than a bare text node: the button's own
 * `::before` is the travelling highlight and would otherwise paint over the
 * label, so the label needs a stacking context above it.
 */
export function CtaButton({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`ac-cta inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] ${className}`}>
      <span className="inline-flex items-center gap-2">{children}</span>
    </span>
  );
}
