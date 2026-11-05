import type { Metadata } from "next";
import { StackBuilder } from "@/components/stack-builder";
import { site } from "@/lib/site";
import { absolute, breadcrumbNode, datasetModified, graph, ids, faqPageJsonLd } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";
import { PageGuidance } from "@/components/page-guidance";
import { PAGE_GUIDANCE } from "@/lib/guidance";

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
    <div className="page-shell pt-14 sm:pt-20">
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
              faqPageJsonLd(PAGE_GUIDANCE.stackBuilder.answers, pageUrl),
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name, path: "/stack-builder" },
              ]),
            ),
          ),
        }}
      />

      <header>
        <p className="t-label">
          Tell me what to use
        </p>
        <h1 className="mt-4 t-h1">
          Build my AI stack.
        </h1>
        <p className="measure mt-4 text-[17px] leading-relaxed text-fg-muted">
          Describe your case — or start from a real one below. The stack updates
          as you answer, every answer becomes part of a shareable link, and the
          decision copies out as a report. Drawn from the 112 tools already in
          the index; estimates are heuristic bands, not vendor quotes.
        </p>
      </header>
      <div className="mt-8">
        <StackBuilder />
      </div>
      <div className="pb-16">
        <PageGuidance rules={PAGE_GUIDANCE.stackBuilder.rules} answers={PAGE_GUIDANCE.stackBuilder.answers} />
      </div>
    </div>
  );
}
