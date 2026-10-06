# Lattice — strategy, moodboard and positioning

*3 October 2026*

| File | What it is |
| --- | --- |
| [`01-competitive-landscape.md`](01-competitive-landscape.md) | 30+ competitors verified by direct fetch, split into three tiers. Which claims are commoditised, which are genuinely open, and the measured visual/copy defaults of the category. |
| [`02-unique-selling-points.md`](02-unique-selling-points.md) | Six ranked USPs with proof each is open, an explicit list of claims to **stop** making, and seven prioritised actions. |
| [`03-launch-and-citation-plan.md`](03-launch-and-citation-plan.md) | **Blockers first** (production domain, Cloudflare bot settings, author), then the launch sequence with paste-ready copy and a 20-query monthly citation log. |
| [`04-monetisation.md`](04-monetisation.md) | Which revenue models are compatible with neutrality and which are not, in what order to take them, and the incremental failure mode that turns a sponsored essay into a paid-listing flow. |
| [`moodboard.html`](moodboard.html) | **Open this in a browser.** The visual direction, built in the direction it describes. |
| [`boards/`](boards) | Nine PNG boards rendered from `moodboard.html` at 1680px, for Figma/FigJam. |

---

## The short version

**Lattice is the only index of AI infrastructure that will tell you when *not* to use
something — and it proves it by failing its own build when its data goes stale.**

Most of what Lattice currently claims is already claimed by someone. Across a 16-site
competitor sample:

- *"hand-picked not submitted"* — boilerplate (ZORGO, ToolDirectory, TAAFT)
- *structured attributes* — table stakes (Infrabase, enterprisedna)
- *comparison pages* — commodity (Infrabase has them; ~20 vendors have them)
- *`llms.txt`* — 7 of 14 engineering peers ship one, and four log studies show it produces
  no citations
- *"Start Here" decision path* — Infrabase `/stacks` shipped it first

**Genuinely open, in order:**

1. **Layer ordering as load-bearing architecture.** Four competitors have the right
   categories. None of them order them, so none can answer *"where does this sit relative
   to what I already run."*
2. **`skipWhen`.** 112 of 112. Nobody in the entire sample publishes the second half of the
   decision pair.
3. **A build-time freshness guard.** ToolDirectory re-checks by hand every 90 days;
   Infrabase has a "suggest an edit" form. Nobody gates a deploy. Lattice throws — and
   then hid it in a changelog nobody reads.
4. **Neutrality.** Every vendor Lattice indexes now ships its own comparison pages
   (Langfuse vs Braintrust, TrueFoundry vs Braintrust). The tiebreaker they cannot be.
5. **Cross-layer comparison.** Vendors will never publish *"here's how your gateway
   compares to your eval platform."*

---

## The money question, answered once

Full argument in [`04-monetisation.md`](04-monetisation.md). The short version:

**Take no money that touches placement. Take money for anything else, if it comes.**

Neutrality is not a stance, it is the product — `alternatives.ts` says the comparison pages are
only trustworthy because this index sells neither side. So the refused models are paid placement,
sponsored slots in a layer, and any affiliate link inside a comparison verdict. Allowed: sponsored
essays, newsletter sponsorships, consulting, and a paid research report — none of which can move a
tool.

`designeer.xyz` is the case study: four sold placements (`utm_medium=sponsored`) plus undisclosed
affiliate tagging, **554 entries organised as flat lists, zero decisions**, and a nav that reads
`Inspiration / Components / Build / Visuals / Utilities / Design Engineers` — then `Sponsors`. The
sponsors are not the problem. *The sponsor being a peer of the taxonomy in the nav is the problem.*
That is what taking the money did to the information architecture.

One extra rule, stricter than it looks: **no monetised URL in `/tools.json`, `/llms.txt`,
`/llms-full.txt`, `/search-index.json` or `/mcp`.** `llms.txt` instructs agents to cite the
canonical tool URL — an affiliate parameter there makes every agent that cites Lattice an
undisclosed affiliate, permanently, in an answer about which vendor is trustworthy.

---

## The design direction: "The Cross-Section"

Not a landing page — an **engineering survey document**. Section drawings, strata, ordinate
numbers, calibration marks, leader-line annotations.

**The core move: three bands, not nine colours.**

| Band | Layers | Sounds like |
| --- | --- | --- |
| I — Compute | 01 inference · 02 routing | too slow, too expensive |
| II — State | 03 retrieval · 04 fine-tuning | wrong answers |
| III — Control | 05 agents … 09 evals | unreliable, unmeasured |

A nine-step hue ramp is a rainbow, and a reader cannot hold a rainbow in working memory.
Three families are information — and the band a reader is in *is* the question they arrived
with.

**What the moodboard refuses**, all measured off real competitor homepages: the gradient
orb, the `rounded-2xl` 3-up card grid, the logo wall, badge soup, centred everything, and
the `"🚀 50,000+ AI Tools"` hero stat. One competitor's initial HTML carries **119
gradients, 45 `backdrop-filter` layers, 856 `border-radius` values and 253 emoji**.

Lattice's honest answer is 112 tools — so **the hero must lead with judgement, never
volume.**

---

## What changed in the repo

Implemented and building clean (280 tests pass, lint clean, 153 prerendered routes):

| Change | File |
| --- | --- |
| Nine-hue ramp → three bands, depth inside each | `site/src/app/globals.css` |
| `bandOf`, `BANDS`, `bandColor`, `hatchClass` helpers | `site/src/lib/layer.ts` |
| Section-drawing hatch (solid = in stack, dashed = spans it) | `site/src/app/globals.css` |
| Stack diagram grouped into bands with the symptom each band carries | `site/src/components/stack-diagram.tsx` |
| Use/skip merged into one valve instead of two equal cards | `site/src/app/[slug]/[tool]/page.tsx` |
| **New** — strata spine: a nine-band rail showing where a page sits | `site/src/components/stack-spine.tsx` |
| **New** — calibration stamp promoting the build's staleness guard into the UI | `site/src/app/[slug]/[tool]/page.tsx` |
| **New** — `/methodology`, with a "where this index is wrong" section | `site/src/app/methodology/page.tsx` |
| **New** — `/<section>/<tool>/alternatives`, 39 pages | `site/src/app/[slug]/[tool]/alternatives/page.tsx` |
| **New** — substitutes graph, derived verdict, adjacency split | `site/src/lib/alternatives.ts` |
| **New** — generated GitHub distribution artefact | `site/scripts/generate-awesome-list.mjs` |
| Crawler policy split: allow search, block training | `site/src/app/robots.ts` |
| llms.txt v2 `Link: rel="describedby"` on every content page | `site/next.config.ts` |
| llms.txt re-keyed by task, with per-tool substitutes | `site/src/app/llms.txt/route.ts` |
| Hero copy leads with the skip-when half of every entry | `site/src/app/page.tsx` |
| Colophon states the six-month build gate and links the method | `site/src/app/page.tsx` |
| `/methodology` in header nav, footer and sitemap | `site-nav.tsx`, `site-footer.tsx`, `sitemap.ts` |
| Alternatives in sitemap and the search palette | `sitemap.ts`, `search-entries.ts` |
| 17 new tests for the graph and band logic | `site/src/lib/alternatives.test.ts` |
| **New** — three cross-layer comparisons (gateway/guardrails/evals, retrieval/fine-tuning/prompting, self-host/route/measure), build-guarded to span ≥2 bands in stack order | `site/src/lib/comparisons.ts` |
| `/compare` split into *Across layers* and *Substitutes*; cross-layer pages ask "which first", label each column's layer and band | `site/src/app/compare/` |
| **New** — `/verification.json`: the staleness guard's public receipt (rule, build date, per-entry check + expiry), linked from `/methodology` | `site/src/lib/verification.ts`, `site/src/app/verification.json/route.ts` |
| Guard cutoff extracted (`staleCutoff`) so guard and receipt cannot disagree | `site/src/lib/data.ts` |

**Second session, 6 October — the cross-layer gaps and the machine reader:**

| Change | File |
| --- | --- |
| **New** — `secondHomes`: a tool can declare another section it belongs to, with a required reason. Build-guarded (real section, not its own, in-stack, no repeats, cap 2, ≥15-char reason). 11 tools annotated, including Letta → retrieval | `site/src/lib/types.ts`, `data.ts`, `attributes.ts` |
| "Also belongs in" on the tool page, with the reason | `site/src/app/[slug]/[tool]/page.tsx` |
| "Also relevant here" on the section page — the inverse direction, which is the one that answers *"where does agent memory live"* | `site/src/app/[slug]/page.tsx` |
| `alsoIn` in `/tools.json`, `/llms-full.txt`, the search index and the flat explorer | `dataset.ts`, `llms-full.txt/route.ts`, `search.ts`, `tool-explorer.tsx` |
| **New** — `/mcp`: an MCP server on the same Worker, stateless, 9 tools, **JSON-RPC implemented directly** rather than via the SDK. `/mcp.json` for discovery | `site/src/lib/mcp.ts`, `site/src/app/mcp/route.ts`, `site/src/app/mcp.json/route.ts` |
| **New** — neutrality guard as a test: no query string on any tool URL, no tracking parameter, no `sponsored`/`featured`/`partner` field in any machine-readable payload | `site/src/lib/neutrality.test.ts` |
| **New** — the citation tracker, runnable. 26 queries mapped to the six open claims, four engine adapters, per-claim citation rates, content-gap detection and month-over-month movement | `site/src/lib/citation-queries.mjs`, `site/src/lib/citation-score.mjs`, `site/scripts/cite-check.mjs` |
| **New** — MCP tool calls logged as structured lines, so the §7 metric needs no binding | `src/app/mcp/route.ts` |
| **New** — a first-party navigation beacon, so the alternatives / comparison / second-home rows of §7 are answerable from Worker logs with no KV or D1 binding. Closed event vocabulary, path-shape validation, 204 always | `src/app/signal/route.ts`, `src/lib/signal.mjs`, `src/components/track-link.tsx` |
| **New** — `/submit`, and the GitHub-intake pipeline that turns it into a **blocked** draft PR | `site/src/app/submit/`, `site/scripts/triage-submission.mjs` |
| `/methodology` §01 rewritten: submission produces a *reviewed draft*, never an entry | `site/src/app/methodology/page.tsx` |

Route count: 362 → **519**. **571 tests** passing, lint clean, 34 harness checks, Worker smoke
test passing (32 checks, including four that assert *which* beacons are logged rather than only
that they answer 204).

> **`/mcp` was 500 in production for one build and nobody noticed.** It was the only route
> declaring `runtime = "edge"`; it loads fine on Node, so every local check and `next start`
> passed, and it failed only on the Worker with
> `interopDefault: undefined.default` during component loading. The SDK it originally imported
> was **not** the cause — removing it changed nothing, and the real fix was dropping the runtime
> declaration to match every other text route.
>
> That produced two fixes, and the second is the one that matters:
>
> 1. **`scripts/worker-smoke.mjs`**, wired into CI. It runs `npm run build`, boots
>    `wrangler dev` against the real bundle and requests 16 routes, the two exact-status routes
>    and five JSON-RPC calls. **Verified against the real regression:** re-adding the one
>    `runtime = "edge"` line fails six checks, every one of them `Internal Server Error`. It is
>    not a decorative smoke test — it is the check that would have stopped the incident.
> 2. **`lib/og.tsx` no longer reads fonts with a rejecting top-level await.** That read is a
>    bare `await Promise.all([readFile(...)])` at module scope, and on Cloudflare — no
>    filesystem — the rejection took the whole module graph down. Every HTML route 500'd on the
>    Worker *and* in `wrangler dev`, which is why no React-rendering change could be verified
>    locally at all. The read now degrades; `og.test.ts` asserts the fonts are present under
>    Node, so a build-time font failure is still a failure rather than a share card in Arial.

**Route count: 153 → 362.** Lint clean, 308 tests passing.

> `src/lib/og.tsx`, the seven `opengraph-image.tsx` routes and `assets/og/` were
> rewritten outside this work (dark-theme OG cards, subset fonts, band-based tint). The
> stale `layerHex` assertions in `layer.test.ts` were updated to the new band API and a
> new test now asserts the OG card and the live site classify every layer identically —
> the two palettes are independent by necessity, so nothing else stops them drifting.

---

## Next, in priority order

1. **Verify robots.txt and Cloudflare agree.** An accidentally-blocked `OAI-SearchBot` is a
   total, invisible loss of ChatGPT citations. Highest expected value, lowest cost. The
   robots file is now split; the CDN half is the part still unverified.
2. **Publish the generated list to a GitHub repo.** `npm run generate` writes
   `public/awesome-lattice.md` — 112 tools, ASCII-clean, generated from the same dataset as
   the site so it cannot claim a different freshness. It needs a repo and a README, not code.
3. **More cross-layer comparisons.** Three shipped; the type and guards are in place, so
   each new one is content only. Candidates: agent framework vs durable workflow host,
   guardrails vs fine-tuning for refusal behaviour.
4. **Instrument citation behaviour.** 30–50 Lattice-shaped queries × 9 engines × 10 runs,
   logging source position rather than yes/no, on each engine's own clock. Everything in the
   research above is a single-day sample; this turns it into a measurement.

---

## Caveats

- Traffic is **unverified** for infrabase.ai, ToolDirectory, enterprisedna, selfhostedworld,
  llm-stats and aisecurityandsafety.org.
- The AI-citation findings are a **single-day, single-query, five-engine sample.** AI
  answers are non-deterministic — a strong prior, not a measurement.
- Design impressions beyond CSS token counts were inferred from markup, not from rendering
  screenshots.
- Moodboard boards 03–09 predate three cosmetic CSS fixes (swatch borders, spine band
  order). The fixes are in `moodboard.html`, which is the source of truth.