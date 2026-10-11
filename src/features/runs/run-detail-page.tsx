import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";

import { KpiStrip } from "@/components/data-display/kpi-strip";
import { LabelTag } from "@/components/data-display/status-tag";
import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { SectionHeading, Sheet } from "@/components/ui/sheet";
import { runTotals } from "@/features/runs/run-totals";
import { useRun } from "@/hooks/use-rulesight";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";
import { NODE_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { AgentRun } from "@/types/domain";

export function RunDetailPage() {
  const { runId = "" } = useParams();
  const run = useRun(runId);
  return (
    <PageFrame
      eyebrow="Agent run"
      title={run.data ? `Run ${run.data.run_id}` : "Run"}
      subtitle={
        run.data
          ? `${run.data.trigger} · started ${formatDateTime(run.data.started_at)}`
          : "Loading…"
      }
      action={
        <Link className="button ghost" to="/runs">
          <ArrowLeft size={15} /> All runs
        </Link>
      }
    >
      <QueryView query={run} what="the run" rows={8}>
        {(data) => <RunDetail run={data} />}
      </QueryView>
    </PageFrame>
  );
}

function RunDetail({ run }: { run: AgentRun }) {
  const totals = runTotals(run);
  const total = Math.max(1, totals.duration);
  return (
    <>
      <KpiStrip
        label="Run totals"
        items={[
          {
            label: "Duration",
            value: formatDuration(totals.duration),
            note: `${String(run.nodes.length)} nodes`,
          },
          {
            label: "LLM calls",
            value: totals.llmCalls,
            note: `${String(run.cache_hits)} served from cache`,
          },
          {
            label: "Tokens",
            value: formatNumber(totals.inputTokens + totals.outputTokens),
            note: `${formatNumber(totals.inputTokens)} in · ${formatNumber(totals.outputTokens)} out`,
          },
          { label: "Retries", value: totals.retries, note: `${String(totals.errors)} errors` },
        ]}
      />
      <Sheet className="chart-card">
        <SectionHeading eyebrow="Timeline" title="Node execution" />
        <ol className="gantt" aria-label="Node timeline">
          {run.nodes.map((node) => (
            <li key={node.node} className={cn(node.conditional && "conditional")}>
              <span className="mono gantt-label">{node.node}</span>
              <span className="gantt-track">
                <i
                  className={cn("gantt-bar", node.status)}
                  style={{
                    marginLeft: `${String((node.offset_ms / total) * 100)}%`,
                    width: `${String(Math.max(0.6, (node.duration_ms / total) * 100))}%`,
                  }}
                  title={`${node.node}: ${formatDuration(node.duration_ms)}, ${String(node.llm_calls)} LLM calls`}
                />
              </span>
              <span className="mono muted gantt-duration">
                {node.status === "queued" ? "—" : formatDuration(node.duration_ms)}
              </span>
            </li>
          ))}
        </ol>
        <p className="chart-note">
          Indented rows form the change branch, which runs only when a document supersedes another.
        </p>
      </Sheet>
      <Sheet className="table-sheet">
        <div className="table-scroll">
          <table className="data-table">
            <caption className="sr-only">Node details</caption>
            <thead>
              <tr>
                <th scope="col">Node</th>
                <th scope="col">Status</th>
                <th scope="col" className="numeric">
                  Calls
                </th>
                <th scope="col" className="numeric hide-sm">
                  Tokens in / out
                </th>
                <th scope="col" className="hide-md">
                  Note
                </th>
              </tr>
            </thead>
            <tbody>
              {run.nodes.map((node) => (
                <tr key={node.node}>
                  <td className="mono">{node.node}</td>
                  <td>
                    <LabelTag value={NODE_STATUS[node.status]} />
                  </td>
                  <td className="numeric mono">{node.llm_calls}</td>
                  <td className="numeric hide-sm mono">
                    {formatNumber(node.input_tokens)} / {formatNumber(node.output_tokens)}
                  </td>
                  <td className="hide-md muted">{node.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sheet>
    </>
  );
}
