import type { Metadata } from "next";
import Link from "next/link";
import {
  InfoChannel,
  InfoPageLayout,
  InfoSection,
  MaintainerNote,
} from "@/components/info-page";
import { site } from "@/lib/site";
import { REPO } from "@/lib/submissions.mjs";
import { absolute, breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "How to reach the maintainers of the Lattice index — email, social, and where to report corrections or suggest tools.",
  alternates: { canonical: "/contact" },
  openGraph: { url: absolute("/contact") },
};

/**
 * A prefilled issue for the commonest correction. Licences change (relicensing
 * to source-available is the usual direction) and a stale one is the error most
 * likely to cost a reader something, so it gets its own one-click route rather
 * than a blank issue the reporter has to structure themselves.
 */
const LICENCE_ISSUE_URL = `${site.repo}/issues/new?${new URLSearchParams({
  title: "Correction: wrong licence for <tool>",
  body: [
    "**Tool:** <name or its Lattice URL>",
    "",
    "**Licence shown on Lattice:** ",
    "**Actual licence:** ",
    "",
    "**Source:** <link to the LICENSE file, release note or announcement>",
    "**Changed on (if known):** ",
  ].join("\n"),
})}`;

export default function ContactPage() {
  const pageUrl = `${site.url}/contact`;
  const jsonLd = toJsonLd(
    graph(
      {
        "@type": "ContactPage",
        "@id": pageUrl,
        url: pageUrl,
        name: "Contact",
        description: metadata.description as string,
        dateModified: datasetModified,
        isPartOf: { "@id": ids.website },
        publisher: { "@id": ids.organization },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      },
      breadcrumbNode(pageUrl, [
        { name: site.name, path: "" },
        { name: "Contact", path: "/contact" },
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
      breadcrumb="Contact"
      eyebrow="Contact · humans and agents"
      title="Reach the maintainers."
      lede={
        <>
          Questions about an entry, a broken link, or how something is classified
          belong on the public record — not in a private inbox that nobody else can
          verify.
        </>
      }
    >
      <MaintainerNote>
        This index is maintained by{" "}
        {site.maintainer ?? site.copyrightHolder}. Email is read by a person,
        not a queue — a correction that arrives by email is verified and published
        through the <Link href="/corrections">corrections log</Link> like any
        other, so a reply asking &ldquo;was this fixed?&rdquo; can be answered with a
        link rather than a recollection. Anything about a specific entry is fastest
        as an{" "}
        <a
          href={`${site.repo}/issues/new`}
          rel="noopener noreferrer"
          target="_blank"
        >
          issue on the public repository
        </a>
        , where the discussion outlives the thread. Reporting a wrong licence or a
        dead link as an issue rather than an email is what keeps the correction
        reviewable by someone else.
      </MaintainerNote>

      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          People
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          <li>
            <InfoChannel
              href={`mailto:${site.contact.email}`}
              label="Email"
              detail={site.contact.email}
            />
          </li>
          <li>
            <InfoChannel
              href={site.contact.x}
              label="X / Twitter"
              detail="Public updates and quick questions"
              external
            />
          </li>
          <li>
            <InfoChannel
              href={`https://github.com/${REPO}/issues`}
              label="GitHub issues"
              detail="Bugs, corrections, and public discussion"
              external
            />
          </li>
          <li>
            <InfoChannel
              href={LICENCE_ISSUE_URL}
              label="Report a wrong licence"
              detail="Prefilled GitHub issue — link the source"
              external
            />
          </li>
          <li>
            <InfoChannel href="/submit" label="Submit a tool" detail="/submit" />
          </li>
          <li>
            <InfoChannel
              href="/corrections"
              label="Corrections log"
              detail="/corrections"
            />
          </li>
        </ul>
      </section>

      <InfoSection title="Machine-readable">
        <p>
          Agents and crawlers can use these endpoints without loading the full UI.
        </p>
        <ul>
          <li>
            <a href="/sitemap.xml">/sitemap.xml</a> — every indexable URL
          </li>
          <li>
            <a href="/llms.txt">/llms.txt</a> — task-keyed index for models
          </li>
          <li>
            <a href="/mcp.json">/mcp.json</a> — MCP discovery document
          </li>
        </ul>
        <p>
          Policy pages:{" "}
          <Link href="/about">About</Link>, <Link href="/privacy">Privacy</Link>,{" "}
          <Link href="/returns">Returns</Link>.
        </p>
      </InfoSection>
    </InfoPageLayout>
    </>
  );
}
