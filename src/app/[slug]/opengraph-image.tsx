import { ImageResponse } from "next/og";
import { getCategory } from "@/lib/data";
import { site } from "@/lib/site";
import { OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Section cover";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Cover image for a stack layer, generated on demand. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <OgCard
        eyebrow={category.layer == null ? "Off-stack" : `Layer ${category.layer}`}
        title={category.title}
        subtitle={category.responsibility}
        meta={`${category.tools.length} tools`}
        layer={category.layer}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    OG_SIZE,
  );
}
