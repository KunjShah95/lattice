import { ImageResponse } from "next/og";
import { AS_OF } from "@/lib/attributes";
import { STALE_AFTER_MONTHS } from "@/lib/data";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Freshness ledger — the build refuses licence and cost data older than six months";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the freshness ledger.
 *
 * `variant="plain"` like `/methodology` and `/corrections`: the page is about the
 * index's own guarantee, not an entry in the stack, so a strata rail would assert
 * a position it does not have. The footer carries the verification date for the
 * same reason `/methodology`'s does — it is the one field that makes the claim
 * checkable from the card alone.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Build gate"
        title="The build refuses stale facts."
        subtitle={`Licence, cost and deployment data older than ${STALE_AFTER_MONTHS} months fails the build, so a deployed copy is a receipt for a check that ran.`}
        meta="Per-entry window · expiry month · machine-readable receipt"
        layer={null}
        footNote={`Verified ${AS_OF}`}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
