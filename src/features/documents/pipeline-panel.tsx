import { X } from "lucide-react";
import { Link } from "react-router";

import { QueryView } from "@/components/feedback/query-view";
import { IconButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useRun } from "@/hooks/use-rulesight";
import { formatDuration } from "@/lib/format";
import { NODE_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Live progress of the agent graph, polled until the run finishes. */
export function PipelinePanel({ runId, onClose }: { runId: string; onClose: () => void }) {
  const run = useRun(runId);
  return (
    <Sheet className="pipeline-panel" aria-label="Pipeline progress">
      <QueryView query={run} what="the pipeline run" rows={5}>
        {(data) => {
          const finished = data.nodes.filter(
            (node) => node.status === "done" || node.status === "retried",
          ).length;
          const elapsed = Math.max(
            0,
            ...data.nodes
              .filter((node) => node.status !== "queued")
              .map((node) => node.offset_ms + node.duration_ms),
          );
          const running = data.status === "running";
          return (
            <>
              <div className="pipeline-summary">
                <header>
                  {running ? <span className="pulse-dot" aria-hidden="true" /> : null}
                  <h3>{running ? "Pipeline running" : "Run complete"}</h3>
                  <span className="mono muted">run {data.run_id}</span>
                  <IconButton label="Hide pipeline progress" onClick={onClose}>
                    <X size={16} />
                  </IconButton>
                </header>
                <p>
                  {data.trigger}. Each step is an LLM agent call checked by a critic; nothing is
                  final until a person accepts it.
                </p>
                <div className="progress-track" aria-hidden="true">
                  <i style={{ width: `${String((finished / data.nodes.length) * 100)}%` }} />
                </div>
                <div className="progress-meta">
                  <span>
                    {finished} of {data.nodes.length} steps
                  </span>
                  <span>{formatDuration(elapsed)} elapsed</span>
                </div>
                {data.cache_hits > 0 ? (
                  <p className="progress-meta">
                    {data.cache_hits} responses served from llm_cache, so this rerun is
                    deterministic.
                  </p>
                ) : null}
                <Link className="text-button" to={`/runs/${data.id}`}>
                  Open run details →
                </Link>
              </div>
              <ol className="pipeline-steps">
                {data.nodes.map((node) => (
                  <li
                    key={node.node}
                    className={cn(node.status, node.conditional && "conditional")}
                  >
                    <span className="step-icon" aria-label={NODE_STATUS[node.status].label}>
                      {NODE_STATUS[node.status].icon}
                    </span>
                    <span className="step-name">
                      {node.node}
                      {node.note ? <span className="step-note">{node.note}</span> : null}
                    </span>
                    <span className="num">
                      {node.status === "queued" ? "—" : formatDuration(node.duration_ms)}
                    </span>
                    <span className="num">{node.llm_calls} calls</span>
                  </li>
                ))}
              </ol>
            </>
          );
        }}
      </QueryView>
    </Sheet>
  );
}
