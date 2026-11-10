import { ImageResponse } from "next/og";
import { WORKLOADS } from "@/lib/stacks";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, StackCard } from "@/lib/og";
import { stackCardData, WORKLOAD_PAGE_CASE } from "@/lib/stack-card";
import type { Workload } from "@/lib/stacks";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for one workload's stack page: the stack itself, drawn as the
 * nine layers with the default case's pick in each, not a title on a card.
 *
 * Mirrors `generateStaticParams` on the page, so a workload can never gain a
 * page without a card or the reverse: the same pairing `roles/[role]` uses.
 */
export function generateStaticParams() {
  return WORKLOADS.map((w) => ({ workload: w.id }));
}

type WorkloadRouteParams = { params: Promise<{ workload: string }> };

export async function generateMetadata({ params }: WorkloadRouteParams) {
  const { workload } = await params;
  const meta = WORKLOADS.find((w) => w.id === workload);
  return {
    alt: `${meta?.label ?? "Stack"}: the default-case stack and what to skip`,
  };
}

export default async function Image({ params }: WorkloadRouteParams) {
  const { workload } = await params;
  const meta = WORKLOADS.find((w) => w.id === workload);
  if (!meta) return new Response("Not found", { status: 404 });

  // The card draws the same default case the page itself describes
  // (`WORKLOAD_PAGE_CASE`), so a shared workload page shows the stack it opens on.
  const card = stackCardData({ workload: meta.id as Workload, ...WORKLOAD_PAGE_CASE });

  return new ImageResponse(
    <StackCard card={card} siteName={site.name} siteHost={site.url.replace(/^https?:\/\//, "")} />,
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
