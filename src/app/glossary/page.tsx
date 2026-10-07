import type { Metadata } from "next";
import Link from "next/link";
import { GlossaryList } from "@/components/glossary-list";
import { glossary } from "@/lib/glossary";
import { site } from "@/lib/site";
import { absolute, collectionPageNodes, indexCrumbs } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

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
    <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-6 sm:pt-16">
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
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {glossary.length} terms
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          The words, defined once.
        </h1>
        <p className="editorial-justify mt-4 max-w-[58ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
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
    </div>
  );
}
