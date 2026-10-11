import { ArrowLeft, Check, EyeOff, FileDiff, Network, Printer, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";

import { useActor } from "@/app/actor-context";
import { EvidenceTable } from "@/components/data-display/evidence-table";
import { GraphPath } from "@/components/data-display/graph-path";
import { PriorityChip } from "@/components/data-display/priority-chip";
import { QuoteBlock } from "@/components/data-display/quote-block";
import { LabelTag, StatusTag } from "@/components/data-display/status-tag";
import { QueryView } from "@/components/feedback/query-view";
import { useToast } from "@/components/feedback/toast-context";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { useGapTrace, useUpdateGapStatus, useUpdateRemediation } from "@/hooks/use-rulesight";
import { formatDateTime, formatScore } from "@/lib/format";
import {
  APPLICABILITY_LABEL,
  COVERAGE,
  DESIGN,
  GAP_STATUS,
  GAP_TYPE,
  OPERATING,
  REMEDIATION_STATUS,
} from "@/lib/labels";
import type { GapStatus, GapTrace, Remediation } from "@/types/domain";

const SEVERITY_NOTE: Record<string, string> = {
  missing: "missing",
  design_operating: "design + operating",
  design: "design",
  operating: "operating",
  insufficient_info: "insufficient info",
};

export function GapTracePage() {
  const { gapId = "" } = useParams();
  const trace = useGapTrace(gapId);
  const title = trace.data ? `${trace.data.gap.code} · ${trace.data.gap.title}` : "Gap trace";

  return (
    <PageFrame
      eyebrow="Gap trace · clause to remediation"
      title={title}
      subtitle={
        trace.data ? (
          <span className="trace-subtitle">
            <PriorityChip value={trace.data.gap.priority} />
            <LabelTag value={GAP_TYPE[trace.data.gap.gap_type]} />
            <LabelTag value={GAP_STATUS[trace.data.gap.status]} />
            <span className="mono">
              {trace.data.obligation.source_label} · {trace.data.obligation.clause_ref}
            </span>
          </span>
        ) : (
          "Loading the evidence chain…"
        )
      }
      action={
        <>
          <Link className="button ghost" to="/gaps">
            <ArrowLeft size={15} /> All gaps
          </Link>
          <Button
            icon={<Printer size={15} />}
            onClick={() => {
              window.print();
            }}
          >
            Print
          </Button>
        </>
      }
    >
      <QueryView query={trace} what="the gap trace" rows={10}>
        {(data) => <TraceBody data={data} />}
      </QueryView>
    </PageFrame>
  );
}

function TraceBody({ data }: { data: GapTrace }) {
  const {
    gap,
    obligation,
    document,
    controls,
    mappings,
    assessment,
    evidence,
    remediations,
    change,
    audit,
  } = data;
  return (
    <div className="trace-layout">
      <div className="trace-main">
        {change ? (
          <div className="notice accent">
            <FileDiff size={17} aria-hidden="true" />
            <div>
              <strong>Introduced by a regulatory change</strong>
              <span>
                {change.summary} Urgency ×{gap.risk_factors.urgency}.{" "}
                <Link to="/changes">View the change</Link>
              </span>
            </div>
          </div>
        ) : null}

        <ol className="trace">
          <TraceStep n={1} entity="clause" title="Regulation clause">
            <p className="trace-meta">
              <span className="serif">{document.title}</span>
              <StatusTag tone="primary" outline>
                RBI · Real text
              </StatusTag>
            </p>
            <QuoteBlock
              text={obligation.source_quote}
              highlight={obligation.key_phrase}
              source={`${obligation.source_label} · ${obligation.clause_ref}${obligation.page ? ` · p. ${String(obligation.page)}` : ""}`}
              verified={obligation.quote_verified}
            />
          </TraceStep>

          <TraceStep n={2} entity="obligation" title={`Obligation · ${obligation.code}`}>
            <p className="trace-lede">
              <strong>{obligation.actor}</strong> must{" "}
              {obligation.action.charAt(0).toLowerCase() + obligation.action.slice(1)}.
            </p>
            <dl className="inline-facts">
              <div>
                <dt>Frequency</dt>
                <dd>{obligation.frequency ?? "Not specified"}</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>{obligation.deadline ?? "Not specified"}</dd>
              </div>
              <div>
                <dt>Threshold</dt>
                <dd>{obligation.threshold ?? "Not specified"}</dd>
              </div>
              <div>
                <dt>Applicability</dt>
                <dd>{APPLICABILITY_LABEL[obligation.applicability]}</dd>
              </div>
            </dl>
          </TraceStep>

          <TraceStep
            n={3}
            entity="control"
            title={controls.length === 1 ? "Control" : `Controls · ${String(controls.length)}`}
          >
            {controls.length === 0 ? (
              <div className="notice neutral">
                <div>
                  <strong>No control in the RCM or policies covers this obligation.</strong>
                  <span>
                    The graph search (kg_candidates and kg_orphans) found no control on this topic.
                  </span>
                </div>
              </div>
            ) : (
              controls.map((control) => {
                const mapping = mappings.find((item) => item.control_id === control.id);
                return (
                  <article className="control-card" key={control.id}>
                    <header>
                      <span className="mono">{control.code}</span>
                      <strong>{control.name}</strong>
                      {mapping ? <LabelTag value={COVERAGE[mapping.coverage]} /> : null}
                    </header>
                    <p className="trace-meta">
                      {control.owner} · {control.frequency} · {control.automation} ·{" "}
                      {control.source_document} {control.source_section}
                    </p>
                    <QuoteBlock
                      text={control.description}
                      source={`${control.source_document} · ${control.source_section} · Fictional bank`}
                      size="compact"
                    />
                    {mapping ? (
                      <>
                        <GraphPath path={mapping.graph_path} critic={mapping.critic} />
                        <p className="rationale">{mapping.rationale}</p>
                      </>
                    ) : null}
                  </article>
                );
              })
            )}
          </TraceStep>

          <TraceStep
            n={4}
            entity="evidence"
            title={
              evidence.length
                ? `Evidence · ${evidence.map((item) => item.code).join(", ")}`
                : "Evidence"
            }
          >
            {evidence.length === 0 ? (
              <div className="notice neutral">
                <EyeOff size={16} aria-hidden="true" />
                <div>
                  <strong>No evidence supplied for this control.</strong>
                  <span>
                    Operating effectiveness: Insufficient evidence. RuleSight does not assume
                    compliance.
                  </span>
                </div>
              </div>
            ) : (
              evidence.map((item) => <EvidenceTable key={item.id} evidence={item} />)
            )}
          </TraceStep>

          <TraceStep n={5} entity="assessment" title="Assessment">
            {assessment ? (
              <div className="assessment-grid">
                <div>
                  <span className="eyebrow">Design</span>
                  <LabelTag value={DESIGN[assessment.design]} />
                  <p>{assessment.design_note}</p>
                </div>
                <div>
                  <span className="eyebrow">Operating</span>
                  <LabelTag value={OPERATING[assessment.operating]} />
                  <p>{assessment.operating_note}</p>
                </div>
              </div>
            ) : (
              <p className="muted">Not assessed yet.</p>
            )}
          </TraceStep>

          <TraceStep n={6} entity="gap" title={`Gap · ${GAP_TYPE[gap.gap_type].label}`}>
            <p className="trace-lede serif">{gap.description}</p>
          </TraceStep>

          <TraceStep n={7} entity="remediation" title="Remediation">
            {remediations.length === 0 ? (
              <p className="muted">No remediation drafted yet.</p>
            ) : (
              remediations.map((item) => (
                <RemediationCard key={item.id} remediation={item} gapCode={gap.code} />
              ))
            )}
          </TraceStep>

          <TraceStep n={8} entity="audit" title="Audit history">
            {audit.length === 0 ? (
              <p className="muted">No recorded actions yet.</p>
            ) : (
              <ul className="audit-list">
                {audit.map((entry) => (
                  <li key={entry.id}>
                    <span className="mono">{formatDateTime(entry.at)}</span>
                    <span className="audit-actor">{entry.actor}</span>
                    <span>
                      {entry.action}
                      {entry.before && entry.after ? (
                        <span className="mono muted">
                          {" "}
                          {Object.values(entry.before).join(", ")} →{" "}
                          {Object.values(entry.after).join(", ")}
                        </span>
                      ) : null}
                      {entry.reason ? <em className="audit-reason">“{entry.reason}”</em> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TraceStep>
        </ol>
      </div>
      <VerdictRail data={data} />
    </div>
  );
}

function TraceStep({
  n,
  entity,
  title,
  children,
}: {
  n: number;
  entity: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className={`trace-step ${entity}`}>
      <span className="trace-dot" aria-hidden="true" />
      <h2 className="trace-title">
        <span className="mono">§{n}</span> <span className="eyebrow">{title}</span>
      </h2>
      <div className="trace-content">{children}</div>
    </li>
  );
}

function VerdictRail({ data }: { data: GapTrace }) {
  const { gap } = data;
  const { actor } = useActor();
  const { notify } = useToast();
  const updateStatus = useUpdateGapStatus();
  const [pendingStatus, setPendingStatus] = useState<GapStatus | null>(null);
  const factors = gap.risk_factors;

  const apply = (status: GapStatus, reason: string | null) => {
    updateStatus.mutate(
      { id: gap.id, status, reason },
      {
        onSuccess: () => {
          setPendingStatus(null);
          notify({
            title: `${gap.code}: ${GAP_STATUS[status].label.toLowerCase()}`,
            detail: `Recorded as ${actor.name}.`,
          });
        },
      },
    );
  };

  return (
    <aside className="verdict" aria-label="Verdict and actions">
      <div className="verdict-block">
        <span className="eyebrow">Verdict</span>
        <div className="risk-total">
          <span>Risk score</span>
          <strong>{formatScore(gap.risk_score)}</strong>
        </div>
        <dl className="ledger">
          <div>
            <dt>Criticality ({data.obligation.topic})</dt>
            <dd>{factors.criticality}</dd>
          </div>
          <div>
            <dt>× Severity ({SEVERITY_NOTE[gap.gap_type]})</dt>
            <dd>{factors.severity}</dd>
          </div>
          <div>
            <dt>× Urgency ({gap.origin === "change" ? "regulatory change" : "initial"})</dt>
            <dd>{factors.urgency}</dd>
          </div>
          <div className="ledger-total">
            <dt>
              = {formatScore(gap.risk_score)} → {gap.priority}
            </dt>
            <dd className="mono">rule {factors.rule_version}</dd>
          </div>
        </dl>
      </div>
      <div className="verdict-block">
        <span className="eyebrow">Status</span>
        <p>
          <LabelTag value={GAP_STATUS[gap.status]} />
        </p>
        <div className="verdict-actions">
          <Button
            variant="primary"
            icon={<Check size={15} />}
            disabled={gap.status === "confirmed" || updateStatus.isPending}
            onClick={() => {
              setPendingStatus("confirmed");
            }}
          >
            Confirm gap
          </Button>
          <Button
            disabled={gap.status === "needs_info" || updateStatus.isPending}
            onClick={() => {
              setPendingStatus("needs_info");
            }}
          >
            Needs info
          </Button>
          <Button
            variant="danger"
            icon={<X size={15} />}
            disabled={gap.status === "dismissed" || updateStatus.isPending}
            onClick={() => {
              setPendingStatus("dismissed");
            }}
          >
            Dismiss
          </Button>
        </div>
        <p className="verdict-actor">
          Acting as <strong>{actor.name}</strong>
        </p>
      </div>
      <div className="verdict-block">
        <Link className="button ghost full" to={`/graph?focus=${gap.id}`}>
          <Network size={15} /> View in graph
        </Link>
      </div>
      {pendingStatus ? (
        <ReasonDialog
          title={`${pendingStatus === "confirmed" ? "Confirm" : pendingStatus === "dismissed" ? "Dismiss" : "Request information for"} ${gap.code}`}
          confirmLabel={
            pendingStatus === "confirmed"
              ? "Confirm gap"
              : pendingStatus === "dismissed"
                ? "Dismiss gap"
                : "Request information"
          }
          variant={pendingStatus === "dismissed" ? "danger" : "primary"}
          requireReason={pendingStatus !== "confirmed"}
          pending={updateStatus.isPending}
          onCancel={() => {
            setPendingStatus(null);
          }}
          onConfirm={(reason) => {
            apply(pendingStatus, reason || null);
          }}
        />
      ) : null}
    </aside>
  );
}

function RemediationCard({ remediation, gapCode }: { remediation: Remediation; gapCode: string }) {
  const update = useUpdateRemediation();
  const { notify } = useToast();
  const [rejecting, setRejecting] = useState(false);
  const isDraft = remediation.status === "draft";

  return (
    <article className="remediation-card">
      <header>
        <LabelTag value={REMEDIATION_STATUS[remediation.status]} />
        {isDraft ? <span className="muted">Drafted by agent · awaiting approval</span> : null}
      </header>
      <p className="serif remediation-action">{remediation.action}</p>
      <dl className="inline-facts">
        <div>
          <dt>Owner team</dt>
          <dd>{remediation.owner_team}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>{remediation.target_days} days</dd>
        </div>
        <div className="wide">
          <dt>Closure evidence</dt>
          <dd>{remediation.closure_evidence}</dd>
        </div>
      </dl>
      {isDraft ? (
        <div className="action-row">
          <Button
            variant="primary"
            icon={<Check size={15} />}
            disabled={update.isPending}
            onClick={() => {
              update.mutate(
                { id: remediation.id, update: { status: "approved" } },
                {
                  onSuccess: () => {
                    notify({
                      title: `Remediation for ${gapCode} approved`,
                      detail: "The audit history has a new entry.",
                    });
                  },
                },
              );
            }}
          >
            Approve remediation
          </Button>
          <Button
            variant="danger"
            disabled={update.isPending}
            onClick={() => {
              setRejecting(true);
            }}
          >
            Reject
          </Button>
        </div>
      ) : remediation.status === "approved" ? (
        <div className="action-row">
          <Button
            disabled={update.isPending}
            onClick={() => {
              update.mutate({ id: remediation.id, update: { status: "in_progress" } });
            }}
          >
            Mark in progress
          </Button>
        </div>
      ) : null}
      {rejecting ? (
        <ReasonDialog
          title={`Reject remediation for ${gapCode}`}
          confirmLabel="Reject remediation"
          pending={update.isPending}
          onCancel={() => {
            setRejecting(false);
          }}
          onConfirm={(reason) => {
            update.mutate(
              { id: remediation.id, update: { status: "rejected", reason } },
              {
                onSuccess: () => {
                  setRejecting(false);
                },
              },
            );
          }}
        />
      ) : null}
    </article>
  );
}
