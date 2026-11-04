import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/info-page";
import { site } from "@/lib/site";
import { absolute, breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Start here: your first working RAG app",
  description:
    "A five-step path from nothing to one working retrieval-augmented app, with the tool at each layer and why.",
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
        description: metadata.description as string,
        step: STEPS.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.title,
          text: s.body,
        })),
        isPartOf: { "@id": ids.website },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      },
      breadcrumbNode(pageUrl, [
        { name: site.name, path: "" },
        { name: "Start here", path: "/start" },
      ]),
    ),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <InfoPageLayout
        breadcrumb="Start here"
        eyebrow="Start here"
        title="Your first working RAG app, in five steps."
        lede="For people who have never shipped one. Pick the tool at each layer, in order, and stop when you have something that answers a question."
      >
        <InfoSection title="The path">
          <ol className="space-y-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                  {s.n}
                </span>
                <div>
                  <p className="text-[15px] font-medium">{s.title}</p>
                  <p className="mt-1 text-pretty text-[13px] leading-relaxed text-fg-muted">
                    {s.body}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-fg-subtle">
                    Tool:{" "}
                    <Link
                      href={s.href}
                      className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
                    >
                      {s.tool}
                    </Link>
                  </p>
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
      </InfoPageLayout>
    </>
  );
}