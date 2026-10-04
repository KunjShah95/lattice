import { ImageResponse } from "next/og";
import { toolCount } from "@/lib/data";
import { ROLES } from "@/lib/roles";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

export const alt = "Tools by role — what each engineering specialisation owns";

/**
 * Cover image for the role index.
 *
 * Without this file the page inherited the root layout's `openGraph`, so every
 * share of `/roles` carried the home card and the site-wide description — the
 * two most-repeated strings on the whole site, on the one page whose entire
 * claim is that it is a different cut of the data. A share link that looks
 * identical to the home page is worse than no image, because it looks like the
 * card was simply forgotten.
 *
 * `variant="plain"` because there is no layer to badge and no strata rail: roles
 * cut across the stack by design, so drawing a depth axis here would assert an
 * ordering the page explicitly denies.
 */
export default function OpengraphImage() {
  const names = ROLES.map((r) => r.short).join(" · ");

  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="By specialisation"
        title="Start from what you own."
        // Short on purpose. `clamp` in og.tsx truncates at 128 characters, and
        // this one was landing just past that and ending in an ellipsis — which
        // reads as a bug on the card even though it is the clamp working.
        subtitle={`The same ${toolCount} tools cut by role rather than stack layer — what each role owns.`}
        meta={names}
        layer={null}
        footNote="Roles overlap by design"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}