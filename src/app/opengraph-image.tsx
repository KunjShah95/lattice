import { ImageResponse } from "next/og";
import { stackLayers, toolCount } from "@/lib/data";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgHomeCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = `${site.name} — the infrastructure behind working AI systems: ${toolCount} tools across nine stack layers`;
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the home page — the most-shared card on the site.
 *
 * Generated rather than a static file so the counts and layer names cannot
 * drift from the index. See `OgHomeCard` for why it draws the stack.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgHomeCard
        layers={stackLayers.map((c) => ({ layer: c.layer ?? 0, title: c.title }))}
        toolCount={toolCount}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
