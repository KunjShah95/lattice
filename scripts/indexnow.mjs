/**
 * Submit every sitemap URL to IndexNow after a deploy.
 *
 * Why: Bing's index backs Copilot and a large share of ChatGPT search, and
 * Bing (with Yandex, Seznam, Naver) accepts IndexNow pushes. A new comparison
 * page otherwise waits for a crawl that can take weeks on a young domain; a
 * push gets it fetched in hours. Google does not take IndexNow — Search
 * Console and the sitemap cover it.
 *
 * Ownership is proved by `public/<key>.txt`, whose body is the key. The script
 * finds that file itself, so rotating the key is: delete it, add a new one.
 *
 * Usage:
 *   npm run indexnow             # submit the live sitemap
 *   npm run indexnow -- --dry    # print what would be sent
 *
 * Reads NEXT_PUBLIC_SITE_URL the same way the build does. It fetches the
 * *live* sitemap, so run it after `cf:deploy`, never before.
 */

import { readdirSync, readFileSync } from "node:fs";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const dry = process.argv.includes("--dry");
const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
if (!/^https:\/\/[^/]+$/.test(site) || /invalid|your-domain/.test(site)) {
  console.error(`indexnow: NEXT_PUBLIC_SITE_URL is not a real origin (${site || "unset"}).`);
  process.exit(1);
}

const keyFile = readdirSync("public").find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("indexnow: no public/<32-hex>.txt key file found.");
  process.exit(1);
}
const key = readFileSync(`public/${keyFile}`, "utf8").trim();

// The key file must be live, or every engine rejects the batch with 403.
const keyRes = await fetch(`${site}/${keyFile}`);
if (!keyRes.ok || (await keyRes.text()).trim() !== key) {
  console.error(`indexnow: ${site}/${keyFile} is not serving the key (HTTP ${keyRes.status}). Deploy first.`);
  process.exit(1);
}

const sitemap = await fetch(`${site}/sitemap.xml`).then((r) => {
  if (!r.ok) throw new Error(`sitemap HTTP ${r.status}`);
  return r.text();
});
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) {
  console.error("indexnow: the live sitemap has no <loc> entries.");
  process.exit(1);
}

const body = {
  host: new URL(site).host,
  key,
  keyLocation: `${site}/${keyFile}`,
  urlList: urls,
};

if (dry) {
  console.log(`indexnow (dry): would submit ${urls.length} URLs for ${body.host}`);
  console.log(urls.slice(0, 5).join("\n") + (urls.length > 5 ? "\n…" : ""));
  process.exit(0);
}

// One endpoint fans out to every participating engine. Limit is 10,000/batch.
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
console.log(`indexnow: submitted ${urls.length} URLs → HTTP ${res.status} ${res.statusText}`);
// 200 = accepted, 202 = accepted pending key check. Anything else is a failure.
if (res.status !== 200 && res.status !== 202) {
  console.error(await res.text());
  process.exit(1);
}
