import {
  ASSESSMENTS,
  AUDIT_LOG,
  CHANGES,
  CONTROLS,
  DOCUMENTS,
  EVAL_REPORT,
  EVIDENCE,
  GAPS,
  INITIAL_RUNS,
  MAPPINGS,
  MISSING_CIRCULARS,
  OBLIGATIONS,
  PIPELINE_NODES,
  REMEDIATIONS,
} from "@/mocks/fixtures";
import type {
  Actor,
  AgentRun,
  AuditEntry,
  DashboardSummary,
  DocType,
  GapStatus,
  GapTrace,
  GapType,
  GraphEdge,
  GraphNode,
  KnowledgeGraph,
  MappingStatus,
  Obligation,
  Priority,
  RemediationStatus,
  ReviewStatus,
  RunNode,
  SourceDocument,
} from "@/types/domain";

/*
 * In-memory stand-in for the backend while VITE_USE_MOCKS=true. It applies the
 * same rules the API will: every write records an audit entry with the actor.
 * State resets on page reload.
 */

/** Live (simulated) runs compress real node durations so the demo finishes in seconds. */
const LIVE_RUN_SPEEDUP = 40;
/** Simulated processing time for a newly uploaded document. */
const UPLOAD_PROCESSING_MS = 4000;
const PHASE_OUT_DEADLINE = "2027-06-30T00:00:00+05:30";

interface StoredRun {
  id: string;
  run_id: string;
  started_at: string;
  trigger: string;
  cache_hits: number;
  live: boolean;
}

function createState() {
  return {
    documents: structuredClone(DOCUMENTS),
    obligations: structuredClone(OBLIGATIONS),
    mappings: structuredClone(MAPPINGS),
    gaps: structuredClone(GAPS),
    remediations: structuredClone(REMEDIATIONS),
    audit: structuredClone(AUDIT_LOG),
    runs: INITIAL_RUNS.map((run): StoredRun => ({ ...run, live: false })),
    sequence: 100,
  };
}

let state = createState();

/** Restores the fixtures. Used by tests. */
export function resetMockDb(): void {
  state = createState();
}

function nextId(prefix: string): string {
  state.sequence += 1;
  return `${prefix}-${String(state.sequence)}`;
}

function record(
  actor: Actor,
  entry: Omit<AuditEntry, "id" | "at" | "actor" | "actor_role">,
  now: number,
): void {
  state.audit.unshift({
    id: nextId("au"),
    at: new Date(now).toISOString(),
    actor: actor.name,
    actor_role: actor.role,
    ...entry,
  });
}

function findOrThrow<T extends { id: string }>(items: T[], id: string, label: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) {
    throw new Error(`${label} ${id} was not found.`);
  }
  return item;
}

// ---- Documents --------------------------------------------------------------------------------

export function listDocuments(now: number): SourceDocument[] {
  for (const doc of state.documents) {
    if (doc.status === "processing" && now - Date.parse(doc.created_at) > UPLOAD_PROCESSING_MS) {
      doc.status = "ready";
    }
  }
  return state.documents;
}

export interface NewDocumentInput {
  file?: File;
  file_name: string;
  file_size: number;
  doc_type: DocType;
  title: string;
  regulator: string | null;
  version_label: string;
  supersedes_id: string | null;
}

export function addDocument(input: NewDocumentInput, actor: Actor, now: number): SourceDocument {
  const doc: SourceDocument = {
    id: nextId("doc"),
    doc_type: input.doc_type,
    title: input.title,
    reference: input.file_name,
    regulator: input.regulator,
    version_label: input.version_label || "Unversioned",
    supersedes_id: input.supersedes_id,
    is_synthetic: input.doc_type !== "regulation",
    status: "processing",
    withdrawn_note: null,
    created_at: new Date(now).toISOString(),
    sha256: "",
    chunk_count: 0,
    obligation_count: 0,
  };
  state.documents.unshift(doc);
  record(
    actor,
    {
      action: "Uploaded document",
      entity_type: "document",
      entity_code: input.title,
      reason: null,
      before: null,
      after: { status: "processing", file: input.file_name },
    },
    now,
  );
  return doc;
}

// ---- Obligations and mappings -------------------------------------------------------------------

export function listObligations(): Obligation[] {
  return state.obligations;
}

export interface ObligationUpdate {
  review_status: ReviewStatus;
  reason?: string | undefined;
  fields?: Partial<
    Pick<Obligation, "action" | "frequency" | "deadline" | "threshold" | "condition">
  >;
}

export function updateObligation(
  id: string,
  update: ObligationUpdate,
  actor: Actor,
  now: number,
): Obligation {
  const obligation = findOrThrow(state.obligations, id, "Obligation");
  const before = obligation.review_status;
  obligation.review_status = update.review_status;
  if (update.fields) {
    Object.assign(obligation, update.fields);
  }
  record(
    actor,
    {
      action: `${capitalise(update.review_status)} obligation`,
      entity_type: "obligation",
      entity_code: obligation.code,
      reason: update.reason ?? null,
      before: { review_status: before },
      after: { review_status: update.review_status },
    },
    now,
  );
  return obligation;
}

export function listControls() {
  return CONTROLS;
}

export function listMappings() {
  return state.mappings;
}

export function updateMapping(id: string, status: MappingStatus, actor: Actor, now: number) {
  const item = findOrThrow(state.mappings, id, "Mapping");
  const before = item.status;
  item.status = status;
  const obligation = findOrThrow(state.obligations, item.obligation_id, "Obligation");
  const control = findOrThrow(CONTROLS, item.control_id, "Control");
  record(
    actor,
    {
      action: `${capitalise(status)} mapping`,
      entity_type: "mapping",
      entity_code: `${obligation.code} → ${control.code}`,
      reason: null,
      before: { status: before },
      after: { status },
    },
    now,
  );
  return item;
}

// ---- Gaps, remediation and the trace -------------------------------------------------------------

export function listGaps() {
  return [...state.gaps].sort((a, b) => b.risk_score - a.risk_score);
}

export function updateGapStatus(
  id: string,
  status: GapStatus,
  reason: string | null,
  actor: Actor,
  now: number,
) {
  const item = findOrThrow(state.gaps, id, "Gap");
  const before = item.status;
  item.status = status;
  record(
    actor,
    {
      action: GAP_ACTION_LABEL[status],
      entity_type: "gap",
      entity_code: item.code,
      reason,
      before: { status: before },
      after: { status },
    },
    now,
  );
  return item;
}

const GAP_ACTION_LABEL: Record<GapStatus, string> = {
  potential: "Reopened gap",
  confirmed: "Confirmed gap",
  dismissed: "Dismissed gap",
  needs_info: "Requested more information",
};

export function listRemediations() {
  return state.remediations;
}

export interface RemediationUpdate {
  status: RemediationStatus;
  reason?: string | undefined;
  action?: string | undefined;
  owner_team?: string | undefined;
}

export function updateRemediation(
  id: string,
  update: RemediationUpdate,
  actor: Actor,
  now: number,
) {
  const item = findOrThrow(state.remediations, id, "Remediation");
  const gapItem = findOrThrow(state.gaps, item.gap_id, "Gap");
  const before = item.status;
  item.status = update.status;
  if (update.action) item.action = update.action;
  if (update.owner_team) item.owner_team = update.owner_team;
  record(
    actor,
    {
      action: REMEDIATION_ACTION_LABEL[update.status],
      entity_type: "remediation",
      entity_code: gapItem.code,
      reason: update.reason ?? null,
      before: { status: before },
      after: { status: update.status },
    },
    now,
  );
  return item;
}

const REMEDIATION_ACTION_LABEL: Record<RemediationStatus, string> = {
  draft: "Returned remediation to draft",
  approved: "Approved remediation",
  in_progress: "Started remediation",
  completed: "Completed remediation",
  verified: "Verified remediation",
  rejected: "Rejected remediation",
};

export function getGapTrace(id: string): GapTrace {
  const gapItem = findOrThrow(state.gaps, id, "Gap");
  const obligation = findOrThrow(state.obligations, gapItem.obligation_id, "Obligation");
  const document = findOrThrow(state.documents, obligation.document_id, "Document");
  const mappings = state.mappings.filter((item) => item.obligation_id === obligation.id);
  const controlIds = new Set([...gapItem.control_ids, ...mappings.map((item) => item.control_id)]);
  const assessment = ASSESSMENTS.find((item) => item.obligation_id === obligation.id) ?? null;
  const evidenceIds = new Set([...gapItem.evidence_ids, ...(assessment?.evidence_ids ?? [])]);
  const codes = new Set([gapItem.code, obligation.code]);
  return {
    gap: gapItem,
    obligation,
    document,
    controls: CONTROLS.filter((control) => controlIds.has(control.id)),
    mappings,
    assessment,
    evidence: EVIDENCE.filter((item) => evidenceIds.has(item.id)),
    remediations: state.remediations.filter((item) => item.gap_id === gapItem.id),
    change: CHANGES.find((item) => item.id === gapItem.change_id) ?? null,
    audit: state.audit.filter((entry) =>
      [...codes].some(
        (code) => entry.entity_code === code || entry.entity_code.startsWith(`${code} `),
      ),
    ),
  };
}

// ---- Changes, audit, evaluation -----------------------------------------------------------------

export function getChangeComparison() {
  const oldDoc = findOrThrow(state.documents, "doc-nsm-v1", "Document");
  const newDoc = findOrThrow(state.documents, "doc-nsm-v2", "Document");
  return {
    old_document: oldDoc,
    new_document: newDoc,
    changes: CHANGES,
    missing_circulars: MISSING_CIRCULARS,
  };
}

export function listAudit() {
  return state.audit;
}

export function getEvalReport() {
  return EVAL_REPORT;
}

// ---- Pipeline runs ------------------------------------------------------------------------------

function buildNodes(run: StoredRun, now: number): RunNode[] {
  const speed = run.live ? LIVE_RUN_SPEEDUP : 1;
  const elapsed = now - Date.parse(run.started_at);
  let offset = 0;
  return PIPELINE_NODES.map((template) => {
    const duration = Math.round(template.duration_ms / speed);
    const nodeOffset = offset;
    offset += duration;
    let status: RunNode["status"] = template.retried ? "retried" : "done";
    if (run.live && elapsed < nodeOffset) status = "queued";
    else if (run.live && elapsed < nodeOffset + duration) status = "running";
    return {
      node: template.node,
      status,
      offset_ms: nodeOffset,
      duration_ms: duration,
      llm_calls: template.llm_calls,
      input_tokens: template.input_tokens,
      output_tokens: template.output_tokens,
      note: template.note,
      conditional: template.conditional,
    };
  });
}

function toRun(run: StoredRun, now: number): AgentRun {
  const nodes = buildNodes(run, now);
  const finished = nodes.every((node) => node.status === "done" || node.status === "retried");
  return {
    id: run.id,
    run_id: run.run_id,
    started_at: run.started_at,
    trigger: run.trigger,
    cache_hits: run.cache_hits,
    status: finished ? "done" : "running",
    nodes,
  };
}

export function listRuns(now: number): AgentRun[] {
  return state.runs.map((run) => toRun(run, now));
}

export function getRun(id: string, now: number): AgentRun {
  return toRun(findOrThrow(state.runs, id, "Run"), now);
}

export function startRun(actor: Actor, now: number): AgentRun {
  const runId = Math.floor(now % 0xffff)
    .toString(16)
    .padStart(4, "0");
  const cacheHits = PIPELINE_NODES.reduce((sum, node) => sum + node.llm_calls, 0);
  const run: StoredRun = {
    id: `run-${runId}`,
    run_id: runId,
    started_at: new Date(now).toISOString(),
    trigger: `Manual run by ${actor.name}`,
    cache_hits: cacheHits,
    live: true,
  };
  state.runs.unshift(run);
  record(
    actor,
    {
      action: "Started pipeline run",
      entity_type: "pipeline",
      entity_code: run.id,
      reason: null,
      before: null,
      after: { status: "running" },
    },
    now,
  );
  return toRun(run, now);
}

// ---- Dashboard and knowledge graph ---------------------------------------------------------------

const GAP_TYPE_ORDER: GapType[] = [
  "design",
  "design_operating",
  "missing",
  "operating",
  "insufficient_info",
];

export function getDashboardSummary(now: number): DashboardSummary {
  const obligations = state.obligations;
  const applicable = obligations.filter((item) => item.applicability === "applicable");
  const openGaps = state.gaps.filter((item) => item.status !== "dismissed");
  const byPriority: Record<Priority, number> = { P1: 0, P2: 0, P3: 0 };
  for (const item of openGaps) byPriority[item.priority] += 1;

  const gapsByType = GAP_TYPE_ORDER.map((gapType) => {
    const counts: Record<Priority, number> = { P1: 0, P2: 0, P3: 0 };
    for (const item of openGaps.filter((candidate) => candidate.gap_type === gapType)) {
      counts[item.priority] += 1;
    }
    return { gap_type: gapType, counts };
  }).filter((row) => row.counts.P1 + row.counts.P2 + row.counts.P3 > 0);

  const latestRun = listRuns(now)[0];
  const deadline = Date.parse(PHASE_OUT_DEADLINE);

  return {
    obligations_total: obligations.length,
    obligations_applicable: applicable.length,
    obligations_not_applicable: obligations.length - applicable.length,
    coverage: {
      covered: applicable.filter((item) => item.coverage === "covered").length,
      partial: applicable.filter((item) => item.coverage === "partial").length,
      insufficient_info: applicable.filter((item) => item.coverage === "insufficient_info").length,
      none: applicable.filter((item) => item.coverage === "none").length,
    },
    open_gaps: openGaps.length,
    gaps_by_priority: byPriority,
    gaps_by_type: gapsByType,
    risk_exposure: openGaps.reduce((sum, item) => sum + item.risk_score, 0),
    remediation_approved: state.remediations.filter((item) =>
      ["approved", "in_progress", "completed", "verified"].includes(item.status),
    ).length,
    remediation_total: state.remediations.length,
    next_deadline: {
      label: "30 Jun 2027",
      date: PHASE_OUT_DEADLINE,
      days_remaining: Math.max(0, Math.ceil((deadline - now) / 86_400_000)),
      context: "NSM phase-out (N-07)",
    },
    review: {
      obligations_suggested: obligations.filter((item) => item.review_status === "suggested")
        .length,
      obligations_accepted: obligations.filter((item) => item.review_status === "accepted").length,
      obligations_edited: obligations.filter((item) => item.review_status === "edited").length,
      obligations_rejected: obligations.filter((item) => item.review_status === "rejected").length,
      mappings_to_review: state.mappings.filter(
        (item) => item.status === "suggested" || item.status === "needs_review",
      ).length,
      quotes_verified: obligations.filter((item) => item.quote_verified).length,
      quotes_total: obligations.length,
    },
    critic_retries: state.mappings.filter((item) => item.critic === "retried").length,
    llm_calls: latestRun ? latestRun.nodes.reduce((sum, node) => sum + node.llm_calls, 0) : 0,
    last_run_at: latestRun ? latestRun.started_at : "",
  };
}

export function getKnowledgeGraph(): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (const item of state.obligations) {
    nodes.push({
      id: `clause:${item.id}`,
      type: "clause",
      label: item.clause_ref,
      detail: item.source_label,
    });
    nodes.push({ id: item.id, type: "obligation", label: item.code, detail: item.summary });
    edges.push({ source: item.id, target: `clause:${item.id}`, type: "DERIVED_FROM" });
  }
  for (const control of CONTROLS) {
    nodes.push({ id: control.id, type: "control", label: control.code, detail: control.name });
  }
  for (const evidence of EVIDENCE) {
    nodes.push({ id: evidence.id, type: "evidence", label: evidence.code, detail: evidence.title });
    for (const code of evidence.control_codes) {
      const control = CONTROLS.find((candidate) => candidate.code === code);
      if (control) edges.push({ source: control.id, target: evidence.id, type: "SUPPORTED_BY" });
    }
  }
  for (const item of state.mappings) {
    edges.push({ source: item.obligation_id, target: item.control_id, type: "COVERED_BY" });
  }
  for (const item of state.gaps) {
    nodes.push({ id: item.id, type: "gap", label: item.code, detail: item.title });
    edges.push({ source: item.id, target: item.obligation_id, type: "ON" });
    for (const controlId of item.control_ids) {
      edges.push({ source: item.id, target: controlId, type: "INVOLVES" });
    }
    for (const evidenceId of item.evidence_ids) {
      edges.push({ source: item.id, target: evidenceId, type: "EVIDENCED_BY" });
    }
  }
  for (const item of state.remediations) {
    nodes.push({
      id: item.id,
      type: "remediation",
      label: `Fix ${item.gap_id.toUpperCase()}`,
      detail: item.action,
    });
    edges.push({ source: item.gap_id, target: item.id, type: "REMEDIATED_BY" });
  }
  return { nodes, edges };
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}
