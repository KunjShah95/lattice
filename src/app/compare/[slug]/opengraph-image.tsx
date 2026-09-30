import { ImageResponse } from "next/og";
import { resolvedComparisons } from "@/lib/comparisons";
import { site } from "@/lib/site";
import { OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Comparison cover";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Cover image for a head-to-head comparison. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comparison = resolvedComparisons.find((c) => c.slug === slug);
  if (!comparison) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Comparison"
        title={comparison.title}
        subtitle={comparison.verdict}
        meta={`${comparison.tools.length} tools compared`}
        layer={comparison.tools[0]?.layer ?? null}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    OG_SIZE,
  );
}
