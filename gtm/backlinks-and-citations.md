# Lattice — backlinks, citations and indexing playbook

*14 October 2026 · canonical origin: **https://lattice.kunjshah.in** · Product Hunt: https://www.producthunt.com/products/lattice-12*

The site's on-page SEO/AEO/GEO is already unusually complete (canonical host,
274-URL sitemap, JSON-LD on every page, `llms.txt`, `tools.json`, an MCP
endpoint, dated entries). What a new domain lacks is **authority**: other sites
linking to it, and search engines having crawled it. This file is the plan for
that — ordered by value per hour, with copy you can paste.

**Ground rules.** Every link below is one a real person chooses to give. No paid
link packages, no "submit to 100 directories for $249" services, no comment
spam, no AI-written forum posts. Those either do nothing or get the domain
discounted, and a site whose pitch is *neutrality* cannot afford to be caught
gaming placement.

---

## 0. Already done in code (this commit)

| Change | Why it matters |
| --- | --- |
| `Organization.sameAs` now lists Product Hunt, the GitHub repo and the awesome-list | Google and the answer engines built on its knowledge graph treat those as **one entity**. A Product Hunt upvote or a GitHub star becomes evidence about lattice.kunjshah.in instead of an unrelated string. |
| `founder` Person node (Kunj Shah → kunjshah.in, GitHub), and every essay byline uses the same `@id` | A named, verifiable author is what E-E-A-T rewards and what cited pages in this category have in common. |
| Placeholder contact details removed (`todo@example.invalid` was live in the footer) | Dead contact details are a trust signal in the wrong direction. Unset channels now fall back to GitHub issues. |
| Product Hunt linked from the footer and the contact page | An outbound link to your own launch strengthens the entity connection both ways. |
| `.github/workflows/indexnow.yml` | After every successful Vercel **production** deploy, all sitemap URLs are pushed to IndexNow (Bing → ChatGPT search & Copilot, Yandex, Seznam, Naver). New pages get fetched in hours rather than weeks. |
| All traffic 308-redirected to `lattice.kunjshah.in`; previews are `noindex` | One host, so links and citations are never split across two addresses. |

---

## 1. This week — owner actions (≈1 hour, highest leverage)

1. **Vercel env vars** (Settings → Environment Variables, Production):
   `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_X` (adds X to `sameAs` automatically).
   Redeploy.
2. **Google Search Console** (property already verified):
   - URL Inspection → `https://lattice.kunjshah.in/sitemap.xml` → *Test live URL*. If live, the "Couldn't fetch" label clears on its own.
   - URL Inspection → *Request indexing* for these, one per day is fine:
     `/`, `/stack-builder`, `/all`, `/compare`, `/fix`, `/blog/the-gateway-is-the-product`.
3. **Bing Webmaster Tools** → *Import from Google Search Console* (one click, no DNS work).
   Bing's index is what ChatGPT search and Copilot cite from — this is the single most
   important AEO step. Then Sitemaps → submit `https://lattice.kunjshah.in/sitemap.xml`.
4. **GitHub repo settings** → *About* → Website: `https://lattice.kunjshah.in`, topics:
   `ai-infrastructure`, `llmops`, `mlops`, `rag`, `ai-agents`, `awesome-list`.
   Do the same on **KunjShah95/awesome-ai-infrastructure**.
5. **Product Hunt page** → make sure the website field is `https://lattice.kunjshah.in`
   (not the old workers.dev or vercel.app address), and pin a maker comment linking to
   `/stack-builder`.
6. **kunjshah.in** case study: link to `https://lattice.kunjshah.in` (not an old host).
7. **Baseline citations**: `npm run cite` once with whichever engine keys you have
   (see `citation-tracker.md`), so later months have something to compare against.

---

## 2. Backlinks, ranked

### 2a. Maintainer badges — the best links available to this site

Every tool page already offers a README badge (`/<section>/<tool>/badge.svg`, with
copyable Markdown). A maintainer who adds it gives a **contextual, relevant link
from a high-authority GitHub repo** — the kind no directory can match. 112 tools ×
even a 10% take-up is ~11 strong links.

**How:** one issue per project, only where the project's README already has a
"featured in", "press", "community" or "used by" section (that's the signal they
accept such links). Never a PR that edits their README unasked. Max ~5 per day.

> **Title:** Lattice lists \<Tool\> — optional "verified" badge for the README
>
> Hi! I maintain [Lattice](https://lattice.kunjshah.in), a neutral index of AI
> infrastructure tools ordered by stack layer. \<Tool\> is listed here:
> https://lattice.kunjshah.in/\<section\>/\<tool\>
>
> Every entry says both **when to use it and when to skip it**, and the build
> fails if an entry's licence/cost facts are more than six months old — so the
> page carries a dated "verified" mark. If the description is wrong anywhere,
> I'd genuinely like to know; corrections are public at
> https://lattice.kunjshah.in/corrections.
>
> If it's useful, there's a self-contained badge (no tracking, no external
> requests) you're welcome to add — totally optional:
>
> ```md
> \<paste from the "Copy Markdown" button on the tool page\>
> ```
>
> Either way, thanks for building \<Tool\>.

The correction offer is the point, not a sweetener: maintainers who fix a
description become the people most likely to link to the page.

### 2b. Awesome-lists (GitHub)

Read each repo's `CONTRIBUTING.md` first; most want one line, alphabetical, in an
existing section, and reject self-promotion that is not itself a resource list.
Lattice qualifies as a *curated directory*, so submit it under "Resources",
"Directories" or "Other lists".

Candidates (verify each is active — last commit within ~6 months):
- `kelvins/awesome-mlops`
- `awesomelistsio/awesome-mlops`
- `EthicalML/awesome-production-machine-learning`
- `tensorchord/Awesome-LLMOps`
- the LLM / RAG / AI-agents awesome-lists you already read

**PR line:**
```md
- [Lattice](https://lattice.kunjshah.in) - Curated index of 112 AI infrastructure tools ordered by stack layer, each with when to use it and when to skip it.
```
**PR description:** *"Adds Lattice, a neutral, dated index of AI infrastructure tools
(no paid placement; entries fail the build when their facts go stale). Happy to move
it to a different section."*

### 2c. Launch and directory sites (one afternoon)

Free listings with real developer audiences. Use the same three blurbs everywhere so
the entity description is consistent:

- **Name:** Lattice
- **Tagline (≤60):** `AI infrastructure tools, with when to skip each one`
- **Short (≤160):** `A curated index of 112 AI infrastructure tools ordered by stack layer — every entry says when to use it and when to skip it. Neutral, dated, free.`
- **Long:** *Lattice is a neutral index of the infrastructure behind production AI
  systems — inference runtimes, gateways, vector stores, agent frameworks, evals —
  ordered as a stack rather than a popularity list. Every entry carries two
  sentences: when to use it and when to skip it. A Stack Builder turns a workload
  description into a recommended stack with a cost band, and symptom guides start
  from "why is my LLM app slow" rather than from a product category. Entries are
  dated and the build fails if any fact is over six months old.*

Where: **DevHunt** (dev tools, weekly), **Peerlist Launchpad**, **Uneed**,
**SaaSHub**, **AlternativeTo** (list it as an alternative to other AI-tool
directories). Skip paid "boost" tiers.

### 2d. Communities (one post each, spaced out, by you — not automated)

**Show HN** (weekday, ~8–10am US Eastern):
- Title: `Show HN: Lattice – AI infra tools, each with when to skip it`
- Body: *I kept reading tool directories that list what a product does but never when
  you shouldn't use it. Lattice indexes 112 AI infrastructure tools by stack layer
  (inference → routing → retrieval → … → evals), and each entry has a "skip when".
  There's a Stack Builder that takes a workload (RAG, agent, voice…) and recommends a
  stack with a cost band, and symptom pages ("why is my RAG giving wrong answers").
  No paid placement; the build fails if an entry's facts are over six months old.
  Corrections welcome — that's the part I most want feedback on.*
  Then stay in the thread for two hours and answer everything.

**Reddit** — read each sub's self-promo rules first; lead with a useful essay, not the
homepage:
- r/LocalLLaMA → `/blog/choosing-an-inference-runtime`
- r/MachineLearning (`[P]` tag) → `/stack-builder`
- r/LLMDevs, r/mlops → `/fix/rag-hallucinations`, `/fix/ai-agent-unreliable`

### 2e. Syndicate the essays (canonical stays on Lattice)

Cross-post the 11 essays to **dev.to**, **Hashnode** and **Medium**, each with its
canonical URL set to the Lattice original (dev.to: `canonical_url:` in front matter;
Hashnode: "Originally published at"; Medium: Import story). You get a link and a new
audience, and Google credits the original.

Start with the three that answer tracked queries:
`the-gateway-is-the-product`, `fix-the-ranking-not-the-prompt`, `prompt-or-finetune`.

---

## 3. Getting cited by AI answer engines (AEO / GEO)

Answer engines cite pages that (1) they can reach, (2) are in Bing/Google's index,
and (3) state a direct answer near the top. Lattice already does (3) by design. The
work is (1) and (2) — sections 1 and 0 above — plus targeting the queries in
`src/lib/citation-queries.mjs`:

| Query | Page that should be cited |
| --- | --- |
| why is my LLM app slow | `/fix/llm-app-too-slow` |
| how to reduce LLM API costs | `/fix/llm-costs-too-high`, `/compare/cutting-inference-cost`, `/blog/the-cost-model` |
| why does my RAG give wrong answers | `/fix/llm-wrong-answers`, `/fix/rag-hallucinations`, `/blog/fix-the-ranking-not-the-prompt` |
| vLLM vs SGLang vs TGI | `/compare/inference-runtimes` |
| pgvector vs Pinecone | `/compare/vector-databases`, `/retrieval-vector-stores/pinecone/alternatives` |
| Langfuse vs LangSmith vs Braintrust | `/compare/llm-observability` |
| RAG vs fine-tuning vs prompt engineering | `/compare/retrieval-finetuning-prompting`, `/blog/prompt-or-finetune` |
| AI infrastructure stack layers | `/` and `/bands` |
| LiteLLM vs Portkey | `/compare/llm-gateways` |
| Temporal vs Inngest for AI agents | `/compare/durable-workflows` |
| should I build an LLM gateway or evals first | `/compare/gateway-guardrails-evals` |

When you post anywhere (2c–2e), **link the page that answers a tracked query**, not
the homepage. A citation is earned per page, and a deep link on a forum is exactly
the co-citation signal engines use to decide that page answers that question.

---

## 4. Measuring it (monthly, same day)

| What | Where | Healthy at 90 days |
| --- | --- | --- |
| Indexed pages | GSC → Pages | > 200 of 274 |
| Impressions / clicks | GSC → Performance | trending up week on week |
| Bing indexed + AI citations | Bing Webmaster Tools → *AI Performance* / Search Performance | indexed > 200 |
| Referring domains | GSC → Links → Top linking sites | 20+ real domains |
| Citations | `npm run cite` → `gtm/citation-log.csv` | cited for ≥3 of 20 tracked queries |
| Traffic | Vercel Analytics → Referrers | chatgpt.com / perplexity.ai appearing |

Anything that moves 3+ positions in the citation log maps to a `claim` in
`citation-queries.mjs` — double down on that claim's content, not on the channel.
