import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/info-page";
import { site } from "@/lib/site";
import { absolute, breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Lattice is, who maintains the index, and how entries are chosen, checked, and corrected.",
  alternates: { canonical: "/about" },
  openGraph: { url: absolute("/about") },
};

export default function AboutPage() {
  const pageUrl = `${site.url}/about`;
  const jsonLd = toJsonLd(
    graph(
      {
        "@type": "AboutPage",
        "@id": pageUrl,
        url: pageUrl,
        name: "About",
        description: metadata.description as string,
        dateModified: datasetModified,
        isPartOf: { "@id": ids.website },
        about: { "@id": ids.organization },
        breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      },
      breadcrumbNode(pageUrl, [
        { name: site.name, path: "" },
        { name: "About", path: "/about" },
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
      breadcrumb="About"
      eyebrow={`About · ${site.name}`}
      title="A curated index, not a popularity list."
      lede={site.tagline}
    >
      <InfoSection title="What this is">
        <p>{site.description}</p>
        <p>
          The ordering is the argument: stack depth first, popularity second. Most
          directories in this space list the right categories with no order — which
          cannot answer where a tool sits relative to what you already run.
        </p>
      </InfoSection>

      <InfoSection title="How to trust it">
        <p>
          The inclusion rules, verification gates, and known weaknesses are written
          out on the <Link href="/methodology">methodology page</Link>. Changes to
          entries are listed on <Link href="/corrections">Corrections</Link>.
        </p>
        <p>
          © {site.copyrightYear} {site.copyrightHolder}. Tool names and logos
          belong to their respective authors.
        </p>
      </InfoSection>
    </InfoPageLayout>
    </>
  );
}
