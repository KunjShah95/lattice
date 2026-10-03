import { buildDataset } from "@/lib/dataset";

/**
 * /tools.json — the full index as structured data, for agents and tools.
 * Prerendered; it changes only when the dataset does, which is a deploy.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(buildDataset()), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=31536000",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
