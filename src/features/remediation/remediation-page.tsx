import { ChevronRight } from "lucide-react";
import { Link } from "react-router";

import { PriorityChip } from "@/components/data-display/priority-chip";
import { LabelTag } from "@/components/data-display/status-tag";
import { EmptyState } from "@/components/feedback/empty-state";
import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { Sheet } from "@/components/ui/sheet";
import { useGaps, useRemediations } from "@/hooks/use-rulesight";
import { REMEDIATION_STATUS } from "@/lib/labels";
import type { RemediationStatus } from "@/types/domain";

const COLUMNS: RemediationStatus[] = ["draft", "approved", "in_progress", "completed", "verified"];
const PROGRESS: Record<RemediationStatus, number> = {
  draft: 1,
  approved: 2,
  in_progress: 3,
  completed: 4,
  verified: 5,
  rejected: 0,
};

/** Remediation actions grouped by status, as ruled lists rather than floating cards. */
export function RemediationPage() {
  const remediations = useRemediations();
  const gaps = useGaps();

  return (
    <PageFrame
      title="Remediation"
      subtitle="Every action links back to its gap. Nothing moves past draft without an approval in the audit log."
    >
      <QueryView
        query={remediations}
        what="remediation actions"
        rows={6}
        empty={
          <Sheet>
            <EmptyState
              title="No remediation actions yet"
              description="The pipeline drafts an action for each gap it finds. Upload documents and run the pipeline, then approve or reject the drafts here."
              action={
                <Link className="button small" to="/gaps">
                  View gaps
                </Link>
              }
            />
          </Sheet>
        }
      >
        {(items) => {
          const gapById = new Map((gaps.data ?? []).map((gap) => [gap.id, gap]));
          const rejected = items.filter((item) => item.status === "rejected");
          return (
            <>
              <div className="board">
                {COLUMNS.map((status) => {
                  const column = items.filter((item) => item.status === status);
                  return (
                    <Sheet
                      className="board-column"
                      key={status}
                      aria-label={REMEDIATION_STATUS[status].label}
                    >
                      <header>
                        <LabelTag value={REMEDIATION_STATUS[status]} />
                        <span className="mono muted">{column.length}</span>
                      </header>
                      {column.length === 0 ? <p className="board-empty">Nothing here.</p> : null}
                      <ul>
                        {column.map((item) => {
                          const gap = gapById.get(item.gap_id);
                          return (
                            <li key={item.id}>
                              <Link className="board-item" to={`/gaps/${item.gap_id}`}>
                                <span className="board-item-head">
                                  {gap ? <PriorityChip value={gap.priority} /> : null}
                                  <span className="mono">{gap?.code ?? item.gap_id}</span>
                                  <ChevronRight size={14} aria-hidden="true" />
                                </span>
                                <span className="board-action">{item.action}</span>
                                <span className="board-meta">
                                  {item.owner_team} · {item.target_days} days
                                </span>
                                <span
                                  className="progress"
                                  aria-label={`Stage ${String(PROGRESS[item.status])} of 5`}
                                >
                                  {[1, 2, 3, 4, 5].map((step) => (
                                    <i
                                      key={step}
                                      className={
                                        step <= PROGRESS[item.status]
                                          ? `seq-${String(step)}`
                                          : undefined
                                      }
                                    />
                                  ))}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </Sheet>
                  );
                })}
              </div>
              {rejected.length > 0 ? (
                <p className="chart-note">
                  Rejected:{" "}
                  {rejected.map((item) => gapById.get(item.gap_id)?.code ?? item.gap_id).join(", ")}
                  . The agent can draft a new action from the gap trace.
                </p>
              ) : null}
            </>
          );
        }}
      </QueryView>
    </PageFrame>
  );
}
