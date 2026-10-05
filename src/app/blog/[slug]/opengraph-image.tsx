import { ImageResponse } from "next/og";
import { getPost, posts } from "@/lib/posts";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard, formatDate } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Essay cover";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Prerendered at build time, mirroring the page's own params. On the Worker
 * there is no filesystem behind `process.cwd()`, so the font reads in
 * lib/og.tsx fail and an on-demand render returns a 500 — which is what every
 * card in this segment did in production before this existed.
 */
export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.meta.slug }));
}

/**
 * Cover image for an essay, prerendered per post. `opengraph-image` files take
 * a default export (unlike route handlers, which take `GET`).
 */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Essay"
        title={post.meta.title}
        subtitle={post.meta.dek}
        meta={`${formatDate(post.meta.date)} · ${post.meta.readingTime}`}
        layer={post.meta.layers[0] ?? null}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
