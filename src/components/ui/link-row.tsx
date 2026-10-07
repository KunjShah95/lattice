import Link from "next/link";
import type { ReactNode } from "react";
import { layerStyle } from "@/lib/layer";
import { TrackLink, type TrackEvent } from "@/components/track-link";

/**
 * A list row that is a link: a layer-coloured bar, a title, a sentence.
 *
 * This is the shape every "what to read next" list on a tool page used —
 * comparisons, essays, alternatives — written out five times with the same
 * twelve classes. The bar is the site's identity device (the layer ramp), so the
 * row takes the colour of the layer it belongs to rather than a generic accent.
 *
 * `event` swaps in `TrackLink` for the two lists whose click-through is a metric
 * (`strategy/04` §7). It is a prop, not a second component, so a row cannot be
 * made trackable by forking the markup and drifting from the untracked ones.
 */
export function LinkRow({
  href,
  layer,
  title,
  description,
  event,
}: {
  href: string;
  /** Stack depth for the bar colour. `null` gives the neutral off-stack grey. */
  layer: number | null;
  title: ReactNode;
  description?: ReactNode;
  event?: TrackEvent;
}) {
  const className =
    "group -mx-2 flex gap-3 rounded-md px-2 py-3 transition-colors hover:bg-bg-sunken";
  const body = (
    <>
      <span
        aria-hidden="true"
        className="mt-1.5 h-6 w-[3px] shrink-0 rounded-full"
        style={layerStyle(layer)}
      />
      <span className="min-w-0">
        <span className="block text-[15px] font-medium group-hover:text-accent">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
            {description}
          </span>
        ) : null}
      </span>
    </>
  );

  return event ? (
    <TrackLink href={href} event={event} className={className}>
      {body}
    </TrackLink>
  ) : (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}
