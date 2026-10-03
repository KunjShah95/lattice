import { ImageResponse } from "next/og";
import { stackLayers, toolCount } from "@/lib/data";
import { posts } from "@/lib/posts";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Lattice — the layers behind working AI systems";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the home page.
 *
 * This is the most-seen card on the site by a wide margin — it is what appears
 * when someone pastes the root URL into a channel — so it carries the argument
 * rather than a description of the argument. Two deliberate choices:
 *
 * - The strata rail runs in `catalog` mode, showing all nine layers grouped
 *   into three bands. That single graphic is the whole product: an ordered map
 *   with visible depth, which is precisely what every competitor's card shows
 *   instead a logo and a number.
 * - The footer states the two claims that are actually open in this category —
 *   that entries are hand-picked and that nothing is ranked by who paid — while
 *   the tool count stays out of the title block. "112 hand-picked tools" is the
 *   category's opening move and the reason the index reads as small next to
 *   directories claiming 50,000; the judgement is the asset, not the count.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="home"
        eyebrow="A curated index"
        title="The layers behind working AI systems."
        subtitle={`${toolCount} tools across ${stackLayers.length} layers, ordered by where they sit in a real system — with ${posts.length} essays on the decisions behind them.`}
        meta="Hand-picked · No sponsored placement"
        layer={null}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}