import type { Metadata } from "next";
import { InfoPageLayout, InfoSection } from "@/components/info-page";
import { submissionLog } from "@/lib/submission-log";
import { site } from "@/lib/site";
import { absolute, breadcrumbNode, graph, ids } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";
import Link from "next/link";
import { PageGuidance } from "@/components/page-guidance";
import { PAGE_GUIDANCE } from "@/lib/guidance";

export const metadata: Metadata = {
  title: "Submissions accepted into the index",
  description:
    "The public log of tools submitted by readers and accepted into the Lattice index, with credit to the submitter.",
  alternates: { canonical: "/submissions" },
  openGraph: { url: absolute("/submissions") },
};

export default function SubmissionsPage() {
  const pageUrl = `${site.url}/submissions`;
  const jsonLd = toJsonLd(
    graph(
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        url: pageUrl,
        name: "Accepted submissions",
        isPartOf: { "@id": ids.website },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      },
      breadcrumbNode(pageUrl, [
        { name: site.name, path: "" },
        { name: "Submissions", path: "/submissions" },
      ]),
    ),
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <InfoPageLayout
        breadcrumb="Submissions"
        eyebrow={`Submissions · ${site.name}`}
        title="Accepted submissions, credited."
        lede="Every tool here arrived through a reader's submission issue and cleared the review bar. The submitter is credited because the submission is the reason the entry exists."
      >
        <InfoSection title="The log">
          {submissionLog.length === 0 ? (
            <p>
              No accepted submissions yet. The first one will appear here with
              the submitter credited and a link to the pull request that merged
              it. Until then, this page is empty on purpose rather than padded.
            </p>
          ) : (
            <ul className="space-y-3">
              {submissionLog.map((entry) => (
                <li key={entry.pr} className="card p-4 not-prose">
                  <Link
                    href={`/${entry.section}/${entry.tool}`}
                    className="text-[17px] font-medium hover:text-accent"
                  >
                    {entry.tool}
                  </Link>
                  <span className="ml-2 inline-flex items-center rounded-[var(--r-pill)] border border-border px-2 py-0.5 font-mono text-[12px] text-fg-muted">
                    {entry.section}
                  </span>
                  <p className="mt-2 text-[14px] text-fg-muted">
                    Contributed by {entry.submitter} · merged {entry.mergedAt} ·{" "}
                    <a href={entry.pr} className="underline">
                      pull request
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </InfoSection>
        <InfoSection title="How to submit">
          <p>
            Suggest a tool on the{" "}
            <Link href="/submit" className="underline">
              submission page
            </Link>
            . A maintainer reviews every submission; most are declined, and the
            review bar is published on the methodology page.
          </p>
        </InfoSection>
        <PageGuidance url={pageUrl} rules={PAGE_GUIDANCE.submissions.rules} answers={PAGE_GUIDANCE.submissions.answers} />
      </InfoPageLayout>
    </>
  );
}