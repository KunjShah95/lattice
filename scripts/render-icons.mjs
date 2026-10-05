/**
 * Render the favicon, SVG icon and Apple touch icon from the mark.
 *
 * The cell layout is the 3x3 lattice in `src/components/logo.tsx`. It is
 * redrawn here rather than imported because each size is pixel-snapped by
 * hand: at 16px a 5:1.5 cell-to-gutter ratio lands on half pixels and the
 * L smears into a grey blob, so every raster size picks whole-pixel cells.
 *
 * Usage: node scripts/render-icons.mjs
 */

import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const INK_DARK = "#ededf0";
const INK_LIGHT = "#16161a";
const ACCENT_DARK = "#fc7659";
const ACCENT_LIGHT = "#d9542f";
const TILE = "#0b0b0c";

// col,row of each cell. "j" is the accent joint, "d" a registration dot.
const CELLS = [
  [0, 0, "i"], [1, 0, "d"], [2, 0, "d"],
  [0, 1, "i"], [1, 1, "d"], [2, 1, "d"],
  [0, 2, "j"], [1, 2, "i"], [2, 2, "i"],
];

/**
 * One mark at a given whole-pixel geometry.
 * `dot` is the dot size in px, or 0 to drop the dots (they are noise at 16px).
 */
function mark({ cell, gap, ox, oy, radius, dot, ink, accent }) {
  return CELLS.map(([c, r, k]) => {
    const x = ox + c * (cell + gap);
    const y = oy + r * (cell + gap);
    if (k === "d") {
      if (!dot) return "";
      const d = (cell - dot) / 2;
      return `<rect x="${x + d}" y="${y + d}" width="${dot}" height="${dot}" rx="${dot / 2}" fill="${ink}" opacity="0.4"/>`;
    }
    return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${radius}" fill="${k === "j" ? accent : ink}"/>`;
  }).join("");
}

/** Raster icons sit on a dark tile so they read on light and dark tab strips alike. */
function tile(size, geom, tileRadius) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
<rect width="${size}" height="${size}" rx="${tileRadius}" fill="${TILE}"/>
${mark({ ...geom, ink: INK_DARK, accent: ACCENT_DARK })}
</svg>`;
}

const png = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

// 16: 4px cells, 1px gutters = 14px, centred with a 1px margin.
const ico16 = await png(tile(16, { cell: 4, gap: 1, ox: 1, oy: 1, radius: 0, dot: 0 }, 3));
// 32: 8px cells, 2px gutters = 28px, centred with a 2px margin.
const ico32 = await png(tile(32, { cell: 8, gap: 2, ox: 2, oy: 2, radius: 1, dot: 2 }, 6));

/** PNG-in-ICO. Every browser that still reads .ico accepts PNG payloads. */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size, e);
    header.writeUInt8(size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((im) => im.data)]);
}

await writeFile("src/app/favicon.ico", ico([{ size: 16, data: ico16 }, { size: 32, data: ico32 }]));

// 180: iOS masks its own corners, so the tile is square. The mark takes ~62%.
await writeFile(
  "src/app/apple-icon.png",
  await png(tile(180, { cell: 32, gap: 8, ox: 34, oy: 34, radius: 5, dot: 7 }, 0)),
);

// SVG: no tile, and the ink follows the tab strip's colour scheme.
await writeFile(
  "src/app/icon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
<style>.i{fill:${INK_LIGHT}}.j{fill:${ACCENT_LIGHT}}@media (prefers-color-scheme:dark){.i{fill:${INK_DARK}}.j{fill:${ACCENT_DARK}}}</style>
${mark({ cell: 8, gap: 2, ox: 2, oy: 2, radius: 1.2, dot: 2, ink: "INK", accent: "ACC" })
  .replaceAll('fill="INK"', 'class="i"')
  .replaceAll('fill="ACC"', 'class="j"')}
</svg>
`,
);

console.log("wrote src/app/favicon.ico, src/app/icon.svg, src/app/apple-icon.png");
