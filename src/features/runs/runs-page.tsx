import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";

import { StatusTag } from "@/components/data-display/status-tag";
import { EmptyState } from "@/components/feedback/empty-state";
import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { Sheet } from "@/components/ui/sheet";
import { runTotals } from "@/features/runs/run-totals";
import { useReadiness } from "@/hooks/use-readiness";
import { useRuns } from "@/hooks/use-rulesight";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";

/** Observability: every pipeline run and its agent nodes (agent_runs table). */
export function RunsPage() {
  const runs = useRuns();
  const navigate = useNavigate();
  return (
    <PageFrame
      title="Agent runs"
      subtitle="Each pipeline run, its nodes, LLM calls and tokens. Cached calls make reruns deterministic."
    >
      <ApiStatus />
      <Sheet className="table-sheet">
        <QueryView
          query={runs}
          what="pipeline runs"
          rows={4}
          empty={
            <EmptyState
              title="No pipeline runs yet"
              description="Upload documents, then start a run from the Documents page. Each run's nodes, LLM calls and tokens appear here."
            />
          }
        >
          {(items) => (
            <div className="table-scroll">
              <table className="data-table">
                <caption className="sr-only">Pipeline runs</caption>
                <thead>
                  <tr>
                    <th scope="col">Run</th>
                    <th scope="col" className="hide-sm">
                      Trigger
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col" className="numeric hide-sm">
                      Duration
                    </th>
                    <th scope="col" className="numeric">
                      LLM calls
                    </th>
                    <th scope="col" className="numeric hide-md">
                      Tokens in / out
                    </th>
                    <th scope="col" className="numeric hide-md">
                      Cache hits
                    </th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((run) => {
                    const totals = runTotals(run);
                    return (
                      <tr
                        key={run.id}
                        className="clickable"
                        onClick={() => {
                          void navigate(`/runs/${run.id}`);
                        }}
                      >
                        <td>
                          <button
                            type="button"
                            className="row-link"
                            onClick={(event) => {
                              event.stopPropagation();
                              void navigate(`/runs/${run.id}`);
                            }}
                          >
                            <span className="mono">run {run.run_id}</span>
                            <span className="muted">{formatDateTime(run.started_at)}</span>
                          </button>
                        </td>
                        <td className="hide-sm">{run.trigger}</td>
                        <td>
                          <StatusTag
                            tone={
                              run.status === "done"
                                ? "success"
                                : run.status === "running"
                                  ? "primary"
                                  : "critical"
                            }
                          >
                            {run.status === "done"
                              ? `Done${totals.retries ? ` · ${String(totals.retries)} retry` : ""}`
                              : run.status === "running"
                                ? "Running"
                                : "Failed"}
                          </StatusTag>
                        </td>
                        <td className="numeric hide-sm mono">{formatDuration(totals.duration)}</td>
                        <td className="numeric mono">{totals.llmCalls}</td>
                        <td className="numeric hide-md mono">
                          {formatNumber(totals.inputTokens)} / {formatNumber(totals.outputTokens)}
                        </td>
                        <td className="numeric hide-md mono">{run.cache_hits}</td>
                        <td>
                          <ChevronRight size={15} aria-hidden="true" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </QueryView>
      </Sheet>
    </PageFrame>
  );
}

function ApiStatus() {
  const readiness = useReadiness();
  return (
    <p className="api-status">
      Backend:{" "}
      {readiness.isPending ? (
        <StatusTag tone="neutral">Checking</StatusTag>
      ) : readiness.isSuccess && readiness.data.database === "ok" ? (
        <StatusTag tone="success">API and database ready</StatusTag>
      ) : (
        <StatusTag tone="critical">Not reachable</StatusTag>
      )}
    </p>
  );
}
