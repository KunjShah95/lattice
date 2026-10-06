"use client";

import { useEffect } from "react";

/**
 * One listener for every `[data-spot]` surface.
 *
 * The highlight is a radial wash in the surface's own colour (`--spot`),
 * parked under the cursor. It is the same idea as a card spotlight, coloured
 * by the layer the reader is pointing at rather than by a shared brand glow.
 * Setting two custom properties does not re-render React, which matters on
 * the search palette, where a mousemove that called setState was already
 * too expensive.
 */
export function SpotLight() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;

    let frame = 0;
    let target: HTMLElement | null = null;
    let px = 0;
    let py = 0;

    const paint = (event: PointerEvent) => {
      const node = event.target instanceof Element ? event.target : null;
      const row = node?.closest("[data-spot]");
      if (!(row instanceof HTMLElement)) return;
      target = row;
      px = event.clientX;
      py = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${px - rect.left}px`);
        target.style.setProperty("--my", `${py - rect.top}px`);
      });
    };

    window.addEventListener("pointermove", paint, { passive: true });
    return () => {
      window.removeEventListener("pointermove", paint);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
