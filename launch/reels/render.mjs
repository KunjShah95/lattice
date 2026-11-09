/**
 * Renders the reels: steps reel.html through each reel's timeline at 30 fps
 * and pipes the frames to ffmpeg, with that reel's soundtrack.
 *
 *   python launch/reels/voice.py <kokoro.onnx> <voices.bin>   # timing + voice
 *   python launch/reels/music.py                              # score + mix
 *   node launch/reels/render.mjs [id ...]                     # out/<id>.mp4 + cover
 *
 * FRAMES="0.4,6.2" renders only those stills (to out/<id>/still-<t>.png), for
 * checking a layout without a full render.
 *
 * Env: CHROMIUM_PATH, FFMPEG (default `ffmpeg`), FPS (default 30).
 */
import { createServer } from "node:http";
import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname, join } from "node:path";
import { chromium } from "@playwright/test";

const REELS = new URL(".", import.meta.url).pathname;
const ROOT = join(REELS, ".."); // serve launch/, so reel.html reaches ../fonts and ../motion.js
const OUT = join(REELS, "out");
const FPS = Number(process.env.FPS ?? 30);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png" };

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(OUT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/reels/reel.html`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const stills = process.env.FRAMES?.split(",").map(Number);

for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`${base}?id=${id}`);
  const duration = await page.evaluate(() => window.ready);

  if (stills) {
    for (const t of stills) {
      await page.evaluate((t) => window.renderFrame(t), t);
      await page.screenshot({ path: join(OUT, id, `still-${t}.png`) });
    }
    console.log(id, "stills", stills.join(", "));
    await page.close();
    continue;
  }

  // Cover: the hook, fully set, so the grid view shows the claim.
  const timing = JSON.parse(await readFile(join(OUT, id, "timing.json"), "utf8"));
  const hook = timing.beats[0];
  await page.evaluate((t) => window.renderFrame(t), Math.min(hook.end - 0.4, hook.voEnd));
  await page.screenshot({ path: join(OUT, `${id}-cover.jpg`), type: "jpeg", quality: 92 });

  const audio = ["soundtrack.m4a", "voice.wav"].map((f) => join(OUT, id, f)).find(existsSync);
  const out = join(OUT, `${id}.mp4`);
  const ff = spawn(process.env.FFMPEG ?? "ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    ...(audio ? ["-i", audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"] : []),
    // Instagram's recommended upload: H.264 high, yuv420p, faststart, ~30 fps.
    "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
    "-t", String(duration), "-movflags", "+faststart", out,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(duration * FPS);
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.renderFrame(t), f / FPS);
    const png = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error(`ffmpeg ${c}`)))));
  console.log("wrote", out, `${duration}s`);
  await page.close();
}

await browser.close();
server.close();
