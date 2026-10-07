import { describe, expect, it } from "vitest";
import { placePopup, type Rect } from "./popup-position";

const VIEW = { width: 1000, height: 800 };
const POPUP = { width: 300, height: 120 };
const at = (left: number, top: number, w = 80, h = 28): Rect => ({
  left,
  right: left + w,
  top,
  bottom: top + h,
});

describe("placePopup horizontal", () => {
  it("leaves a popup that fits exactly where it is", () => {
    expect(placePopup(at(100, 100), POPUP, VIEW).dx).toBe(0);
  });

  it("pulls it back from the right edge, keeping the margin", () => {
    const p = placePopup(at(900, 100), POPUP, VIEW, 12);
    // Left edge lands at 1000 - 12 - 300 = 688, so it shifts by 688 - 900.
    expect(p.dx).toBe(-212);
    expect(900 + p.dx + POPUP.width).toBeLessThanOrEqual(VIEW.width - 12);
  });

  it("never pushes it past the left edge", () => {
    expect(placePopup(at(-40, 100), POPUP, VIEW, 12).dx).toBe(52);
  });

  it("prefers the left margin when the popup is wider than the viewport", () => {
    const wide = placePopup(at(50, 100), { width: 1200, height: 100 }, VIEW, 12);
    expect(50 + wide.dx).toBe(12);
  });
});

describe("placePopup vertical", () => {
  it("opens below by default", () => {
    expect(placePopup(at(100, 100), POPUP, VIEW).side).toBe("below");
  });

  it("flips above when below would run off the bottom and above fits", () => {
    expect(placePopup(at(100, 700), POPUP, VIEW).side).toBe("above");
  });

  it("stays below when neither side fits, rather than hiding it above the fold", () => {
    const tall = { width: 300, height: 700 };
    expect(placePopup(at(100, 400), tall, VIEW).side).toBe("below");
  });

  it("counts the bridge gap, so a card that only just fits below is not clipped", () => {
    // trigger.bottom 668 + gap 8 + height 120 = 796, over 800 - 12.
    expect(placePopup(at(100, 640), POPUP, VIEW, 12, 8).side).toBe("above");
    // The same card with no gap would have fit.
    expect(placePopup(at(100, 640), POPUP, VIEW, 12, 0).side).toBe("below");
  });
});
