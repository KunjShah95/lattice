import { ImageResponse } from "next/og";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";
import { site } from "@/lib/site";

/**
 * The Stack Builder's default card, for every link that carries no case and for
 * every runtime that cannot render one on request.
 *
 * It was `stack-builder/opengraph-image.tsx`. It moved because the file
 * convention outranks the metadata API: with that file present, no page under
 * `/stack-builder` could name a different image, so a built stack could never
 * have its own card. As a route handler it is still prerendered at build time
 * (`force-static`), so it exists on a Worker, which is the whole reason it is
 * the fallback.
 */
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Stack Builder"
        title="Tell me what infrastructure to use."
        subtitle="Four questions. One recommended stack with cost band, confidence and tradeoffs: drawn from the 112-tool index."
        meta="Gateway · Retrieval · Inference · Evals"
        layer={null}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
