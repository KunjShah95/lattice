/**
 * Renders the launch film: steps `index.html` through time at 30 fps and
 * pipes each frame to ffmpeg.
 *
 *   node launch/capture.mjs   # footage, once
 *   node launch/render.mjs    # writes launch/lattice-redesign-launch.mp4
 *
 * Env: CHROMIUM_PATH (browser binary), FFMPEG (default `ffmpeg`),
 * FPS (default 30), FRAMES ("12.5,20" renders only those stills to out/).
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname, join } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = new URL(".", import.meta.url).pathname;
const FPS = Number(process.env.FPS ?? 30);
const DURATION = 36;
const TYPES = { ".html": "text/html", ".png": "image/png", ".woff2": "font/woff2" };

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
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(url);
await page.evaluate(() => window.ready);

const stills = process.env.FRAMES?.split(",").map(Number);
if (stills) {
  for (const t of stills) {
    await page.evaluate((t) => window.renderFrame(t), t);
    await page.screenshot({ path: join(ROOT, "out", `frame-${t}.png`) });
    console.log("still", t);
  }
} else {
  const out = join(ROOT, "lattice-redesign-launch.mp4");
  const ff = spawn(process.env.FFMPEG ?? "ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
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
