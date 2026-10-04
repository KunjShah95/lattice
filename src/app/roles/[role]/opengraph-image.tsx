import { ImageResponse } from "next/og";
import { toolsByRole } from "@/lib/data";
import { ROLES, roleMeta } from "@/lib/roles";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for one specialisation.
 *
 * Mirrors `generateStaticParams` on the page, so a role can never gain a page
 * without a card or the reverse.
 */
export function generateStaticParams() {
  return ROLES.map((r) => ({ role: r.id }));
}

/** Typed explicitly: the route map has no entry for metadata routes. */
type RoleRouteParams = { params: Promise<{ role: string }> };

export async function generateMetadata({ params }: RoleRouteParams) {
  const { role } = await params;
  const meta = roleMeta(role as Parameters<typeof roleMeta>[0]);
  if (!meta) return { alt: "Role" };
  return {
    alt: `${meta.title} — ${toolsByRole(meta.id).length} tools that role owns`,
  };
}

export default async function Image({ params }: RoleRouteParams) {
  const { role } = await params;
  const meta = roleMeta(role as Parameters<typeof roleMeta>[0]);
  if (!meta) return new Response("Not found", { status: 404 });

  const tools = toolsByRole(meta.id);
  // Named tools, not a count. "Temporal, Dagster, Prefect" tells a reader
  // scrolling a timeline whether this is the page they came for; "9 tools"
  // does not. `clamp` in og.tsx still guards the width.
  const names = tools
    .slice(0, 3)
    .map((t) => t.name)
    .join(", ");

  return new ImageResponse(
    (
      <OgCard
        // `plain`, not `section`: a role deliberately spans layers, so there is
        // no single depth to badge and no strata rail that would mean anything.
        // The band colour is dropped for the same reason — it is a property of
        // the stack, not of the person.
        variant="plain"
        eyebrow="Specialisation"
        title={`${meta.title} tools.`}
        subtitle={meta.owns}
        meta={`${names}${tools.length > 3 ? ` +${tools.length - 3}` : ""}`}
        layer={null}
        // The question is the most distinctive line on the page and belongs on the card,
        // but it is a sentence and the footer slot is one line — hence the short
        // form, which is authored rather than truncated. A "…" in the footer of
        // a share image reads as a rendering fault.
        footNote={`${tools.length} tools · ${meta.short.toLowerCase()} owns the stack`}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}