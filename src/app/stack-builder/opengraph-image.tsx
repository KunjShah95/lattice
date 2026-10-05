import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Stack Builder — tell me what infrastructure to use";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Stack Builder"
        title="Tell me what infrastructure to use."
        subtitle="Four questions. One recommended stack with cost band, confidence and tradeoffs — drawn from the 112-tool index."
        meta="Gateway · Retrieval · Inference · Evals"
        layer={null}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
