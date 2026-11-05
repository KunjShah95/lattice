import type { Metadata } from "next";
import Link from "next/link";
import { GlossaryList } from "@/components/glossary-list";
import { glossary } from "@/lib/glossary";
import { site } from "@/lib/site";
import { absolute, collectionPageNodes, indexCrumbs } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";
import { PageGuidance } from "@/components/page-guidance";
import { PAGE_GUIDANCE } from "@/lib/guidance";

export const metadata: Metadata = {
  title: "AI infrastructure glossary",
  description:
    `${glossary.length} terms from production AI systems defined plainly — batching, ` +
    `the KV cache, prefix caching, reranking, LoRA, DPO, prompt injection and ` +
    `evals, each with what it implies for a decision.`,
  alternates: { canonical: "/glossary" },
  // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
  // canonical, and an inherited one points at the home page.
  openGraph: { url: absolute("/glossary") },
};

export default function GlossaryIndexPage() {
  const pageUrl = `${site.url}/glossary`;
  const name = "Glossary";

  return (
    <div className="page-shell pt-14 sm:pt-20">
      {/* Every term as an ItemList, described by its definition. Each term page
          declares DefinedTerm + WebPage, but nothing connected them into a
          vocabulary — so the set was only visible as 40 rendered links. A
          definition is short enough to inline here, which is the point: it is
          the answer the term exists to give. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            collectionPageNodes({
              pageUrl,
              faq: PAGE_GUIDANCE.glossaryIndex.answers,
              name,
              description: metadata.description as string,
              listId: "terms",
              crumbs: indexCrumbs("Glossary", "/glossary"),
              items: glossary.map((t) => ({
                name: t.term,
                description: t.definition,
                url: absolute(`/glossary/${t.slug}`),
              })),
            }),
          ),
        }}
      />

      <header className="mb-8">
        <p className="t-label">
          {glossary.length} terms
        </p>
        <h1 className="mt-4 t-h1">
          The words, defined once.
        </h1>
        <p className="measure mt-4 text-[17px] leading-relaxed text-fg-muted">
          Short enough to answer a question, opinionated enough to be useful.
          Each entry says what the term{" "}
          <em className="text-fg not-italic">implies for a decision</em>, not just
          what it names — and every term mentioned in the{" "}
          <Link
            href="/blog"
            className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
          >
            essays
          </Link>{" "}
          links here automatically.
        </p>
      </header>

      <GlossaryList terms={glossary} />
      <div className="pb-16">
        <PageGuidance rules={PAGE_GUIDANCE.glossaryIndex.rules} answers={PAGE_GUIDANCE.glossaryIndex.answers} />
      </div>
    </div>
  );
}
