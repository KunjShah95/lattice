/**
 * Open Graph card, rendered by Satori via `next/og`.
 *
 * Six constraints shape this file, and every one of them is invisible in the
 * markup and load-bearing in the result:
 *
 * 1. Social crawlers do not execute CSS, so the palette is inlined as literals
 *    that mirror globals.css. The card is dark-only: an OG image has no theme
 *    context and a feed preview lands on whatever surface the reader is using,
 *    so it picks the one that holds up on both.
 * 2. Satori supports a subset of CSS. `gap` is unreliable, so spacing is done
 *    with margins on siblings. There is no `grid`, no `lineClamp` and no
 *    `text-overflow` — anything that would truncate on the live site is
 *    truncated here in JS, which is what `clamp` is for. **Any div with more
 *    than one child must declare `display: flex`, `display: contents` or
 *    `display: none`**, or the render throws at build time.
 * 3. The 500 KB route bundle ceiling counts embedded fonts, so exactly three
 *    Latin-subset faces ship: Plex Serif 500 for the title, Plex Sans 600 for
 *    the subtitle, Plex Mono 500 for every label. Regenerate with
 *    `python scripts/subset-og-fonts.py <dir>`; do not add a fourth.
 * 4. Fonts are read once at module scope. They do not vary per request, and
 *    reading them inside the handler would put ~187 KB of disk I/O in front of
 *    every share-card render.
 * 5. One card, three shapes. A section card, a tool card and the home card are
 *    not the same layout wearing different text — see `variant` below. The
 *    strata rail and the use/skip valve only appear where they carry
 *    information, because a share card is the one place the site's thesis can
 *    reach someone who never opens it.
 * 6. Nothing decorative survives contact with a 1200x630 crop. LinkedIn and
 *    Slack both crop the card to roughly 1.91:1 on desktop, which trims the
 *    left and right edges, and X crops harder. All content sits inside a
 *    64px side margin so a horizontal crop cannot cut a word.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

const [plexSans, plexSerif, plexMono] = await Promise.all([
  readFile(join(process.cwd(), "assets/og/IBMPlexSans-SemiBold-subset.ttf")),
  readFile(join(process.cwd(), "assets/og/IBMPlexSerif-Medium-subset.ttf")),
  readFile(join(process.cwd(), "assets/og/IBMPlexMono-Medium-subset.ttf")),
]);

/**
 * Only the weights that actually ship are declared. Satori matches on weight
 * and silently substitutes its own fallback face when a request asks for one it
 * was not given, so asking for 400 here would put Arial back on the card.
 */
export const OG_FONTS = [
  { name: "Plex Serif", data: plexSerif, weight: 500 as const, style: "normal" as const },
  { name: "Plex Sans", data: plexSans, weight: 600 as const, style: "normal" as const },
  { name: "Plex Mono", data: plexMono, weight: 500 as const, style: "normal" as const },
];

const SERIF = "Plex Serif";
const SANS = "Plex Sans";
const MONO = "Plex Mono";

/** Dark theme, globals.css `.dark`. */
const C = {
  bg: "#0b0b0c",
  bgLift: "#121216",
  grid: "rgba(255,255,255,0.055)",
  fg: "#ededf0",
  muted: "#9a9aa3",
  subtle: "#68686f",
  faint: "#45454e",
  border: "#232327",
  borderFirm: "#36363c",
  accent: "#fc7659",
};

/**
 * The three bands from globals.css, not the nine layer stops.
 *
 * The nine-stop ramp was retired on the live site — nine hues is a rainbow,
 * and a rainbow is decoration. A card inherits that reasoning or it does not.
 */
const BAND_HEX = {
  compute: "#e09f45",
  state: "#88bf84",
  control: "#6aaae6",
} as const;

export type Band = keyof typeof BAND_HEX;

/** Which band a stack depth belongs to. Mirrors `bandOf` in layer.ts. */
export function bandOf(layer: number | null): Band | null {
  if (layer == null || layer < 1) return null;
  if (layer <= 2) return "compute";
  if (layer <= 4) return "state";
  return "control";
}

export function bandHex(band: Band | null): string {
  return band ? BAND_HEX[band] : C.subtle;
}

/** Band display order, surface-first, matching the live stack diagram. */
const BANDS_SURFACE_FIRST: Array<{ id: Band; layers: number[] }> = [
  { id: "control", layers: [9, 8, 7, 6, 5] },
  { id: "state", layers: [4, 3] },
  { id: "compute", layers: [2, 1] },
];

const BAND_LABEL: Record<Band, string> = {
  compute: "I · Compute",
  state: "II · State",
  control: "III · Control",
};

/**
 * The band a layer belongs to, as a display string.
 *
 * Exported so the route files can put the band in the eyebrow and the depth in
 * the badge. Those are two different facts and stating both in the eyebrow was
 * saying the same thing twice — "LAYER 03" above the title and "LAYER 03 / 09"
 * in the masthead, with the band appearing nowhere until the strata rail.
 */
export function bandLabel(layer: number | null): string {
  const band = bandOf(layer);
  return band ? BAND_LABEL[band] : "Off-stack";
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Satori has no `lineClamp` and no `text-overflow: ellipsis`, so a long title
 * silently grows the card past 630px and gets clipped by the frame. Every
 * string that reaches the card goes through here, cutting on a word boundary
 * so the last visible word is never half a word.
 */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.—-]+$/, "")}…`;
}

/**
 * Title size ladder, set in the serif so the card carries the same voice as
 * every h1 on the site. Serif needs a touch more room than the old sans did:
 * it has a smaller x-height at the same nominal size, and the old ladder was
 * tuned when the title was sans.
 */
function titleSize(title: string): number {
  if (title.length <= 14) return 88;
  if (title.length <= 24) return 76;
  if (title.length <= 36) return 66;
  return 56;
}

/**
 * The lattice glyph from components/logo.tsx, drawn with divs rather than
 * inline SVG. Satori's SVG support is real but partial, and four rounded
 * rectangles are not worth a rendering edge case — `position: absolute` is
 * supported everywhere and always behaves.
 *
 * The asymmetry is what makes it read as a lattice rather than a grid: two
 * cells are full pills, two are near-square outlines, and exactly one is
 * filled. A 2x2 of identical squares is a favicon.
 */
function Glyph({ size = 30, color }: { size?: number; color: string }) {
  const cell = Math.round(size * 0.4);
  const gap = Math.round(size * 0.16);
  const step = cell + gap;
  const stroke = Math.max(2, Math.round(size * 0.075));
  const cells: Array<{ x: number; y: number; r: number; filled: boolean }> = [
    { x: 0, y: 0, r: cell, filled: false },
    { x: step, y: 0, r: Math.round(cell * 0.2), filled: false },
    { x: 0, y: step, r: Math.round(cell * 0.2), filled: false },
    { x: step, y: step, r: Math.round(cell * 0.2), filled: true },
  ];
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        flexDirection: "row",
      }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            width: cell,
            height: cell,
            borderRadius: c.r,
            border: c.filled ? "none" : `${stroke}px solid ${color}`,
            backgroundColor: c.filled ? color : "transparent",
          }}
        />
      ))}
    </div>
  );
}

/** Mono label. Every small string on the card is set in it. */
function Label({
  children,
  color = C.muted,
  size = 21,
  tracking = 0,
}: {
  children: React.ReactNode;
  color?: string;
  size?: number;
  tracking?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: MONO,
        fontSize: size,
        color,
        letterSpacing: tracking,
        lineHeight: 1.25,
      }}
    >
      {children}
    </div>
  );
}

/**
 * The strata rail — nine bands, surface-first, with the current one ringed.
 *
 * This is the site's signature device and the reason a share card here can
 * carry something a directory's card never could: where this page sits
 * relative to the substrate. Every competitor in the category indexes a flat
 * list, so they have nothing to draw here.
 *
 * Two modes, because "where am I" and "what is this" are different questions:
 *
 *   current  section and tool cards. The band you are in is full height, full
 *            ink and ringed in the tint; the rest are stubs.
 *   catalog  the home card. Nothing is current, so all nine are shown at full
 *            height in their band colour with the band gaps left visible. This
 *            is the whole product in one image — nine layers, three bands,
 *            ordered — and it is the reason the index is legible as a map
 *            rather than a list.
 */
function Strata({
  current,
  catalog = false,
}: {
  current: number | null;
  catalog?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end" }}>
      {BANDS_SURFACE_FIRST.map((band, bi) => (
        <div
          key={band.id}
          style={{
            display: "flex",
            flexDirection: "row",
            marginLeft: bi === 0 ? 0 : 14,
          }}
        >
          {band.layers.map((layer) => {
            const on = !catalog && current === layer;
            const c = BAND_HEX[band.id];
            return (
              <div
                key={layer}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  width: 46,
                  height: on ? 30 : catalog ? 26 : 12,
                  marginRight: 5,
                  borderRadius: 2,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: catalog ? c : on ? c : C.faint,
                  // Ringed in the mark, not the band colour — a ring the same
                  // hue as the fill it surrounds is invisible, which is exactly
                  // what the first pass did. This matches the live site, where
                  // the current layer is ringed in the accent.
                  border: on ? `2px solid ${C.accent}` : "none",
                  // In catalog mode every band is present, so the weights are
                  // modulated slightly rather than left identical — the eye
                  // reads nine things, which is the intent.
                  opacity: catalog ? (band.id === "compute" ? 0.72 : band.id === "state" ? 0.86 : 1) : 1,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Horizontal rule. Used as a datum line, matching the live site's hairlines. */
function Rule({ width = 1072, color = C.border }: { width?: number; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        width,
        height: 1,
        backgroundColor: color,
      }}
    />
  );
}

/**
 * The use/skip valve.
 *
 * On a live tool page these two sentences are the site's whole thesis, set as
 * two equal cards. On a card they cannot be cards — there is no room and a
 * card implies a component. Two stacked lines with the labels pushed to the
 * margin reads as the argument it is, and it is the one thing here no vendor
 * can put on their own share image without it being an advertisement.
 */
/** Fixed label column so the two valve lines start their text on one axis. */
const VALVE_LABEL_W = 128;

/**
 * Width available to a valve sentence: the content box less the label column.
 *
 * Without it a flex item keeps `min-width: auto` and simply grows past the card
 * instead of wrapping, so the longest sentence in the dataset ran off the right
 * edge and was clipped by the frame. `clamp` cannot help — it truncates, and a
 * good sentence cut at "…" is worse than one wrapped onto a second line.
 *
 * 1136 is the right edge of the padded box (1200 - 64); minus the 128px label
 * leaves 944, which fits 223 of the 224 useWhen/skipWhen strings in the dataset
 * on one line. The one that does not is Distill's, which now wraps.
 */
const VALVE_TEXT_W = 1136 - VALVE_LABEL_W;

/**
 * Characters per line at 23px Plex Sans SemiBold inside a 944px column.
 *
 * Measured, not guessed: the longest sentence in the dataset rendered to 967px
 * of ink on a 944px column, so ~10.9px per character including the trailing
 * space. 78 characters lands near 850px, which leaves room for a wide glyph run
 * without crossing the right margin.
 */
const VALVE_CHARS_PER_LINE = 78;

/**
 * Wrap on a character budget, in JS.
 *
 * Satori will not do this reliably. Given `width`, `maxWidth`, or neither, a
 * string inside a `flexDirection: row` parent is measured at max-content and
 * laid out on one line — which is how Distill's `useWhen` reached x=1159 on a
 * 1200px card while every width property on the element said otherwise.
 * `check-og-bounds.py` found it across 235 cards.
 *
 * `clamp` is the wrong tool here: it truncates, and a good sentence cut at an
 * ellipsis is worse than one wrapped onto a second line. So the card does its
 * own line breaking and renders each line as its own block, which Satori lays
 * out exactly as written. Words are never split.
 */
function wrapLines(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const lines: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const cut = rest.lastIndexOf(" ", max);
    // No space within the budget means the word is longer than a line; break it
    // hard rather than looping forever.
    const at = cut > 0 ? cut : max;
    lines.push(rest.slice(0, at).replace(/\s+$/, ""));
    rest = rest.slice(at).replace(/^\s+/, "");
  }
  if (rest) lines.push(rest);
  return lines;
}

/** A valve sentence, pre-wrapped. One block per line, no Satori reflow needed. */
function ValveText({ text, color }: { text: string; color: string }) {
  const lines = wrapLines(text, VALVE_CHARS_PER_LINE);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: VALVE_TEXT_W,
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            fontFamily: SANS,
            fontSize: 23,
            lineHeight: 1.36,
            color,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

function Valve({
  use,
  skip,
  tint,
}: {
  use?: string | null;
  skip?: string | null;
  tint: string;
}) {
  if (!use && !skip) return null;
  // 128px, not 106. "SKIP WHEN" is two words and at 17px mono with 1.6
  // tracking it needs ~124px; at 106 it wrapped onto two lines and the second
  // line desynced from the text beside it, which looked like a rendering fault
  // rather than a label.
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {use ? (
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div style={{ display: "flex", width: VALVE_LABEL_W, flexShrink: 0 }}>
            <Label color={tint} size={17} tracking={1.6}>
              USE WHEN
            </Label>
          </div>
          <ValveText text={clamp(use, 88)} color={C.fg} />
        </div>
      ) : null}
      {skip ? (
        <div style={{ display: "flex", flexDirection: "row", marginTop: 12 }}>
          <div style={{ display: "flex", width: VALVE_LABEL_W, flexShrink: 0 }}>
            <Label color={C.subtle} size={17} tracking={1.6}>
              SKIP WHEN
            </Label>
          </div>
          <ValveText text={clamp(skip, 88)} color={C.muted} />
        </div>
      ) : null}
    </div>
  );
}

export type OgVariant = "home" | "section" | "tool" | "plain";

export function OgCard({
  variant = "section",
  eyebrow,
  title,
  subtitle,
  meta,
  layer,
  siteName,
  siteHost,
  domain,
  useWhen,
  skipWhen,
  footNote,
}: {
  variant?: OgVariant;
  eyebrow: string;
  title: string;
  subtitle: string;
  meta: string;
  layer: number | null;
  siteName: string;
  siteHost: string;
  /** Vendor host on a tool card. The thing a reader would type to go there. */
  domain?: string | null;
  /** The decision pair. Tool cards only. */
  useWhen?: string | null;
  skipWhen?: string | null;
  /** Overrides the domain on the right of the footer. */
  footNote?: string | null;
}) {
  const band = bandOf(layer);
  const tint = bandHex(band);

  // The strata rail only means something when there is a "current" layer —
  // except on the home card, where nothing is current and showing the whole
  // catalogue is the point.
  const showStrata =
    variant === "home" ||
    (layer != null && (variant === "section" || variant === "tool"));

  // Off-stack material and the non-layer routes have no depth to badge, so the
  // badge is omitted rather than rendered as an empty stub — a rule that means
  // nothing is worse than no rule.
  const badge =
    layer == null
      ? null
      : variant === "tool"
        ? `Layer ${String(layer).padStart(2, "0")}`
        : `Layer ${String(layer).padStart(2, "0")} / 09`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: C.bg,
        // A flat #0b0b0c reads as a black rectangle in a feed. The diagonal
        // lift keeps the card from disappearing into a dark reader without
        // becoming a gradient-y card, and the 64px grid is the site's
        // engineering-paper cue carried across at higher contrast than the live
        // page, because a card is viewed for two seconds and the live site is
        // viewed for ten minutes.
        backgroundImage: `linear-gradient(152deg, ${C.bgLift} 0%, ${C.bg} 44%, #08080a 100%), linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 64px 64px, 64px 64px",
        padding: "54px 64px 50px",
        fontFamily: SANS,
      }}
    >
      {/* Masthead: wordmark left, depth badge right. */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <Glyph color={tint} />
        <div style={{ display: "flex", marginLeft: 15 }}>
          <Label color={C.fg} size={22} tracking={2}>
            {siteName.toUpperCase()}
          </Label>
        </div>
        {badge ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              marginLeft: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: tint,
                marginRight: 11,
              }}
            />
            <Label color={C.muted} size={20} tracking={1.8}>
              {badge.toUpperCase()}
            </Label>
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 38,
        }}
      >
        <Label color={tint} size={21} tracking={3}>
          {eyebrow.toUpperCase()}
        </Label>

        {/* Title row. The domain, when present, sits on the baseline to the
            right of the name in mono, which separates "what this is called"
            from "where it lives" without needing a second line. */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "baseline",
            marginTop: 17,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: SERIF,
              fontSize: titleSize(title),
              lineHeight: 1.04,
              letterSpacing: -1.8,
              color: C.fg,
              maxWidth: domain ? 760 : 1010,
            }}
          >
            {clamp(title, 44)}
          </div>
          {domain ? (
            <div style={{ display: "flex", marginLeft: 26, flexShrink: 0 }}>
              <Label color={C.subtle} size={20} tracking={0.5}>
                {clamp(domain, 30)}
              </Label>
            </div>
          ) : null}
        </div>

        {subtitle ? (
          <div
            style={{
              display: "flex",
              fontFamily: SANS,
              fontSize: 26,
              lineHeight: 1.4,
              letterSpacing: -0.3,
              color: C.muted,
              marginTop: 17,
              maxWidth: 1000,
            }}
          >
            {clamp(subtitle, 128)}
          </div>
        ) : null}

        {/* The valve, on the card that can carry it. */}
        {variant === "tool" ? (
          <div style={{ display: "flex", marginTop: 30 }}>
            <Valve use={useWhen} skip={skipWhen} tint={tint} />
          </div>
        ) : null}
      </div>

      {/* Strata, directly above the footer rule, sharing its baseline so the
          rail reads as a depth axis the card is sitting on. */}
      {showStrata ? (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end" }}>
          <Strata current={layer} catalog={variant === "home"} />
          {/* The band is already in the eyebrow on every layered card, so the
              rail's right-hand label is only needed on the home card, where
              there is no eyebrow band and the count of bands is the point. */}
          {variant === "home" ? (
            <div style={{ display: "flex", marginLeft: "auto" }}>
              <Label color={C.subtle} size={18} tracking={2}>
                9 LAYERS · 3 BANDS
              </Label>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column" }}>
        <Rule />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            paddingTop: 20,
          }}
        >
          <Label color={C.subtle} size={20} tracking={1.2}>
            {clamp(footNote ?? meta, 62).toUpperCase()}
          </Label>
          <div style={{ display: "flex", marginLeft: "auto" }}>
            <Label color={C.accent} size={20} tracking={1.2}>
              {siteHost.toUpperCase()}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}