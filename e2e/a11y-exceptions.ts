/**
 * Known accessibility violations, with the measurements behind them.
 *
 * ## Why an allowlist at all
 *
 * `a11y.spec.ts` runs axe against every route family and fails on any violation.
 * The first run reported **499 `color-contrast` failures on `/all` alone** — a
 * real WCAG AA defect, not a false positive: `--fg-subtle` was the site's most
 * used text colour and measured 2.89:1 in light and 3.35:1 in dark against its
 * own background, against a 4.5:1 requirement.
 *
 * ## The list is now empty
 *
 * `--fg-subtle` and `--fg-muted` were raised in both palettes (see
 * `src/app/globals.css`), the typographic floor moved from 10px to 12px, and the
 * colour is mirrored in `src/lib/og.tsx` so share cards agree with the site. The
 * exception that used to live here has been deleted, which is the only way this
 * ratchet is meant to shrink: by fixing the defect, not by declaring it.
 *
 * ## What the ratchet does, if an entry is ever added back
 *
 * 1. Every violation id not in this file fails the suite. A *new* accessibility
 *    problem is still a build failure.
 * 2. Every id in this file must still be present. Removing the token by accident
 *    and declaring victory does not pass.
 * 3. Every id here must not have got worse. `worstContrast` is a floor: pass if
 *    the measured ratio is **at least** this good, fail if it dropped.
 *
 * ## To add one
 *
 * Raise the colour in both palettes in `globals.css` — and in `src/lib/og.tsx`
 * too, because Satori does not read CSS custom properties. Only then, if the
 * defect is genuinely deferred, record it here with the measured floor.
 */

export type A11yException = {
  /** The axe violation id. */
  id: string;
  /** Why it is not fixed yet, in one sentence a reviewer can check. */
  reason: string;
  /**
   * The worst contrast ratio currently measured against its background, in the
   * worse of the two themes. A ratchet floor: the suite fails if the real
   * measurement drops *below* this, so the list cannot rot.
   *
   * `Infinity` for an exception with no numeric dimension.
   */
  worstContrast: number;
};

export const A11Y_EXCEPTIONS: A11yException[] = [];

/** Ids this suite will tolerate, for a fast lookup. */
export const EXCEPTION_IDS = new Set(A11Y_EXCEPTIONS.map((e) => e.id));

export function exceptionFor(id: string) {
  return A11Y_EXCEPTIONS.find((e) => e.id === id);
}
