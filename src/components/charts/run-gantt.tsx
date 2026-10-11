import { formatDuration } from "@/lib/format";
import { NODE_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { RunNode } from "@/types/domain";

/** One row per agent node, bars placed on a shared time axis. Queued nodes are labelled. */
export function RunGantt({ nodes, label }: { nodes: readonly RunNode[]; label: string }) {
  const span = Math.max(1, ...nodes.map((node) => node.offset_ms + node.duration_ms));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((share) => formatDuration(span * share));
  const pct = (ms: number) => `${String((ms / span) * 100)}%`;
  return (
    <figure className="run-gantt" aria-label={label}>
      <ol className="gantt">
        {nodes.map((node) => (
          <li key={node.node} className={node.status}>
            <span className="gantt-label">{node.node}</span>
            <span className="gantt-track">
              {node.status === "queued" ? (
                <span className="gantt-queued" style={{ left: pct(node.offset_ms) }}>
                  queued
                </span>
              ) : (
                <span
                  className={cn("gantt-bar", node.status)}
                  style={{ left: pct(node.offset_ms), width: pct(node.duration_ms) }}
                  title={`${node.node} · ${formatDuration(node.duration_ms)} · ${NODE_STATUS[node.status].label.toLowerCase()}`}
                />
              )}
            </span>
          </li>
        ))}
      </ol>
      <div className="gantt-axis-row" aria-hidden="true">
        <span />
        <span className="gantt-axis">
          {ticks.map((tick, index) => (
            <span key={String(index)}>{tick}</span>
          ))}
        </span>
      </div>
    </figure>
  );
}
