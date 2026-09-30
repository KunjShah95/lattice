/**
 * Open Graph card, rendered by Satori via `next/og`.
 *
 * Two constraints shape this file:
 *
 * 1. Social crawlers do not execute CSS, so the palette is inlined as
 *    literals. It mirrors globals.css and must be kept in step with it.
 * 2. Satori supports a subset of CSS. In particular `gap` is unreliable, so
 *    spacing is done with margins on siblings. No external font is fetched —
 *    a missing font would fail the render at request time.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const C = {
  bg: "#fbfbfa",
  grid: "rgba(22,22,26,0.05)",
  fg: "#16161a",
  muted: "#66666e",
  subtle: "#97979f",
  border: "#e4e4e0",
  accent: "#b8442a",
};

/** Substrate gold through to surface indigo. Mirrors --layer-1..9. */
const LAYER_HEX = [
  "#ac731a",
  "#c2871f",
  "#5f8f3e",
  "#3f9a72",
  "#2f9a92",
  "#2f8fae",
  "#3a7cc4",
  "#4a69ce",
  "#6f5ce0",
];

export function layerHex(layer: number | null): string {
  if (layer == null) return C.subtle;
  return LAYER_HEX[layer - 1] ?? C.subtle;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function OgCard({
  eyebrow,
  title,
  subtitle,
  meta,
  layer,
  siteName,
  siteHost,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  meta: string;
  layer: number | null;
  siteName: string;
  siteHost: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: C.bg,
        backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
        padding: "70px 80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Masthead, with the layer's identity rule. */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <div
          style={{
            width: 8,
            height: 60,
            borderRadius: 4,
            backgroundColor: layerHex(layer),
            marginRight: 24,
          }}
        />
        <div
          style={{
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: C.subtle,
          }}
        >
          {eyebrow}
        </div>
        <div style={{ fontSize: 24, color: C.muted, marginLeft: 24 }}>
          {siteName}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: title.length > 40 ? 60 : 74,
            lineHeight: 1.1,
            letterSpacing: -2,
            color: C.fg,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 29,
            lineHeight: 1.4,
            color: C.muted,
            marginTop: 24,
            maxWidth: 940,
          }}
        >
          {subtitle}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          borderTop: `2px solid ${C.border}`,
          paddingTop: 24,
          fontSize: 23,
          color: C.subtle,
        }}
      >
        <div>{meta}</div>
        <div style={{ margin: "0 18px", color: C.border }}>·</div>
        <div>{siteHost}</div>
      </div>
    </div>
  );
}
