import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";

import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { Field, Select } from "@/components/ui/field";
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

const COL_WIDTH = 196;
const NODE_WIDTH = 150;
const NODE_HEIGHT = 30;
const ROW_HEIGHT = 40;
const TOP = 44;

interface Positioned extends GraphNode {
  x: number;
  y: number;
  column: number;
}

/** Nodes that explain one gap: the gap, its obligation and clause, controls, evidence and remediation. */
function focusSet(graph: KnowledgeGraph, focus: string): Set<string> {
  const set = new Set<string>([focus]);
  for (const edge of graph.edges) {
    if (edge.source === focus) set.add(edge.target);
  }
  for (const edge of graph.edges) {
    if (set.has(edge.source) && (edge.type === "DERIVED_FROM" || edge.type === "COVERED_BY")) {
      set.add(edge.target);
    }
  }
  for (const edge of graph.edges) {
    if (edge.type === "SUPPORTED_BY" && set.has(edge.source) && set.has(edge.target))
      set.add(edge.target);
  }
  return set;
}

function layout(graph: KnowledgeGraph): Positioned[] {
  const obligationOrder = new Map(
    graph.nodes.filter((node) => node.type === "obligation").map((node, index) => [node.id, index]),
  );
  // Each node is sorted by the first obligation it connects to, which keeps edges short.
  const anchor = (node: GraphNode): number => {
    if (node.type === "obligation") return obligationOrder.get(node.id) ?? 0;
    if (node.type === "clause") return obligationOrder.get(node.id.replace("clause:", "")) ?? 0;
    const linked = graph.edges
      .filter((edge) => edge.source === node.id || edge.target === node.id)
      .map((edge) => (edge.source === node.id ? edge.target : edge.source));
    const scores = linked
      .map((id) => obligationOrder.get(id))
      .filter((value): value is number => value !== undefined);
    if (scores.length > 0) return Math.min(...scores);
    const viaGap = linked.map(
      (id) => graph.edges.find((edge) => edge.source === id && edge.type === "ON")?.target,
    );
    const fallback = viaGap
      .map((id) => (id ? obligationOrder.get(id) : undefined))
      .filter((value): value is number => value !== undefined);
    return fallback.length > 0 ? Math.min(...fallback) : 99;
  };
  return COLUMNS.flatMap((column, columnIndex) =>
    graph.nodes
      .filter((node) => node.type === column.type)
      .sort((a, b) => anchor(a) - anchor(b))
      .map((node, rowIndex) => ({
        ...node,
        column: columnIndex,
        x: columnIndex * COL_WIDTH + 12,
        y: TOP + rowIndex * ROW_HEIGHT,
      })),
  );
}

export function GraphPage() {
  const graph = useKnowledgeGraph();
  const [params, setParams] = useSearchParams();
  const focus = params.get("focus") ?? "g-07";

  return (
    <PageFrame
      eyebrow="Knowledge graph · rebuilt from Postgres after each run"
      title="Graph"
      subtitle="Clauses, obligations, controls, evidence, gaps and remediation as one connected record. The selected gap's path is highlighted."
    >
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
  focus,
  onFocus,
}: {
  graph: KnowledgeGraph;
  focus: string;
  onFocus: (id: string) => void;
}) {
  const nodes = useMemo(() => layout(graph), [graph]);
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const highlighted = useMemo(() => focusSet(graph, focus), [graph, focus]);
  const gaps = graph.nodes.filter((node) => node.type === "gap");
  const height = Math.max(...nodes.map((node) => node.y)) + ROW_HEIGHT + 8;
  const width = COLUMNS.length * COL_WIDTH;
  const pathNodes = nodes.filter((node) => highlighted.has(node.id));

  return (
    <div className="graph-layout">
      <Sheet className="graph-canvas">
        <div className="graph-toolbar">
          <Field label="Focus gap">
            {(props) => (
              <Select
                {...props}
                value={focus}
                onChange={(event) => {
                  onFocus(event.target.value);
                }}
              >
                {gaps.map((gap) => (
                  <option key={gap.id} value={gap.id}>
                    {gap.label} · {gap.detail}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="graph-legend" aria-label="Legend">
            {COLUMNS.map((column) => (
              <span key={column.type}>
                <i className={`node-swatch ${column.type}`} aria-hidden="true" />
                {column.label}
              </span>
            ))}
          </div>
        </div>
        <div className="graph-scroll">
          <svg
            width={width}
            height={height}
            role="img"
            aria-label="Knowledge graph. The highlighted path is listed beside the graph."
          >
            {COLUMNS.map((column, index) => (
              <text key={column.type} x={index * COL_WIDTH + 12} y={20} className="graph-col-label">
                {column.label.toUpperCase()}
              </text>
            ))}
            {graph.edges.map((edge, index) => {
              const a = byId.get(edge.source);
              const b = byId.get(edge.target);
              if (!a || !b) return null;
              const [left, right] = a.x <= b.x ? [a, b] : [b, a];
              const x1 = left.x + NODE_WIDTH;
              const y1 = left.y + NODE_HEIGHT / 2;
              const x2 = right.x;
              const y2 = right.y + NODE_HEIGHT / 2;
              const mid = (x1 + x2) / 2;
              const active = highlighted.has(edge.source) && highlighted.has(edge.target);
              return (
                <path
                  key={`${edge.source}-${edge.target}-${String(index)}`}
                  d={`M${String(x1)},${String(y1)} C${String(mid)},${String(y1)} ${String(mid)},${String(y2)} ${String(x2)},${String(y2)}`}
                  className={cn("graph-edge", active && "active")}
                >
                  <title>{edge.type}</title>
                </path>
              );
            })}
            {nodes.map((node) => {
              const active = highlighted.has(node.id);
              const clickable = node.type === "gap";
              return (
                <g
                  key={node.id}
                  transform={`translate(${String(node.x)},${String(node.y)})`}
                  className={cn(
                    "graph-node",
                    node.type,
                    active ? "active" : "faded",
                    clickable && "clickable",
                  )}
                  onClick={
                    clickable
                      ? () => {
                          onFocus(node.id);
                        }
                      : undefined
                  }
                >
                  <title>{`${node.label}: ${node.detail}`}</title>
                  {active && node.id === focus ? (
                    <rect
                      className="halo"
                      x={-4}
                      y={-4}
                      width={NODE_WIDTH + 8}
                      height={NODE_HEIGHT + 8}
                      rx={6}
                    />
                  ) : null}
                  <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx={4} className="node-body" />
                  <rect width={3} height={NODE_HEIGHT} className="node-bar" />
                  <text x={10} y={19} className="node-label">
                    {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </Sheet>
      <Sheet className="graph-path-panel" aria-label="Highlighted path as text">
        <span className="eyebrow">Path for {byId.get(focus)?.label ?? focus}</span>
        <ol>
          {COLUMNS.map((column) => {
            const items = pathNodes.filter((node) => node.type === column.type);
            if (items.length === 0) return null;
            return (
              <li key={column.type}>
                <span className={`node-swatch ${column.type}`} aria-hidden="true" />
                <div>
                  <strong>{column.label}</strong>
                  {items.map((item) => (
                    <p key={item.id}>
                      <span className="mono">{item.label}</span> {item.detail}
                    </p>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
        <Link className="button primary full" to={`/gaps/${focus}`}>
          Open gap trace
        </Link>
      </Sheet>
    </div>
  );
}
