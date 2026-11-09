import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALLOWED_EVENTS, parseSignal } from "./signal.mjs";
import { CLIENT_EVENTS, captureLanding, sendSignal } from "./beacon";

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

describe("event vocabulary", () => {
  it("is the same list on both sides of the wire", () => {
    // A client event the validator rejects is lost silently and reads as
    // nobody converting; a server event no client sends is dead vocabulary.
    expect([...CLIENT_EVENTS].sort()).toEqual([...ALLOWED_EVENTS].sort());
  });
});
