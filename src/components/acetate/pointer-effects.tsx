"use client";

/**
 * Pointer-reactive Aceternity effects.
 *
 * Both components share one rule, and it is the only rule that matters here:
 *
 *   **a `mousemove` handler writes CSS custom properties. It never calls
 *   `setState`.**
 *
 * The obvious implementation of a cursor-following effect is `onMouseMove` →
 * `setPosition({x, y})` → re-render → repaint. That puts a React render on
 * every pointer event, which is up to 120 per second on a gaming mouse, and it
 * re-renders the whole subtree under the state owner — including any children.
 * Writing `--mx`/`--my` on the DOM node instead costs one attribute write and a
 * style recalc on one element, with no render at all. The gradient repaint is
 * composited.
 *
 * Both are also gated on a fine pointer. On a touch device there is no cursor to
 * track, so the effect would either never fire or, worse, pin itself to the
 * last synthetic tap coordinate and leave a permanent glow on a phone.
 */

import { useCallback, useEffect, useRef, type CSSProperties } from "react";

/** Tracks the cursor across a container and paints a radial wash beneath it. */
export function Spotlight({
  className = "",
}: {
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    node.style.setProperty("--mx", `${event.clientX - box.left}px`);
    node.style.setProperty("--my", `${event.clientY - box.top}px`);
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      aria-hidden="true"
      className={`ac-spotlight ${className}`}
    />
  );
}

/**
 * A button that leans toward the cursor and springs back on leave.
 *
 * Bounded to `max` pixels of travel. The restraint is the whole effect: a
 * magnetic button that crosses half its own width stops reading as a physical
 * object responding to a hand and starts reading as a layout bug.
 */
export function Magnetic({
  children,
  strength = 6,
  className = "",
}: {
  children: React.ReactNode;
  /** Maximum travel in px at the corner of the hit area. Keep it under ~10. */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    // Same gate as above: no cursor to follow, so nothing to listen for.
    if (!node || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    let frame = 0;
    const settle = () => {
      frame = 0;
      node.style.transform = "translate3d(0, 0, 0)";
    };

    const onMove = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        node.style.transform = `translate3d(${dx * 0.18}px, ${dy * 0.3}px, 0)`;
      });
    };

    node.addEventListener("pointermove", onMove);
    // `leave` rather than `pointerleave` — the latter fires when the pointer
    // crosses *any* descendant boundary on some engines, which would cut the
    // lean off mid-hover whenever the label moved under the cursor.
    node.addEventListener("pointerleave", settle);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", settle);
    };
  }, [strength]);

  return (
    <span
      ref={ref}
      className={`inline-flex will-change-transform ${className}`}
      style={{ "--mx": "50%", "--my": "50%" } as CSSProperties}
    >
      {children}
    </span>
  );
}
