import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

import { SearchProvider } from "@/components/search-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { themeInitScript } from "@/components/theme-toggle";
import { site } from "@/lib/site";

/**
 * IBM Plex — a typeface family designed for engineering and technical
 * documentation. Chosen over the Next.js default specifically because the
 * default is the single loudest "unbranded template" signal available.
 *
 * Weights and preloads are deliberately narrow. Every weight declared here is
 * a separate woff2 the reader downloads, and every family preloaded is
 * bandwidth taken from the HTML and CSS that gate first paint.
 *
 *   - Sans 400/500/600 — 400 is body copy, 500 is labels, and 600 is used by
 *     `.prose-lattice h3` and `strong`. Next serves all three from one
 *     variable file, so this is a single 40 KB request.
 *   - Serif 500 only — serif is display type and appears exactly once per
 *     page, on an `h1` or `h2`, always at `font-medium`. 400 and 600 were
 *     never rendered by anything and cost two extra files (~30 KB).
 *   - Mono 400/500 — 400 is inline `code` and the small caps labels, 500 is
 *     `.prose-lattice th`. Not preloaded: mono only ever sets 10–12px labels
 *     and code, where the `swap` fallback is invisible, and preloading it
 *     competed with the two faces that actually render the headline.
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
  preload: false,
});
/** Serif is reserved for display type — it carries the editorial voice. */
const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  weight: ["500"],
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
        {/*
          No `entries` prop. The palette fetches /search-index.json on first
          open, so the corpus is no longer serialised into the RSC payload of
          every route on the site.
        */}
        <SearchProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </SearchProvider>

        {/*
          Cloudflare Web Analytics.

          A plain server-rendered <script> rather than `next/script` on purpose.
          Every page here is prerendered and served from the edge with a
          one-year `s-maxage`, so a runtime-injected tag never reaches the
          cached HTML — `afterInteractive` would fire only on client-side
          navigation and miss every cold cache hit, which is most real
          traffic. Baking the tag into the build puts it in the cached
          document on the very first request.

          Keep `type="module"`. Without it IE11 throws on the beacon's modern
          syntax; the error is invisible but the beacons are lost. `async`
          satisfies `no-sync-scripts` and is safe here — module scripts are
          deferred by spec anyway, and the beacon has no ordering dependency
          on anything else on the page.

          The token in `data-cf-beacon` also scopes collection to this exact
          hostname — Cloudflare validates it and silently discards beacons
          arriving from any other host.
        */}
        <script
          async
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "d637537d35244c2b8570042b04f61365"}'
        />
      </body>
    </html>
  );
}
