import { useState } from "react";
import { useNavigate } from "react-router";

import { useSession } from "@/app/auth-context";
import { RunGantt } from "@/components/charts/run-gantt";
import { SegmentBar, SegmentLegend, type Segment } from "@/components/charts/segment-bar";
import { TrendChart } from "@/components/charts/trend-chart";
import { KpiStrip, type Kpi } from "@/components/data-display/kpi-strip";
import { PriorityChip } from "@/components/data-display/priority-chip";
import { StatusTag } from "@/components/data-display/status-tag";
import { QueryView } from "@/components/feedback/query-view";
import { useToast } from "@/components/feedback/toast-context";
import { PageFrame } from "@/components/layout/page-frame";
import { Button, TextButton } from "@/components/ui/button";
import { Sheet, SheetHead } from "@/components/ui/sheet";
import { UploadDialog } from "@/features/documents/upload-dialog";
import {
  useDashboardSummary,
  useDocuments,
  useEvalReport,
  useGaps,
  useObligations,
  useRemediations,
  useRuns,
} from "@/hooks/use-rulesight";
import { formatDateTime, formatDuration, formatScore } from "@/lib/format";
import { GAP_TYPE } from "@/lib/labels";
import { ROLES } from "@/lib/roles";
import type {
  DashboardSummary,
  Gap,
  Obligation,
  Priority,
  RemediationStatus,
  ReviewStatus,
} from "@/types/domain";

const PRIORITY_COLOR: Record<Priority, string> = {
  P1: "var(--critical)",
  P2: "var(--warning)",
  P3: "var(--neutral)",
};

/**
 * Earlier pipeline runs are not stored yet, so the trend shows fixed demo history and
 * appends the live counts as the latest point. The card is tagged "Mock values".
 */
const MOCK_HISTORY: readonly [string, number, number][] = [
  ["29 Sep", 9, 1],
  ["1 Oct", 11, 2],
  ["3 Oct", 11, 2],
  ["6 Oct", 10, 2],
  ["8 Oct", 11, 2],
];

/**
 * Overview. Priya (Compliance Officer) gets exposure and decisions; Rahul (Analyst)
 * gets review progress and pipeline quality. Figures come from the data.
 */
export function DashboardPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { notify } = useToast();
  const summary = useDashboardSummary();
  const obligations = useObligations();
  const documents = useDocuments();
  const [uploadOpen, setUploadOpen] = useState(false);
  // Analysts get the review view; officers, administrators and auditors get the oversight view.
  const isCompliance = user.role !== ROLES.complianceAnalyst;

  const sources = [...new Set((obligations.data ?? []).map((item) => item.source_label))];
  const scope = sources.length ? ` against ${sources.join(" and ")}` : "";
  const lastRun = summary.data?.last_run_at
    ? ` · last pipeline run ${formatDateTime(summary.data.last_run_at)}`
    : "";

  return (
    <PageFrame
      roomy
      title={isCompliance ? "Compliance overview" : "Review overview"}
      subtitle={`Nova Trust Bank (fictional)${scope}${lastRun}`}
      action={
        <>
          <Button
            onClick={() => {
              setUploadOpen(true);
            }}
          >
            Upload document
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              void navigate("/documents");
            }}
          >
            Run pipeline
          </Button>
        </>
      }
    >
      <QueryView query={summary} what="the dashboard" rows={6}>
        {(data) => (isCompliance ? <ComplianceView data={data} /> : <AnalystView data={data} />)}
      </QueryView>
      {uploadOpen ? (
        <UploadDialog
          documents={documents.data ?? []}
          onClose={() => {
            setUploadOpen(false);
          }}
          onUploaded={(doc) => {
            setUploadOpen(false);
            notify({ title: `“${doc.title}” uploaded`, detail: "Processing has started." });
          }}
        />
      ) : null}
    </PageFrame>
  );
}

// ---- Compliance Officer ------------------------------------------------------------------------

function ComplianceView({ data }: { data: DashboardSummary }) {
  const navigate = useNavigate();
  const gaps = useGaps();
  const obligations = useObligations();
  const remediations = useRemediations();
  const openGaps = (gaps.data ?? []).filter((gap) => gap.status !== "dismissed");
  const applicable = data.obligations_applicable;
  const coveredPct = applicable ? Math.round((data.coverage.covered / applicable) * 100) : 0;

  const kpis: Kpi[] = [
    {
      label: "Open gaps",
      value: data.open_gaps,
      note: (
        <span className="tag-row">
          {(["P1", "P2", "P3"] as const).map((priority) => (
            <span key={priority} className={`priority priority-count ${priority.toLowerCase()}`}>
              {priority} <b>{data.gaps_by_priority[priority]}</b>
            </span>
          ))}
        </span>
      ),
      onClick: () => {
        void navigate("/gaps");
      },
    },
    {
      label: "Coverage",
      value: (
        <>
          {data.coverage.covered}
          <small> / {applicable}</small>
        </>
      ),
      note: `${String(coveredPct)}% of applicable obligations`,
      onClick: () => {
        void navigate("/obligations");
      },
    },
    {
      label: "Remediation",
      value: (
        <>
          {data.remediation_approved}
          <small> approved</small>
        </>
      ),
      note: `of ${String(data.remediation_total)} drafted by agent`,
      onClick: () => {
        void navigate("/remediation");
      },
    },
    {
      label: "Next deadline",
      value: data.next_deadline.label.split(" ").slice(0, 2).join(" "),
      note: `${data.next_deadline.context} · ${String(data.next_deadline.days_remaining)} days`,
      onClick: () => {
        void navigate("/remediation");
      },
    },
  ];

  return (
    <>
      <KpiStrip label="Key figures" items={kpis} />
      <div className="grid-2 stretch">
        <ClauseHero gaps={openGaps} obligations={obligations.data ?? []} />
        <GapTrend gaps={openGaps} />
      </div>
      <div className="grid-2">
        <TopRisks gaps={openGaps} />
        <GapsByType data={data} />
        <RiskMatrix gaps={openGaps} />
        <RemediationProgress statuses={(remediations.data ?? []).map((item) => item.status)} />
      </div>
    </>
  );
}

/** Words around the key phrase, so the hero shows the requirement and not the whole paragraph. */
function excerpt(
  text: string,
  phrase: string | null,
): { before: string; mark: string; after: string } {
  const index = phrase ? text.indexOf(phrase) : -1;
  if (!phrase || index < 0) {
    const cut = text.length > 220 ? `${text.slice(0, text.lastIndexOf(" ", 220))}…` : text;
    return { before: cut, mark: "", after: "" };
  }
  const start = index > 70 ? text.indexOf(" ", index - 70) + 1 : 0;
  const tail = index + phrase.length;
  const endSpace = text.indexOf(" ", tail + 80);
  const end = text.length - tail > 90 && endSpace > 0 ? endSpace : text.length;
  return {
    before: `${start > 0 ? "…" : ""}${text.slice(start, index)}`,
    mark: phrase,
    after: `${text.slice(tail, end)}${end < text.length ? "…" : ""}`,
  };
}

function ClauseHero({ gaps, obligations }: { gaps: Gap[]; obligations: Obligation[] }) {
  const navigate = useNavigate();
  const gap = [...gaps]
    .filter((item) => item.origin === "initial")
    .sort((a, b) => b.risk_score - a.risk_score)[0];
  const obligation = obligations.find((item) => item.id === gap?.obligation_id);
  if (!gap || !obligation) return <Sheet className="sheet-pad">No initial gaps yet.</Sheet>;
  const parts = excerpt(obligation.source_quote, obligation.key_phrase);
  return (
    <figure className="clause-hero">
      <span className="hero-dots" aria-hidden="true" />
      <span className="hero-orb" aria-hidden="true" />
      <span className="hero-pilcrow" aria-hidden="true">
        ¶
      </span>
      <span className="eyebrow">
        The clause behind {gap.code} · your highest-scored initial gap
      </span>
      <blockquote>
        “{parts.before}
        {parts.mark ? <mark>{parts.mark}</mark> : null}
        {parts.after}”
      </blockquote>
      <figcaption>
        <span>
          {obligation.source_label} · {obligation.clause_ref}
          {obligation.quote_verified ? " · Verbatim ✓" : " · Quote not verified"}
        </span>
        <button
          type="button"
          className="glass-button"
          onClick={() => {
            void navigate(`/gaps/${gap.id}`);
          }}
        >
          Read the trace →
        </button>
      </figcaption>
    </figure>
  );
}

function GapTrend({ gaps }: { gaps: Gap[] }) {
  const [asTable, setAsTable] = useState(false);
  const p1 = gaps.filter((gap) => gap.priority === "P1").length;
  const fromChange = gaps.filter((gap) => gap.origin === "change").map((gap) => gap.code);
  const rows: [string, number, number][] = [...MOCK_HISTORY, ["Latest", gaps.length, p1]];
  const labels = rows.map((row) => row[0]);
  return (
    <Sheet className="stack">
      <SheetHead
        title="Open gaps across pipeline runs"
        meta={
          <>
            <span className="legend">
              <span>
                <i
                  className="swatch line"
                  style={{ background: "var(--cyan)" }}
                  aria-hidden="true"
                />
                All open
              </span>
              <span>
                <i
                  className="swatch line"
                  style={{ background: "var(--critical)" }}
                  aria-hidden="true"
                />
                P1
              </span>
            </span>
            <StatusTag tone="warning" outline small>
              Mock values
            </StatusTag>
          </>
        }
      />
      <div className="sheet-body" style={{ flex: 1 }}>
        {asTable ? (
          <table className="data-table compact">
            <caption className="sr-only">Open gaps by run</caption>
            <thead>
              <tr>
                <th scope="col">Run</th>
                <th scope="col" className="numeric">
                  Open
                </th>
                <th scope="col" className="numeric">
                  P1
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([run, open, critical]) => (
                <tr key={run}>
                  <td>{run}</td>
                  <td className="numeric">{open}</td>
                  <td className="numeric">{critical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <TrendChart
            labels={labels}
            label={`Open gaps across ${String(rows.length)} pipeline runs, now ${String(gaps.length)}. P1 gaps now ${String(p1)}.`}
            annotation={
              fromChange.length ? `${fromChange.join(", ")} added by a change` : undefined
            }
            series={[
              {
                key: "open",
                name: "Open gaps",
                color: "var(--cyan)",
                values: rows.map((row) => row[1]),
              },
              {
                key: "p1",
                name: "P1 gaps",
                color: "var(--critical)",
                values: rows.map((row) => row[2]),
              },
            ]}
          />
        )}
      </div>
      <div className="sheet-foot row">
        <span>
          {fromChange.length
            ? `${fromChange.join(", ")} arrived with a regulatory change in the latest run.`
            : "No gaps arrived from regulatory changes in the latest run."}
        </span>
        <TextButton
          onClick={() => {
            setAsTable((value) => !value);
          }}
        >
          {asTable ? "View as chart" : "View as table"}
        </TextButton>
      </div>
    </Sheet>
  );
}

function TopRisks({ gaps }: { gaps: Gap[] }) {
  const navigate = useNavigate();
  const top = [...gaps].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);
  return (
    <Sheet className="risk-list">
      <SheetHead title="Top risks" meta="Risk score, descending" />
      <table className="data-table">
        <caption className="sr-only">Top five gaps by risk score</caption>
        <tbody>
          {top.map((gap) => (
            <tr
              key={gap.id}
              className="clickable"
              onClick={() => {
                void navigate(`/gaps/${gap.id}`);
              }}
            >
              <td style={{ width: 40 }}>
                <PriorityChip value={gap.priority} />
              </td>
              <td className="mono muted" style={{ width: 64 }}>
                {gap.code}
              </td>
              <td>
                {gap.title}
                {gap.origin === "change" ? (
                  <>
                    {" "}
                    <StatusTag tone="accent" small>
                      From change
                    </StatusTag>
                  </>
                ) : null}
              </td>
              <td className="numeric score">{formatScore(gap.risk_score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="footer-link">
        <TextButton
          onClick={() => {
            void navigate("/gaps");
          }}
        >
          View all {gaps.length} gaps →
        </TextButton>
      </div>
    </Sheet>
  );
}

function GapsByType({ data }: { data: DashboardSummary }) {
  const rows = [...data.gaps_by_type]
    .map((row) => ({ ...row, total: row.counts.P1 + row.counts.P2 + row.counts.P3 }))
    .sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...rows.map((row) => row.total));
  return (
    <Sheet>
      <SheetHead
        title="Gaps by type and priority"
        meta={
          <span className="legend">
            {(["P1", "P2", "P3"] as const).map((priority) => (
              <span key={priority}>
                <i
                  className="swatch"
                  style={{ background: PRIORITY_COLOR[priority] }}
                  aria-hidden="true"
                />
                {priority}
              </span>
            ))}
          </span>
        }
      />
      <div className="sheet-body bar-rows">
        {rows.map((row) => (
          <div className="bar-row" key={row.gap_type}>
            <span>{GAP_TYPE[row.gap_type].label}</span>
            <SegmentBar
              total={max}
              showValues={(segment) => segment.key}
              label={`${GAP_TYPE[row.gap_type].label}: ${(["P1", "P2", "P3"] as const)
                .map((priority) => `${priority} ${String(row.counts[priority])}`)
                .join(", ")}`}
              segments={(["P1", "P2", "P3"] as const).map((priority) => ({
                key: priority,
                label: `${GAP_TYPE[row.gap_type].label} · ${priority}`,
                value: row.counts[priority],
                color: PRIORITY_COLOR[priority],
              }))}
            />
            <b>{row.total}</b>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function RiskMatrix({ gaps }: { gaps: Gap[] }) {
  const severities = [...new Set(gaps.map((gap) => gap.risk_factors.severity))].sort(
    (a, b) => a - b,
  );
  const criticalities = [3, 2, 1];
  const step = (n: number) => (n === 0 ? 0 : n >= 6 ? 5 : n >= 4 ? 4 : n >= 2 ? 3 : 2);
  return (
    <Sheet>
      <SheetHead title="Risk matrix" meta="Count of open gaps" />
      <div
        className="risk-matrix"
        role="table"
        aria-label="Open gaps by criticality and severity"
        style={{ gridTemplateColumns: `88px repeat(${String(severities.length)}, 1fr)` }}
      >
        <span role="columnheader" />
        {severities.map((severity) => (
          <span key={severity} className="col-head" role="columnheader">
            Sev {severity}
          </span>
        ))}
        {criticalities.map((criticality) => (
          <div key={criticality} role="row" style={{ display: "contents" }}>
            <span className="row-head" role="rowheader">
              Criticality {criticality}
            </span>
            {severities.map((severity) => {
              const n = gaps.filter(
                (gap) =>
                  gap.risk_factors.criticality === criticality &&
                  gap.risk_factors.severity === severity,
              ).length;
              const level = step(n);
              return (
                <span
                  key={severity}
                  role="cell"
                  className={level >= 3 ? "cell strong" : "cell"}
                  style={level ? { background: `var(--seq-${String(level)})` } : undefined}
                  title={`Criticality ${String(criticality)} × severity ${String(severity)}: ${String(n)} gaps`}
                >
                  {n || ""}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <p className="sheet-foot" style={{ borderTop: 0, paddingTop: 0 }}>
        Rows: criticality. Columns: severity. Score = criticality × severity × urgency (rule v1).
      </p>
    </Sheet>
  );
}

const REMEDIATION_STAGES: [RemediationStatus, string, string][] = [
  ["draft", "Draft", "var(--seq-1)"],
  ["approved", "Approved", "var(--seq-2)"],
  ["in_progress", "In progress", "var(--seq-3)"],
  ["completed", "Completed", "var(--seq-4)"],
  ["verified", "Verified", "var(--seq-5)"],
];

function RemediationProgress({ statuses }: { statuses: RemediationStatus[] }) {
  const segments: Segment[] = REMEDIATION_STAGES.map(([key, label, color]) => ({
    key,
    label,
    color,
    value: statuses.filter((status) => status === key).length,
  }));
  return (
    <Sheet>
      <SheetHead title="Remediation progress" meta={`${String(statuses.length)} plans drafted`} />
      <div className="sheet-body stack" style={{ gap: 14, paddingTop: 20 }}>
        <SegmentBar
          size="thick"
          segments={segments}
          label={segments.map((segment) => `${segment.label} ${String(segment.value)}`).join(", ")}
        />
        <div className="stat-legend">
          {segments.map((segment) => (
            <span key={segment.key} style={{ borderLeftColor: segment.color }}>
              <small>{segment.label}</small>
              <b>{segment.value}</b>
            </span>
          ))}
        </div>
      </div>
      <p className="sheet-foot">Work starts only after a Compliance Officer approves the plan.</p>
    </Sheet>
  );
}

// ---- Analyst -----------------------------------------------------------------------------------

const REVIEW_STAGES: [ReviewStatus, string, string][] = [
  ["accepted", "Accepted", "var(--success)"],
  ["edited", "Edited", "var(--cat-control)"],
  ["suggested", "Suggested by agent", "var(--primary)"],
  ["rejected", "Rejected", "var(--critical)"],
];

function AnalystView({ data }: { data: DashboardSummary }) {
  const navigate = useNavigate();
  const runs = useRuns();
  const latest = runs.data?.[0];
  const review = data.review;
  const accepted = review.obligations_accepted + review.obligations_edited;
  const goObligations = () => {
    void navigate("/obligations");
  };

  const kpis: Kpi[] = [
    {
      label: "Extracted",
      value: data.obligations_total,
      note: `${String(data.obligations_applicable)} applicable · ${String(data.obligations_not_applicable)} not applicable`,
      onClick: goObligations,
    },
    {
      label: "Awaiting review",
      value: review.obligations_suggested,
      note: `obligations · ${String(review.mappings_to_review)} mappings to review`,
      onClick: () => {
        void navigate("/obligations?review=suggested");
      },
    },
    {
      label: "Accepted",
      value: accepted,
      note: review.obligations_edited
        ? `${String(review.obligations_edited)} after your edits`
        : "none edited yet",
      onClick: goObligations,
    },
    {
      label: "Critic retries",
      value: data.critic_retries,
      note: `of ${String(data.llm_calls)} LLM calls${latest ? ` in run ${latest.run_id}` : ""}`,
      onClick: () => {
        void navigate(latest ? `/runs/${latest.id}` : "/runs");
      },
    },
  ];

  const coverage: Segment[] = [
    { key: "covered", label: "Covered", value: data.coverage.covered, color: "var(--seq-5)" },
    { key: "partial", label: "Partial", value: data.coverage.partial, color: "var(--seq-3)" },
    {
      key: "insufficient",
      label: "Insufficient info",
      value: data.coverage.insufficient_info,
      color: "var(--seq-2)",
    },
    { key: "missing", label: "Missing", value: data.coverage.none, color: "var(--seq-1)" },
  ];

  return (
    <>
      <KpiStrip label="Review figures" items={kpis} />
      <figure className="coverage-figure">
        <figcaption>
          <strong>Coverage of applicable obligations</strong>
          <span>
            {data.obligations_applicable} applicable of {data.obligations_total} extracted
          </span>
        </figcaption>
        <SegmentBar
          size="thin"
          segments={coverage}
          label={`Coverage: ${coverage.map((segment) => `${segment.label} ${String(segment.value)}`).join(", ")}`}
        />
        <SegmentLegend segments={coverage} counts />
      </figure>
      <div className="grid-2">
        <ReviewByDocument />
        <LatestRun />
        <Accuracy />
      </div>
    </>
  );
}

function ReviewByDocument() {
  const obligations = useObligations();
  const items = obligations.data ?? [];
  const sources = [...new Set(items.map((item) => item.source_label))];
  const legend: Segment[] = REVIEW_STAGES.map(([key, label, color]) => ({
    key,
    label,
    color,
    value: 0,
  }));
  return (
    <Sheet>
      <SheetHead title="Review status by document" meta="Extracted obligations" />
      <div className="sheet-body stack" style={{ gap: 16, padding: "18px 16px" }}>
        {sources.map((source) => {
          const group = items.filter((item) => item.source_label === source);
          const segments = REVIEW_STAGES.map(([key, label, color]) => ({
            key,
            label,
            color,
            value: group.filter((item) => item.review_status === key).length,
          }));
          return (
            <div className="doc-review" key={source}>
              <header>
                <strong>{source}</strong>
                <span>{group.length} obligations</span>
              </header>
              <SegmentBar
                size="thick"
                showValues
                segments={segments}
                label={`${source}: ${segments.map((segment) => `${segment.label} ${String(segment.value)}`).join(", ")}`}
              />
            </div>
          );
        })}
        <SegmentLegend segments={legend} />
      </div>
    </Sheet>
  );
}

function LatestRun() {
  const runs = useRuns();
  return (
    <Sheet>
      <QueryView query={runs} what="pipeline runs" rows={6}>
        {(items) => {
          const run = items[0];
          if (!run) return <p className="sheet-pad muted">No pipeline runs yet.</p>;
          const elapsed = Math.max(...run.nodes.map((node) => node.offset_ms + node.duration_ms));
          const retried = run.nodes.filter((node) => node.status === "retried");
          const conditional = run.nodes.filter((node) => node.conditional);
          return (
            <>
              <SheetHead
                title={
                  <>
                    Latest run <span className="mono muted">{run.run_id}</span>
                  </>
                }
                meta={
                  run.status === "running" ? (
                    <span className="inline-icon" style={{ color: "var(--primary)" }}>
                      <span className="pulse-dot" aria-hidden="true" />
                      Running · {formatDuration(elapsed)}
                    </span>
                  ) : (
                    `Done · ${formatDuration(elapsed)}`
                  )
                }
              />
              <div className="sheet-body" style={{ padding: "14px 16px" }}>
                <RunGantt nodes={run.nodes} label={`Node timeline for run ${run.run_id}`} />
              </div>
              <p className="sheet-foot">
                {retried.length ? (
                  <>
                    <span style={{ color: "var(--warning)" }}>↻</span> critic retried{" "}
                    {retried.map((node) => node.node).join(", ")}.{" "}
                  </>
                ) : null}
                {conditional.length
                  ? "The change branch runs because a document supersedes another."
                  : run.trigger}
              </p>
            </>
          );
        }}
      </QueryView>
    </Sheet>
  );
}

function Accuracy() {
  const evaluation = useEvalReport();
  return (
    <Sheet>
      <SheetHead
        title="Accuracy against answer key"
        meta={
          evaluation.data?.is_mock ? (
            <StatusTag tone="warning" outline small>
              Mock values
            </StatusTag>
          ) : null
        }
      />
      <QueryView query={evaluation} what="accuracy metrics" rows={6}>
        {(report) => (
          <>
            <div className="sheet-body stack" style={{ gap: 10 }}>
              {report.metrics.map((metric) => (
                <div className="accuracy-row" key={metric.key}>
                  <span>{metric.label}</span>
                  <span className="meter" aria-hidden="true">
                    <i style={{ width: `${String(metric.value * 100)}%` }} />
                  </span>
                  <b>{metric.value.toFixed(2)}</b>
                </div>
              ))}
            </div>
            <p className="sheet-foot">
              {report.method}
              {report.scored_at ? ` · ${formatDateTime(report.scored_at)}` : ""}
            </p>
          </>
        )}
      </QueryView>
    </Sheet>
  );
}
