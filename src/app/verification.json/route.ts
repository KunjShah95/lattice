import { buildVerificationReport } from "@/lib/verification";

/**
 * /verification.json — the receipt for the staleness guard in `data.ts`.
 *
 * Prerendered, so `generatedAt` is the build date: the date the guard actually
 * ran. A deployed copy of this file is evidence that every entry passed on
 * that date, because a build with a stale entry throws before it gets here.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(buildVerificationReport(new Date()), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=31536000",
    },
  });
}
