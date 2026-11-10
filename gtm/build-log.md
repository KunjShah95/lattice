# Build log: one build a week, posted with a tagged stack link

*Started 10 November 2026.*

The one channel that sends people is X: 152 of the 174 visitors who arrived with
a referrer in the last 30 days came from `t.co`. This file is the routine that
feeds it, and the drafts for the first three weeks.

## The routine

Once a week:

1. **Build one thing.** A small, real system: the stack a preset gives you, wired
   end to end, with one measurement. An evening, not a project.
2. **Get the stack link.** Open the case in `/stack-builder`, press **Post to X**.
   It fills the compose window with the picks and a link to that exact case,
   tagged `?src=social`.
3. **Add what happened.** One or two replies under the first post: the number you
   measured, and the thing that broke. This is the part nobody else can write
   and the reason to follow the account.
4. **Tag any other link by hand** before pasting it:

   ```bash
   npm run share -- /blog/continuous-batching-from-first-principles
   ```

Two rules.

- **Post only what was built.** The first post of each draft below is true today:
  it reports what the builder picks and each pick's skip-when. The lines marked
  `[after you build it]` are not written, on purpose. Do not fill them with a
  guess. A build log with invented results is worth less than no build log, and
  it spends the one thing the index sells.
- **Never paste an untagged link.** The X app strips the referrer, so an untagged
  click lands as "direct" and the post looks like it did nothing. Never tag a
  link in `llms.txt`, `tools.json` or `/mcp` (`strategy/04-monetisation.md` §7a).

## What to read afterwards

All in Vercel Analytics, under Events, and in the Worker log as
`event: "lattice.signal"`:

| Question | Event | Read it as |
| --- | --- | --- |
| Did the post send people? | `land`, `channel: social` | Sessions that week |
| Did they use the product? | `hero-stack`, then `stack-built` | Divide by `land` for the same channel |
| Did the loop close? | `stack-shared` | Someone else posted a stack |

Compare rates, not counts, and do not trust a gap until each side has 15 to 20
conversions (§7a again).

## Week 1: RAG over 10M documents, heavy filtering

Link (already tagged):
`https://lattice.kunjshah.in/stack-builder?workload=rag&q=500000&docs=10000000&filtering=heavy&freshness=daily&latency=fast&lock=1&src=social`

**Post 1**

> RAG over 10M docs, 500K queries a month, heavy metadata filtering, daily
> updates. I asked the Lattice Stack Builder for a stack with no lock-in:
>
> Routing: Envoy AI Gateway
> Retrieval: Qdrant
> Inference: llama.cpp
> Prompts: Agenta
> Evals: Arize Phoenix
>
> Each pick comes with when to skip it. [link]

**Post 2**

> The skip-whens are the useful half.
>
> Qdrant: skip if you want no new datastore to operate.
> Envoy AI Gateway: skip if you want a gateway you can configure without a data plane.
> llama.cpp: skip if you need maximum concurrent throughput on datacentre GPUs.

**Post 3**

> The builder's own warning for this case: filtering is load-bearing, so
> validate filtered recall against a query set before migrating. Most
> disappointing retrieval is a ranking problem, not a database problem.

**Post 4** `[after you build it]` Your filtered recall on your own ten questions,
before and after, and what you changed.

## Week 2: an agent that runs for hours under a strict tool policy

Link:
`https://lattice.kunjshah.in/stack-builder?workload=agent&q=50000&lang=python&dur=hours&safety=strict&lock=1&src=social`

**Post 1**

> An agent that runs for hours, in Python, with a strict policy on what its
> tools may do. The stack the Lattice Stack Builder gives for that:
>
> Routing: LiteLLM
> Agents: LangChain
> Workflows: DBOS
> Inference: SGLang
> Guardrails: Guardrails AI
> Evals: Arize Phoenix
>
> [link]

**Post 2**

> The pick people skip is the workflow engine. DBOS here: durable workflows as
> ordinary Python functions. Skip it if you want a separate service to operate.
>
> Why it is in the stack at all: a restart in the middle of the loop is the most
> common way an agent does real damage.

**Post 3**

> And the caveat the builder attaches: a durable engine fixes durability, not
> idempotency. A tool call with a side effect still needs an idempotency key.

**Post 4** `[after you build it]` Kill the process mid-run. Which steps ran twice?

## Week 3: a support chatbot with personal data in the conversation

Link:
`https://lattice.kunjshah.in/stack-builder?workload=chatbot&q=200000&latency=fast&lang=python&safety=pii&lock=1&src=social`

**Post 1**

> A support chatbot: 200K conversations a month, under two seconds, Python, and
> customers paste personal data into it. Stack from the Lattice Stack Builder:
>
> Routing: LiteLLM
> Inference: vLLM
> Prompts: Instructor
> Guardrails: Guardrails AI
> Evals: Arize Phoenix
>
> [link]

**Post 2**

> vLLM is the right call only if traffic overlaps. Its skip-when: traffic is
> steady and low-concurrency, so batches never fill.
>
> Why batching is the whole game, from the hardware up:
> `https://lattice.kunjshah.in/blog/continuous-batching-from-first-principles?src=social`

**Post 3**

> The builder's warning for this one: personal data is a data-flow problem.
> Detect and redact before the model sees it, not after it answers.

**Post 4** `[after you build it]` Ten messages containing personal data: how many
reached the model unredacted before, and after.

## The fortnightly essay

Alternate weeks, one first-principles essay on `/blog`, announced the same way
with a tagged link. The first is
[`continuous-batching-from-first-principles`](../src/content/blog/continuous-batching-from-first-principles.mdx).
Candidates that follow the same recipe (derive the number from the hardware or
the data structure, then say when the conclusion does not hold):

| Layer | Question | Arithmetic it starts from |
| --- | --- | --- |
| 03 Retrieval | Why does filtered vector search lose recall? | How an HNSW graph is traversed when most neighbours fail the filter |
| 02 Routing | What does a gateway cost in latency? | One extra hop against the time to first token |
| 01 Inference | What does 4-bit quantisation cost? | Bytes per weight against memory bandwidth, the same model as the batching essay |
| 06 Workflows | Why is exactly-once a property of the step, not the engine? | Replay of a log with a non-idempotent side effect |
| 09 Evals | How many cases before a difference is real? | The confidence interval on a pass rate of 20, 50 and 200 cases |

Each needs `keywords` and `faq` in its frontmatter (they become the Article
keywords and the FAQPage markup), and a registration line in `src/lib/posts.ts`.
