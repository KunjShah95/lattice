import type { Metadata } from "next";
import { StackBuilder } from "@/components/stack-builder";
import { site } from "@/lib/site";
import { absolute, breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "AI stack builder",
  description:
    "Describe your AI system and get a recommended stack of AI infrastructure tools — gateway, retrieval, inference, evals — as a shareable link with cost band, confidence and tradeoffs.",
  alternates: { canonical: "/stack-builder" },
  // Next does not derive `og:url` from the canonical, and an inherited one
  // points at the home page. See `absolute()` in lib/seo.ts.
  openGraph: { url: absolute("/stack-builder") },
};

export default function StackBuilderPage() {
  const pageUrl = `${site.url}/stack-builder`;
  const name = "Stack Builder";

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      {/* WebApplication, not CollectionPage. This is the one route on the site
          that is a tool rather than a list, so it gets the type that says so:
          a thing a reader operates, free, in a browser, with no install.
          `applicationCategory` is UtilitiesApplication — closest schema.org
          offers for "not an editor, not a game" — and the tool count is stated
          because it is the honest bound on what the output can draw from. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "WebApplication",
                "@id": pageUrl,
                url: pageUrl,
                name,
                description: metadata.description as string,
                applicationCategory: "UtilitiesApplication",
                operatingSystem: "Any",
                isAccessibleForFree: true,
                browserRequirements: "Requires JavaScript",
                dateModified: datasetModified,
                isPartOf: { "@id": ids.website },
                publisher: { "@id": ids.organization },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name, path: "/stack-builder" },
              ]),
            ),
          ),
        }}
      />

      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          Tell me what to use
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          Build my AI stack.
        </h1>
        <p className="editorial-justify mt-4 max-w-[56ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          Describe your case — or start from a real one below. The stack updates
          as you answer, every answer becomes part of a shareable link, and the
          decision copies out as a report. Drawn from the 112 tools already in
          the index; estimates are heuristic bands, not vendor quotes.
        </p>
      </header>
      <div className="mt-8">
        <StackBuilder />
      </div>
    </div>
  );
}
