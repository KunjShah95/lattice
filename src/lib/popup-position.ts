/**
 * Where a popup sits relative to its trigger, so it never leaves the viewport.
 *
 * Pure and DOM-free so the geometry can be tested; the component measures real
 * rects and passes them in. The two cases that actually go wrong with a
 * hover card are a trigger at the right edge (the card overflows and a
 * horizontal scrollbar appears) and a trigger at the bottom (the card lands
 * below the fold where nobody sees it), and both are handled here rather than by
 * a positioning library: a chip list needs two rules, not a layout engine.
 */

export type Rect = { left: number; right: number; top: number; bottom: number };

export type Placement = {
  /** Horizontal nudge in px, applied on top of left-aligning to the trigger. */
  dx: number;
  /** `below` is the default; `above` only when below does not fit and above does. */
  side: "below" | "above";
};

/**
 * @param trigger  trigger's bounding rect
 * @param popup    popup's size (width and height, as measured)
 * @param viewport the visible area
 * @param margin   minimum gap kept to every viewport edge
 * @param gap      space between trigger and popup, which the popup bridges so
 *                 the pointer can travel onto it without leaving the hover area
 */
export function placePopup(
  trigger: Rect,
  popup: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 12,
  gap = 8,
): Placement {
  // Left-aligned to the trigger by default; shift only as far as needed.
  let left = trigger.left;
  const maxLeft = viewport.width - margin - popup.width;
  if (left > maxLeft) left = maxLeft;
  if (left < margin) left = margin;
  const dx = left - trigger.left;

  const fitsBelow = trigger.bottom + gap + popup.height <= viewport.height - margin;
  const fitsAbove = trigger.top - gap - popup.height >= margin;
  const side = !fitsBelow && fitsAbove ? "above" : "below";

  return { dx, side };
}
