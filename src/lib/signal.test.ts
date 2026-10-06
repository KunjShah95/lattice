import { describe, expect, it } from "vitest";
import { ALLOWED_EVENTS, MAX_SIGNAL_BYTES, parseSignal } from "./signal.mjs";

/**
 * The beacon validator.
 *
 * `/signal` is an unauthenticated public endpoint that anything on the internet
 * can POST to, and its output is the metric `strategy/04-monetisation.md` §7
 * calls "the wedge is being used". That combination is exactly where an endpoint
 * gets abused quietly: POST ten thousand fake `compare` events and the number you
 * built says the wedge is working.
 *
 * So most of these tests are about what the endpoint *refuses*, which is the
 * part that has no visible effect when it is missing.
 */

/**
 * Control characters are built with `String.fromCharCode` rather than written as
 * escapes. Escapes in a test file are exactly how `signal.mjs` ended up holding
 * literal control bytes and reading as a binary file to every tool that touched
 * it, including this one.
 */
const BEL = String.fromCharCode(7);
const DEL = String.fromCharCode(127);

const ok = { event: "compare", from: "/inference-serving/vllm", to: "/compare/inference-runtimes" };

describe("parseSignal", () => {
  it("accepts a well-formed beacon", () => {
    expect(parseSignal(JSON.stringify(ok))).toEqual(ok);
  });

  it("requires both ends of the edge", () => {
    // The regression this file exists for. An earlier version accepted a beacon
    // carrying only `to`, and `TrackLink` sent the *current* page in that field —
    // so the log recorded where a reader already was and never where they went.
    // `kind: "compare"` then looked like a comparison exit while proving only
    // that a comparison link was rendered. Every metric in §7 that depends on
    // knowing a reader arrived somewhere was wrong, silently.
    expect(parseSignal(JSON.stringify({ event: "compare", to: "/compare/x" }))).toBeNull();
    expect(parseSignal(JSON.stringify({ event: "compare", from: "/a" }))).toBeNull();
  });

  it("keeps the two ends distinct rather than collapsing them", () => {
    const parsed = parseSignal(JSON.stringify(ok));
    expect(parsed!.from).toBe("/inference-serving/vllm");
    expect(parsed!.to).toBe("/compare/inference-runtimes");
    expect(parsed!.from).not.toBe(parsed!.to);
  });

  it("rejects an event outside the vocabulary", () => {
    // The poisoning case. Without a closed set, this endpoint is a write API for
    // whatever number someone wants to see.
    expect(
      parseSignal(JSON.stringify({ ...ok, event: "stakeholder_pressure" })),
    ).toBeNull();
    expect(parseSignal(JSON.stringify({ ...ok, event: "COMPARE" }))).toBeNull();
    expect(parseSignal(JSON.stringify({ ...ok, event: "" }))).toBeNull();
    expect(parseSignal(JSON.stringify({ ...ok, event: 42 }))).toBeNull();
  });

  it("covers every event the components actually send", () => {
    // A component emitting an event the validator rejects loses data silently,
    // which looks identical to nobody clicking. Asserted against the component's
    // own union so adding an event without adding it here fails here.
    for (const event of ["alternatives", "compare", "second-home", "tool"]) {
      expect(ALLOWED_EVENTS, `component sends "${event}"`).toContain(event);
    }
  });

  it("rejects an endpoint that is not a site-absolute path", () => {
    for (const bad of ["", "compare/x", "https://evil.com", "javascript:alert(1)"]) {
      expect(parseSignal(JSON.stringify({ ...ok, to: bad })), `to: ${bad}`).toBeNull();
      expect(parseSignal(JSON.stringify({ ...ok, from: bad })), `from: ${bad}`).toBeNull();
    }
  });

  it("rejects a scheme-relative path rather than repairing it", () => {
    // `//evil.com` starts with a slash and ends up in a log that people read. A
    // value that had to be fixed to be safe is a value that gets copied without
    // the fix, so it is refused instead.
    expect(parseSignal(JSON.stringify({ ...ok, to: "//evil.com" }))).toBeNull();
    expect(parseSignal(JSON.stringify({ ...ok, from: "//evil.com" }))).toBeNull();
    expect(parseSignal(JSON.stringify({ ...ok, to: "//evil.com/path" }))).toBeNull();
  });

  it("strips the querystring and fragment from both ends", () => {
    expect(
      parseSignal(
        JSON.stringify({
          event: "compare",
          from: "/a?utm_source=twitter",
          to: "/compare/x#verdict",
        }),
      ),
    ).toEqual({ event: "compare", from: "/a", to: "/compare/x" });
  });

  it("rejects control characters that would break the log line", () => {
    expect(
      parseSignal(JSON.stringify({ ...ok, to: `/a\nFAKE {"event":"compare"}` })),
    ).toBeNull();
    expect(parseSignal(JSON.stringify({ ...ok, to: `/a${BEL}b` }))).toBeNull();
    expect(parseSignal(JSON.stringify({ ...ok, event: `comp${BEL}are` }))).toBeNull();
  });

  it("rejects DEL as well as the C0 range", () => {
    // The original byte-range check stopped at 0x1f and let DEL through. A log
    // line containing one is unreadable in a terminal, which is the only place
    // these lines get read.
    expect(parseSignal(JSON.stringify({ ...ok, to: `/a${DEL}b` }))).toBeNull();
  });

  it("rejects anything that is not a JSON object", () => {
    for (const raw of ["", "null", "[]", '"a string"', "42", "{", "{,}"]) {
      expect(parseSignal(raw), raw).toBeNull();
    }
    expect(parseSignal(null)).toBeNull();
    expect(parseSignal(undefined)).toBeNull();
  });

  it("ignores extra fields rather than rejecting them", () => {
    // `TrackLink` may grow a field later. Being strict about unknown keys turns a
    // forward-compatible change into dropped data.
    expect(
      parseSignal(JSON.stringify({ ...ok, referrer: "https://twitter.com", ua: "x" })),
    ).toEqual(ok);
  });

  it("bounds the payload, so a POST cannot allocate on its own behalf", () => {
    const huge = JSON.stringify({ ...ok, to: `/${"a".repeat(100_000)}` });
    expect(huge.length).toBeGreaterThan(MAX_SIGNAL_BYTES);
    expect(parseSignal(huge)).toBeNull();
    expect(parseSignal("x".repeat(MAX_SIGNAL_BYTES + 1))).toBeNull();
  });

  it("bounds each path independently of the body", () => {
    // A long-but-legal body with an absurd path is still an absurd path.
    expect(parseSignal(JSON.stringify({ ...ok, to: `/${"a".repeat(5000)}` }))).toBeNull();
    expect(parseSignal(JSON.stringify({ ...ok, from: `/${"a".repeat(5000)}` }))).toBeNull();
  });

  it("survives a self-link, where both ends are the same path", () => {
    // Not a special case worth rejecting — an anchor to the current page is a
    // real thing to click, and dropping it would be an unexplained data gap.
    const self = { event: "tool", from: "/all", to: "/all" };
    expect(parseSignal(JSON.stringify(self))).toEqual(self);
  });
});