import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALLOWED_EVENTS, parseSignal } from "./signal.mjs";
import { CLIENT_EVENTS, MIRRORED_EVENTS, captureLanding, sendSignal } from "./beacon";

/**
 * What reached Vercel's queue, as `[name, properties]`. `window.va` is stubbed
 * the way the library stubs it before its script loads: calls are recorded.
 */
const tracked: { calls: Array<[string, Record<string, unknown>]>; throws: boolean } = { calls: [], throws: false };

function stubVercel() {
  vi.stubGlobal("window", {
    va: (kind: string, payload: { name: string; data: Record<string, unknown> }) => {
      if (tracked.throws) throw new Error("blocked");
      if (kind === "event") tracked.calls.push([payload.name, payload.data]);
    },
  });
}

/**
 * The browser half of `/signal`.
 *
 * What is pinned here is the denominator. A conversion rate is only as honest
 * as its `land` count: one per tab, never one per page, and none at all when
 * the tab cannot remember it already sent one. An inflated denominator makes
 * every channel look worse and hides exactly the gap this exists to find.
 */

type Sent = { url: string; body: Record<string, unknown> };

let sent: Sent[];
let store: Map<string, string>;
let storageThrows: boolean;

function page(path: string, referrer = "", search = "") {
  vi.stubGlobal("location", { pathname: path, search, hostname: "lattice.test", origin: "https://lattice.test" });
  vi.stubGlobal("document", { referrer });
}

beforeEach(() => {
  tracked.calls = [];
  tracked.throws = false;
  stubVercel();
  sent = [];
  store = new Map();
  storageThrows = false;
  vi.stubGlobal("navigator", {
    sendBeacon: (url: string, body: string) => {
      sent.push({ url, body: JSON.parse(body) });
      return true;
    },
  });
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => {
      if (storageThrows) throw new Error("blocked");
      return store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (storageThrows) throw new Error("blocked");
      store.set(k, v);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("captureLanding", () => {
  it("sends one land beacon per tab, with the classified channel", () => {
    page("/compare/agent-frameworks", "", "?utm_source=chatgpt.com");
    captureLanding();
    expect(sent).toEqual([
      {
        url: "/signal",
        body: { event: "land", from: "/compare/agent-frameworks", to: "/compare/agent-frameworks", channel: "ai" },
      },
    ]);

    // The next page in the same tab: an internal hop, already classified.
    page("/review", "https://lattice.test/compare/agent-frameworks");
    captureLanding();
    expect(sent).toHaveLength(1);
  });

  it("sends nothing when storage is blocked, rather than one per page", () => {
    storageThrows = true;
    page("/", "https://www.google.com/");
    captureLanding();
    page("/all", "https://lattice.test/");
    captureLanding();
    expect(sent).toHaveLength(0);
  });

  it("sends nothing for an internal hop in a tab with no landing recorded", () => {
    page("/all", "https://lattice.test/");
    captureLanding();
    expect(sent).toHaveLength(0);
  });

  it("produces a beacon the validator accepts", () => {
    page("/inference-serving/vllm", "https://claude.ai/");
    captureLanding();
    expect(parseSignal(JSON.stringify(sent[0].body))).toMatchObject({ event: "land", channel: "ai" });
  });
});

describe("sendSignal", () => {
  it("attaches the remembered landing channel to a conversion", () => {
    page("/", "https://news.ycombinator.com/");
    captureLanding();
    page("/stack-builder", "https://lattice.test/");
    sendSignal("stack-built", "/stack/rag");
    expect(sent[1].body).toEqual({ event: "stack-built", from: "/stack-builder", to: "/stack/rag", channel: "social" });
    expect(parseSignal(JSON.stringify(sent[1].body))).not.toBeNull();
  });

  it("never throws when sendBeacon is missing", () => {
    vi.stubGlobal("navigator", {});
    page("/");
    expect(() => sendSignal("review", "/review")).not.toThrow();
  });
});

describe("the Vercel mirror", () => {
  it("mirrors the landing once, with the same path and channel as the beacon", () => {
    page("/compare/agent-frameworks", "", "?src=social");
    captureLanding();
    captureLanding();
    expect(tracked.calls).toEqual([["land", { to: "/compare/agent-frameworks", channel: "social" }]]);
  });

  it("mirrors a conversion with the remembered channel", () => {
    page("/", "https://t.co/abc");
    captureLanding();
    sendSignal("hero-stack", "/stack/rag");
    expect(tracked.calls[1]).toEqual(["hero-stack", { to: "/stack/rag", channel: "social" }]);
  });

  it("says 'unknown' rather than omitting the channel", () => {
    // An internal hop in a tab with no landing recorded: a missing property
    // would drop the row out of every by-channel breakdown in the dashboard.
    page("/review", "https://lattice.test/");
    sendSignal("review", "/review");
    expect(tracked.calls).toEqual([["review", { to: "/review", channel: "unknown" }]]);
  });

  it("keeps navigation edges out of the dashboard", () => {
    page("/", "https://www.google.com/");
    for (const event of CLIENT_EVENTS) {
      if (!MIRRORED_EVENTS.includes(event)) sendSignal(event, "/all");
    }
    expect(tracked.calls).toEqual([]);
  });

  it("still mirrors when sendBeacon is missing, and never throws when the queue does", () => {
    vi.stubGlobal("navigator", {});
    page("/stack-builder");
    sendSignal("stack-built", "/stack/agent");
    expect(tracked.calls).toHaveLength(1);
    tracked.throws = true;
    expect(() => sendSignal("stack-built", "/stack/agent")).not.toThrow();
  });

  it("creates Vercel's queue when the landing fires before <Analytics /> mounts", () => {
    // Both sides initialise in effects. With no queue yet, the event used to
    // be dropped: every `land`, the denominator, whenever it won the race.
    const w: { va?: (...p: unknown[]) => void; vaq?: unknown[][] } = {};
    vi.stubGlobal("window", w);
    page("/", "https://www.google.com/");
    captureLanding();
    expect(w.vaq).toEqual([["event", { name: "land", data: { to: "/", channel: "search" } }]]);
    // The stub keeps queueing for whatever is sent before the script loads.
    w.va!("pageview", { path: "/" });
    expect(w.vaq).toHaveLength(2);
  });

  it("never throws with no window at all", () => {
    vi.stubGlobal("window", undefined);
    page("/", "https://www.google.com/");
    expect(() => captureLanding()).not.toThrow();
    expect(sent).toHaveLength(1);
  });

  it("mirrors only events the client can send", () => {
    for (const event of MIRRORED_EVENTS) expect(CLIENT_EVENTS).toContain(event);
  });
});

describe("event vocabulary", () => {
  it("is the same list on both sides of the wire", () => {
    // A client event the validator rejects is lost silently and reads as
    // nobody converting; a server event no client sends is dead vocabulary.
    expect([...CLIENT_EVENTS].sort()).toEqual([...ALLOWED_EVENTS].sort());
  });
});
