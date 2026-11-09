import type { Metadata } from "next";
import Link from "next/link";
import { AskAi } from "@/components/ask-ai";
import { InfoPageLayout, InfoSection } from "@/components/info-page";
import { site } from "@/lib/site";
import { absolute, breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Privacy policy and data use",
  description:
    "What data Lattice collects when you browse the site, how analytics and third-party badges work, and how to contact the maintainer.",
  alternates: { canonical: "/privacy" },
  openGraph: { url: absolute("/privacy") },
};

export default function PrivacyPage() {
  const pageUrl = `${site.url}/privacy`;
  const jsonLd = toJsonLd(
    graph(
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: "Privacy policy",
        description: metadata.description as string,
        dateModified: datasetModified,
        isPartOf: { "@id": ids.website },
        publisher: { "@id": ids.organization },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      },
      breadcrumbNode(pageUrl, [
        { name: site.name, path: "" },
        { name: "Privacy", path: "/privacy" },
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
      breadcrumb="Privacy"
      eyebrow="Privacy"
      title="What this site collects."
      lede={
        <>
          This site is a static index. It does not sell listings, run accounts, or
          process payments on this domain.
        </>
      }
    >
      <InfoSection title="Server logs">
        <p>
          The hosting provider may record standard request metadata (such as IP
          address, user agent, and requested URL) for security and operations.
          Those logs are governed by the provider&apos;s policy, not stored here
          as a user database.
        </p>
      </InfoSection>

      <InfoSection title="Click signals">
        <p>
          A few links (into comparisons, alternatives, tool homepages and the
          review page) send a small beacon to this site when clicked: the page
          you were on, where the link goes, and one word for the kind of place
          you first arrived from: <code>ai</code>, <code>search</code>,{" "}
          <code>social</code>, <code>direct</code> or <code>referral</code>.
          That word is worked out in your browser. The referring URL itself is
          never sent, and there is no cookie and no identifier, so the record
          cannot be tied to you or joined across visits. The word is kept in
          your tab&apos;s session storage until the tab closes.
        </p>
      </InfoSection>

      <InfoSection title="Third-party links and badges">
        <p>
          Pages link out to tool vendors, GitHub, and badge providers (for example
          Product Hunt, UsefulShelf, Smol Rank and Peerlist). Following those links is subject to each
          destination&apos;s privacy terms.
        </p>
      </InfoSection>

      <InfoSection title="Questions">
        <p>
          Privacy questions: <Link href="/contact">Contact</Link> or{" "}
          <a href={site.contact.href}>{site.contact.label}</a>.
        </p>
      </InfoSection>
      <AskAi url={pageUrl} />
    </InfoPageLayout>
    </>
  );
}
