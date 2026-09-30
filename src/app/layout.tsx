import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

import { SearchProvider, type SearchEntry } from "@/components/search-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { themeInitScript } from "@/components/theme-toggle";
import { categories } from "@/lib/data";
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
  openGraph: {
    type: "website",
    url: site.url,
    title: site.defaultTitle,
    description: site.description,
    siteName: site.name,
  },
  robots: { index: true, follow: true },
};

const searchEntries: SearchEntry[] = categories.flatMap((c) =>
  c.tools.map((tool) => ({
    ...tool,
    categoryTitle: c.title,
    categorySlug: c.slug,
    categoryLayer: c.layer,
  })),
);

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
