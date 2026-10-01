import { layerStyle } from "@/lib/layer";

/**
 * Declarative flow-diagram renderer.
 *
 * Diagrams are described as data (columns, nodes, edges) and drawn as SVG.
 * Doing it this way rather than hand-authoring paths means the diagrams stay
 * theme-aware, cost nothing to render on the client, and can be added or
 * re-laid-out without touching geometry code.
 *
 * All colours come from CSS custom properties, so a diagram inverts with the
 * page and needs no second asset.
 */

export type DiagramNode = {
  id: string;
  label: string;
  /** Optional second line — a role, a technology, a caveat. */
  sub?: string;
  /** Stack depth, drives the node's identity rule. Null = off-stack/neutral. */
  layer?: number | null;
  col: number;
  row: number;
  /** Width in column units. Defaults to 1. */
  span?: number;
  /** Render as a dashed outline (cross-cutting, or outside the main path). */
  dashed?: boolean;
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** Route below the nodes rather than between them. */
  back?: boolean;
};

export type DiagramSpec = {
  title: string;
  subtitle?: string;
  columns: number;
  nodes: DiagramNode[];
  edges?: DiagramEdge[];
  /** Bulleted takeaways rendered beneath the figure. */
  notes?: string[];
};

const VB_W = 960;
const PAD_X = 18;
const PAD_Y = 18;
const GAP_X = 26;
const GAP_Y = 22;
const NODE_H = 58;
const EDGE_LABEL_GAP = 13;

type Box = { x: number; y: number; w: number; h: number };

function layout(spec: DiagramSpec) {
  const { columns, nodes } = spec;
  const colW =
    (VB_W - PAD_X * 2 - GAP_X * (columns - 1)) / columns;

  const boxes: Record<string, Box> = {};
  let maxRow = 0;

  for (const node of nodes) {
    const w = colW * (node.span ?? 1) + GAP_X * ((node.span ?? 1) - 1);
    boxes[node.id] = {
      x: PAD_X + node.col * (colW + GAP_X),
      y: PAD_Y + node.row * (NODE_H + GAP_Y),
      w,
      h: NODE_H,
    };
    maxRow = Math.max(maxRow, node.row);
  }

  return { colW, boxes, height: PAD_Y * 2 + (maxRow + 1) * NODE_H + maxRow * GAP_Y };
}

export function FlowDiagram({ spec }: { spec: DiagramSpec }) {
  const { boxes, height } = layout(spec);
  const byId = Object.fromEntries(spec.nodes.map((n) => [n.id, n]));

  return (
    <figure className="my-10 not-prose">
      <div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">
        {/* Figure chrome */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted">
            {spec.title}
          </span>
          {spec.subtitle ? (
            <span className="font-mono text-[11px] text-fg-subtle">
              {spec.subtitle}
            </span>
          ) : null}
        </div>

        {/*
          Horizontal scroll below `sm`, not a scaled-down diagram.

          The viewBox is a fixed 960 units wide, so `w-full` alone means a
          375px phone renders the whole figure at 39% scale — 13px labels land
          at roughly 5px, and 10.5px sub-labels at 4px. That is not a diagram
          any more, it is a grey rectangle. Pinning a `min-w` keeps the type at
          its authored size and lets the reader pan, which is the behaviour they
          already expect from a wide figure.

          `overscroll-x-contain` stops a horizontal drag inside the figure from
          hijacking the page scroll once the figure is panned to its end.
        */}
        <div className="overflow-x-auto overscroll-x-contain">
          <svg
            viewBox={`0 0 ${VB_W} ${height}`}
            className="block w-full min-w-[680px]"
            role="img"
            aria-label={`${spec.title}. ${spec.subtitle ?? ""}`}
          >
          <defs>
            <marker
              id="fd-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0 0.5 L7 4 L0 7.5 z" fill="var(--fg-subtle)" />
            </marker>
          </defs>

          {/* Edges first so nodes paint over the line ends. */}
          {spec.edges?.map((edge, i) => {
            const a = boxes[edge.from];
            const b = boxes[edge.to];
            if (!a || !b) return null;

            const sameCol = byId[edge.from].col === byId[edge.to].col;
            const goesBack = b.x < a.x;
            // Does the target sit horizontally under any part of the source?
            const overlaps = b.x < a.x + a.w && a.x < b.x + b.w;
            const goesDown = b.y > a.y;

            let d: string;
            let labelX: number;
            let labelY: number;
            let anchor: "start" | "middle" | "end" = "middle";

            if (sameCol || (overlaps && goesDown)) {
              // Drop straight down — either within a column, or into a
              // directly-below node. Keeps side-effects legible.
              const downward = goesDown;
              const y1 = downward ? a.y + a.h : a.y;
              const y2 = downward ? b.y : b.y + b.h;
              const x = sameCol
                ? a.x + a.w / 2
                : Math.min(Math.max(a.x + a.w / 2, b.x + 16), b.x + b.w - 16);
              const midY = (y1 + y2) / 2;
              d = `M ${x} ${y1} C ${x} ${midY}, ${x} ${midY}, ${x} ${y2}`;
              labelX = x + 8;
              labelY = midY;
              anchor = "start";
            } else if (goesBack) {
              // Return path: sweep under both nodes.
              const y1 = a.y + a.h;
              const y2 = b.y + b.h;
              const dip = Math.max(y1, y2) + 30;
              d = `M ${a.x + a.w} ${y1} C ${a.x + a.w} ${dip}, ${b.x + b.w} ${dip}, ${b.x + b.w} ${y2}`;
              labelX = (a.x + a.w + b.x + b.w) / 2;
              labelY = dip - 6;
            } else {
              const x1 = a.x + a.w;
              const x2 = b.x;
              const y1 = a.y + a.h / 2;
              const y2 = b.y + b.h / 2;
              const midX = (x1 + x2) / 2;
              d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
              labelX = midX;
              labelY = y1 - EDGE_LABEL_GAP;
            }

            return (
              <g key={`${edge.from}-${edge.to}-${i}`}>
                <path
                  d={d}
                  fill="none"
                  stroke="var(--fg-subtle)"
                  strokeWidth="1.25"
                  strokeDasharray={edge.dashed ? "4 3" : undefined}
                  markerEnd="url(#fd-arrow)"
                />
                {edge.label ? (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor={anchor}
                    className="fill-[var(--fg-subtle)] font-mono"
                    style={{ fontSize: 10 }}
                  >
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* Nodes */}
          {spec.nodes.map((node) => {
            const b = boxes[node.id];
            const isLayer = node.layer != null;
            return (
              <g key={node.id}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx="7"
                  fill="var(--bg-sunken)"
                  stroke={node.dashed ? "var(--fg-subtle)" : "var(--border-strong)"}
                  strokeWidth="1"
                  strokeDasharray={node.dashed ? "4 3" : undefined}
                />
                {/* Identity rule in the node's layer colour. */}
                <rect
                  x={b.x}
                  y={b.y + 9}
                  width="3"
                  height={b.h - 18}
                  rx="1.5"
                  opacity={isLayer ? 1 : 0.35}
                  style={layerStyle(node.layer ?? null)}
                />
                <text
                  x={b.x + 13}
                  y={node.sub ? b.y + 26 : b.y + b.h / 2 + 4}
                  className="fill-[var(--fg)]"
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  {node.label}
                </text>
                {node.sub ? (
                  <text
                    x={b.x + 13}
                    y={b.y + 43}
                    className="fill-[var(--fg-muted)]"
                    style={{ fontSize: 10.5 }}
                  >
                    {node.sub}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        </div>
      </div>

      {spec.notes?.length ? (
        <figcaption className="mt-3 space-y-1.5">
          {spec.notes.map((note) => (
            <p
              key={note}
              className="flex gap-2 text-pretty text-[13px] leading-relaxed text-fg-muted"
            >
              <span aria-hidden="true" className="text-fg-subtle">
                —
              </span>
              {note}
            </p>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
