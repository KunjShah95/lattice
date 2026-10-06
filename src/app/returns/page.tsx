import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection, MaintainerNote } from "@/components/info-page";
import { site } from "@/lib/site";
import { absolute, breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Returns and refunds",
  description:
    "Whether Lattice sells goods or services on this site, and where to ask about refunds if you paid a third party listed in the index.",
  alternates: { canonical: "/returns" },
  openGraph: { url: absolute("/returns") },
};

export default function ReturnsPage() {
  const pageUrl = `${site.url}/returns`;
  const jsonLd = toJsonLd(
    graph(
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: "Returns and refunds",
        description: metadata.description as string,
        dateModified: datasetModified,
        isPartOf: { "@id": ids.website },
        publisher: { "@id": ids.organization },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      },
      breadcrumbNode(pageUrl, [
        { name: site.name, path: "" },
        { name: "Returns", path: "/returns" },
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
      breadcrumb="Returns"
      eyebrow="Returns & refunds"
      title="Nothing is sold on this domain."
      lede={
        <>
          {site.name} is a curated reference index. Purchases happen with vendors
          listed here, not with the maintainer of this site.
        </>
      }
    >
      <MaintainerNote>
        There is nothing to refund here, because {site.name} charges nothing: no
        account, no paywall, no paid placement, no affiliate link anywhere in the
        index. Listing is free and a vendor cannot buy a position, a band, or a
        comparison. If a page ever starts taking payment, this one changes first.
      </MaintainerNote>

      <InfoSection title="Vendor purchases">
        <p>
          If you purchased a product or service from a vendor listed in the index,
          that transaction is with the vendor. Use their returns policy and support
          channels — this site cannot refund a purchase it was not party to.
        </p>
      </InfoSection>

      <InfoSection title="What the maintainer does take responsibility for">
        <p>
          The index itself is editorial work, and it is correctable. If an entry
          misstates a price, a licence or a capability, that is a claim made by{" "}
          {site.name} and it gets fixed: report it on{" "}
          <Link href="/contact">contact</Link> and it will appear in the{" "}
          <Link href="/corrections">corrections log</Link>, whatever route it
          arrived by.
        </p>
      </InfoSection>
    </InfoPageLayout>
    </>
  );
}
