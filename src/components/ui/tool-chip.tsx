import Link from "next/link";
import type { ReactNode } from "react";
import { layerStyle } from "@/lib/layer";

export const CHIP =
  "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg";

/** The layer tick. Shared with `PreviewToolChip`, so the two cannot drift apart. */
export function ChipTick({ layer }: { layer: number | null }) {
  return (
    <span aria-hidden="true" className="h-3 w-[2px] rounded-full" style={layerStyle(layer)} />
  );
}

/**
 * A tool as a small bordered link with its layer tick: the sibling and
 * "listed as an alternative to" lists on a tool page.
 *
 * Distinct from `FacetChip` in the explorer on purpose. That one is a toggle
 * (a button with `aria-pressed`); this one navigates. Sharing a component would
 * have meant one element pretending to be the other.
 *
 * Plain server-rendered link with no client code at all, so a long list — the 112
 * chips on `/verification` — costs nothing. The hover card lives in
 * `PreviewToolChip`, a separate file on purpose: a first version took an optional
 * `preview` prop here, and importing the client component from this module put its
 * chunk in the bundle of *every* route that renders a chip, previews or not. The
 * bundle budget caught it. Keeping the import out of this file is what keeps the
 * claim true.
 */
export function ToolChip({
  href,
  layer,
  children,
}: {
  href: string;
  layer: number | null;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={CHIP}>
      <ChipTick layer={layer} />
      {children}
    </Link>
  );
}
