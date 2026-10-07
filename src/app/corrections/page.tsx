import type { Metadata } from "next";
import Link from "next/link";
import { corrections } from "@/content/corrections.generated";
import { AS_OF } from "@/lib/attributes";
import { toolCount } from "@/lib/data";
import { site } from "@/lib/site";
import { absolute, breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Corrections — what this index has got wrong",
  description:
    "Every change to the entries, generated from the commit log rather than maintained by hand. What was corrected, when, and which claim it touched.",
  alternates: { canonical: "/corrections" },
  // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
  // canonical, and an inherited one points at the home page.
  openGraph: { url: absolute("/corrections") },
};

/**
 * The corrections log.
 *
 * ## Why this page exists
 *
 * `strategy/02-unique-selling-points.md` §3 says the freshness guard is the
 * strongest true claim this index makes and that nothing on the site shows it
 * happening. `/verification.json` published the *rule*; this publishes the
 * *history*.
 *
 * That matters for a specific reason the strategy doc names: stated uncertainty is
 * the one reliably citable signal, because the practitioner who broke through in
 * the category audit got cited for a caveat — "I do not cite GitHub stars as
 * quality because they can be inflated" — and not for a list. A caveat only
 * earns that if it is visibly acted on. A corrections page with entries on it is
 * the evidence; a prose promise in `/methodology` §06 is not.
 *
 * ## Why it is generated
 *
 * From `git log` over `attributes.ts` and `data.ts`, by
 * `scripts/build-corrections-log.mjs`. A hand-maintained corrections page is a
 * list somebody has to remember to append to, and it goes stale the moment
 * someone forgets — at which point it is worse than absent, because it looks like
 * evidence. Derived, it cannot disagree with what happened, and
 * `npm run generate:check` fails the build if the two drift.
 *
 * ## What it is not
 *
 * It is not a claim that the index is accurate. It is a record of the index
 * changing. The machine-readable receipt with an enforcement mechanism behind it
 * is still `/verification.json`; this is the narrative, and a narrative can be
 * edited.
 */
export default function CorrectionsPage() {
  const pageUrl = `${site.url}/corrections`;
  const dates = corrections.map((c) => c.date);
  const earliest = dates.length ? dates[dates.length - 1] : null;

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                // A `Blog` is the closest honest type: a dated, ordered list of
                // authored entries. `CollectionPage` would imply these are
                // sub-pages with their own URLs, and they are not — they are rows.
                "@type": "Blog",
                "@id": pageUrl,
                url: pageUrl,
                name: "Corrections",
                description: metadata.description as string,
                dateModified: datasetModified,
                isPartOf: { "@id": ids.website },
                blogPost: corrections.map((c, i) => ({
                  "@type": "BlogPosting",
                  "@id": `${pageUrl}#${c.hash}`,
                  position: i + 1,
                  headline: c.title,
                  datePublished: c.date,
                  url: c.url,
                })),
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: "Corrections", path: "/corrections" },
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
            <li className="text-fg-muted">Corrections</li>
          </ol>
        </nav>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {corrections.length} changes · {earliest ?? AS_OF} onward
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          What this index has got wrong.
        </h1>
        <p className="editorial-justify mt-4 max-w-[58ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          Every change to the {toolCount} entries, in order, generated from the
          commit log rather than kept by hand. An index that says it wants to be
          corrected and then shows no corrections has told you nothing.
        </p>
      </header>

      {corrections.length === 0 ? (
        <p className="mt-10 border-t border-border pt-6 text-[14px] text-fg-subtle">
          No entries have been corrected yet. That is a statement about this page
          having been added after the fact, not about the index being right —{" "}
          <Link
            href="/methodology"
            className="text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
          >
            the method
          </Link>{" "}
          says where it is wrong in ways a commit cannot show.
        </p>
      ) : (
        <ol className="mt-10 space-y-px">
          {corrections.map((entry) => (
            <li
              key={entry.hash}
              className="border-t border-border py-4 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <time
                  dateTime={entry.date}
                  className="font-mono text-[11px] tabular-nums text-fg-subtle"
                >
                  {entry.date}
                </time>
                {entry.touched.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-border px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <h2 className="mt-1.5 text-balance font-serif text-[19px] font-medium leading-snug tracking-[-0.01em]">
                {/* Outbound, `rel="noopener"`, and deliberately not a next/link:
                    it goes to github.com, and prefetching a commit page on
                    every row of a list nobody asked for is not worth the
                    request. */}
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener"
                  className="text-fg transition-colors hover:text-accent"
                >
                  {entry.title}
                </a>
              </h2>
              <p className="mt-1 font-mono text-[11px] text-fg-subtle">
                <span className="sr-only">Commit </span>
                {entry.hash}
              </p>
            </li>
          ))}
        </ol>
      )}

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          How to read this
        </h2>
        <ul className="mt-4 space-y-3 text-pretty text-[14px] leading-relaxed text-fg-muted">
          <li className="editorial-justify">
            <span className="text-fg">This is a record, not a score.</span> A
            short log means little has needed fixing, or that this page was added
            late — it is not evidence that the index is right.{" "}
            <Link
              href="/methodology"
              className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
            >
              The method
            </Link>{" "}
            says where the index is wrong in ways a commit cannot show.
          </li>
          <li className="editorial-justify">
            <span className="text-fg">Commit subjects are verbatim.</span>{" "}
            Nothing here is reworded for the reader, because a paraphrased log is a
            second claim about what happened and this page&rsquo;s only value is
            that it is not one.
          </li>
          <li className="editorial-justify">
            <span className="text-fg">The enforcement is elsewhere.</span>{" "}
            Licence and cost data older than six months fails the build, so a
            deployed copy of{" "}
            <Link href="/verification.json" className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent">
              /verification.json
            </Link>{" "}
            is a receipt for a check that actually ran. A changelog can be edited;
            a build that throws cannot.
          </li>
          <li className="editorial-justify">
            <span className="text-fg">Found something wrong?</span>{" "}
            <Link
              href="/submit"
              className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
            >
              Open an issue
            </Link>
            . Corrections are treated as more urgent than new entries, and a
            wrong licence changes architecture for everyone who reads this page.
          </li>
        </ul>
      </section>
    </div>
  );
}