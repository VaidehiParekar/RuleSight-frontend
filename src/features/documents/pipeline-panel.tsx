import { Check, CircleDashed, LoaderCircle, RotateCw, X } from "lucide-react";
import { Link } from "react-router";

import { QueryView } from "@/components/feedback/query-view";
import { IconButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useRun } from "@/hooks/use-rulesight";
import { formatDuration } from "@/lib/format";
import { NODE_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { NodeStatus } from "@/types/domain";

const ICON: Record<NodeStatus, typeof Check> = {
  queued: CircleDashed,
  running: LoaderCircle,
  done: Check,
  retried: RotateCw,
  failed: X,
};

/** Live progress of the agent graph, polled until the run finishes. */
export function PipelinePanel({ runId, onClose }: { runId: string; onClose: () => void }) {
  const run = useRun(runId);
  return (
    <Sheet className="pipeline-panel" aria-label="Pipeline progress">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Pipeline run {run.data ? run.data.run_id : ""}</span>
          <h2>{run.data?.status === "done" ? "Run complete" : "Processing documents"}</h2>
        </div>
        <IconButton label="Hide pipeline progress" onClick={onClose}>
          <X size={17} />
        </IconButton>
      </div>
      <QueryView query={run} what="the pipeline run" rows={5}>
        {(data) => (
          <>
            <ol className="pipeline-steps">
              {data.nodes.map((node) => {
                const Icon = ICON[node.status];
                return (
                  <li
                    key={node.node}
                    className={cn(node.status, node.conditional && "conditional")}
                  >
                    <Icon
                      size={15}
                      aria-hidden="true"
                      className={node.status === "running" ? "spin" : undefined}
                    />
                    <span className="mono">{node.node}</span>
                    <span className="sr-only">{NODE_STATUS[node.status].label}</span>
                    <span className="step-note">{node.note}</span>
                    <span className="mono muted">
                      {node.status === "queued" ? "—" : formatDuration(node.duration_ms)}
                    </span>
                    <span className="mono muted">{node.llm_calls} calls</span>
                  </li>
                );
              })}
            </ol>
            <p className="chart-note">
              {data.cache_hits > 0
                ? `${String(data.cache_hits)} LLM responses served from llm_cache, so this rerun is deterministic and costs nothing. `
                : null}
              <Link to={`/runs/${data.id}`}>Open run details</Link>
            </p>
          </>
        )}
      </QueryView>
    </Sheet>
  );
}
