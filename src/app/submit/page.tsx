import type { Metadata } from "next";
import Link from "next/link";
import { LAYERS, REPO, ISSUE_TEMPLATE } from "@/lib/submissions.mjs";
import { site } from "@/lib/site";
import { absolute, breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

/**
 * `/submit` — the intake, and the page that has to be honest about it.
 *
 * There is no server route here, deliberately. A form that POSTs somewhere needs
 * a database, spam protection and a moderation queue before it is trustworthy;
 * this instead hands the submitter a prefilled GitHub issue, which needs none of
 * that and puts the whole conversation in a place that already has search,
 * history and notifications. The cost is that submitting requires a GitHub
 * account, and the page says so rather than discovering it at the last step.
 *
 * The framing matters more than the mechanics. `methodology` §01 says tools are
 * hand-picked and that there is no submission form resulting in an entry. This
 * page does not contradict that: a submission produces a *draft under review*,
 * never an entry. So the copy below leads with what the reviewer decides, not
 * with what the submitter gets — because the honest answer to "what happens if I
 * submit something" is "it might be declined", and a page that hides that is
 * how a submission queue fills with things nobody wanted.
 */
export const metadata: Metadata = {
  title: "Submit a tool",
  description:
    "Suggest a tool for the index. A maintainer reviews every submission and decides whether it becomes an entry — most are declined, and the review bar is published.",
  alternates: { canonical: "/submit" },
  openGraph: { url: absolute("/submit") },
};

export default function SubmitPage() {
  const pageUrl = `${site.url}/submit`;
  const issueUrl = `https://github.com/${REPO}/issues/new`;

  const questions = [
    {
      q: "Does submitting get my tool listed?",
      a: "Not automatically, and often not at all. A maintainer reads every submission and decides whether it clears the bar described on the methodology page. Most submissions are declined, and the commonest reason is that the tool is an application rather than infrastructure a production system runs on.",
    },
    {
      q: "What does the reviewer decide?",
      a: "Three things a bot cannot: whether the tool is infrastructure at all, which layer of the stack it belongs to, and whether the use-when and skip-when lines survive scrutiny. The submission carries your sentences as proposals; the index's own judgement is separate and yours to disagree with.",
    },
    {
      q: "What happens to my submission?",
      a: "It becomes a public GitHub issue on this repository, and then a draft pull request that nobody can merge without a human editing it. If it is declined, the reason is written on the issue. Corrections to existing entries are handled the same way and are treated as more urgent than new submissions.",
    },
    {
      q: "Why GitHub issues instead of a form?",
      a: "An issue needs no database, no spam protection and no third-party form service, and it keeps the whole conversation searchable and public. The trade is that it requires a GitHub account, which is a real cost for someone who only wants to send one link.",
    },
    {
      q: "The skip-when line is the hard one. Why?",
      a: "Because it is the line most directories leave out, and leaving it out is what makes a list a list of links. If a tool has no situation in which it is the wrong choice, that is usually a sign the tool has not been used in anger yet, and it belongs in a different index.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "WebPage",
                "@id": pageUrl,
                url: pageUrl,
                name: "Submit a tool to Lattice",
                description:
                  "How submissions are reviewed, and the bar a tool has to clear before it becomes an entry.",
                dateModified: datasetModified,
                isPartOf: { "@id": ids.website },
                publisher: { "@id": ids.organization },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
                mainEntity: { "@id": `${pageUrl}#faq` },
              },
              {
                "@type": "FAQPage",
                "@id": `${pageUrl}#faq`,
                mainEntity: questions.map((item) => ({
                  "@type": "Question",
                  name: item.q,
                  acceptedAnswer: { "@type": "Answer", text: item.a },
                })),
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: "Submit a tool", path: "/submit" },
              ]),
            ),
          ),
        }}
      />

      <nav aria-label="Breadcrumb" className="font-mono text-[11px]">
        <ol className="flex flex-wrap items-center gap-1.5 text-fg-subtle">
          <li>
            <Link href="/" className="transition-colors hover:text-fg-muted">
              Index
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Submit</li>
        </ol>
      </nav>

      <header className="mt-6">
        <h1 className="text-balance font-serif text-[32px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-[40px]">
          Submit a tool
        </h1>
        <p className="mt-4 text-pretty text-[16px] leading-relaxed text-fg-muted">
          This index is ordered by stack layer rather than popularity, which
          only means something if the order is deliberate. Every entry was placed
          by a person who decided where it belonged and why. A submission is a
          proposal for that decision, not a request to skip it.
        </p>
      </header>

      {/* What the reviewer decides, stated before the button rather than
          after. A submitter who does not know submissions are usually declined
          will read every decline as being ignored. */}
      <section className="mt-8 border-l-2 border-accent pl-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
          Before you submit
        </h2>
        <ul className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-fg-muted">
          <li>
            Is it <strong className="text-fg">infrastructure</strong> — something
            a production AI system runs on — rather than an application someone
            uses? That single test excludes most things called AI tools.
          </li>
          <li>
            Does it have a situation in which it is the{" "}
            <strong className="text-fg">wrong</strong> choice? A tool with no
            such situation has usually not met production yet.
          </li>
          <li>
            Is it already{" "}
            <Link
              href="/all"
              className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
            >
              listed
            </Link>
            ? If so, a correction is more useful than a submission.
          </li>
        </ul>
      </section>

      {/* The button. `href` to `github.com/.../issues/new` with the template in
          the body rather than a form POST: there is no endpoint to receive one,
          and building one for a page this simple would mean a database, spam
          protection and a moderation queue to serve a form GitHub already
          serves. GitHub's own `new?body=` has a length limit, so the template is
          linked in full and this button opens the form with a pointer to it. */}
      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href={issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-bg-elevated px-4 py-2.5 text-[14.5px] font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Open a submission issue
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>
        <span className="font-mono text-[11px] text-fg-subtle">
          Requires a GitHub account
        </span>
      </div>

      {/* The template, verbatim. Publishing it is what stops the round trip
          where somebody opens the issue, writes three words, and the bot
          reports six missing fields. */}
      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          The form
        </h2>
        <p className="mt-2 max-w-[62ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
          Copy this into the issue body. The field names and the fence markers
          have to survive editing — the bot reads them, and a renamed field
          arrives empty.
        </p>
        <pre className="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-border bg-bg-elevated p-4 font-mono text-[12px] leading-relaxed text-fg-muted">
          {ISSUE_TEMPLATE}
        </pre>
      </section>

      {/* The nine layers, so the field is answerable without leaving the page. */}
      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          The nine layers
        </h2>
        <p className="mt-2 max-w-[62ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
          Pick the one you think it belongs in. Guessing is fine and expected —
          the reviewer will disagree, and that disagreement is the useful part.
        </p>
        <ul className="mt-4 grid gap-px border border-border bg-border sm:grid-cols-2">
          {LAYERS.map((layer) => (
            <li key={layer.slug} className="bg-bg-elevated px-3.5 py-2.5">
              <Link
                href={`/${layer.slug}`}
                className="group flex items-baseline gap-2"
              >
                <span className="font-mono text-[12px] tabular-nums text-fg-subtle">
                  {layer.index}
                </span>
                <span className="text-[14px] font-medium transition-colors group-hover:text-accent">
                  {layer.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          What happens next
        </h2>
        <dl className="mt-4 space-y-5">
          {questions.map((item) => (
            <div key={item.q}>
              <dt className="text-[15px] font-medium">{item.q}</dt>
              <dd className="mt-1 max-w-[62ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-12 max-w-[62ch] border-t border-border pt-6 text-[12.5px] leading-relaxed text-fg-subtle">
        Corrections to entries that are already here are treated as more urgent
        than new submissions — a wrong licence or a wrong deployment model can
        change an architecture decision. The same issue link works; say which
        entry in the notes. The bar is written out on the{" "}
        <Link
          href="/methodology"
          className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
        >
          methodology page
        </Link>
        , including{" "}
        <Link
          href="/methodology#wrong"
          className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
        >
          where this index is wrong
        </Link>
        .
      </p>
    </div>
  );
}