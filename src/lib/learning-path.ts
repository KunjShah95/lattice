/**
 * "AI infrastructure from zero": nine short lessons, one per stack layer.
 *
 * ## Why this is a second ordering of the same nine layers
 *
 * The index is ordered substrate first, by where a request passes through.
 * That is the right order for a map and the wrong order for a first week: it
 * opens with GPU runtimes, which a newcomer should not touch for months. This
 * is the order a person actually meets the layers in, and the site already
 * argues for it one rule at a time (`PAGE_GUIDANCE.start`): ship one call,
 * write the eval set, defer self-hosting, routing and agents until a
 * measurement asks for them.
 *
 * ## The shape of a lesson
 *
 * Each one is the house pair, taught: what the layer is and when you need it,
 * then when to skip it. Between them sits one exercise small enough to finish
 * in a sitting, because a lesson that ends in reading produces a reader and
 * one that ends in a result produces someone who comes back. Every lesson
 * links to exactly one layer page, which is where the tools are.
 *
 * No tool is named as "the" answer in a lesson. Picking tools is what the
 * layer pages and the Stack Builder are for, and a learning path that
 * recommends products is a sales funnel with extra steps.
 *
 * Plain data with no imports, so the test can check it against the dataset
 * and the page can render it on the server.
 */

export type Lesson = {
  /** The category this lesson teaches, and the one layer page it links to. */
  section: string;
  /** The question a newcomer is actually asking, in their words. */
  question: string;
  /** What the layer is, in two sentences, with no jargon left undefined. */
  what: string;
  /** The moment this layer starts to matter. */
  needWhen: string;
  /** One exercise that ends in something you can look at. */
  tryThis: string;
  /** The other half of the pair: when to leave this layer alone. */
  skipUntil: string;
  /** The essay that goes deeper, by slug. */
  essay: string;
};

export const LESSONS: Lesson[] = [
  {
    section: "prompt-engineering",
    question: "How do I tell the model what I want?",
    what: "A prompt is the instruction and the context you send with every request. Treated as code, it lives in version control, has a reviewer, and can be compared with the version before it.",
    needWhen:
      "From the first request. It is the cheapest thing you can change, and the first thing to try when an answer is wrong.",
    tryThis:
      "Call a hosted model with one real question from your product. Keep the prompt in a file in your repository, not in a string inside a handler. Change one sentence and put the two answers side by side.",
    skipUntil:
      "Skip prompt management tools until more than one person edits prompts, or you need to change one without a deploy.",
    essay: "context-is-a-budget",
  },
  {
    section: "evaluation-observability",
    question: "How do I know a change made it better?",
    what: "An eval is a fixed set of inputs and a way to score the outputs, run on every change. Observability is the production half of the same job: a trace of what each real request did.",
    needWhen: "The day a prompt change could break something a user relies on.",
    tryThis:
      "Write down twenty real questions and what a good answer to each must contain. Run them before and after your next prompt change, and count the ones that got worse.",
    skipUntil:
      "Skip dashboards and model graders until twenty cases you check by hand stop being enough.",
    essay: "evals-are-the-asset",
  },
  {
    section: "retrieval-vector-stores",
    question: "How does the model answer from my data?",
    what: "Retrieval finds the few passages relevant to a question and puts them in the prompt, so the model answers from your documents and not from memory. Embeddings make that search possible: they turn text into vectors, so passages with similar meaning sit close together.",
    needWhen:
      "When answers must come from data the model was not trained on, or from data that changes.",
    tryThis:
      "Embed fifty of your documents, ask ten real questions, and read the top five passages returned for each. Do this before judging a single answer: if the right passage is not in the five, no prompt will fix it.",
    skipUntil:
      "Skip a dedicated vector database until the collection outgrows the database you already run. A vector extension on that database is enough for a first version.",
    essay: "fix-the-ranking-not-the-prompt",
  },
  {
    section: "routing-gateways",
    question: "What sits between my app and the model provider?",
    what: "A gateway is one proxy that every model request passes through. It holds the keys, logs each call, attributes the cost, and can retry or fall back to a second provider.",
    needWhen:
      "When you add a second provider, need cost per team or per feature, or have been hurt by an outage.",
    tryThis:
      "Put a gateway in front of the provider you already use, and change nothing else. After a day, read the log and find the feature that costs the most.",
    skipUntil: "Skip it while you have one provider, one app, and a bill you can read.",
    essay: "do-you-need-an-ai-gateway",
  },
  {
    section: "guardrails-safety",
    question: "How do I stop bad input and bad output?",
    what: "Guardrails are checks that run before a request reaches the model and after an answer leaves it. They redact personal data, block injected instructions, and confirm the output has the shape your code expects.",
    needWhen:
      "When text you do not control reaches the model, when the model can take actions, or when personal data flows through it.",
    tryThis:
      "Write five inputs that should be refused and five that should pass. Run all ten through your app as it is today, with nothing added, and see what happens.",
    skipUntil:
      "Skip a guardrail product until you can name the failure it would stop. Checking the structure of the output in your own code comes first.",
    essay: "where-guardrails-belong",
  },
  {
    section: "agent-frameworks",
    question: "When does one model call become a program?",
    what: "An agent is a loop: the model picks a tool, your code runs it, the result goes back to the model, and this repeats until the task is done. A framework supplies the loop, the tool definitions, and the state carried between steps.",
    needWhen: "When a task takes several steps whose order you cannot write down in advance.",
    tryThis:
      "Give a model two tools (a search and a calculator will do) and write the loop yourself, in about forty lines. You will see exactly what a framework would be doing for you.",
    skipUntil:
      "Skip a framework while the steps are fixed and known. A function that calls the model twice is not an agent and does not need one.",
    essay: "when-not-to-use-an-agent-framework",
  },
  {
    section: "workflow-orchestration",
    question: "What happens when it crashes halfway?",
    what: "A durable workflow engine records each finished step. A run interrupted by a deploy, a crash or a rate limit then resumes where it stopped, and does not start over or repeat a step.",
    needWhen:
      "When a run outlasts a single request, waits on a person, or does something that must not happen twice, such as sending an email or charging a card.",
    tryThis:
      "Kill your process in the middle of a multi-step run and start it again. Note which steps ran twice, and what that would have cost if they had real side effects.",
    skipUntil:
      "Skip it while every run finishes inside one request and can be retried from the start without harm.",
    essay: "agents-need-a-durable-host",
  },
  {
    section: "inference-serving",
    question: "Should I run the model myself?",
    what: "An inference runtime loads model weights onto a GPU and serves requests against them. The good ones run many requests through the model together, which is where most of their throughput comes from.",
    needWhen:
      "When data cannot leave your network, when you serve a model you tuned yourself, or when steady volume makes a rented GPU cheaper than paying per token.",
    tryThis:
      "Run a small open model on your own machine with a local runtime, and send it the twenty eval cases from lesson two. Compare its quality and speed with the hosted API you use now.",
    skipUntil:
      "Skip self-hosting until one of those three reasons is real and measured. A hosted API is the right first answer for nearly everyone.",
    essay: "continuous-batching-from-first-principles",
  },
  {
    section: "fine-tuning",
    question: "When do I change the model itself?",
    what: "Fine-tuning continues the training of an existing model on your own examples, so it picks up a behaviour: a format, a tone, a narrow task. Methods such as LoRA train a small set of added weights and leave the original model untouched.",
    needWhen:
      "When a prompt cannot hold the behaviour reliably, or a small tuned model could replace a large, expensive one on a narrow task.",
    tryThis:
      "Collect a hundred pairs of input and ideal output for the behaviour you want. Use them as examples in the prompt and as eval cases first: that tells you whether tuning has anything left to add.",
    skipUntil:
      "Skip it for facts. Knowledge that changes belongs in retrieval, and a model tuned on last month's facts is wrong this month.",
    essay: "prompt-or-finetune",
  },
];

/** The anchor of a lesson on `/start`, so an explainer can be linked on its own. */
export function lessonAnchor(index: number): string {
  return `lesson-${index + 1}`;
}
