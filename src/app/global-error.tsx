"use client";

/**
 * Last-resort boundary for a failure in the root layout itself.
 *
 * It replaces the layout, so none of the site's CSS, fonts or theme class are
 * available (Next's docs: global-error renders its own document). Styles are
 * therefore inline and follow the OS colour scheme, using the same two paper
 * and ink values as the design tokens so it still reads as this site.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <title>Something went wrong · Lattice</title>
        <style>{`
          body { background: #fbfbfa; color: #16161a; }
          @media (prefers-color-scheme: dark) { body { background: #0b0b0c; color: #ededf0; } }
          button { font: inherit; cursor: pointer; border: 0; border-radius: 8px; padding: 10px 16px;
                   background: currentColor; }
          button span { color: #fbfbfa; }
          @media (prefers-color-scheme: dark) { button span { color: #0b0b0c; } }
        `}</style>
        <main style={{ maxWidth: 520 }}>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.6 }}>
            Lattice · error
          </p>
          <h1 style={{ fontFamily: "ui-serif, Georgia, serif", fontWeight: 500, fontSize: 34, lineHeight: 1.15, margin: "16px 0 12px" }}>
            The site failed to load.
          </h1>
          <p style={{ lineHeight: 1.6, opacity: 0.75, margin: "0 0 24px" }}>
            Trying again usually fixes it. If it keeps happening, the index is
            also available as plain text at <a href="/llms-full.txt" style={{ color: "inherit" }}>/llms-full.txt</a>.
          </p>
          <button type="button" onClick={() => retry()}>
            <span>Try again</span>
          </button>
          {error.digest ? (
            <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, opacity: 0.55, marginTop: 32 }}>
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
