"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { placePopup, type Placement } from "@/lib/popup-position";

/**
 * A link with a hover/focus preview card.
 *
 * Borrowed mechanic: Aceternity's Link Preview and Tooltip Card — show what is on
 * the other side of a link without leaving the page. The aesthetic is not
 * borrowed (no spotlight, no gradient border, no spring); the card is a plain
 * bordered box in the site's own tokens.
 *
 * ## Why it is here at all
 *
 * A tool page lists a dozen siblings and alternatives as bare names. A reader
 * choosing between them has to open each one to learn the one thing the index is
 * for: when to use it and when not to. The preview puts the use/skip pair under
 * the pointer, so the comparison happens on the page the reader is already on.
 *
 * ## The rules for a hover card (WCAG 1.4.13), and how each is met
 *
 * - *Dismissible:* Escape closes it without moving focus or the pointer.
 * - *Hoverable:* the card is a descendant of the trigger's wrapper and bridges
 *   the gap with padding, so the pointer can travel onto it without a
 *   `mouseleave` firing in between.
 * - *Persistent:* it stays until the pointer leaves, focus leaves, or Escape —
 *   never on a timer once open.
 *
 * ## It is progressive enhancement, not the content
 *
 * The preview is supplementary: the same facts are on the destination page, and
 * on touch there is no hover, so none of it is the only route to anything. The
 * card is always in the DOM and `aria-describedby` points at it, so a screen
 * reader announces it as the link's description whether or not it is visible —
 * `visibility: hidden` content still contributes to an accessible description.
 *
 * ## Why it takes `tick` rather than a layer
 *
 * `lib/layer` imports the whole dataset. A client component importing it drags
 * the dataset into the browser bundle, so the colour is resolved on the server
 * and passed in as a string. The bundle budget would have caught it; it is
 * cheaper to not need it to.
 */

const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 120;

export function PreviewLink({
  href,
  className,
  tick,
  preview,
  children,
}: {
  href: string;
  className: string;
  /** Rendered before the label — the layer tick. Server-built, so it costs no client code. */
  tick?: ReactNode;
  /** The card's body. Server-rendered and passed through; this component never reads it. */
  preview: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>({ dx: 0, side: "below" });
  const wrapRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const schedule = useCallback((next: boolean, delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  }, []);

  useEffect(() => clear, [clear]);

  // Measure on open, before paint, so the card never flashes in the wrong place.
  // The card is always mounted (hidden), which is what makes it measurable.
  useLayoutEffect(() => {
    if (!open || !wrapRef.current || !cardRef.current) return;
    const t = wrapRef.current.getBoundingClientRect();
    const c = cardRef.current.getBoundingClientRect();
    setPlacement(
      placePopup(
        t,
        { width: c.width, height: c.height },
        { width: document.documentElement.clientWidth, height: window.innerHeight },
        12,
        0, // the bridge is padding inside the card, already part of its height
      ),
    );
  }, [open]);

  // Escape dismisses without moving focus. Listens only while open, so a closed
  // preview never competes with the search palette's own Escape handling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clear();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, clear]);

  const above = placement.side === "above";

  return (
    <span
      ref={wrapRef}
      className="relative inline-block"
      // `pointerType === "mouse"`: a tap fires pointerenter too, and opening a
      // card on the tap that is about to navigate away is noise.
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") schedule(true, OPEN_DELAY_MS);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") schedule(false, CLOSE_DELAY_MS);
      }}
      onFocus={(e) => {
        // Keyboard focus only. `:focus-visible` is false after a mouse click, and
        // a card that pops on every click is the behaviour people hate hover
        // cards for.
        if ((e.target as HTMLElement).matches(":focus-visible")) {
          clear();
          setOpen(true);
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          clear();
          setOpen(false);
        }
      }}
    >
      <Link href={href} className={className} aria-describedby={id}>
        {tick}
        {children}
      </Link>
      <span
        ref={cardRef}
        id={id}
        role="tooltip"
        style={{ transform: `translateX(${placement.dx}px)` }}
        className={`absolute left-0 z-40 block w-[min(22rem,calc(100vw-1.5rem))] ${
          above ? "bottom-full pb-2" : "top-full pt-2"
        } transition-opacity duration-150 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <span className="block rounded-lg border border-border-strong bg-bg-elevated p-3.5 text-left shadow-float">
          {preview}
        </span>
      </span>
    </span>
  );
}
