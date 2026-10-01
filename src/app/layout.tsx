import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

import { SearchProvider } from "@/components/search-provider";
import type { SearchEntry } from "@/lib/search";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { themeInitScript } from "@/components/theme-toggle";
import { categories } from "@/lib/data";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { site } from "@/lib/site";

/**
 * IBM Plex — a typeface family designed for engineering and technical
 * documentation. Chosen over the Next.js default specifically because the
 * default is the single loudest "unbranded template" signal available.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});
/** Serif is reserved for display type — it carries the editorial voice. */
const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.defaultTitle, template: site.titleTemplate },
  description: site.description,
  // Set here so the root layout is the single place canonicals are declared.
  // Every section, tool, essay and comparison sets its own, but the home page
  // had none — and the home page is the URL most likely to be indexed under a
  // variant (tracking params, trailing slash, apex vs www). `alternates` merges
  // rather than replaces, so child routes still override this.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: site.url,
    title: site.defaultTitle,
    description: site.description,
    siteName: site.name,
  },
  robots: { index: true, follow: true },
};

/**
 * Explicit viewport.
 *
 * Next.js already emits `width=device-width, initial-scale=1`, so this is not
 * about the width. `viewportFit: "cover"` lets the sticky header and the
 * glossary's sticky filter bar extend into the notch and rounded corners on
 * hardware that has them — without it iOS letterboxes the page into the safe
 * area and the header sits visibly inset from the screen edge.
 *
 * `themeColor` is what a mobile browser paints behind the page when scrolling
 * past the content, or in the overscroll area. Without it that region is
 * white in dark mode, which reads as a rendering fault.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0f" },
  ],
};

const searchEntries: SearchEntry[] = [
  // Tools
  ...categories.flatMap((c) =>
    c.tools.map((tool) => ({
      kind: "tool" as const,
      name: tool.name,
      blurb: tool.blurb,
      categoryTitle: c.title,
      categoryLayer: c.layer,
      href: `/${c.slug}/${tool.slug}`,
      external: tool.url,
      domain: tool.domain,
      tag: tool.kind,
    })),
  ),
  // Essays — the site's actual argument. Excluding these meant a query for
  // "evals" returned only tools and hid the best answer on the site.
  ...posts.map((p) => ({
    kind: "essay" as const,
    name: p.meta.title,
    blurb: p.meta.dek,
    categoryTitle: "Essays",
    categoryLayer: p.meta.layers[0] ?? null,
    href: `/blog/${p.meta.slug}`,
    tag: "Essay",
  })),
  // Comparisons
  ...resolvedComparisons.map((c) => ({
    kind: "comparison" as const,
    name: c.title,
    blurb: c.description,
    categoryTitle: "Comparisons",
    categoryLayer: c.tools[0]?.layer ?? null,
    href: `/compare/${c.slug}`,
    tag: "Compared",
  })),
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} ${plexSerif.variable} h-full antialiased`}
    >
      <head>
        {/* Applies the stored/system theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SearchProvider entries={searchEntries}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </SearchProvider>
      </body>
    </html>
  );
}
