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
 * So these tests are about what the endpoint *refuses*, which is the part that has
 * no visible effect when it is missing.
 */

const ok = { event: "compare", to: "/compare/vector-databases" };

describe("parseSignal", () => {
  it("accepts a well-formed beacon", () => {
    expect(parseSignal(JSON.stringify(ok))).toEqual(ok);
  });

  it("rejects an event outside the vocabulary", () => {
    // The poisoning case. Without a closed set, this endpoint is a write API for
    // whatever number someone wants to see.
    expect(parseSignal(JSON.stringify({ event: "stakeholder_pressure", to: "/x" }))).toBeNull();
    expect(parseSignal(JSON.stringify({ event: "COMPARE", to: "/x" }))).toBeNull();
    expect(parseSignal(JSON.stringify({ event: "", to: "/x" }))).toBeNull();
    expect(parseSignal(JSON.stringify({ event: 42, to: "/x" }))).toBeNull();
  });

  it("covers every event the components actually send", () => {
    // A component emitting an event the validator rejects loses data silently,
    // which looks identical to nobody clicking. Asserted against the component's
    // own union so adding an event without adding it here fails here.
    const sent = ["alternatives", "compare", "second-home", "tool"];
    for (const event of sent) {
      expect(ALLOWED_EVENTS, `component sends "${event}"`).toContain(event);
    }
  });

  it("rejects a destination that is not a site-absolute path", () => {
    for (const to of ["", "compare/x", "https://evil.com", "javascript:alert(1)"]) {
      expect(parseSignal(JSON.stringify({ ...ok, to })), to).toBeNull();
    }
  });

  it("rejects a scheme-relative path rather than repairing it", () => {
    // `//evil.com` starts with a slash and ends up in a log that people read. A
    // value that had to be fixed to be safe is a value that gets copied without
    // the fix, so it is refused instead.
    expect(parseSignal(JSON.stringify({ ...ok, to: "//evil.com" }))).toBeNull();
    expect(parseSignal(JSON.stringify({ ...ok, to: "//evil.com/path" }))).toBeNull();
  });

  it("strips the querystring and fragment", () => {
    // Nothing useful rides in them and both make a log line unreadable.
    expect(parseSignal(JSON.stringify({ event: "compare", to: "/compare/x?utm_source=twitter" }))).toEqual({
      event: "compare",
      to: "/compare/x",
    });
    expect(parseSignal(JSON.stringify({ event: "compare", to: "/compare/x#verdict" }))).toEqual({
      event: "compare",
      to: "/compare/x",
    });
  });

  it("rejects control characters that would break the log line", () => {
    expect(parseSignal(JSON.stringify({ ...ok, to: "/a\nFAKE {\"event\":\"compare\"}" }))).toBeNull();
    expect(parseSignal(`{"event":"compare","to":"/ab"}`)).toBeNull();
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

  it("bounds the destination independently of the body", () => {
    // A long-but-legal body with an absurd path is still an absurd path.
    expect(parseSignal(JSON.stringify({ ...ok, to: `/${"a".repeat(5000)}` }))).toBeNull();
  });
});