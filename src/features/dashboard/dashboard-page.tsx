import { ArrowRight, BarChart3, ChevronRight, Gauge, ListChecks } from "lucide-react";
import { useNavigate } from "react-router";

import { useActor } from "@/app/actor-context";
import { MeterList } from "@/components/charts/meter-list";
import { PriorityBars } from "@/components/charts/priority-bars";
import { StackedBar } from "@/components/charts/stacked-bar";
import { KpiStrip, type Kpi } from "@/components/data-display/kpi-strip";
import { PriorityChip } from "@/components/data-display/priority-chip";
import { StatusTag } from "@/components/data-display/status-tag";
import { QueryView } from "@/components/feedback/query-view";
import { PageFrame } from "@/components/layout/page-frame";
import { Button, IconButton, TextButton } from "@/components/ui/button";
import { SectionHeading, Sheet } from "@/components/ui/sheet";
import {
  useDashboardSummary,
  useEvalReport,
  useGaps,
  useMappings,
  useObligations,
} from "@/hooks/use-rulesight";
import { formatDateTime, formatScore } from "@/lib/format";
import { GAP_TYPE } from "@/lib/labels";
import type { DashboardSummary } from "@/types/domain";

/**
 * Overview. Priya (Compliance Officer) gets a decision brief; Rahul (Analyst) gets
 * a review desk. Every figure is computed from the data, never hard-coded.
 */
export function DashboardPage() {
  const { actor } = useActor();
  const navigate = useNavigate();
  const summary = useDashboardSummary();
  const isCompliance = actor.id === "priya";

  return (
    <PageFrame
      eyebrow={
        isCompliance
          ? `Decision brief${summary.data ? ` · last run ${formatDateTime(summary.data.last_run_at)}` : ""}`
          : `Review desk${summary.data ? ` · last run ${formatDateTime(summary.data.last_run_at)}` : ""}`
      }
      title={isCompliance ? "Compliance overview" : "Analyst review queue"}
      subtitle={
        isCompliance
          ? "Exposure, deadlines and approvals for Nova Trust Bank against 3 RBI documents."
          : `Extraction quality, mappings and source review assigned to ${actor.name}.`
      }
      action={
        <Button
          variant="primary"
          onClick={() => {
            void navigate(isCompliance ? "/gaps?priority=P1" : "/obligations?review=suggested");
          }}
        >
          {isCompliance ? "Review P1 gaps" : "Continue review"} <ArrowRight size={15} />
        </Button>
      }
    >
      <QueryView query={summary} what="the dashboard" rows={6}>
        {(data) => (
          <>
            <KpiStrip
              label="Key metrics"
              items={isCompliance ? complianceKpis(data) : analystKpis(data)}
            />
            {isCompliance ? <ComplianceCharts data={data} /> : <AnalystCharts data={data} />}
            <section className="dashboard-grid lower">
              {isCompliance ? <TopRisks /> : <ReviewQueue />}
              {isCompliance ? (
                <Insight
                  eyebrow="Change intelligence"
                  title="A regulation changed the exposure"
                  body="The NSM Master Direction of 2 Oct 2026 withdraws the 2024 circular. Seven discontinued machines now create P1 gap NG-03."
                  actionLabel="Inspect change"
                  onAction={() => {
                    void navigate("/changes");
                  }}
                />
              ) : (
                <Insight
                  eyebrow="Source integrity"
                  title="The system abstained, not guessed"
                  body={`${String(data.review.quotes_verified)} of ${String(data.review.quotes_total)} quotes are verified as verbatim. Where evidence is missing, mappings say “Insufficient evidence” rather than “compliant”.`}
                  actionLabel="Inspect mappings"
                  onAction={() => {
                    void navigate("/controls?tab=matrix");
                  }}
                />
              )}
            </section>
          </>
        )}
      </QueryView>
    </PageFrame>
  );
}

function complianceKpis(data: DashboardSummary): Kpi[] {
  return [
    {
      label: "Open P1 gaps",
      value: data.gaps_by_priority.P1,
      note: `${String(data.open_gaps)} open gaps in total`,
    },
    {
      label: "Risk exposure",
      value: formatScore(data.risk_exposure),
      note: `Sum of risk scores across ${String(data.open_gaps)} gaps`,
    },
    {
      label: "Remediation",
      value: `${String(data.remediation_approved)} / ${String(data.remediation_total)}`,
      note: "Actions approved or under way",
    },
    {
      label: "Next deadline",
      value: data.next_deadline.label.split(" ").slice(0, 2).join(" "),
      note: `${data.next_deadline.context} · ${String(data.next_deadline.days_remaining)} days`,
    },
  ];
}

function analystKpis(data: DashboardSummary): Kpi[] {
  return [
    {
      label: "Needs review",
      value: data.review.obligations_suggested + data.review.mappings_to_review,
      note: `${String(data.review.obligations_suggested)} obligations · ${String(data.review.mappings_to_review)} mappings`,
    },
    {
      label: "Accepted",
      value: data.review.obligations_accepted,
      note: `Obligations accepted of ${String(data.obligations_total)}`,
    },
    {
      label: "Critic retries",
      value: data.critic_retries,
      note: `Across ${String(data.llm_calls)} LLM calls in the last run`,
    },
    {
      label: "Applicability",
      value: `${String(data.obligations_applicable)} / ${String(data.obligations_total)}`,
      note: `${String(data.obligations_not_applicable)} not applicable, with reason`,
    },
  ];
}

function ComplianceCharts({ data }: { data: DashboardSummary }) {
  const navigate = useNavigate();
  const applicable = data.obligations_applicable;
  const coveredPct = applicable > 0 ? Math.round((data.coverage.covered / applicable) * 100) : 0;
  return (
    <section className="dashboard-grid">
      <Sheet className="chart-card">
        <SectionHeading
          eyebrow="Coverage composition"
          title="Applicable obligations"
          action={
            <IconButton
              label="Open controls and mappings"
              onClick={() => {
                void navigate("/controls?tab=matrix");
              }}
            >
              <BarChart3 size={17} />
            </IconButton>
          }
        />
        <div className="coverage-number">
          <strong>{coveredPct}%</strong>
          <span>
            fully covered · {data.coverage.covered} of {applicable}
          </span>
        </div>
        <StackedBar
          label="Coverage of applicable obligations"
          segments={[
            { key: "covered", label: "Covered", value: data.coverage.covered, className: "seq-5" },
            { key: "partial", label: "Partial", value: data.coverage.partial, className: "seq-4" },
            {
              key: "insufficient",
              label: "Insufficient",
              value: data.coverage.insufficient_info,
              className: "seq-2",
            },
            { key: "missing", label: "Missing", value: data.coverage.none, className: "seq-1" },
          ]}
        />
      </Sheet>
      <Sheet className="chart-card">
        <SectionHeading
          eyebrow="Risk distribution"
          title="Gaps by type"
          action={<Gauge size={18} className="muted-icon" aria-hidden="true" />}
        />
        <PriorityBars
          label="Open gaps by type and priority"
          rows={data.gaps_by_type.map((row) => ({
            label: GAP_TYPE[row.gap_type].label,
            counts: row.counts,
          }))}
        />
      </Sheet>
    </section>
  );
}

function AnalystCharts({ data }: { data: DashboardSummary }) {
  const evaluation = useEvalReport();
  return (
    <section className="dashboard-grid">
      <Sheet className="chart-card">
        <SectionHeading
          eyebrow="Measured quality"
          title="Accuracy against answer key"
          action={
            evaluation.data?.is_mock ? <StatusTag tone="warning">Mock evaluation</StatusTag> : null
          }
        />
        <QueryView query={evaluation} what="accuracy metrics" rows={4}>
          {(report) => (
            <>
              <MeterList label="Accuracy metrics, 0 to 1" items={report.metrics} />
              <p className="chart-note">{report.method}</p>
            </>
          )}
        </QueryView>
      </Sheet>
      <Sheet className="chart-card">
        <SectionHeading
          eyebrow="Review status"
          title="Extracted obligations"
          action={<ListChecks size={18} className="muted-icon" aria-hidden="true" />}
        />
        <StackedBar
          label="Review status of extracted obligations"
          segments={[
            {
              key: "accepted",
              label: "Accepted",
              value: data.review.obligations_accepted,
              className: "seq-5",
            },
            {
              key: "edited",
              label: "Edited",
              value: data.review.obligations_edited,
              className: "seq-3",
            },
            {
              key: "suggested",
              label: "Awaiting review",
              value: data.review.obligations_suggested,
              className: "seq-2",
            },
            {
              key: "rejected",
              label: "Rejected",
              value: data.review.obligations_rejected,
              className: "seq-1",
            },
          ]}
        />
        <p className="chart-note">
          Quotes verified as verbatim: {data.review.quotes_verified} of {data.review.quotes_total}.
          Mappings awaiting review: {data.review.mappings_to_review}.
        </p>
      </Sheet>
    </section>
  );
}

function TopRisks() {
  const navigate = useNavigate();
  const gaps = useGaps();
  return (
    <Sheet>
      <div className="sheet-pad">
        <SectionHeading
          eyebrow="Priority ledger"
          title="Top risks"
          action={
            <TextButton
              onClick={() => {
                void navigate("/gaps");
              }}
            >
              View all <ArrowRight size={14} />
            </TextButton>
          }
        />
      </div>
      <QueryView query={gaps} what="gaps" rows={4}>
        {(items) => (
          <ul className="risk-list">
            {items
              .filter((gap) => gap.status !== "dismissed")
              .slice(0, 4)
              .map((gap) => (
                <li key={gap.id}>
                  <button
                    type="button"
                    className="risk-row"
                    onClick={() => {
                      void navigate(`/gaps/${gap.id}`);
                    }}
                  >
                    <PriorityChip value={gap.priority} />
                    <span className="mono">{gap.code}</span>
                    <span className="risk-title">
                      {gap.title}
                      {gap.origin === "change" ? <small>From change</small> : null}
                    </span>
                    <strong aria-label={`Risk score ${formatScore(gap.risk_score)}`}>
                      {formatScore(gap.risk_score)}
                    </strong>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </QueryView>
    </Sheet>
  );
}

function ReviewQueue() {
  const navigate = useNavigate();
  const obligations = useObligations();
  const mappings = useMappings();
  return (
    <Sheet>
      <div className="sheet-pad">
        <SectionHeading
          eyebrow="Work queue"
          title="Items awaiting your review"
          action={
            <TextButton
              onClick={() => {
                void navigate("/obligations?review=suggested");
              }}
            >
              View all <ArrowRight size={14} />
            </TextButton>
          }
        />
      </div>
      <QueryView query={obligations} what="obligations" rows={4}>
        {(items) => {
          const queue = [
            ...items
              .filter((item) => item.review_status === "suggested")
              .map((item) => ({
                id: item.id,
                type: "OB",
                code: item.code,
                text: item.summary,
                meta: item.clause_ref,
                to: `/obligations?select=${item.id}`,
              })),
            ...(mappings.data ?? [])
              .filter((item) => item.status === "needs_review")
              .map((item) => ({
                id: item.id,
                type: "MAP",
                code: item.graph_path.at(-1) ?? "",
                text: item.rationale,
                meta: "Needs review",
                to: "/controls?tab=matrix",
              })),
          ].slice(0, 5);
          return (
            <ul className="risk-list">
              {queue.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="risk-row"
                    onClick={() => {
                      void navigate(item.to);
                    }}
                  >
                    <span className="queue-type">{item.type}</span>
                    <span className="mono">{item.code}</span>
                    <span className="risk-title">{item.text}</span>
                    <span className="mono muted">{item.meta}</span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          );
        }}
      </QueryView>
    </Sheet>
  );
}

interface InsightProps {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}

function Insight({ eyebrow, title, body, actionLabel, onAction }: InsightProps) {
  return (
    <Sheet className="insight">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="insight-rule" aria-hidden="true" />
      <Button variant="accent" onClick={onAction}>
        {actionLabel} <ArrowRight size={15} />
      </Button>
    </Sheet>
  );
}
