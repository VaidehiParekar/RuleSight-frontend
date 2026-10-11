import { useState } from "react";
import { useNavigate } from "react-router";

import { useSession } from "@/app/auth-context";
import { RunGantt } from "@/components/charts/run-gantt";
import { SegmentBar, SegmentLegend, type Segment } from "@/components/charts/segment-bar";
import { KpiStrip, type Kpi } from "@/components/data-display/kpi-strip";
import { PriorityChip } from "@/components/data-display/priority-chip";
import { StatusTag } from "@/components/data-display/status-tag";
import { EmptyState } from "@/components/feedback/empty-state";
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
 * Overview. Compliance Officers get exposure and decisions; analysts get review progress
 * and pipeline quality. Every figure comes from the API.
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
  const scope = sources.length
    ? `Measured against ${sources.join(" and ")}`
    : "No regulations analysed yet";
  const lastRun = summary.data?.last_run_at
    ? ` · last pipeline run ${formatDateTime(summary.data.last_run_at)}`
    : "";
  const openUpload = () => {
    setUploadOpen(true);
  };

  return (
    <PageFrame
      roomy
      title={isCompliance ? "Compliance overview" : "Review overview"}
      subtitle={`${scope}${lastRun}`}
      action={
        <>
          <Button onClick={openUpload}>Upload document</Button>
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
      <QueryView
        query={summary}
        what="the dashboard"
        rows={6}
        isEmpty={(data) => data.obligations_total === 0}
        empty={
          <GettingStarted
            hasDocuments={(documents.data?.length ?? 0) > 0}
            onUpload={openUpload}
            onOpenDocuments={() => {
              void navigate("/documents");
            }}
          />
        }
      >
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

/** Shown while the database has no extracted obligations: what to do first. */
function GettingStarted({
  hasDocuments,
  onUpload,
  onOpenDocuments,
}: {
  hasDocuments: boolean;
  onUpload: () => void;
  onOpenDocuments: () => void;
}) {
  return (
    <Sheet>
      <EmptyState
        title={
          hasDocuments
            ? "Documents are uploaded. Run the pipeline to extract obligations."
            : "Nothing to report yet. Upload documents to start."
        }
        description={
          hasDocuments
            ? "The pipeline reads each regulation, extracts obligations with verbatim quotes, maps them to your controls and ranks the gaps. The figures here fill in once it has run."
            : "Upload a regulation (for example an RBI Master Direction), your policies, the risk and control matrix and any evidence, then run the pipeline from the Documents page. Coverage, gaps and remediation plans appear here once it has run."
        }
        action={
          <div className="row" style={{ gap: 8, justifyContent: "center" }}>
            <Button onClick={onUpload}>Upload document</Button>
            <Button variant="primary" onClick={onOpenDocuments}>
              {hasDocuments ? "Run pipeline" : "Go to documents"}
            </Button>
          </div>
        }
      />
    </Sheet>
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
      value: data.next_deadline.date
        ? data.next_deadline.label.split(" ").slice(0, 2).join(" ")
        : "None",
      note: data.next_deadline.date
        ? `${data.next_deadline.context} · ${String(data.next_deadline.days_remaining)} days`
        : "No upcoming deadline in the extracted obligations",
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
        <LatestRun />
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

function TopRisks({ gaps }: { gaps: Gap[] }) {
  const navigate = useNavigate();
  const top = [...gaps].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);
  return (
    <Sheet className="risk-list">
      <SheetHead title="Top risks" meta="Risk score, descending" />
      {top.length === 0 ? (
        <EmptyState
          title="No open gaps"
          description="Gaps appear here, highest risk first, after the pipeline compares obligations with your controls."
        />
      ) : null}
      <table className="data-table" hidden={top.length === 0}>
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
        {rows.length === 0 ? <p className="muted">No open gaps to break down yet.</p> : null}
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
      {severities.length === 0 ? (
        <p className="sheet-pad muted">No open gaps to place on the matrix yet.</p>
      ) : null}
      <div
        hidden={severities.length === 0}
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
        Rows: criticality. Columns: severity. Score = criticality × severity × urgency
        {gaps[0] ? ` (rule ${gaps[0].risk_factors.rule_version})` : ""}.
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
      {statuses.length === 0 ? (
        <p className="sheet-pad muted">
          No remediation plans yet. The pipeline drafts one for each confirmed gap.
        </p>
      ) : null}
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
        {sources.length === 0 ? <p className="muted">No obligations extracted yet.</p> : null}
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
      <SheetHead title="Accuracy against answer key" />
      <QueryView
        query={evaluation}
        what="accuracy metrics"
        rows={6}
        isEmpty={(report) => report.is_mock || report.metrics.length === 0}
        empty={
          <EmptyState
            title="Accuracy not measured yet"
            description="Run the pipeline, then run scripts/evaluate.py on the backend to score the results against the answer key. The measured figures appear here."
          />
        }
      >
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
