# Lattice reels: posting kit

Five reels, each one decision from the site in 19–34 seconds. They are built to
earn a follow on the value alone and to send the viewers who want the full
answer to the page that has it.

| # | Reel | Length | Sends to |
|---|---|---|---|
| 1 | `01-vector-db.mp4`: "Your RAG app probably doesn't need a vector database." | 34 s | `/compare/vector-databases` |
| 2 | `02-slow-llm-app.mp4`: "Your LLM app is slow. It's probably not the model." | 30 s | `/fix/llm-app-too-slow` |
| 3 | `03-llm-bill.mp4`: "Cutting your LLM bill? Do it in this order." | 32 s | `/fix/llm-costs-too-high` |
| 4 | `04-nine-layers.mp4`: "Every AI app runs on the same nine layers." | 19 s | `/` |
| 5 | `05-agent-frameworks.mp4`: "Stop picking agent frameworks by GitHub stars." | 29 s | `/compare/agent-frameworks` |

Each has a cover (`<id>-cover.jpg`, the hook fully set) for the profile grid.

## The link, and why it carries `?src=social`

Instagram's in-app browser often sends **no referrer**, so a visitor from a reel
would be counted as `direct` and the social channel would look empty. Every
link below carries `?src=social`, which the site reads first
(`src/lib/channel.mjs`), so these visits are counted as social. The
`utm_campaign` names the reel for any analytics tool that reads UTMs; the site's
own log tells reels apart by the page they land on (`kind: "land"`, grouped by
`to`).

Instagram allows up to five links in a bio. Put all five there, named by topic,
and say "link in bio" in the caption as the reels do:

```
Vector DB or Postgres?   https://lattice.kunjshah.in/compare/vector-databases?src=social&utm_source=instagram&utm_campaign=reel-01
Slow LLM app checklist   https://lattice.kunjshah.in/fix/llm-app-too-slow?src=social&utm_source=instagram&utm_campaign=reel-02
Cut your LLM bill        https://lattice.kunjshah.in/fix/llm-costs-too-high?src=social&utm_source=instagram&utm_campaign=reel-03
The 9-layer AI stack     https://lattice.kunjshah.in/?src=social&utm_source=instagram&utm_campaign=reel-04
Pick an agent framework  https://lattice.kunjshah.in/compare/agent-frameworks?src=social&utm_source=instagram&utm_campaign=reel-05
```

Also share each reel to your story with a **link sticker** to its page: stories
are the one place on Instagram where a link is one tap.

## Captions

Instagram's own guidance is now 3–5 relevant hashtags, not 30. The first line is
what shows in the feed, so it restates the hook; the question at the end is
there to earn comments, which is what the ranking rewards.

### 1 · Vector DB

```
Your RAG app probably doesn't need a vector database.

Before you add Pinecone or Qdrant, ask:
→ Filtering by users, permissions or tenants? A SQL join beats a copy you keep in sync.
→ Under a few million vectors? pgvector handles it. No new service.
→ Bad search results? Usually chunking or embeddings, not the database.

Start on pgvector. Move when vector search becomes the workload, not a side feature.

Full comparison of pgvector, Qdrant, Pinecone and Chroma: link in bio.

What are you running retrieval on right now? 👇

#rag #vectordatabase #postgres #aiengineering #llm
```

### 2 · Slow LLM app

```
Your LLM app is slow. It's probably not the model.

Check these, in this order:
1. Trace one slow request end to end
2. Count the output tokens, and ask for fewer
3. Run independent calls in parallel
4. Cache repeats and add a faster fallback
5. Only then, tune the serving runtime

Not the fix: a bigger GPU before you've measured where the time goes.

The full checklist, with the tools for each step: link in bio.

Which one got you? 👇

#llm #aiengineering #latency #genai #mlops
```

### 3 · LLM bill

```
Cutting your LLM bill? Do it in this order.

Spend is never even. A few features, long prompts or silent retries usually dominate it.

1. Attribute spend per request and feature (zero quality risk)
2. Shrink the prompt and the context you send
3. Cache repeats, enforce budgets at the gateway
4. Route easy queries to a cheaper model, with an eval first
5. Self-host last, only when utilisation is high and steady

Every step with its tools: link in bio.

What's your biggest LLM cost line? 👇

#llm #aiengineering #finops #genai #llmops
```

### 4 · Nine layers

```
Every AI app runs on the same nine layers.

01 Inference · 02 Routing · 03 Retrieval · 04 Training · 05 Agents
06 Workflows · 07 Guardrails · 08 Prompts · 09 Evals

Lattice sorts 112 tools by the layer they live in, and every one tells you when to skip it.

Find your layer: link in bio.

Which layer gives you the most trouble? 👇

#aiengineering #llm #aiinfrastructure #genai #mlops
```

### 5 · Agent frameworks

```
Stop picking agent frameworks by GitHub stars.

Pick by the shape of the job:
→ Retrieval is the product: LlamaIndex
→ Tool calls must be schema-safe: Pydantic AI
→ A small loop with handoffs built in: OpenAI Agents SDK
→ The widest integrations: LangChain, and you pay the abstraction tax

Either way, run the loop on a durable host and trace every tool call.

Full comparison: link in bio.

What are you building agents with? 👇

#aiagents #langchain #llamaindex #aiengineering #llm
```

## Schedule

One reel every second day, so each gets 48 hours to find its audience before
the next arrives. Lead with the broadest hook:

| Day | Reel | Why here |
|---|---|---|
| 1 | 04 · Nine layers | The shortest, and it explains the whole account |
| 3 | 02 · Slow LLM app | A pain almost every builder has |
| 5 | 01 · Vector DB | The most contrarian hook: the share and save candidate |
| 7 | 03 · LLM bill | Same format as 02, a different pain |
| 9 | 05 · Agent frameworks | Names tools people search for |

Reply to every comment in the first hour. Post a reel's cover to the grid only if
it reads on its own (all five do: each is its hook).

## Reading the result

Instagram's Insights tell you reach, retention and follows. The site's log tells
you what Instagram cannot: whether the visitors converted.
`strategy/04-monetisation.md` §7a has the queries. In short, for the `social`
channel over the same 30 days:

- **Visits**: `kind: "land"`, `channel: "social"`. Grouped by `to`, that is visits per reel.
- **Conversions**: `kind: "review"`, `"stack-built"`, `"compare-built"`, same channel.

Compare the **rate** to the `ai` channel's, never the counts, and trust a gap
only past ~15–20 conversions per channel. Reels are expected to win on reach and
lose on rate; their job is the follow and the burst of visits that gets pages
indexed.

Two signals worth acting on in Insights:

- **3-second hold under ~60%**: the hook is the problem. Re-cut with a sharper first line; the script is one JSON edit.
- **Watch-through high, profile visits low**: the payoff is complete in the reel. Hold one item back ("the fifth one is on the site").

## Making more

Each reel is one entry in `scripts.json`. Every beat has the on-screen `text`
and a `vo` line spelled for the voice ("P G vector", "L L M"). Then:

```bash
pip install kokoro-onnx soundfile numpy scipy
# model files: github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
python launch/reels/voice.py kokoro-v1.0.onnx voices-v1.0.bin <id>   # timeline + voice
python launch/reels/music.py <id>                                    # score + mix, -14 LUFS
node launch/reels/render.mjs <id>                                    # out/<id>.mp4 + cover
```

`FRAMES="1,6.5" node launch/reels/render.mjs <id>` renders stills to check a
layout first. Beat types: `hook`, `say`, `item` (numbered, with its layer),
`verdict`, `stack` (the nine layers) and `cta`.

Good next scripts, from pages that already exist: the other `/fix` symptoms
(`ai-agent-unreliable`), the remaining comparisons (`inference-runtimes`,
`llm-gateways`), and one Stack Builder demo built from the screen captures in
`launch/assets/`.

The score is synthesised, so it is safe to post as is. Trending audio can lift
reach; if you swap it in Instagram's editor, keep the voice track. The words on
screen carry the reel for viewers watching muted, but the voice is the hook for
those with sound on.
