import { describe, expect, it } from "vitest";
import { CHANNELS, classifyArrival } from "./channel.mjs";
import { SOURCE_PARAM, withSource, xIntentUrl } from "./share.mjs";
import { decodeStackInput } from "./stack-url";

const OWN = "lattice.kunjshah.in";

describe("withSource", () => {
  it("tags a path and an absolute URL, returning the same kind", () => {
    expect(withSource("/blog/evals-are-the-asset", "social")).toBe("/blog/evals-are-the-asset?src=social");
    expect(withSource(`https://${OWN}/start`, "social")).toBe(`https://${OWN}/start?src=social`);
  });

  it("keeps a built stack intact, which is nothing but query", () => {
    const stack = "/stack-builder?workload=rag&q=200000&docs=1000000&latency=fast";
    const tagged = withSource(stack, "social");
    expect(tagged).toBe(`${stack}&src=social`);
    // The builder ignores the tag: the shared link still opens the same case.
    expect(decodeStackInput(tagged.slice(tagged.indexOf("?")))).toEqual(
      decodeStackInput(stack.slice(stack.indexOf("?"))),
    );
  });

  it("replaces an existing tag instead of stacking a second one", () => {
    expect(withSource("/start?src=ai&x=1", "social")).toBe("/start?x=1&src=social");
  });

  it("keeps the fragment", () => {
    expect(withSource("/start#layer-3", "social")).toBe("/start?src=social#layer-3");
  });

  it("produces a link the classifier reads as that channel, with no referrer", () => {
    // The in-app browser case: the header is stripped and the tag is all there is.
    for (const channel of CHANNELS) {
      const tagged = withSource("/stack-builder?workload=agent&q=1", channel);
      expect(classifyArrival("", tagged.slice(tagged.indexOf("?")), OWN), channel).toBe(channel);
    }
  });

  it("refuses a channel outside the closed set", () => {
    // @ts-expect-error: the point of the test
    expect(() => withSource("/start", "twitter")).toThrow(/Unknown channel/);
  });

  it("refuses something that is not a URL or a path", () => {
    expect(() => withSource("start", "social")).toThrow();
    expect(() => withSource("", "social")).toThrow();
  });

  it("writes the parameter the classifier reads", () => {
    expect(SOURCE_PARAM).toBe("src");
  });
});

describe("xIntentUrl", () => {
  it("passes the text and the URL as separate, encoded parameters", () => {
    const url = `https://${OWN}/stack-builder?workload=rag&q=200000&src=social`;
    const intent = new URL(xIntentUrl("My stack:\n01 vLLM & friends", url));
    expect(intent.origin + intent.pathname).toBe("https://x.com/intent/tweet");
    expect(intent.searchParams.get("text")).toBe("My stack:\n01 vLLM & friends");
    // Round-trips whole: an unencoded `&` would cut the stack off at `workload`.
    expect(intent.searchParams.get("url")).toBe(url);
  });
});
