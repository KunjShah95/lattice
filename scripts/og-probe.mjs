/**
 * Render one OgCard outside Next, so Satori errors come back with a real
 * stack instead of a 500 in the dev-server log.
 *
 * The failure this exists for is Satori's "Expected <div> to have explicit
 * display: flex" rule, which throws with no indication of which node tripped
 * it. Bisecting that through HTTP costs a dev-server reload per attempt.
 *
 *   node scripts/_og-probe.mjs '<json props>'
 */

import { build } from "esbuild";
import { writeFile, mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");

const props = {
  eyebrow: "A curated index",
  title: "The layers behind working AI systems.",
  subtitle:
    "112 tools across 10 sections, ordered by where they sit in a real system.",
  meta: "Inference · Routing · Retrieval · Evals",
  layer: null,
  siteName: "Lattice",
  siteHost: "lattice.sh",
  ...(process.argv[2] ? JSON.parse(process.argv[2]) : {}),
};

const ogPath = join(ROOT, "src/lib/og").replace(/\\/g, "/");
const propsJson = JSON.stringify(props);
const entry = `
import { OgCard, OG_FONTS, OG_SIZE } from "${ogPath}";
export { OG_FONTS, OG_SIZE };
export const el = OgCard(${propsJson});

// Walk the element tree and report every node Satori will reject.
//
// The rule, read off @vercel/og index.node.js:19658, is NOT "more than one
// child". It is: type === "div" && props.children && typeof children !==
// "string" && display not in {flex, contents, none}. So a div wrapping a
// single <Label/> is just as fatal as one wrapping three — which is why the
// previous version of this card passed: every div that held an element was
// given display:flex, and every div that held text held a string.
function findOffenders(node, path, out) {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((n, i) => findOffenders(n, path + "[" + i + "]", out));
    return out;
  }
  const type = node.type;
  const props = node.props;
  if (!props) return out;
  const kids = props.children;
  const display = props.style && props.style.display;
  if (
    type === "div" &&
    kids != null &&
    typeof kids !== "string" &&
    !["flex", "contents", "none"].includes(display)
  ) {
    out.push({
      path: path || "(root)",
      display: String(display),
      shape: Array.isArray(kids)
        ? kids.map((k) => (k == null ? "null" : typeof k === "string" ? "text" : String(k?.type)))
        : typeof kids === "string" ? "text" : String(kids?.type),
    });
  }
  findOffenders(kids, path + ">", out);
  return out;
}
export const offenders = findOffenders(el, "", []);
`;

const dir = await mkdtemp(join(tmpdir(), "og-probe-"));
const entryFile = join(dir, "entry.tsx");
await writeFile(entryFile, entry, "utf8");

const outfile = join(dir, "bundle.mjs");
await build({
  entryPoints: [entryFile],
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  // Node builtins stay external; everything else, including the .ttf reads,
  // gets bundled so process.cwd() resolves against the project.
  external: ["node:*", "next/og", "@vercel/og"],
  loader: { ".ttf": "file" },
  absWorkingDir: ROOT,
  alias: { "@": join(ROOT, "src") },
  logLevel: "error",
});

const mod = await import(pathToFileURL(outfile).href);
const { ImageResponse } = await import("next/og.js");

if (mod.offenders.length) {
  console.log(`${mod.offenders.length} node(s) would trip Satori's flex rule:`);
  for (const o of mod.offenders) {
    console.log(`  path ${o.path || "(root)"}`);
    console.log(`    children=${o.children} display=${o.display} shape=${JSON.stringify(o.shape)}`);
  }
} else {
  console.log("no offending nodes found by the walker");
}

const res = new ImageResponse(mod.el, {
  ...mod.OG_SIZE,
  fonts: mod.OG_FONTS,
});

const buf = Buffer.from(await res.arrayBuffer());
const outDir = join(ROOT, "og-out");
await mkdir(outDir, { recursive: true });
const dest = join(outDir, "probe.png");
await writeFile(dest, buf);
console.log(`OK  ${buf.length} bytes -> ${dest}`);