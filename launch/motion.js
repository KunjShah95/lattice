/**
 * Motion primitives shared by both cuts of the launch film (index.html is
 * 16:9, vertical.html is 9:16): the site's easing curves, a spring, and the
 * lattice mark assembling cell by cell.
 */
/* ---------- easing ---------- */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (sx(t) - x) / d; }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
const easeOut = bezier(0.22, 1, 0.36, 1);      // the site's --ease-out
const easeInOut = bezier(0.65, 0, 0.35, 1);
const easeIn = bezier(0.55, 0, 1, 0.45);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, p) => a + (b - a) * p;
/** progress of t through [a, b], eased */
const prog = (t, a, b, ease = easeOut) => ease(clamp((t - a) / (b - a)));
/** damped spring 0 -> 1 with a little overshoot, like --ease-spring */
const spring = (t, a, dur = 0.9) => {
  const x = clamp((t - a) / dur);
  if (x <= 0) return 0;
  return 1 - Math.exp(-6.5 * x) * Math.cos(9.5 * x);
};
function pose(el, { x = 0, y = 0, s = 1, r = 0, o = 1, blur = 0 } = {}) {
  el.style.transform = `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`;
  el.style.opacity = o;
  el.style.filter = blur > 0.05 ? `blur(${blur}px)` : "";
}

/* ---------- mark ---------- */
const CELLS = [[0,0,"ink"],[1,0,"dot"],[2,0,"dot"],[0,1,"ink"],[1,1,"dot"],[2,1,"dot"],[0,2,"joint"],[1,2,"ink"],[2,2,"ink"]];
const STEP = 84, CELL = 64;
/** Builds the 3x3 mark inside `markEl`; returns its pose function. */
function createMark(markEl) {
  const cellEls = CELLS.map(([c, r, k]) => {
    const d = document.createElement("div");
    d.className = "cell" + (k === "joint" ? " joint" : k === "dot" ? " dot" : "");
    markEl.appendChild(d);
    return { el: d, c, r, k };
  });
  return function poseMark(t, { cx, cy, scale, appear, leave = 99 }) {
    // Assemble: cells drop in on a spring, staggered along the stroke of the L.
    const order = { "0,0": 0, "0,1": 1, "0,2": 2, "1,2": 3, "2,2": 4 };
    cellEls.forEach(({ el, c, r, k }, i) => {
      const size = k === "dot" ? 10 : CELL;
      const baseX = (c - 1) * STEP - size / 2, baseY = (r - 1) * STEP - size / 2;
      const idx = k === "dot" ? 5 + (i % 4) * 0.4 : order[`${c},${r}`];
      const sp = spring(t, appear + idx * 0.09, 0.95);
      const lv = prog(t, leave, leave + 0.5, easeIn);
      const x = cx + baseX * scale, y = cy + baseY * scale;
      el.style.width = el.style.height = size * scale + "px";
      el.style.borderRadius = (k === "dot" ? 50 : 8 * scale) + (k === "dot" ? "%" : "px");
      el.style.transformOrigin = "50% 100%";
      pose(el, { x, y: y - (1 - sp) * 60 - lv * 30, s: k === "dot" ? clamp(sp) : Math.max(0, sp), o: clamp(sp * 1.4) * (1 - lv) * (k === "dot" ? 0.6 : 1) });
    });
  }
}
