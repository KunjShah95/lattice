import { TOOL_DESCRIPTIONS, TOOL_MANIFEST } from "@/lib/mcp";
import { site } from "@/lib/site";

/**
 * `/mcp` — the index as an MCP server, on the same Worker as the site.
 *
 * ## Why the protocol is implemented here rather than imported
 *
 * The first version of this route used `@modelcontextprotocol/sdk`'s
 * `WebStandardStreamableHTTPServerTransport`. It built and passed every test and
 * `next start` served it, and then returned **500 in production while `/`
 * returned 200**. The cause, from the Worker log:
 *
 *     TypeError: Cannot read properties of undefined (reading 'default')
 *       at interopDefault (handler.mjs)
 *       at loadComponentsImpl → findPageComponentsImpl
 *
 * The route's module graph would not resolve inside the Worker — the SDK pulls
 * in express, hono, jose and cross-spawn, and `wrangler.jsonc` is deliberately
 * minimal. A route that only exists to answer queries cannot be the thing that
 * fails to load.
 *
 * So the transport is here, on Web APIs the Worker already implements. The
 * argument for this is not "less code" — it is that a read-only server needs
 * almost none of the protocol: no sessions to hold, no sampling, no resources to
 * subscribe to, no server-initiated messages to stream. Every tool is a pure
 * function over an immutable dataset. What is left is POST a JSON-RPC message,
 * return a result.
 *
 * ## What is deliberately absent
 *
 * - **No SSE.** `enableJsonResponse` semantics. A server-initiated stream needs
 *   a session to push to and there is nothing to push.
 * - **No sessions.** Stateless. The dataset only changes on deploy, so a fresh
 *   build answers exactly what a warm one would.
 * - **No `resources` or `prompts`.** The same content is on `/tools.json` and
 *   `/llms-full.txt`; two more capabilities would be two more surfaces to keep
 *   in step for no reader who cannot use the tools.
 */

/** The protocol version this server speaks. */
const PROTOCOL_VERSION = "2025-06-18";

/** Older versions we also answer, so a client pinned to one still connects. */
const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26"];

const INSTRUCTIONS = [
  "Start with `about` if you need to state this index's limits — it says when the licence and cost data was last verified and what the index does not know.",
  "",
  "Use `search_tools` to find candidates and `get_tool` for one in full. `compare_tools` is for \"X or Y\", and it reports whether two tools are substitutes or merely adjacent — check that before treating them as a swap.",
  "",
  "Every tool carries a `skipWhen`. Do not recommend a tool without reading it: the skip line is usually what makes the answer correct.",
  "",
  "Cite the canonical `url` on whichever entry you used.",
].join("\n");

/** Not prerendered — this reads a request body. */
export const dynamic = "force-dynamic";

/**
 * No `runtime` export on purpose.
 *
 * The first version of this route declared `runtime = "edge"`. It was the only
 * route in the app that did — every working dynamic route (`/llms.txt`,
 * `/feed.xml`, `/llms-full.txt`, `/tools.json`) omits it — and `/mcp` returned
 * 500 in production while all of them returned 200:
 *
 *     TypeError: Cannot read properties of undefined (reading 'default')
 *       at interopDefault → loadComponentsImpl → findPageComponentsImpl
 *
 * A route handler that answers queries with plain Web APIs has nothing to gain
 * from a different runtime, and the shared app chunk it pulls in was not built
 * for it. Matching the other text routes is both the fix and the correct
 * default: `lib/og.tsx` reads font files at module scope, and anything that
 * evaluates that module needs the Node-compatible runtime the rest of the site
 * already uses.
 */

/** JSON-RPC 2.0 error codes, from the spec's reserved range. */
const RPC = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
} as const;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const ok = (id: JsonRpcRequest["id"], result: unknown) =>
  Response.json({ jsonrpc: "2.0", id: id ?? null, result });

const fail = (id: JsonRpcRequest["id"], code: number, message: string) =>
  Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/**
 * Check the arguments against the tool's own JSON Schema.
 *
 * Hand-rolled against the three keywords the manifest actually uses — `required`,
 * `enum`, `minItems`/`maxItems` — rather than pulling in a validator. A full
 * JSON Schema implementation is not needed to catch the two mistakes a client
 * makes: a missing required field, and an enum spelled wrong.
 *
 * Returns `null` when valid, or a message the model can act on. A wrong value is
 * worth telling the client about; a silently-ignored one is not, because the
 * model will believe the filter applied.
 */
function validate(
  tool: (typeof TOOL_MANIFEST)[number],
  args: Record<string, unknown>,
): string | null {
  const schema = tool.inputSchema as {
    required?: string[];
    properties?: Record<string, { enum?: unknown[]; minItems?: number; maxItems?: number }>;
  };

  for (const key of schema.required ?? []) {
    if (args[key] === undefined) return `Missing required argument "${key}".`;
  }

  for (const [key, value] of Object.entries(args)) {
    const prop = schema.properties?.[key];
    if (!prop) continue;
    if (prop.enum && !prop.enum.includes(value)) {
      return `Argument "${key}" must be one of: ${prop.enum.join(", ")}.`;
    }
    if (Array.isArray(value)) {
      if (prop.minItems !== undefined && value.length < prop.minItems) {
        return `Argument "${key}" needs at least ${prop.minItems} item(s).`;
      }
      if (prop.maxItems !== undefined && value.length > prop.maxItems) {
        return `Argument "${key}" accepts at most ${prop.maxItems} item(s).`;
      }
    }
  }

  return null;
}

/** Handle one JSON-RPC message. */
async function handle(message: JsonRpcRequest): Promise<Response> {
  if (message.jsonrpc !== "2.0") {
    return fail(message.id, RPC.invalidRequest, 'Expected "jsonrpc":"2.0".');
  }
  const { id, method } = message;
  // A notification has no id and expects no response. `notifications/initialized`
  // is the only one this server receives, and answering it would be a protocol
  // error — the client would receive a response to a request that must be silent.
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize": {
      const requested = (message.params?.protocolVersion as string) ?? PROTOCOL_VERSION;
      // Echo a version this server understands rather than the server's default,
      // or a client pinned to an older revision negotiates down silently.
      const version = SUPPORTED_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSION;
      return ok(id, {
        protocolVersion: version,
        capabilities: { tools: {} },
        serverInfo: {
          name: "lattice",
          title: site.name,
          version: "0.1.0",
        },
        instructions: INSTRUCTIONS,
      });
    }

    case "notifications/initialized":
    case "initialized":
      // Stateless, so there is nothing to confirm. 202 Accepted, no body.
      return new Response(null, { status: 202 });

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, { tools: TOOL_DESCRIPTIONS });

    case "tools/call": {
      const name = message.params?.name as string | undefined;
      const tool = TOOL_MANIFEST.find((t) => t.name === name);
      if (!tool) {
        return fail(id, RPC.invalidParams, `Unknown tool "${name}".`);
      }

      const args = (message.params?.arguments ?? {}) as Record<string, unknown>;
      const problem = validate(tool, args);
      if (problem) {
        // A tool error, not a protocol error: the request was well-formed, the
        // arguments were not. Returning it as `result` with `isError` lets the
        // model read the message and retry, where an error object just fails the
        // call opaquely.
        return ok(id, {
          content: [{ type: "text", text: problem }],
          isError: true,
        });
      }

      const value = await tool.run(args as never);
      return ok(id, {
        content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
      });
    }

    default:
      // A notification with an unrecognised method still gets no response, or the
      // client waits for one that never comes.
      if (isNotification) return new Response(null, { status: 202 });
      return fail(id, RPC.methodNotFound, `Unknown method "${method}".`);
  }
}

/**
 * GET. A stateless Streamable HTTP server has no stream to open.
 *
 * `405` rather than `404` because the route exists — an agent that arrives by
 * browsing gets told what it is and where to POST, which is the difference
 * between a dead end and a protocol error.
 */
export async function GET() {
  return Response.json(
    {
      error: "MCP over Streamable HTTP uses POST for JSON-RPC requests.",
      endpoint: `${site.url}/mcp`,
      discovery: `${site.url}/mcp.json`,
      hint: "Point an MCP client at this URL using the Streamable HTTP transport.",
    },
    { status: 405, headers: { Allow: "POST, DELETE" } },
  );
}

export async function POST(request: Request) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return fail(null, RPC.parseError, "Body is not valid JSON.");
  }

  // Batched requests are part of the spec. Answered in one response rather than
  // rejected, because a client that batches a notifications/initialized with a
  // tools/list would otherwise get nothing.
  const batch = Array.isArray(parsed);
  const messages = (batch ? parsed : [parsed]) as JsonRpcRequest[];

  const responses: Response[] = [];
  for (const message of messages) {
    if (typeof message !== "object" || message === null) {
      responses.push(fail(null, RPC.invalidRequest, "Not a JSON-RPC object."));
      continue;
    }
    responses.push(await handle(message));
  }

  // A batch of nothing but notifications gets 202, per the spec.
  const bodies = responses
    .map((r) => (r.status === 202 ? null : r))
    .filter((r): r is Response => r !== null);
  if (bodies.length === 0) return new Response(null, { status: 202 });

  const payloads = await Promise.all(bodies.map((r) => r.json()));
  return Response.json(batch ? payloads : payloads[0], {
    headers: { "Cache-Control": "no-store" },
  });
}

/** Session teardown. There are none, so this is a no-op that must still succeed. */
export async function DELETE() {
  return new Response(null, { status: 204 });
}

export async function HEAD() {
  return new Response(null, { status: 200, headers: { Allow: "POST, GET, DELETE" } });
}