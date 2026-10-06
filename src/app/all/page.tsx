import type { Metadata } from "next";
import Link from "next/link";
import { ToolExplorer } from "@/components/tool-explorer";
import { allToolEntries, kinds, licenses, selfHostedCount, toolCount } from "@/lib/data";
import { site } from "@/lib/site";
import { absolute, collectionPageNodes, indexCrumbs } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "All AI infrastructure tools",
  description:
    `Every AI stack tool in the ${site.name} index — ${toolCount} tools ` +
    `across ${kinds.length} kinds, filterable by section, deployment model, kind and cost.`,
  alternates: { canonical: "/all" },
  // Next does not derive `og:url` from the canonical, and an inherited one
  // points at the home page. See `absolute()` in lib/seo.ts.
  openGraph: { url: absolute("/all") },
};

const permissive = licenses.filter((l) =>
  /MIT|Apache|BSD|PostgreSQL|CDLA|^ISC$/i.test(l.value),
).reduce((n, l) => n + l.count, 0);

export default function AllToolsPage() {
  const pageUrl = `${site.url}/all`;
  const name = "All AI infrastructure tools";

  return (
    <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-6 sm:pt-16">
      {/* Every tool in the index, as an ItemList. This is the one page that
          lists all 112 and the only parent of every tool page, so without it the
          complete set is described nowhere in structured data — a crawler sees
          112 links it has to follow rather than 112 entries it can read.
          `blurb` is the description, same field the section pages use. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            collectionPageNodes({
              pageUrl,
              name,
              description: metadata.description as string,
              listId: "tools",
              crumbs: indexCrumbs("All tools", "/all"),
              items: allToolEntries.map((t) => ({
                name: t.name,
                description: t.blurb,
                url: absolute(`/${t.categorySlug}/${t.slug}`),
              })),
            }),
          ),
        }}
      />

      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {toolCount} tools · {selfHostedCount} self-hosted · {permissive} permissively
          licensed
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          Every AI infrastructure tool, filterable.
        </h1>
        <p className="mt-4 max-w-[58ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          The whole index in one list. Use it when you know what you are
          looking for; use the{" "}
          <Link
            href="/"
            className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
          >
            stack diagram
          </Link>{" "}
          when you do not.
        </p>
      </header>

      <ToolExplorer tools={allToolEntries} />
    </div>
  );
}
