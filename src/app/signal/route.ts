// `.mjs` in the specifier, not left to resolution. `moduleResolution: "bundler"`
// will not map `@/lib/signal` onto `signal.mjs`, so the extension is stated —
// which is also how `app/mcp/route.ts` and `app/submit/page.tsx` import their
// sibling `.mjs` modules.
import { allowedEvents, MAX_SIGNAL_BYTES, parseSignal } from "@/lib/signal.mjs";
import { isRateLimited } from "@/lib/rate-limit.mjs";

/**
 * `/signal` — receives navigation beacons and writes one structured line per click.
 *
 * ## Why the Worker logs rather than a database
 *
 * `wrangler.jsonc` is deliberately minimal and says so: *"Add the bindings back
 * deliberately if ISR or image optimization arrives."* Adding a KV or D1 binding to
 * count link clicks would trade a documented architectural decision for a number,
 * and a counter nobody reads is not worth a binding.
 *
 * `observability.enabled` is already true, so a `console.log` line lands in the
 * Worker logs and is queryable with the tooling that already exists. That is the
 * whole storage layer, and it is the right size.
 *
 * ## Why this route validates rather than trusting
 *
 * It is an unauthenticated public endpoint that anything on the internet can POST
 * to. Three rules, all of them cheap:
 *
 * 1. **A closed vocabulary of events.** `event` must be one of four. An arbitrary
 *    string in a log is a log-injection vector and an analytics-poisoning one.
 * 2. **A path shape, not a path value.** `to` must start with `/` and must not
 *    start with `//` — which would make the value usable as an open redirect the
 *    moment anything renders it back as a link.
 * 3. **A size cap.** 512 bytes is more than the payload needs and less than a
 *    request body worth allocating memory for.
 *
 * Those three bound the cost of *one* request. A fourth, in `rate-limit.mjs`,
 * bounds the number of them — because a flood of perfectly well-formed beacons
 * is the actual attack here: it does not have to be malformed to be harmful, it
 * only has to be repeated.
 *
 * ## 204 for rejections, 200 for accepted
 *
 * A rejection is a malformed beacon, which is noise, and a 4xx would be visible
 * as failed requests in the analytics this route exists to produce — so a rejected
 * beacon answers 204 and says nothing at all. Not telling anyone is deliberate.
 *
 * An *accepted* beacon answers 200 with the edge it recorded. That is the change
 * from answering 204 for everything, which was defensible and turned out to make
 * the route untestable: with every case returning the same status and an empty
 * body, the only way to assert "this one was counted and that one was discarded"
 * was to scrape the Worker's stdout, which is a subprocess's buffered pipe and
 * fails intermittently — and did, here, in a way that looked like a product bug.
 *
 * Both statuses are 2xx, so neither pollutes request analytics. `sendBeacon` does
 * not read a response, so nothing about the client changes. And the body is only
 * ever the validated record: an event from a closed set of four, and two paths
 * that already passed the shape checks, so there is nothing here to reflect.
 */
export const dynamic = "force-dynamic";

/** No `runtime` export, matching every other text route — see `app/mcp/route.ts`. */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  /**
   * Volume, not shape. The rules in `signal.mjs` bound what one beacon can cost;
   * they cannot bound how many arrive, and a well-formed flood is exactly how
   * the metrics this route exists to produce get poisoned
   * (`strategy/04-monetisation.md` §7).
   *
   * `204` rather than `429`, like every other rejection here: a status the sender
   * can see would show up as a failed request in the analytics this route
   * produces, and there is no caller worth informing.
   */
  if (isRateLimited(request)) {
    return new Response(null, { status: 204, headers: CORS });
  }

  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_SIGNAL_BYTES) {
    return new Response(null, { status: 204, headers: CORS });
  }

  let parsed;
  try {
    const raw = await request.text();
    if (raw.length > MAX_SIGNAL_BYTES) {
      return new Response(null, { status: 204, headers: CORS });
    }
    parsed = parseSignal(raw);
  } catch {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (!parsed) {
    // Rejected, and deliberately silent — see above. A rejected beacon is a
    // malformed beacon, which is noise, and logging it would let anyone who finds
    // this endpoint fill the log with their own junk.
    return new Response(null, { status: 204, headers: CORS });
  }

  // The `kind` key rather than spreading `event` last: `parsed.event` is the
// beacon's own value and `event: "lattice.signal"` is the log record's. Two keys
// called `event` means the spread silently overwrote the envelope type, which is
// the kind of thing that makes a log unqueryable six months later.
//
// `from` and `to` are both logged because the record is an edge. A log that only
// says "an alternatives link was clicked" cannot answer "alternatives-page entry",
// which is the metric this route exists to serve.
const record = {
  event: "lattice.signal" as const,
  kind: parsed.event,
  from: parsed.from,
  to: parsed.to,
  at: new Date().toISOString(),
};

console.log(JSON.stringify(record));

// The same record, echoed. See the note above: this is what makes "was this
// counted?" answerable without reading the Worker's stdout, which is what the
// smoke test used to have to do.
return Response.json(record, { status: 200, headers: CORS });
}

/** A GET is not a signal. Answering it keeps the route from looking missing. */
export async function GET() {
  return Response.json(
    {
      endpoint: "/signal",
      method: "POST",
      accepts: { event: allowedEvents },
    },
    { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } },
  );
}