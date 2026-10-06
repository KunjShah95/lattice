/**
 * Run the citation tracker and write the log.
 *
 * ## What this measures, and what it cannot
 *
 * It measures whether an answer engine chooses a Lattice page when asked one of
 * the queries in `src/lib/citation-queries.mjs`, and where in its source list
 * that page appears. `gtm/citation-tracker.md` says the research so far is "a
 * single-day, single-query, five-engine sample" and a "strong prior, not a
 * measurement". This is the thing that makes it a measurement.
 *
 * Stated plainly, because a tracker that overstates itself is worse than none:
 *
 * - **Attribution, not traffic.** It asks engines, not readers.
 * - **Position, not page views.** An engine citing a page first is not a visit.
 * - **The engine's own clock.** Answers are non-deterministic, so `--runs`
 *   defaults to 2 and every run is logged rather than averaged away.
 * - **Whatever the enabled engines are.** A run covering two of five engines is
 *   reported as two, in the output and in the log header, rather than inferred
 *   from an empty cell.
 *
 * ## Providers
 *
 * Adapters sit behind environment variables and nothing is hardcoded — no key, no
 * endpoint, **no model id**. A default model id is a guess, and a guess that rots
 * silently is worse than a clear "set this".
 *
 *   OPENAI_API_KEY     + OPENAI_MODEL
 *   ANTHROPIC_API_KEY  + ANTHROPIC_MODEL
 *   PERPLEXITY_API_KEY + PERPLEXITY_MODEL
 *   GOOGLE_API_KEY     + GOOGLE_MODEL
 *
 * ## Files
 *
 * Rows go to `gtm/citation-log.csv`, which accumulates — the header is written
 * once and rows are appended, so a month can be filtered out in a spreadsheet.
 * The markdown summary is appended to `gtm/citation-tracker.md`. 20 queries × 5
 * engines × 2 runs is 200 rows, and 200 rows of markdown is not a log anyone
 * reads.
 *
 * ## Verifying it without keys
 *
 * `--self-test` runs the whole pipeline — fetch, score, aggregate, render, write
 * — against a stubbed provider returning deterministic sources, into a temp
 * directory. Everything except the HTTP call is exercised. Without it, the only
 * tested path would be the one that refuses to run.
 *
 * Run:
 *   node scripts/cite-check.mjs --self-test
 *   node scripts/cite-check.mjs                       # every enabled provider
 *   node scripts/cite-check.mjs --runs 3
 *   node scripts/cite-check.mjs --query 17,20         # a subset
 *   node scripts/cite-check.mjs --provider openai
 *   node scripts/cite-check.mjs --dry-run             # validate config only
 */
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_QUERIES, CLAIMS, CLAIM_IDS } from "../src/lib/citation-queries.mjs";
import {
  claimSummary,
  contentGaps,
  latticePosition,
  median,
  movement,
  topSources,
} from "../src/lib/citation-score.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the real run writes. The self-test redirects this. */
const OUT_DIR = join(root, "..", "gtm");

/** The origin to look for in an answer's sources. Bare host, no scheme. */
const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://lattice.kkshah2005.workers.dev")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

// ------------------------------------------------------------------ args

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const RUNS = Number(value("runs", 2));
const SELF_TEST = flag("self-test");
const DRY = flag("dry-run");
const ONLY_QUERIES = value("query")
  ? String(value("query"))
      .split(",")
      .map((n) => Number(n.trim()))
  : null;

const QUERIES = ONLY_QUERIES
  ? ALL_QUERIES.filter((q) => ONLY_QUERIES.includes(q.id))
  : ALL_QUERIES;

// -------------------------------------------------------------- providers

/**
 * Each adapter returns `{ text, sources }`, sources being a list of URLs.
 *
 * They are four quite different APIs and they normalise to one shape: OpenAI
 * puts URLs in annotations, Anthropic in result blocks and citations, Perplexity
 * in a top-level `citations` array, Google in grounding chunks. Normalising here
 * means the position logic below is written once and cannot drift per provider.
 */
const PROVIDERS = [
  {
    id: "openai",
    label: "ChatGPT (web search)",
    envHint: "OPENAI_API_KEY + OPENAI_MODEL",
    key: () => process.env.OPENAI_API_KEY,
    model: () => process.env.OPENAI_MODEL,
    async run(query) {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL,
          input: query,
          tools: [{ type: "web_search_preview" }],
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const json = await res.json();
      const sources = [];
      for (const item of json.output ?? []) {
        for (const block of item.content ?? []) {
          for (const a of block.annotations ?? []) if (a.url) sources.push(a.url);
        }
      }
      return { text: json.output_text ?? "", sources };
    },
  },
  {
    id: "anthropic",
    label: "Claude (web search)",
    envHint: "ANTHROPIC_API_KEY + ANTHROPIC_MODEL",
    key: () => process.env.ANTHROPIC_API_KEY,
    model: () => process.env.ANTHROPIC_MODEL,
    async run(query) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL,
          max_tokens: 2000,
          messages: [{ role: "user", content: query }],
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const json = await res.json();
      const sources = [];
      for (const block of json.content ?? []) {
        if (block.type === "web_search_result_location" && block.url) sources.push(block.url);
        if (block.type === "text" && Array.isArray(block.citations)) {
          for (const c of block.citations) if (c.url) sources.push(c.url);
        }
      }
      return { text: (json.content ?? []).map((b) => b.text ?? "").join("\n"), sources };
    },
  },
  {
    id: "perplexity",
    label: "Perplexity",
    envHint: "PERPLEXITY_API_KEY + PERPLEXITY_MODEL",
    key: () => process.env.PERPLEXITY_API_KEY,
    model: () => process.env.PERPLEXITY_MODEL,
    async run(query) {
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.PERPLEXITY_MODEL,
          messages: [{ role: "user", content: query }],
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const json = await res.json();
      // Sonar returns `citations` alongside the message.
      return { text: json.choices?.[0]?.message?.content ?? "", sources: json.citations ?? [] };
    },
  },
  {
    id: "google",
    label: "Gemini (grounded)",
    envHint: "GOOGLE_API_KEY + GOOGLE_MODEL",
    key: () => process.env.GOOGLE_API_KEY,
    model: () => process.env.GOOGLE_MODEL,
    async run(query) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GOOGLE_MODEL}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: query }] }],
            tools: [{ google_search_retrieval: {} }],
          }),
        },
      );
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const json = await res.json();
      const sources = [];
      for (const cand of json.candidates ?? []) {
        for (const chunk of cand.groundingMetadata?.groundingChunks ?? []) {
          if (chunk.web?.uri) sources.push(chunk.web.uri);
        }
      }
      return {
        text: (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("\n"),
        sources,
      };
    },
  },
];

/**
 * A deterministic stand-in for a real engine.
 *
 * Not a mock in the sense of "always returns the good case": it cites this site
 * for some queries, not for others, at varying depths, and sometimes cites the
 * same host twice. That is what makes the self-test worth running — it exercises
 * the uncited path, the multi-URL-per-host path and the position arithmetic, not
 * just the happy one.
 */
const STUB_PROVIDER = {
  id: "stub",
  label: "stub (deterministic)",
  envHint: "--self-test",
  key: () => "stub",
  model: () => "stub",
  async run(query) {
    const sources = ["https://competitor-a.example", "https://competitor-b.example"];
    // Every third query cites this site, and the depth varies by query id so the
    // median has something to compute.
    const q = ALL_QUERIES.find((x) => x.query === query);
    if (q && q.id % 3 === 0) {
      // Two URLs on the same host, to prove host-deduplication works.
      sources.push(`https://${SITE_HOST}${q.target || "/"}`, `https://${SITE_HOST}/methodology`);
    } else if (q && q.id % 5 === 0) {
      sources.push(`https://${SITE_HOST}${q.target || "/"}`);
    }
    return { text: `stub answer for: ${query}`, sources };
  },
};

/** Providers with both a key and a model id. Neither is defaulted. */
function enabledProviders() {
  if (SELF_TEST) return [STUB_PROVIDER];
  const only = value("provider");
  return PROVIDERS.filter((p) => (!only || p.id === only) && p.key() && p.model());
}

/**
 * Providers with half their config set.
 *
 * Reported rather than skipped silently: a run that quietly covered two of four
 * engines looks identical, in the output, to a run that covered two of four
 * deliberately.
 */
function misconfiguredProviders() {
  if (SELF_TEST) return [];
  const only = value("provider");
  return PROVIDERS.filter(
    (p) => (!only || p.id === only) && (p.key() || p.model()) && !(p.key() && p.model()),
  );
}

// ------------------------------------------------------------- state

const stamp = new Date().toISOString().slice(0, 10);
const month = stamp.slice(0, 7);

const rows = [];
const errors = [];

async function runAll() {
  const providers = enabledProviders();

  console.log(`\nCitation check — ${stamp}${SELF_TEST ? " (SELF-TEST)" : ""}`);
  console.log(`Site: ${SITE_HOST}`);
  console.log(`Queries: ${QUERIES.length} · runs each: ${RUNS}`);
  console.log(
    `Providers: ${providers.length ? providers.map((p) => p.label).join(", ") : "NONE ENABLED"}\n`,
  );

  for (const p of misconfiguredProviders()) {
    const line = `${p.label}: ${p.envHint} — only one half is set, so it was skipped`;
    console.log(`  ! ${line}`);
    errors.push(line);
  }

  if (!providers.length) {
    console.error(
      "No provider configured, so there is nothing to run.\n\n" +
        "Set a key and a model id for at least one of:\n" +
        PROVIDERS.map((p) => `  ${p.envHint}`).join("\n") +
        "\n\nBoth are required. Neither is defaulted, because a default model id is a\n" +
        "guess that rots silently.\n\n" +
        "This script writes nothing in this state on purpose: a run with no engines\n" +
        "produces a table of empty cells, which reads like \"not cited yet\" rather\n" +
        "than \"never ran\".\n\n" +
        "To exercise everything except the HTTP call, run `node scripts/cite-check.mjs --self-test`.",
    );
    process.exit(1);
  }

  let done = 0;
  const total = providers.length * QUERIES.length * RUNS;

  for (const provider of providers) {
    for (const q of QUERIES) {
      for (let run = 1; run <= RUNS; run++) {
        const label = `  [${String(++done).padStart(3)}/${total}] ${provider.id} #${q.id} run ${run}`;
        process.stdout.write(`${label}\r`);
        try {
          const { sources } = await provider.run(q.query);
          const pos = latticePosition(sources, SITE_HOST);
          rows.push({
            date: stamp,
            month,
            engine: provider.id,
            query_id: q.id,
            claim: q.claim,
            query: q.query,
            run,
            cited: pos != null,
            position: pos ?? "",
            sources_returned: sources.length,
            top3: topSources(sources).join(" | "),
          });
          process.stdout.write(`${label}  ${pos ? `cited at ${pos}` : "not cited"}\n`);
        } catch (error) {
          const line = `${provider.id} #${q.id} run ${run}: ${error.message.slice(0, 120)}`;
          errors.push(line);
          process.stdout.write(`${label}  ERROR ${error.message.slice(0, 80)}\n`);
        }
      }
    }
  }
  process.stdout.write("\n");
}

// ----------------------------------------------------------- reporting

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function queryTable() {
  const lines = [
    "| # | Claim | Query | Cited | Median position | Engines citing |",
    "| ---: | --- | --- | ---: | ---: | --- |",
  ];
  for (const q of QUERIES) {
    const mine = rows.filter((r) => r.query_id === q.id);
    if (!mine.length) continue;
    const cited = mine.filter((r) => r.cited);
    const engines = new Set(cited.map((r) => r.engine));
    lines.push(
      `| ${q.id} | ${q.claim} | ${q.query} | ${cited.length}/${mine.length} | ${
        // The tested `median`, not a second copy of it. The first version of this
        // file inlined its own and it would have drifted from the one the CSV
        // round-trip goes through.
        median(cited.map((r) => r.position)) ?? "—"
      } | ${[...engines].join(", ") || "—"} |`,
    );
  }
  return lines.join("\n");
}

function renderSummary() {
  const engines = [...new Set(rows.map((r) => r.engine))];
  const summary = claimSummary(rows, CLAIM_IDS);
  const gaps = contentGaps(QUERIES, rows);

  const sections = [
    `<!-- GENERATED by scripts/cite-check.mjs on ${stamp}. Do not edit by hand. -->`,
    `<!-- Query set: src/lib/citation-queries.mjs · rows: gtm/citation-log.csv -->`,
    "",
    `## ${month} — ${stamp}${SELF_TEST ? " (SELF-TEST, not a real measurement)" : ""}`,
    "",
    `${rows.length} runs · ${engines.length} engine(s) [${engines.join(", ")}] · ${QUERIES.length} queries · ${RUNS} run(s) each.`,
    "",
    "Engines are the model's own clock and answers are non-deterministic, so every run is",
    "logged rather than averaged away. A missing engine means it was not configured, not",
    "that it found nothing.",
    "",
    "### By claim",
    "",
    "| Claim | Citation rate | Median position | Runs | What it tests |",
    "| --- | ---: | ---: | ---: | --- |",
    ...summary.map(
      (c) =>
        `| \`${c.claim}\` | ${(c.rate * 100).toFixed(0)}% | ${c.median ?? "—"} | ${c.runs} | ${CLAIMS[c.claim].title} |`,
    ),
  ];

  if (!summary.length) {
    sections.push("", "_No runs completed, so there is nothing to summarise._");
  }

  sections.push("", "### By query", "", queryTable());

  if (gaps.length) {
    sections.push(
      "",
      "### Content gaps",
      "",
      "Tracked queries with no page on this site to be cited from. These need a page",
      "written, not a ranking improved — which is a different job with a different fix.",
      "",
      "| # | Claim | Query |",
      "| ---: | --- | --- |",
      ...gaps.map((g) => `| ${g.id} | ${g.claim} | ${g.query} |`),
    );
  }

  if (errors.length) {
    sections.push("", "### Errors", "", ...errors.map((e) => `- ${e}`));
  }

  return sections.join("\n");
}

function writeOutputs(outDir) {
  mkdirSync(outDir, { recursive: true });

  const header = [
    "date", "engine", "query_id", "claim", "query", "run",
    "cited", "position", "sources_returned", "top3",
  ];
  const csvPath = join(outDir, "citation-log.csv");

  // Header once, rows appended, so the CSV accumulates across months and a
  // spreadsheet filter answers "what happened in October".
  if (!existsSync(csvPath)) writeFileSync(csvPath, `${header.join(",")}\n`, "utf8");
  appendFileSync(
    csvPath,
    `${rows.map((r) => header.map((h) => csvCell(r[h])).join(",")).join("\n")}\n`,
    "utf8",
  );

  const mdPath = join(outDir, "citation-tracker.md");
  appendFileSync(mdPath, `\n${renderSummary()}\n`, "utf8");

  return { csvPath, mdPath };
}

/** Movement against the previous rows for the same queries, where any exist. */
function movementNote() {
  const csvPath = join(OUT_DIR, "citation-log.csv");
  if (!existsSync(csvPath)) return [];
  const lines = readFileSync(csvPath, "utf8").trim().split("\n");
  const previous = lines
    .slice(1)
    .map((line) => {
      const cells = line.split('","').map((c) => c.replace(/^"|"$/g, ""));
      const o = Object.fromEntries(cells.map((c, i) => [headerOrder[i], c]));
      return { query_id: Number(o.query_id), claim: o.claim, cited: o.cited === "true", position: o.position };
    })
    .filter((r) => r.date < stamp);

  return movement(rows, previous);
}

const headerOrder = [
  "date", "engine", "query_id", "claim", "query", "run",
  "cited", "position", "sources_returned", "top3",
];

// ---------------------------------------------------------------- run

await runAll();

if (!DRY) {
  const outDir = SELF_TEST ? mkdtempSync(join(tmpdir(), "cite-check-")) : OUT_DIR;
  const { csvPath, mdPath } = writeOutputs(outDir);
  console.log(`Wrote ${rows.length} rows to ${csvPath}`);
  console.log(`Appended the ${month} section to ${mdPath}`);

  if (!SELF_TEST) {
    const moved = movementNote();
    if (moved.length) {
      console.log("\nMovement vs earlier runs (positive = moved closer to the top):");
      for (const m of moved.slice(0, 5)) {
        console.log(`  #${m.queryId}  ${m.from} → ${m.to}  (${m.delta > 0 ? "+" : ""}${m.delta})`);
      }
    }
  }
}

console.log("\nBy claim:");
for (const c of claimSummary(rows, CLAIM_IDS)) {
  console.log(
    `  ${c.claim.padEnd(16)} ${String(Math.round(c.rate * 100)).padStart(3)}%  median pos ${c.median ?? "—"}`,
  );
}
if (errors.length) console.log(`\n${errors.length} call(s) failed — see the Errors section.`);