import { ImageResponse } from "next/og";
import { WORKLOADS } from "@/lib/stacks";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for one workload's stack page.
 *
 * Mirrors `generateStaticParams` on the page, so a workload can never gain a
 * page without a card or the reverse — the same pairing `roles/[role]` uses.
 */
export function generateStaticParams() {
  return WORKLOADS.map((w) => ({ workload: w.id }));
}

type WorkloadRouteParams = { params: Promise<{ workload: string }> };

export async function generateMetadata({ params }: WorkloadRouteParams) {
  const { workload } = await params;
  const meta = WORKLOADS.find((w) => w.id === workload);
  return {
    alt: `${meta?.label ?? "Stack"} — the default-case stack and what to skip`,
  };
}

export default async function Image({ params }: WorkloadRouteParams) {
  const { workload } = await params;
  const meta = WORKLOADS.find((w) => w.id === workload);
  if (!meta) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Default-case stack"
        title={`A ${meta.label.toLowerCase()} stack.`}
        subtitle={meta.detail}
        meta="One pick per layer · each with its own skip-when"
        layer={null}
        footNote="A starting point, not a prescription"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}