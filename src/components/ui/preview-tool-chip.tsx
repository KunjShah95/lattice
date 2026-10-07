import type { ReactNode } from "react";
import { CHIP, ChipTick } from "./tool-chip";
import { PreviewLink } from "./preview-link";

/**
 * `ToolChip` with a hover/focus card. Use where a reader is choosing between a
 * handful of tools and the use/skip pair should be under the pointer; use plain
 * `ToolChip` for long lists, where it would cost client code for no one.
 */
export function PreviewToolChip({
  href,
  layer,
  preview,
  children,
}: {
  href: string;
  layer: number | null;
  preview: ReactNode;
  children: ReactNode;
}) {
  return (
    <PreviewLink href={href} className={CHIP} tick={<ChipTick layer={layer} />} preview={preview}>
      {children}
    </PreviewLink>
  );
}
