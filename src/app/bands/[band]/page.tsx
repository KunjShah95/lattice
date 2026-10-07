import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BANDS, bandColor, bandLayers, bandMeta, layerStyle } from "@/lib/layer";
import { getSecondHomeTools } from "@/lib/data";
import { resolvedSymptoms } from "@/lib/symptoms";
import { roleTitle, ROLES } from "@/lib/roles";
import { site } from "@/lib/site";
import {
  absolute,
  breadcrumbNode,
  datasetModified,
  graph,
  ids,
} from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";
import type { Band } from "@/lib/layer";

/**
 * One band: the layers it owns, the tools in them, the symptoms it explains and
 * the cross-layer tools that reach it from elsewhere.
 *
 * ## Why this page earns its existence
 *
 * `/bands/<id>` is the shortest path from "it is too slow" to the two sections
 * worth reading, and that path previously ended in prose. The band is also the
 * unit the palette, the layer ramp, `/fix` and `layer_overlaps` all already use,
 * so this page is a view over existing data rather than new content.
 *
 * The second-homes block is the part that is not reachable anywhere else on the
 * site: "my problem is in band I, but the tool I need is indexed in band III."
 * That crossing is the single question this index is uniquely able to answer
 * (`mcp.ts` `layer_overlaps`), and here it is answerable by a reader too.
 */
export function generateStaticParams() {
  return BANDS.map((b) => ({ band: b.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/bands/[band]">): Promise<Metadata> {
  const { band } = await params;
  const meta = bandMeta(band as Band);
  if (!meta) return { title: "Not found" };

  const layers = bandLayers(meta.id);
  const tools = layers.reduce((n, c) => n + c.tools.length, 0);
  return {
    title: `Band ${meta.roman} · ${meta.title} — ${tools} tools for when it is ${meta.sounds}`,
    description:
      `Layers ${meta.layers.join(" and ")} of the AI stack: ${tools} tools, ` +
      `grouped by what each is accountable for. Use it when the failure sounds like ` +
      `“${meta.sounds}”.`,
    alternates: { canonical: `/bands/${meta.id}` },
    openGraph: { url: absolute(`/bands/${meta.id}`) },
  };
}

export default async function BandPage({ params }: PageProps<"/bands/[band]">) {
  const { band: bandParam } = await params;
  const meta = bandMeta(bandParam as Band);
  if (!meta) notFound();

  const layers = bandLayers(meta.id);
  const pageUrl = `${site.url}/bands/${meta.id}`;
  const tools = layers.flatMap((c) => c.tools);
  const symptoms = resolvedSymptoms.filter((s) => s.band === meta.id);

  // Which specialisations this band is mostly owned by. Counted rather than
  // asserted: a band is a property of the stack, a role is a property of a
  // person, and the interesting claim is which people this band actually falls
  // to. A band with no owning role would be a gap worth seeing on the page.
  const roleCounts = ROLES.map((r) => ({
    role: r,
    count: tools.filter((t) => t.roles.includes(r.id)).length,
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  // The crossings: tools indexed elsewhere that also serve this band.
  const crossings = layers.flatMap((c) =>
    getSecondHomeTools(c.slug).map((entry) => ({
      ...entry,
      homeSection: entry.tool.category.title,
      homeSlug: entry.tool.category.slug,
      toolSlug: entry.tool.slug,
    })),
  );

  return (
    <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "CollectionPage",
                "@id": pageUrl,
                url: pageUrl,
                name: `Band ${meta.roman} · ${meta.title}`,
                description: `Layers ${meta.layers.join(" and ")} of the AI stack. Failure sounds like: ${meta.sounds}.`,
                dateModified: datasetModified,
                isPartOf: { "@id": ids.website },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
                mainEntity: { "@id": `${pageUrl}#tools` },
              },
              {
                "@type": "ItemList",
                "@id": `${pageUrl}#tools`,
                name: `Tools in band ${meta.roman} · ${meta.title}`,
                numberOfItems: tools.length,
                // Flattened from the layers rather than from `allTools`: a
                // `Category["tools"][number]` is a bare `Tool` with no
                // `.category`, so the owning section has to come from the group
                // it was listed under. Asserting against `allTools` here would
                // mean a different traversal than the list above it.
                itemListElement: layers.flatMap((c) =>
                  c.tools.map((tool) => ({
                    "@type": "ListItem",
                    position: tools.indexOf(tool) + 1,
                    name: tool.name,
                    url: `${site.url}/${c.slug}/${tool.slug}`,
                  })),
                ),
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: "Bands", path: "/bands" },
                { name: meta.title, path: `/bands/${meta.id}` },
              ]),
            ),
          ),
        }}
      />

      <header>
        <nav aria-label="Breadcrumb" className="font-mono text-[11px]">
          <ol className="flex flex-wrap items-center gap-1.5 text-fg-subtle">
            <li>
              <Link href="/" className="transition-colors hover:text-fg-muted">
                Index
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/bands" className="transition-colors hover:text-fg-muted">
                Bands
              </Link>
            </li>
          </ol>
        </nav>

        <div className="mt-6 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: bandColor(meta.id) }}
          />
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            Band {meta.roman} · {meta.title}
          </p>
        </div>

        <h1 className="mt-3 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          When it fails, it fails like{" "}
          <em className="text-fg-subtle not-italic">“{meta.sounds}”</em>
        </h1>
        <p className="editorial-justify mt-4 max-w-[56ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          Band {meta.roman} is layers{" "}
          {meta.layers.map((l, i) => (
            <span key={l}>
              {i > 0 ? (i === meta.layers.length - 1 ? " and " : ", ") : ""}
              <Link
                href={`/${layers[i]?.slug ?? ""}`}
                className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
              >
                {layers[i]?.title ?? l}
              </Link>
            </span>
          ))}
          . {tools.length} tools sit here, and the failure mode is recognisable
          before you have read any of them.
        </p>

        {symptoms.length ? (
          <div className="mt-6 rounded-md border border-border p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              Start from the symptom instead
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {symptoms.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/fix/${s.slug}`}
                    className="text-[14px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] leading-relaxed text-fg-subtle">
              Each is an ordered checklist through the stack, cheapest check first.
            </p>
          </div>
        ) : null}
      </header>

      {/* Who owns this band. Counted from the dataset rather than written, so it
          cannot claim a role owns the band when no tool in it carries that role. */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          Who ends up owning it
        </h2>
        <p className="editorial-justify mt-3 max-w-[58ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
          A band is a property of the stack; a role is a property of a person.
          They correlate but are not the same question — which is why the count is
          derived rather than asserted.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {roleCounts.map(({ role, count }) => (
            <li key={role.id}>
              <Link
                href={`/roles/${role.id}`}
                className="inline-flex items-baseline gap-1.5 rounded-full border border-border px-3 py-1 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
              >
                {roleTitle(role.id)}
                <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                  {count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* The layers, with their tools. */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          The layers
        </h2>
        {layers.map((category) => (
          <div key={category.slug} className="mt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="inline-flex items-baseline gap-2.5 font-serif text-[20px] font-medium tracking-[-0.01em]">
                <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                  {category.index}
                </span>
                <Link
                  href={`/${category.slug}`}
                  className="transition-colors hover:text-accent"
                >
                  {category.title}
                </Link>
              </h3>
              <span className="font-mono text-[11px] text-fg-subtle">
                {category.tools.length} tools
              </span>
            </div>
            <p className="editorial-justify mt-1.5 text-pretty text-[13.5px] leading-relaxed text-fg-muted">
              {category.responsibility}. {category.description}
            </p>
            <ul className="mt-4 space-y-px">
              {category.tools.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/${category.slug}/${tool.slug}`}
                    className="group -mx-2 flex gap-3 rounded-md px-2 py-3 transition-colors hover:bg-bg-sunken"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1 h-8 w-[3px] shrink-0 rounded-full"
                      style={layerStyle(category.layer)}
                    />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-fg group-hover:text-accent">
                        {tool.name}
                      </span>
                      <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
                        {tool.skipWhen}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* The crossings. Only rendered when there are any, because an empty
          "also reaches this band" block reads as a broken lookup rather than an
          honest absence — and `layer_overlaps` reports the same crossings. */}
      {crossings.length ? (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Indexed elsewhere, but serving this band
          </h2>
          <p className="editorial-justify mt-3 max-w-[58ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
            The problem is in band {meta.roman} and the tool you need is filed
            under a different layer. These are the crossings, each with the
            reason it belongs here too — a bare cross-reference reads as a
            mistake, so the reason is the whole payload.
          </p>
          <ul className="mt-5 space-y-px">
            {crossings.map((c) => (
              <li key={`${c.homeSlug}/${c.toolSlug}`}>
                <Link
                  href={`/${c.homeSlug}/${c.toolSlug}`}
                  className="group -mx-2 block rounded-md px-2 py-3 transition-colors hover:bg-bg-sunken"
                >
                  <span className="block text-[14px] font-medium text-fg group-hover:text-accent">
                    {c.tool.name}
                    <span className="ml-2 font-mono text-[11px] font-normal text-fg-subtle">
                      {c.homeSection}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
                    {c.because}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="editorial-justify mt-12 border-t border-border pt-6 text-pretty text-[13.5px] leading-relaxed text-fg-subtle">
        Bands are a shortcut, not a taxonomy —{" "}
        <span className="text-fg-muted">
          band {meta.roman} covers {meta.layers.length} of nine layers
        </span>
        , so the band tells you where to look without telling you how much of the
        stack is involved.{" "}
        <Link
          href="/methodology"
          className="text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
        >
          The method
        </Link>{" "}
        says where else this index is wrong.
      </p>
    </div>
  );
}