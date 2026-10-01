import type { Metadata } from "next";
import Link from "next/link";
import { GlossaryList } from "@/components/glossary-list";
import { glossary } from "@/lib/glossary";

export const metadata: Metadata = {
  title: "Glossary",
  description:
    `${glossary.length} terms from production AI systems defined plainly — batching, ` +
    `the KV cache, prefix caching, reranking, hybrid search, LoRA, DPO, durable ` +
    `execution, prompt injection, evals and more, each with what it implies for a decision.`,
  alternates: { canonical: "/glossary" },
};

export default function GlossaryIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-6 sm:pt-16">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {glossary.length} terms
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          The words, defined once.
        </h1>
        <p className="mt-4 max-w-[58ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
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
