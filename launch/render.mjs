/**
 * Renders the launch film: steps `index.html` through time at 30 fps and
 * pipes each frame to ffmpeg.
 *
 *   node launch/capture.mjs   # footage, once
 *   node launch/render.mjs            # 16:9, launch/lattice-redesign-launch.mp4
 *   node launch/render.mjs vertical   # 9:16, launch/lattice-redesign-launch-vertical.mp4
 *
 * The voiceover (launch/voiceover.m4a, from voice.py) is muxed in when present.
 *
 * Env: CHROMIUM_PATH (browser binary), FFMPEG (default `ffmpeg`),
 * FPS (default 30), FRAMES ("12.5,20" renders only those stills to out/).
 */
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname, join } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = new URL(".", import.meta.url).pathname;
const FPS = Number(process.env.FPS ?? 30);
const DURATION = 36;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".woff2": "font/woff2" };
const CUTS = {
  landscape: { page: "index.html", width: 1920, height: 1080, out: "lattice-redesign-launch.mp4" },
  vertical: { page: "vertical.html", width: 1080, height: 1920, out: "lattice-redesign-launch-vertical.mp4" },
};
const cut = CUTS[process.argv[2] ?? "landscape"];
if (!cut) throw new Error(`unknown cut: ${process.argv[2]} (landscape | vertical)`);
const VOICE = join(ROOT, "voiceover.m4a");

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path === "/") path = "/index.html";
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: cut.width, height: cut.height } });
await page.goto(url + cut.page);
await page.evaluate(() => window.ready);

const stills = process.env.FRAMES?.split(",").map(Number);
if (stills) {
  await mkdir(join(ROOT, "out"), { recursive: true });
  for (const t of stills) {
    await page.evaluate((t) => window.renderFrame(t), t);
    await page.screenshot({ path: join(ROOT, "out", `${process.argv[2] ?? "landscape"}-${t}.png`) });
    console.log("still", t);
  }
} else {
  const out = join(ROOT, cut.out);
  const voice = existsSync(VOICE);
  const ff = spawn(process.env.FFMPEG ?? "ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    ...(voice ? ["-i", VOICE, "-map", "0:v", "-map", "1:a", "-c:a", "copy", "-shortest"] : []),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", out,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(DURATION * FPS);
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.renderFrame(t), f / FPS);
    const png = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 90 === 0) console.log(`frame ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error(`ffmpeg ${c}`)))));
  console.log("wrote", out);
}

await browser.close();
server.close();
