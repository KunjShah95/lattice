import { getComparison } from "./comparisons";
import type { QA } from "./seo";

/**
 * "Rules of thumb" and "Quick answers" for every page that is not built from
 * a comparison, stack or symptom record (those derive theirs from their own
 * data).
 *
 * House style, enforced by `guidance.test.ts`:
 *   - A rule is two or three short sentences. The first names the failure or
 *     the claim; the next says what to do about it. No vendor names: rules are
 *     about the decision, not about a product.
 *   - An answer stands alone. Quoted without the page around it, it still
 *     answers the question it sits under.
 */
export type Guidance = { rules: string[]; answers: QA[] };

/** Per stack section, keyed by category slug. */
export const CATEGORY_GUIDANCE: Record<string, Guidance> = {
  "inference-serving": {
    rules: [
      "Benchmark at your concurrency, not at batch size one. A runtime that wins a single-stream demo can lose badly at fifty concurrent users.",
      "Measure time to first token and tokens per second separately. Users feel the first; your GPU bill feels the second.",
      "Self-host only when a hosted API fails a measured requirement: cost at volume, data residency or latency. Owning GPUs is an operations job, not a config flag.",
    ],
    answers: [
      {
        question: "What does an inference server actually do?",
        answer:
          "It loads model weights onto hardware and turns requests into tokens as fast as the hardware allows, batching concurrent requests and managing the KV cache so memory is not wasted. It is the bottom of the stack: every other layer pays its latency.",
      },
      {
        question: "Should I self-host a model or call a hosted API?",
        answer:
          "Start on a hosted API. Move to self-hosting when you can name the measured reason: sustained volume that makes per-token pricing more expensive than GPUs, data that cannot leave your network, or a latency target the API misses.",
      },
      {
        question: "Which number matters most when comparing runtimes?",
        answer:
          "Throughput at your real concurrency and prompt length. Single-request latency hides batching behaviour, which is where production runtimes differ most.",
      },
    ],
  },
  "routing-gateways": {
    rules: [
      "Route on measured quality, not on price alone. A cheaper model that fails your eval set is not cheaper.",
      "A gateway is in the request path, so it adds latency to every call. Measure that overhead before you add policy to it.",
      "Fallbacks that switch models silently change your output. Log which model answered every request, or you cannot debug quality.",
    ],
    answers: [
      {
        question: "Why put a gateway in front of model providers?",
        answer:
          "To get one endpoint, one key store and one place for policy: retries, fallbacks, rate limits, budgets and logging. It lets you change providers without changing application code.",
      },
      {
        question: "When is a gateway not worth it?",
        answer:
          "When you call one provider with one model and have no budget or fallback policy. A thin client library is enough until a second provider or a spend limit forces the issue.",
      },
      {
        question: "Does routing to cheaper models save money?",
        answer:
          "Only if the cheaper model passes the same eval set. Routing without an eval trades a visible cost for an invisible quality regression.",
      },
    ],
  },
  "retrieval-vector-stores": {
    rules: [
      "Most bad retrieval is a ranking or chunking problem, not a database problem. Fix the eval set and the chunks before you migrate stores.",
      "Test filtered recall, not just recall. Metadata filters are where vector stores differ most and where demos never look.",
      "Use the database you already run until it measurably fails. A second datastore is a second thing to back up, secure and page on.",
    ],
    answers: [
      {
        question: "Do I need a dedicated vector database?",
        answer:
          "Usually not at first. A vector extension on a database you already run handles millions of embeddings. Move to a dedicated store when filtered recall, latency or index size fails a measured target.",
      },
      {
        question: "Why does my RAG app return the wrong passages?",
        answer:
          "Most often the chunks are wrong or the ranking is weak, not the store. Build a small query set with known correct passages, measure recall, then change one thing at a time: chunking, embedding model, hybrid search or a reranker.",
      },
      {
        question: "What is hybrid search?",
        answer:
          "Combining keyword search with vector search and merging the results. It recovers exact matches such as product codes and names that embeddings alone tend to miss.",
      },
    ],
  },
  "fine-tuning": {
    rules: [
      "Fine-tuning teaches behaviour, not facts. If the answer changes monthly, it belongs in retrieval instead.",
      "Exhaust prompting and retrieval before training. A fine-tune is a model you now have to version, evaluate and serve.",
      "Hold out an eval set before the first training run. Without it you cannot tell a better model from a different one.",
    ],
    answers: [
      {
        question: "When should I fine-tune instead of prompting?",
        answer:
          "When you need a consistent format, tone or narrow skill that prompting cannot hold reliably, or when a smaller tuned model can replace a larger general one at lower cost. Not when you need the model to know new facts.",
      },
      {
        question: "What is LoRA?",
        answer:
          "Low-rank adaptation: training a small set of extra weights on top of a frozen base model. It cuts memory and cost enough to fine-tune large open models on a single GPU.",
      },
      {
        question: "How much data does fine-tuning need?",
        answer:
          "Hundreds to a few thousand clean, representative examples are often enough for behaviour and format. Quality and coverage of the examples matter more than volume.",
      },
    ],
  },
  "agent-frameworks": {
    rules: [
      "An agent loop that cannot survive a deploy will eventually cause real damage. Durability and tool permissions are the controls, not the prompt.",
      "Start with a single model call and plain code. Add an agent framework when the control flow genuinely depends on the model's output.",
      "Give every side-effecting tool an idempotency key. Retries are guaranteed; duplicate payments should not be.",
    ],
    answers: [
      {
        question: "What does an agent framework add over plain API calls?",
        answer:
          "A loop that lets the model choose tools, state carried between steps, and conventions for memory, retries and handoffs. It is worth the dependency when the number and order of steps are decided at runtime.",
      },
      {
        question: "Why do agents fail in production?",
        answer:
          "Mostly from unbounded loops, tools with too much permission, and lost state when a process restarts mid-run. Cap steps, scope tool credentials, and persist state outside the process.",
      },
      {
        question: "Do I need multiple agents?",
        answer:
          "Rarely at first. One agent with well-described tools is easier to debug. Split into several only when one context window or one set of instructions measurably cannot hold the task.",
      },
    ],
  },
  "workflow-orchestration": {
    rules: [
      "If a step can fail halfway, it will. Write every step so running it twice is safe.",
      "Durable execution fixes crashes, not bad logic. Retries replay your bugs as faithfully as your successes.",
      "Use a queue and a cron until you need waits, retries and visibility across hours. Then adopt an engine, not before.",
    ],
    answers: [
      {
        question: "What is durable execution?",
        answer:
          "Running a workflow so its progress is recorded after each step. If the process dies, the workflow resumes from the last completed step instead of starting over or silently stopping.",
      },
      {
        question: "Do LLM pipelines need a workflow engine?",
        answer:
          "Long-running ones do: batch enrichment, multi-hour agents, anything waiting on humans or rate limits. Short request-response calls do not.",
      },
      {
        question: "What makes a workflow step safe to retry?",
        answer:
          "Idempotency: the step produces the same effect whether it runs once or several times, usually by checking a key before writing or charging.",
      },
    ],
  },
  "guardrails-safety": {
    rules: [
      "A guardrail without an eval is a guess about which failures matter. Write the eval that found the failure, then the guardrail that blocks it.",
      "PII is a data-flow problem. Detect and redact before the model ever sees it, not after it answers.",
      "Every guardrail in the request path adds latency to every call. Run checks offline first and move them inline only when production forces it.",
    ],
    answers: [
      {
        question: "What do LLM guardrails actually catch?",
        answer:
          "Input checks catch prompt injection, PII and off-topic requests; output checks catch policy violations, leaked data and malformed structure. None of them replace scoped tool permissions.",
      },
      {
        question: "Can a guardrail stop prompt injection?",
        answer:
          "It reduces it, it does not eliminate it. The reliable defence is limiting what a hijacked model can do: least-privilege tools, human approval for irreversible actions, and no secrets in the context.",
      },
      {
        question: "Where should guardrails run?",
        answer:
          "Offline first, against logged traffic, to learn which failures are real. Inline only for the few checks that must block a response, because each one costs latency on every call.",
      },
    ],
  },
  "prompt-engineering": {
    rules: [
      "Prompt changes without evals are guesses. Version prompts and measure before you ship a wording change.",
      "Keep prompts out of string literals. A prompt you cannot diff is a prompt you cannot review.",
      "Fix the examples before the instructions. Models copy what you show more faithfully than what you tell.",
    ],
    answers: [
      {
        question: "Why version prompts?",
        answer:
          "Because a one-word change can move output quality as much as a model swap. Versioning lets you tie each production response to the exact prompt that produced it and roll back a regression.",
      },
      {
        question: "Do I need a prompt management tool?",
        answer:
          "Not for one or two prompts in code with tests. It helps when non-engineers edit prompts, when prompts change faster than deploys, or when you need to compare versions against an eval set.",
      },
      {
        question: "What is structured output?",
        answer:
          "Constraining the model to return data matching a schema, such as JSON with required fields. It removes a whole class of parsing failures between the model and your code.",
      },
    ],
  },
  "evaluation-observability": {
    rules: [
      "Build the eval set before tuning anything. Every later decision in the stack is only as good as the measurement behind it.",
      "Trace every production call with its prompt, model and output. You cannot fix a failure you cannot replay.",
      "Grade with code where you can and with a model where you must. A model grader needs its own spot-checks against human labels.",
    ],
    answers: [
      {
        question: "What is an LLM eval?",
        answer:
          "A fixed set of inputs with a way to score the outputs, run on every change to prompt, model or retrieval. It turns 'seems better' into a number you can compare.",
      },
      {
        question: "What is the difference between evaluation and observability?",
        answer:
          "Evaluation scores outputs against a dataset before release; observability records what happened to real requests after release. Production traces become the next eval cases.",
      },
      {
        question: "How big should an eval set be?",
        answer:
          "Start with 20 to 50 real cases that cover the failures you care about. Grow it from production failures; a small set you run on every change beats a large one you never run.",
      },
    ],
  },
  "learning-reference": {
    rules: [
      "Read about the layer you are about to change, not the whole field. Depth on one decision beats breadth on fifty.",
      "Prefer sources that show measurements over sources that show diagrams. A benchmark you can rerun outranks an opinion you cannot.",
      "Date-check everything. Advice about models and runtimes ages in months, not years.",
    ],
    answers: [
      {
        question: "Where should I start learning AI infrastructure?",
        answer:
          "With the layer your product touches first, usually a hosted model API, prompts and an eval set. Learn serving, routing and retrieval when a real requirement pushes you there.",
      },
      {
        question: "Why is reading listed separately from tools?",
        answer:
          "Because it is not a layer of the stack. It is what helps you choose between the layers, so it sits outside the depth order.",
      },
      {
        question: "How do I tell if a guide is out of date?",
        answer:
          "Check the publish date against model and library release dates. If it predates the major version you would install, treat its specifics as history and its principles as still useful.",
      },
    ],
  },
};

/** The fallback for a section added before its guidance is written. */
const GENERIC_SECTION: Guidance = {
  rules: [
    "Pick the tool that passes your eval set, not the one with the best demo. A demo shows the happy path; an eval shows yours.",
    "Adopt the simplest option that meets a measured requirement. Every extra moving part is one more thing to page on.",
    "Stay offline until production forces otherwise. Anything in the request path adds latency to every call.",
  ],
  answers: [],
};

export function categoryGuidance(slug: string): Guidance {
  return CATEGORY_GUIDANCE[slug] ?? GENERIC_SECTION;
}

/**
 * Rules for a page that spans several sections (a recommended stack): the
 * lead rule of each section, in stack order, without repeats.
 */
export function rulesForSections(slugs: readonly string[], max = 4): string[] {
  const out: string[] = [];
  for (const slug of slugs) {
    const rule = categoryGuidance(slug).rules[0];
    if (rule && !out.includes(rule)) out.push(rule);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Rules for a page that points at comparisons (a symptom checklist): the
 * first rule of each linked comparison, so the fix page and the comparison
 * it sends readers to say the same thing in the same words.
 */
export function rulesFromComparisons(slugs: readonly string[], max = 3): string[] {
  const out: string[] = [];
  for (const slug of slugs) {
    for (const rule of getComparison(slug)?.rules ?? []) {
      if (!out.includes(rule)) {
        out.push(rule);
        break;
      }
    }
    if (out.length >= max) break;
  }
  return out;
}

/** Per standalone page, keyed by route. */
export const PAGE_GUIDANCE = {
  home: {
    rules: [
      "Build from the bottom of the stack up, but buy from the top down. Start with a hosted model and an eval set; own lower layers only when a measurement says so.",
      "Every layer you add is a layer you operate. Add one when a measured failure names it, not when a diagram suggests it.",
      "Anything in the request path adds latency to every call; anything offline adds none. Stay offline until production forces otherwise.",
    ],
    answers: [
      {
        question: "What is Lattice?",
        answer:
          "A curated index of AI infrastructure tools, ordered by where they sit in a real system rather than by popularity. Every entry carries licence, deployment and cost facts, verified on a dated schedule.",
      },
      {
        question: "Is Lattice sponsored by the tools it lists?",
        answer:
          "No. It takes no sponsorship and carries no referral links; entries are hand-picked, not paid for or submitted.",
      },
      {
        question: "Where should I start?",
        answer:
          "Use the five-step path on the Start page if you are building your first AI feature, or the Stack Builder if you already know your workload and constraints.",
      },
    ],
  },
  all: {
    rules: [
      "Filter on constraints first and features second. Licence and deployment rule tools out faster than any feature list rules them in.",
      "A long shortlist is a sign the requirement is vague. Write the requirement down before you compare three more tools.",
      "Prefer the tool your team can operate over the tool that tops a benchmark. Operations cost outlives benchmark wins.",
    ],
    answers: [
      {
        question: "How do I narrow this list quickly?",
        answer:
          "Set the hard constraints first: self-hosted or managed, open licence or not, and cost model. That usually removes most entries before you read a single description.",
      },
      {
        question: "Why are tools grouped by layer?",
        answer:
          "Because the layer decides what a tool is responsible for. Two tools in different layers rarely compete; two in the same layer usually do.",
      },
    ],
  },
  start: {
    rules: [
      "Ship one working call before choosing any infrastructure. A real request teaches more than a week of tool research.",
      "Write the eval set in week one. Every later choice is only as good as the measurement behind it.",
      "Defer self-hosting, routing and agents until a measurement asks for them. Early complexity is the most expensive kind.",
    ],
    answers: [
      {
        question: "What is the minimum AI stack to ship a first feature?",
        answer:
          "A hosted model API, prompts kept in version control, and a small eval set run on every change. Add retrieval if answers must come from your data.",
      },
      {
        question: "How long should the first step take?",
        answer:
          "Hours, not weeks. The first goal is a working request and a measurement, not the final architecture.",
      },
    ],
  },
  stackBuilder: {
    rules: [
      "Answer the constraints honestly; the recommendation is only as specific as the inputs. 'Must be self-hosted' removes more options than any feature.",
      "Treat the cost band as a heuristic, not a quote. Use it to compare stacks, then price the one you pick.",
      "Re-run the builder when the workload changes shape. A stack chosen for a prototype rarely fits ten times the volume.",
    ],
    answers: [
      {
        question: "How does the Stack Builder choose tools?",
        answer:
          "It maps your workload to the stack sections it needs, filters each section by your hard constraints, then scores tools on how well their own documented strengths match the workload. No vendor pays for placement.",
      },
      {
        question: "Is the cost estimate accurate?",
        answer:
          "It is a band from query volume and each pick's cost model, not a vendor quote. It is useful for comparing stacks, not for a budget.",
      },
    ],
  },
  compareIndex: {
    rules: [
      "Compare tools in the same layer; order tools in different layers. A vector store and a gateway are not alternatives.",
      "Constraints rule tools out; features only rank what is left. Decide on licence and deployment before you read a feature table.",
      "A comparison without your own eval run is a starting point. Confirm the winner on your data before you migrate.",
    ],
    answers: [
      {
        question: "How are these comparisons written?",
        answer:
          "Each one states a recommendation first, then the rules behind it and when each tool should be skipped. Facts are dated and listed in the methodology.",
      },
      {
        question: "What is a cross-layer comparison?",
        answer:
          "One that compares tools from different stack layers, where the real question is not which to pick but which to adopt first.",
      },
    ],
  },
  fixIndex: {
    rules: [
      "Check the cheapest cause first. Most slow, costly or wrong AI apps are fixed by a trace and a prompt change, not a migration.",
      "Name the symptom before the layer. 'Too slow' is a measurement; 'we need a new runtime' is a guess.",
      "Change one thing at a time and re-run the eval. Two changes at once teach you nothing.",
    ],
    answers: [
      {
        question: "Why is my LLM app slow?",
        answer:
          "Most often long prompts, sequential calls that could run in parallel, or no streaming. Trace a slow request end to end before changing the model or runtime.",
      },
      {
        question: "Why is my LLM app expensive?",
        answer:
          "Usually oversized prompts, an oversized model for easy requests, or missing caching. Measure tokens per request by route before switching providers.",
      },
    ],
  },
  glossaryIndex: {
    rules: [
      "Learn a term when a decision depends on it. Vocabulary without a decision attached does not stick.",
      "Vendors use the same word for different things. Trust the definition that names a measurement.",
      "If a term hides a trade-off, ask what it costs. Every optimisation spends latency, memory or quality somewhere.",
    ],
    answers: [
      {
        question: "Who is this glossary for?",
        answer:
          "Engineers moving into AI infrastructure who need short, plain definitions tied to the stack layer where each term matters.",
      },
    ],
  },
  glossaryTerm: {
    rules: [
      "A definition is only useful next to the decision it changes. Read the linked layer to see where this term bites.",
      "If a vendor's definition differs from this one, ask what it measures. Marketing definitions rarely name a number.",
      "Every optimisation spends latency, memory or quality somewhere. Find out which before you turn it on.",
    ],
    answers: [],
  },
  blogIndex: {
    rules: [
      "Read the essay for the layer you are about to change. Depth on one decision beats breadth on fifty.",
      "Trust claims that come with measurements you can rerun. Everything else is a hypothesis.",
      "Advice about models ages in months. Check the date before you act on it.",
    ],
    answers: [
      {
        question: "What do these essays cover?",
        answer:
          "Decisions inside the AI stack: when to self-host, how to evaluate, what breaks in production. Each one links to the tools and comparisons it discusses.",
      },
    ],
  },
  blogPost: {
    rules: [
      "Treat an essay as a hypothesis for your system. Rerun the measurement on your own data before you act on it.",
      "Change one layer at a time. Two changes at once teach you nothing about either.",
      "Stay offline until production forces otherwise. Anything in the request path adds latency to every call.",
    ],
    answers: [],
  },
  roles: {
    rules: [
      "Own a layer, not a tool. Tools change yearly; responsibility for throughput, retrieval or quality does not.",
      "Learn the layer above and the layer below yours. Most production failures happen at the boundary.",
      "Every role owns part of evaluation. Quality is not a team; it is a measurement everyone runs.",
    ],
    answers: [
      {
        question: "What roles exist in AI infrastructure?",
        answer:
          "Platform, serving, data, applied and production engineering. Each owns a part of the stack, and the boundaries between them are where most handoff failures live.",
      },
    ],
  },
  role: {
    rules: [
      "Own the measurement for your layer. If you cannot name the number you are accountable for, the role is not defined yet.",
      "Learn the layer above and the layer below yours. Most production failures happen at the boundary.",
      "Choose tools your on-call rotation can debug at 3 a.m. Elegance does not page well.",
    ],
    answers: [],
  },
  bands: {
    rules: [
      "Name the symptom before the layer. 'Too slow' is a measurement; 'we need a new runtime' is a guess.",
      "Check the cheapest cause first. Most fixes are a trace and a config change, not a migration.",
      "Change one thing at a time and re-run the eval. Two changes at once teach you nothing.",
    ],
    answers: [
      {
        question: "What is a band?",
        answer:
          "A group of stack layers that fail in similar ways and are felt as one kind of symptom, such as slow, expensive or wrong. It is how readers describe problems before they know which layer caused them.",
      },
    ],
  },
  band: {
    rules: [
      "Name the symptom before the layer. 'Too slow' is a measurement; 'we need a new runtime' is a guess.",
      "Check the cheapest cause first. Most fixes are a trace and a config change, not a migration.",
      "Change one thing at a time and re-run the eval. Two changes at once teach you nothing.",
    ],
    answers: [],
  },
  methodology: {
    rules: [
      "A fact without a date is an opinion. Every licence and cost figure here carries the month it was checked.",
      "Order by position in the stack, not by popularity. Stars measure attention, not fit.",
      "Publish corrections in the open. An index that hides its mistakes cannot be trusted with its claims.",
    ],
    answers: [
      {
        question: "How are tools chosen for Lattice?",
        answer:
          "By hand, against the criteria on this page: a real, maintained tool with a clear place in the stack. Submissions are considered but never paid for.",
      },
      {
        question: "How often is the data checked?",
        answer:
          "Every licence and cost fact carries a verification month, and any fact older than six months fails the build until it is re-checked.",
      },
    ],
  },
  verification: {
    rules: [
      "A fact without a date is an opinion. Every entry here carries the month it was last checked.",
      "Stale data should fail loudly. A build that breaks on old facts is better than a page that quietly lies.",
      "Check the source, not the summary. Licences and prices are read from the vendor's own page.",
    ],
    answers: [
      {
        question: "What does 'verified' mean on Lattice?",
        answer:
          "That the licence, deployment and cost facts were read from the tool's own source in the stated month. It is not an endorsement of quality.",
      },
      {
        question: "What happens when a fact goes stale?",
        answer:
          "After six months without re-verification the build fails, so stale facts cannot ship silently.",
      },
    ],
  },
  corrections: {
    rules: [
      "Publish corrections in the open. An index that hides its mistakes cannot be trusted with its claims.",
      "Say what changed and when. A silent edit looks the same as a fact that was always right.",
      "Report errors with a source. A link to the vendor's page turns a disagreement into a fix.",
    ],
    answers: [
      {
        question: "How do I report an error?",
        answer:
          "Send the tool, the wrong fact and a link to the source that shows the right one. Recent changes to the dataset are logged on this page with their date and commit.",
      },
    ],
  },
  submit: {
    rules: [
      "Submit the tool, not the pitch. Licence, deployment and the layer it serves decide inclusion; adjectives do not.",
      "Show where it sits in the stack. A tool that fits no layer is hard to compare and hard to list.",
      "Inclusion is never paid for. Lattice takes no sponsorship and carries no referral links.",
    ],
    answers: [],
  },
  submissions: {
    rules: [
      "Log every decision, including the rejections. A public no is what makes a yes credible.",
      "Decide against published criteria. If the reason cannot be written down, it is not a reason.",
    ],
    answers: [],
  },
  review: {
    rules: [
      "Bring the measurement, not just the architecture diagram. A review of numbers finds more than a review of boxes.",
      "Fix the cheapest failure first. Most stacks need a trace and an eval before they need a migration.",
      "Write the decision down. A choice nobody recorded gets re-argued every quarter.",
    ],
    answers: [],
  },
  about: {
    rules: [
      "A curated list is only useful if the curation is visible. Every criterion is published on the methodology page.",
      "Neutrality is a practice, not a claim. No sponsorship, no referral links, corrections in the open.",
    ],
    answers: [
      {
        question: "Who runs Lattice?",
        answer:
          "Kunj Shah maintains it. It is not owned by, or paid by, any vendor it lists, and the Corrections page logs the most recent changes to the tool dataset, each with its date and commit.",
      },
    ],
  },
} satisfies Record<string, Guidance>;
