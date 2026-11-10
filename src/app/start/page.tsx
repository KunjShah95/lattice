import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/info-page";
import { site } from "@/lib/site";
import { absolute, breadcrumbNode, graph, ids, faqPageJsonLd } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";
import { PageGuidance } from "@/components/page-guidance";
import { PAGE_GUIDANCE } from "@/lib/guidance";
import { getCategory } from "@/lib/data";
import { layerColor } from "@/lib/layer";
import { LESSONS, lessonAnchor } from "@/lib/learning-path";
import { getPost } from "@/lib/posts";

/**
 * AI infrastructure from zero.
 *
 * This page used to be five steps to a first RAG app and nothing else, which
 * served a reader who already knew they wanted RAG. A newcomer's question is
 * earlier than that: what are these nine layers, and which of them do I need
 * yet? So the page is now a path of nine short lessons, one per layer, in the
 * order a person meets them (`lib/learning-path.ts`). Each lesson ends in an
 * exercise and links to one layer page.
 *
 * The five-step build is kept, below the lessons, as what to do with them.
 */
export const metadata: Metadata = {
  title: "AI infrastructure from zero: a nine-lesson path",
  description:
    "Nine short lessons, one per layer of the AI stack, in the order you will need them. Each explains what the layer is, when to skip it, and one thing to try.",
  alternates: { canonical: "/start" },
  openGraph: { url: absolute("/start") },
};

const STEPS = [
  {
    n: "01",
    title: "Pick a model you can call",
    body: "Use a hosted API to start (OpenAI, Anthropic, or a free tier). Self-hosting is a later decision; it is not step one.",
    tool: "OpenRouter",
    href: "/routing-gateways/openrouter",
  },
  {
    n: "02",
    title: "Store your documents somewhere you can query",
    body: "Start with pgvector if you already run Postgres; it is one less system to operate. Move to a dedicated store only when retrieval becomes the workload.",
    tool: "pgvector",
    href: "/retrieval-vector-stores/pgvector",
  },
  {
    n: "03",
    title: "Chunk and embed, then check recall",
    body: "Chunk by structure, not by token count, and measure recall against ten real questions before adding more documents.",
    tool: "Qdrant",
    href: "/retrieval-vector-stores/qdrant",
  },
  {
    n: "04",
    title: "Put a gateway in front",
    body: "One proxy for auth, logging and cost attribution. It is the only layer that sees the whole request.",
    tool: "LiteLLM",
    href: "/routing-gateways/litellm",
  },
  {
    n: "05",
    title: "Add an eval before you ship",
    body: "A small set of labelled examples and a score. Without it you cannot tell whether a change helped.",
    tool: "promptfoo",
    href: "/evaluation-observability/promptfoo",
  },
];

export default function StartPage() {
  const pageUrl = `${site.url}/start`;
  const jsonLd = toJsonLd(
    graph(
      {
        "@type": "HowTo",
        "@id": pageUrl,
        url: pageUrl,
        name: "Your first working RAG app in five steps",
        description:
          "A five-step path from nothing to one working retrieval-augmented app, with the tool at each layer and why.",
        step: STEPS.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.title,
          text: s.body,
        })),
        isPartOf: { "@id": ids.website },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#lessons`,
        name: "AI infrastructure from zero: nine lessons",
        numberOfItems: LESSONS.length,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        itemListElement: LESSONS.map((l, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: l.question,
          description: l.what,
          url: `${pageUrl}#${lessonAnchor(i)}`,
        })),
      },
      faqPageJsonLd(PAGE_GUIDANCE.start.answers, pageUrl),
      breadcrumbNode(pageUrl, [
        { name: site.name, path: "" },
        { name: "Start here", path: "/start" },
      ]),
    ),
  );

  const lessons = LESSONS.map((lesson, i) => {
    const category = getCategory(lesson.section)!;
    return { ...lesson, category, post: getPost(lesson.essay), anchor: lessonAnchor(i), n: i + 1 };
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <InfoPageLayout
        breadcrumb="Start here"
        eyebrow="Start here"
        title="AI infrastructure from zero."
        lede="Nine short lessons, one for each layer of the stack, in the order you will need them and not the order they are drawn. Each one says what the layer is, gives you one thing to try, and tells you when to leave it alone."
      >
        {/* The whole path at a glance. Anchors, not a client component: nine
            links need no state, and each lesson is addressable on its own, so
            an explainer can be linked to from a post. */}
        <nav aria-label="The nine lessons" className="mt-10">
          <ol className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((l) => (
              <li key={l.anchor}>
                <a
                  href={`#${l.anchor}`}
                  className="group flex min-h-11 items-baseline gap-3 border-b border-border py-2.5 text-[15px] transition-colors hover:border-border-strong"
                >
                  <span className="font-mono text-[13px] tabular-nums text-fg-subtle">
                    {String(l.n).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-fg-muted transition-colors group-hover:text-fg">
                    {l.question}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <section aria-labelledby="lessons-heading" className="mt-14 border-t border-border pt-8">
          <h2 id="lessons-heading" className="t-h3">
            The lessons
          </h2>
          <p className="measure mt-3 text-[15.5px] leading-relaxed text-fg-muted">
            Do them in order and stop whenever you have what you need. The
            first two are enough to ship something. Most products never need
            the last two.
          </p>

          <ol className="mt-8 space-y-6">
            {lessons.map((l) => (
              <li
                key={l.anchor}
                id={l.anchor}
                className="scroll-mt-24 rounded-[var(--r-card)] border border-border bg-bg-elevated p-5 shadow-ink sm:p-7"
              >
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] uppercase tracking-[0.08em] text-fg-muted">
                  <span className="tabular-nums">Lesson {String(l.n).padStart(2, "0")}</span>
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: layerColor(l.category.layer) }}
                    />
                    Layer {l.category.index} · {l.category.title}
                  </span>
                </p>
                <h3 className="t-h3 mt-3">{l.question}</h3>
                <p className="measure mt-3 text-pretty text-[16px] leading-relaxed">{l.what}</p>

                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <dt className="t-label">You need it when</dt>
                    <dd className="mt-1.5 text-pretty text-[15px] leading-relaxed text-fg-muted">
                      {l.needWhen}
                    </dd>
                  </div>
                  <div>
                    <dt className="t-label">Skip it until</dt>
                    <dd className="mt-1.5 text-pretty text-[15px] leading-relaxed text-fg-muted">
                      {l.skipUntil}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="t-label">Try this</dt>
                    <dd className="measure mt-1.5 text-pretty text-[15px] leading-relaxed">
                      {l.tryThis}
                    </dd>
                  </div>
                </dl>

                <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-[14.5px]">
                  <Link
                    href={`/${l.category.slug}`}
                    className="group inline-flex min-h-10 items-center gap-1.5 font-medium text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
                  >
                    {l.category.title}: {l.category.tools.length} tools
                    <span aria-hidden="true" className="nudge">→</span>
                  </Link>
                  {l.post ? (
                    <Link
                      href={`/blog/${l.post.meta.slug}`}
                      className="inline-flex min-h-10 items-center text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
                    >
                      Go deeper: {l.post.meta.title}
                    </Link>
                  ) : null}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <InfoSection title="Then build one thing: a first RAG app in five steps">
          <p>
            The lessons are the map. This is one route across it, for people
            who have never shipped an AI feature: pick the tool at each step,
            in order, and stop when you have something that answers a question.
          </p>
          <ol className="mt-6 space-y-0">
            {STEPS.map((s) => (
              <li key={s.n} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 sm:gap-4">
                <span className="pt-0.5 font-mono text-[13px] tabular-nums text-fg-subtle">
                  {s.n}
                </span>
                <div className="relative border-l border-border pb-7 pl-4 sm:pl-5">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[3px] top-1.5 h-1.5 w-1.5 rounded-full bg-border-strong"
                  />
                  <p className="text-[17px] font-medium leading-snug">{s.title}</p>
                  <p className="mt-1 text-pretty text-[15px] leading-relaxed text-fg-muted">
                    {s.body}
                  </p>
                  <Link
                    href={s.href}
                    className="chip mt-2.5 min-h-8 no-underline hover:no-underline"
                  >
                    <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-fg-subtle">
                      Tool
                    </span>
                    {s.tool}
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </InfoSection>
        <InfoSection title="After step five">
          <p>
            You have a working app and a measurement. From here the index earns
            its keep: compare alternatives, read the symptom checklists when
            something breaks, and use the Stack Builder when the shape of the
            workload changes.
          </p>
          <p>
            <Link
              href="/stack-builder"
              className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
            >
              Build my stack →
            </Link>
          </p>
        </InfoSection>
        <PageGuidance url={pageUrl} rules={PAGE_GUIDANCE.start.rules} answers={PAGE_GUIDANCE.start.answers} />
      </InfoPageLayout>
    </>
  );
}
