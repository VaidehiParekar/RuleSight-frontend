import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { Sheet } from "@/components/ui/sheet";
import { useKnowledgeGraph } from "@/hooks/use-rulesight";
import { cn } from "@/lib/utils";
import type { GraphNode, KnowledgeGraph } from "@/types/domain";

const COLUMNS: { type: GraphNode["type"]; label: string }[] = [
  { type: "clause", label: "Clause" },
  { type: "obligation", label: "Obligation" },
  { type: "control", label: "Control" },
  { type: "evidence", label: "Evidence" },
  { type: "gap", label: "Gap" },
  { type: "remediation", label: "Remediation" },
];

const COL_WIDTH = 184;
const NODE_WIDTH = 150;
const NODE_HEIGHT = 38;
const ROW_HEIGHT = 60;
const TOP = 30;
const STAGE_WIDTH = (COLUMNS.length - 1) * COL_WIDTH + NODE_WIDTH;

interface Positioned extends GraphNode {
  x: number;
  y: number;
  column: number;
}

/** Edges pointing left to right, whatever direction the API stores them in. */
function orient(graph: KnowledgeGraph, byId: Map<string, Positioned>): [string, string, string][] {
  return graph.edges.flatMap((edge): [string, string, string][] => {
    const a = byId.get(edge.source);
    const b = byId.get(edge.target);
    if (!a || !b || a.column === b.column) return [];
    return a.column < b.column ? [[a.id, b.id, edge.type]] : [[b.id, a.id, edge.type]];
  });
}

/** Everything upstream and downstream of `focus` along left-to-right edges. */
function reach(edges: [string, string, string][], focus: string) {
  const up = new Set([focus]);
  const down = new Set([focus]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of edges) {
      if (up.has(b) && !up.has(a)) {
        up.add(a);
        changed = true;
      }
      if (down.has(a) && !down.has(b)) {
        down.add(b);
        changed = true;
      }
    }
  }
  return { up, down, all: new Set([...up, ...down]) };
}

/** Keeps only nodes on some gap's chain, and orders rows by obligation so edges stay short. */
function layout(graph: KnowledgeGraph): Positioned[] {
  const gapIds = graph.nodes.filter((node) => node.type === "gap").map((node) => node.id);
  const relevant = new Set(gapIds);
  for (const edge of graph.edges) {
    if (relevant.has(edge.source)) relevant.add(edge.target);
  }
  for (const edge of graph.edges) {
    if (relevant.has(edge.source) && edge.type === "DERIVED_FROM") relevant.add(edge.target);
  }
  const obligationOrder = new Map(
    graph.nodes.filter((node) => node.type === "obligation").map((node, index) => [node.id, index]),
  );
  const anchor = (node: GraphNode): number => {
    if (node.type === "obligation") return obligationOrder.get(node.id) ?? 0;
    if (node.type === "clause") return obligationOrder.get(node.id.replace("clause:", "")) ?? 0;
    const linked = graph.edges
      .filter((edge) => edge.source === node.id || edge.target === node.id)
      .map((edge) => (edge.source === node.id ? edge.target : edge.source));
    const direct = linked
      .map((id) => obligationOrder.get(id))
      .filter((value): value is number => value !== undefined);
    if (direct.length) return Math.min(...direct);
    const viaGap = linked
      .map((id) => graph.edges.find((edge) => edge.source === id && edge.type === "ON")?.target)
      .map((id) => (id ? obligationOrder.get(id) : undefined))
      .filter((value): value is number => value !== undefined);
    return viaGap.length ? Math.min(...viaGap) : 99;
  };
  return COLUMNS.flatMap((column, columnIndex) =>
    graph.nodes
      .filter((node) => node.type === column.type && relevant.has(node.id))
      .sort((a, b) => anchor(a) - anchor(b))
      .map((node, rowIndex) => ({
        ...node,
        column: columnIndex,
        x: columnIndex * COL_WIDTH,
        y: TOP + rowIndex * ROW_HEIGHT,
      })),
  );
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(STAGE_WIDTH);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    setWidth(element.clientWidth || STAGE_WIDTH);
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, width] as const;
}

export function GraphPage() {
  const graph = useKnowledgeGraph();
  const [params, setParams] = useSearchParams();
  const focus = params.get("focus") ?? "g-07";

  return (
    <PageFrame
      title="Knowledge graph"
      subtitle="Each column is one step of the chain. Select any node to trace everything it connects to."
    >
      <div className="graph-legend" aria-label="Legend">
        {COLUMNS.map((column) => (
          <span key={column.type}>
            <i className={`node-swatch kind-${column.type}`} aria-hidden="true" />
            {column.label}
          </span>
        ))}
      </div>
      <QueryView query={graph} what="the knowledge graph" rows={8}>
        {(data) => (
          <GraphView
            graph={data}
            focus={focus}
            onFocus={(id) => {
              setParams({ focus: id }, { replace: true });
            }}
          />
        )}
      </QueryView>
    </PageFrame>
  );
}

function GraphView({
  graph,
  focus: requested,
  onFocus,
}: {
  graph: KnowledgeGraph;
  focus: string;
  onFocus: (id: string) => void;
}) {
  const nodes = useMemo(() => layout(graph), [graph]);
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const edges = useMemo(() => orient(graph, byId), [graph, byId]);
  const focus = byId.has(requested)
    ? requested
    : (nodes.find((node) => node.type === "gap")?.id ?? "");
  const { up, down, all } = useMemo(() => reach(edges, focus), [edges, focus]);
  const [canvasRef, canvasWidth] = useWidth<HTMLDivElement>();

  const scale = Math.max(0.45, Math.min(1, canvasWidth / STAGE_WIDTH));
  const height = Math.max(...nodes.map((node) => node.y), TOP) + NODE_HEIGHT + 8;
  const focusNode = byId.get(focus);
  const path = nodes
    .filter((node) => all.has(node.id))
    .sort((a, b) => a.column - b.column || a.y - b.y);

  return (
    <div className="graph-layout">
      <Sheet className="graph-canvas">
        <div className="graph-scroll" ref={canvasRef}>
          <div
            className="graph-stage"
            style={{ width: STAGE_WIDTH * scale, height: height * scale }}
          >
            <div
              className="graph-inner"
              style={{ width: STAGE_WIDTH, height, transform: `scale(${String(scale)})` }}
            >
              {COLUMNS.map((column, index) => (
                <span
                  key={column.type}
                  className="graph-col-label"
                  style={{ left: index * COL_WIDTH }}
                >
                  {column.label}
                </span>
              ))}
              <svg className="graph-edges" width={STAGE_WIDTH} height={height} aria-hidden="true">
                {edges.map(([a, b, type], index) => {
                  const from = byId.get(a);
                  const to = byId.get(b);
                  if (!from || !to) return null;
                  const x1 = from.x + NODE_WIDTH;
                  const y1 = from.y + NODE_HEIGHT / 2;
                  const x2 = to.x;
                  const y2 = to.y + NODE_HEIGHT / 2;
                  const active = (up.has(a) && up.has(b)) || (down.has(a) && down.has(b));
                  return (
                    <path
                      key={`${a}-${b}-${String(index)}`}
                      className={cn("graph-edge", active && "active")}
                      d={`M${String(x1)} ${String(y1)} C${String(x1 + 30)} ${String(y1)} ${String(x2 - 30)} ${String(y2)} ${String(x2)} ${String(y2)}`}
                    >
                      <title>{`${from.label} ${type} ${to.label}`}</title>
                    </path>
                  );
                })}
              </svg>
              {nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className={cn(
                    "graph-node",
                    `kind-${node.type}`,
                    !all.has(node.id) && "faded",
                    node.id === focus && "focused",
                  )}
                  style={{ left: node.x, top: node.y }}
                  aria-pressed={node.id === focus}
                  title={`${COLUMNS[node.column]?.label ?? ""} ${node.label} · ${node.detail}`}
                  onClick={() => {
                    onFocus(node.id);
                  }}
                >
                  <b>{node.label}</b>
                  <span>{node.detail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Sheet>
      <Sheet className="graph-path-panel" aria-label="Highlighted path as text">
        <header>
          <span className="eyebrow">Path</span>
          <span className="mono">{focusNode?.label ?? ""}</span>
        </header>
        <ol className="path-list">
          {path.map((node) => (
            <li key={node.id} className={`kind-${node.type}`}>
              <span className="eyebrow">{COLUMNS[node.column]?.label}</span>
              <span>
                <span className="mono">{node.label}</span> · {node.detail}
              </span>
            </li>
          ))}
        </ol>
        {focusNode?.type === "gap" ? (
          <Link className="button primary small" to={`/gaps/${focus}`}>
            Open gap trace
          </Link>
        ) : null}
        <p className="page-note">
          This list is the text version of the highlighted path. Layout is fixed by column, so it
          reads the same on every run.
        </p>
      </Sheet>
    </div>
  );
}
