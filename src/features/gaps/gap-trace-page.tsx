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
import { Button, TextButton } from "@/components/ui/button";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { useGapTrace, useUpdateGapStatus, useUpdateRemediation } from "@/hooks/use-rulesight";
import { formatScore, formatStamp } from "@/lib/format";
import {
  APPLICABILITY_LABEL,
  DESIGN,
  GAP_STATUS,
  GAP_TYPE,
  OPERATING,
  REMEDIATION_STATUS,
  REVIEW_STATUS,
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
  const data = trace.data;

  return (
    <PageFrame
      back={{ to: "/gaps", label: "All gaps" }}
      documentTitle={data ? `${data.gap.code} · ${data.gap.title}` : "Gap trace"}
      title={
        data ? (
          <>
            <span className="page-title-id">{data.gap.code}</span> · {data.gap.title}
          </>
        ) : (
          "Gap trace"
        )
      }
      subtitle={data ? undefined : "Loading the evidence chain…"}
      meta={
        data ? (
          <div className="tag-row">
            <PriorityChip value={data.gap.priority} />
            <StatusTag tone="plain">{GAP_TYPE[data.gap.gap_type].label}</StatusTag>
            <LabelTag
              value={GAP_STATUS[data.gap.status]}
              struck={data.gap.status === "dismissed"}
            />
            <span className="mono push">
              {data.document.title} · {data.obligation.clause_ref}
            </span>
          </div>
        ) : null
      }
    >
      <QueryView query={trace} what="the gap trace" rows={10}>
        {(loaded) => <TraceBody data={loaded} />}
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
          <div className="change-banner">
            <span className="eyebrow">Regulatory change</span>
            <span>
              Introduced by a regulatory change: {change.summary} Urgency ×
              {gap.risk_factors.urgency}.
            </span>
            <Link to="/changes">View change {change.code}</Link>
          </div>
        ) : null}

        <ol className="trace">
          <TraceStep n={1} kind="clause" title="Regulation clause">
            <p className="trace-doc">{document.title}</p>
            <QuoteBlock
              size="large"
              text={obligation.source_quote}
              highlight={obligation.key_phrase}
              source={`${obligation.source_label} · ${obligation.clause_ref}${obligation.page ? ` · p. ${String(obligation.page)}` : ""}`}
              verified={obligation.quote_verified}
            />
          </TraceStep>

          <TraceStep n={2} kind="obligation" title="Obligation" entity={obligation.code}>
            <p className="trace-lede">
              <span className="muted">{obligation.actor} must</span>{" "}
              {obligation.action.charAt(0).toLowerCase() + obligation.action.slice(1)}
            </p>
            <div className="trace-meta">
              <StatusTag tone={obligation.applicability === "applicable" ? "primary" : "neutral"}>
                {APPLICABILITY_LABEL[obligation.applicability]}
              </StatusTag>
              <LabelTag value={REVIEW_STATUS[obligation.review_status]} />
              <span className="push">
                Criticality {obligation.criticality} · {obligation.topic}
              </span>
            </div>
          </TraceStep>

          <TraceStep n={3} kind="control" title={controls.length > 1 ? "Controls" : "Control"}>
            {controls.length === 0 ? (
              <div className="empty-block">
                <p>No control in the RCM or policies covers this obligation.</p>
                <div className="graph-path">
                  <span className="eyebrow">Search</span>
                  <span>
                    {obligation.code} → topic: {obligation.topic} ←
                  </span>
                  <span className="fg">no control found</span>
                  <span>· kg_orphans</span>
                </div>
              </div>
            ) : (
              controls.map((control) => {
                const mapping = mappings.find((item) => item.control_id === control.id);
                return (
                  <div className="control-block" key={control.id}>
                    <header>
                      <span className="mono">{control.code}</span>
                      <strong>{control.name}</strong>
                    </header>
                    <p className="muted">
                      {control.owner} · {control.frequency} · {control.automation} ·{" "}
                      {control.control_type}
                    </p>
                    <QuoteBlock
                      size="compact"
                      text={control.description}
                      source={`${control.source_document} ${control.source_section}`}
                    />
                    {mapping ? (
                      <>
                        <GraphPath path={mapping.graph_path} critic={mapping.critic} />
                        <p className="rationale">{mapping.rationale}</p>
                      </>
                    ) : null}
                  </div>
                );
              })
            )}
          </TraceStep>

          <TraceStep n={4} kind="evidence" title="Evidence">
            {evidence.length === 0 ? (
              <div className="empty-block neutral">
                No evidence supplied for this control. Operating effectiveness:{" "}
                <strong>Insufficient evidence</strong>. RuleSight does not assume compliance.
              </div>
            ) : (
              evidence.map((item) => <EvidenceTable key={item.id} evidence={item} />)
            )}
          </TraceStep>

          <TraceStep n={5} kind="assessment" title="Assessment">
            {assessment ? (
              <>
                <div className="assessment-row">
                  <span>
                    Design <LabelTag value={DESIGN[assessment.design]} />
                  </span>
                  <span>
                    Operating <LabelTag value={OPERATING[assessment.operating]} />
                  </span>
                </div>
                <p className="trace-prose">
                  {assessment.design_note} {assessment.operating_note}
                </p>
              </>
            ) : (
              <p className="muted">Not assessed yet.</p>
            )}
          </TraceStep>

          <TraceStep n={6} kind="gap" title="Gap" entity={GAP_TYPE[gap.gap_type].label} plain>
            <p className="trace-prose">{gap.description}</p>
          </TraceStep>

          <TraceStep
            n={7}
            kind="remediation"
            title="Remediation"
            extra={
              remediations[0] ? (
                <>
                  <LabelTag value={REMEDIATION_STATUS[remediations[0].status]} />
                  <span className="cell-sub">
                    {remediations[0].status === "draft"
                      ? "Drafted by agent · awaiting approval"
                      : "Drafted by agent"}
                  </span>
                </>
              ) : null
            }
          >
            {remediations.length === 0 ? (
              <p className="muted">No remediation drafted yet.</p>
            ) : (
              remediations.map((item) => (
                <RemediationPlan key={item.id} remediation={item} gapCode={gap.code} />
              ))
            )}
          </TraceStep>

          <TraceStep n={8} kind="audit" title="Audit history">
            {audit.length === 0 ? (
              <p className="muted">No recorded actions yet.</p>
            ) : (
              <ul className="audit-list">
                {audit.map((entry) => (
                  <li key={entry.id}>
                    <span className="mono">{formatStamp(entry.at)}</span>
                    <span className={entry.actor === "Pipeline" ? "pipeline" : undefined}>
                      {entry.actor}
                    </span>
                    <span>
                      {entry.action}
                      {entry.before && entry.after ? (
                        <span className="mono muted">
                          {" "}
                          ({Object.values(entry.before).join(", ")} →{" "}
                          {Object.values(entry.after).join(", ")})
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
  kind,
  title,
  entity,
  plain = false,
  extra,
  children,
}: {
  n: number;
  kind: string;
  title: string;
  /** Code or label shown after the step name. */
  entity?: string;
  /** Show `entity` in sans rather than mono. */
  plain?: boolean;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={`trace-step kind-${kind}`}>
      <span className="trace-dot" aria-hidden="true" />
      <h2 className="trace-title">
        <span className="mono">§{n}</span>
        <span className="eyebrow">{title}</span>
        {entity ? (
          <span className={plain ? "entity-label" : "mono entity-id"}>{entity}</span>
        ) : null}
        {extra}
      </h2>
      <div className="trace-content">{children}</div>
    </li>
  );
}

const STATUS_DIALOG: Record<
  Exclude<GapStatus, "potential">,
  { title: string; body: string; cta: string; reason: boolean; danger: boolean }
> = {
  confirmed: {
    title: "Confirm gap",
    body: "The gap moves from Potential to Confirmed and is included in the next compliance report.",
    cta: "Confirm gap",
    reason: false,
    danger: false,
  },
  needs_info: {
    title: "Mark as needing information:",
    body: "The gap stays open and is flagged for the control owner to supply evidence.",
    cta: "Mark needs info",
    reason: false,
    danger: false,
  },
  dismissed: {
    title: "Dismiss",
    body: "Dismissed gaps stay in the audit trail but leave the open count.",
    cta: "Dismiss gap",
    reason: true,
    danger: true,
  },
};

function VerdictRail({ data }: { data: GapTrace }) {
  const { gap } = data;
  const { actor } = useActor();
  const { notify } = useToast();
  const updateStatus = useUpdateGapStatus();
  const [pending, setPending] = useState<Exclude<GapStatus, "potential"> | null>(null);
  const factors = data.gap.risk_factors;
  const dialog = pending ? STATUS_DIALOG[pending] : null;

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
            <dt>
              Criticality <small>({data.obligation.topic})</small>
            </dt>
            <dd>{factors.criticality}</dd>
          </div>
          <div>
            <dt>
              × Severity <small>({SEVERITY_NOTE[gap.gap_type]})</small>
            </dt>
            <dd>{factors.severity}</dd>
          </div>
          <div className="ledger-last">
            <dt>
              × Urgency <small>({gap.origin === "change" ? "from change" : "initial"})</small>
            </dt>
            <dd>{factors.urgency}</dd>
          </div>
          <div className="ledger-total">
            <dt>
              = {formatScore(gap.risk_score)} → {gap.priority}
            </dt>
            <dd>rule {factors.rule_version}</dd>
          </div>
        </dl>
      </div>
      <div className="verdict-block">
        <div className="status-line">
          <span>Status</span>
          <LabelTag value={GAP_STATUS[gap.status]} struck={gap.status === "dismissed"} />
        </div>
        {gap.status !== "dismissed" ? (
          <div className="verdict-actions">
            <Button
              variant="primary"
              disabled={gap.status === "confirmed" || updateStatus.isPending}
              onClick={() => {
                setPending("confirmed");
              }}
            >
              Confirm gap
            </Button>
            <Button
              size="sm"
              disabled={gap.status === "needs_info" || updateStatus.isPending}
              onClick={() => {
                setPending("needs_info");
              }}
            >
              Needs info
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={updateStatus.isPending}
              onClick={() => {
                setPending("dismissed");
              }}
            >
              Dismiss
            </Button>
          </div>
        ) : null}
        <Link className="text-button" to={`/graph?focus=${gap.id}`}>
          View in graph →
        </Link>
      </div>
      <div className="verdict-actor">
        <span className="avatar small" aria-hidden="true">
          {actor.initials}
        </span>
        Acting as {actor.name}
      </div>
      {pending && dialog ? (
        <ReasonDialog
          title={`${dialog.title} ${gap.code}`}
          body={dialog.body}
          confirmLabel={dialog.cta}
          danger={dialog.danger}
          requireReason={dialog.reason}
          pending={updateStatus.isPending}
          onCancel={() => {
            setPending(null);
          }}
          onConfirm={(reason) => {
            updateStatus.mutate(
              { id: gap.id, status: pending, reason: reason || null },
              {
                onSuccess: () => {
                  setPending(null);
                  notify({
                    title: `${gap.code}: ${GAP_STATUS[pending].label.toLowerCase()}`,
                    detail: `Recorded as ${actor.name}.`,
                  });
                },
              },
            );
          }}
        />
      ) : null}
    </aside>
  );
}

function RemediationPlan({ remediation, gapCode }: { remediation: Remediation; gapCode: string }) {
  const update = useUpdateRemediation();
  const { notify } = useToast();
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);

  return (
    <>
      <dl className="definition-list wide-terms">
        <dt>Action</dt>
        <dd>{remediation.action}</dd>
        <dt>Owner team</dt>
        <dd>{remediation.owner_team}</dd>
        <dt>Target</dt>
        <dd>{remediation.target_days} days</dd>
        <dt>Closure evidence</dt>
        <dd>{remediation.closure_evidence}</dd>
      </dl>
      {remediation.status === "draft" ? (
        <div className="action-row">
          <Button
            variant="primary"
            disabled={update.isPending}
            onClick={() => {
              setConfirming("approve");
            }}
          >
            Approve remediation
          </Button>
          <Button
            variant="danger"
            disabled={update.isPending}
            onClick={() => {
              setConfirming("reject");
            }}
          >
            Reject
          </Button>
        </div>
      ) : remediation.status === "approved" ? (
        <div className="action-row">
          <TextButton
            disabled={update.isPending}
            onClick={() => {
              update.mutate({ id: remediation.id, update: { status: "in_progress" } });
            }}
          >
            Mark in progress →
          </TextButton>
        </div>
      ) : null}
      {confirming ? (
        <ReasonDialog
          title={`${confirming === "approve" ? "Approve" : "Reject"} remediation for ${gapCode}`}
          body={
            confirming === "approve"
              ? "The drafted action, owner and target become the agreed plan for this gap."
              : "The draft is returned to the agent with your reason."
          }
          confirmLabel={confirming === "approve" ? "Approve remediation" : "Reject remediation"}
          danger={confirming === "reject"}
          requireReason={confirming === "reject"}
          pending={update.isPending}
          onCancel={() => {
            setConfirming(null);
          }}
          onConfirm={(reason) => {
            update.mutate(
              {
                id: remediation.id,
                update:
                  confirming === "approve"
                    ? { status: "approved" }
                    : { status: "rejected", reason },
              },
              {
                onSuccess: () => {
                  setConfirming(null);
                  notify({
                    title: `Remediation for ${gapCode} ${confirming === "approve" ? "approved" : "rejected"}`,
                    detail: "The audit history has a new entry.",
                  });
                },
              },
            );
          }}
        />
      ) : null}
    </>
  );
}
