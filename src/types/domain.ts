/**
 * Domain types for the RuleSight UI. They mirror the API contract and database
 * enums in backend/TEAM_PLAN_ONE_NIGHT.md §4 and §5 (snake_case on the wire).
 */

export type Priority = "P1" | "P2" | "P3";
export type GapType = "missing" | "design" | "operating" | "design_operating" | "insufficient_info";
export type GapStatus = "potential" | "confirmed" | "dismissed" | "needs_info";
export type GapOrigin = "initial" | "change";
export type Coverage = "covered" | "partial" | "none" | "insufficient_info" | "not_applicable";
export type Applicability = "applicable" | "not_applicable" | "unknown";
export type ReviewStatus = "suggested" | "accepted" | "rejected" | "edited";
export type MappingStatus = "suggested" | "accepted" | "rejected" | "needs_review";
export type CriticResult = "passed" | "retried" | "failed";
export type DesignAssessment = "adequate" | "inadequate" | "unknown";
export type OperatingAssessment =
  "effective" | "partially_effective" | "ineffective" | "insufficient_evidence" | "not_applicable";
export type RemediationStatus =
  "draft" | "approved" | "in_progress" | "completed" | "verified" | "rejected";
export type DocType = "regulation" | "policy" | "rcm" | "evidence";
export type DocStatus = "uploaded" | "processing" | "ready" | "failed" | "superseded";
export type ChangeType = "modified" | "withdrawn" | "corpus_gap" | "consolidated";
export type Significance = "high" | "medium" | "low" | "administrative";
export type NodeStatus = "queued" | "running" | "done" | "retried" | "failed";

export interface Actor {
  id: "priya" | "rahul";
  name: string;
  role: string;
  initials: string;
}

export interface SourceDocument {
  id: string;
  doc_type: DocType;
  title: string;
  /** Official reference, e.g. the RBI circular number. */
  reference: string;
  regulator: string | null;
  version_label: string;
  supersedes_id: string | null;
  is_synthetic: boolean;
  status: DocStatus;
  withdrawn_note: string | null;
  created_at: string;
  sha256: string;
  chunk_count: number;
  obligation_count: number;
}

export interface Obligation {
  id: string;
  code: string;
  document_id: string;
  /** Short regulation name for display, e.g. "RBI KYC MD 2016". */
  source_label: string;
  clause_ref: string;
  page: number | null;
  /** Verbatim text copied from the regulation file. Never paraphrased. */
  source_quote: string;
  /** The phrase inside source_quote that carries the requirement (highlighted in the UI). */
  key_phrase: string | null;
  quote_verified: boolean;
  summary: string;
  actor: string;
  action: string;
  condition: string | null;
  frequency: string | null;
  deadline: string | null;
  threshold: string | null;
  topic: string;
  criticality: 1 | 2 | 3;
  applicability: Applicability;
  applicability_reason: string | null;
  coverage: Coverage;
  review_status: ReviewStatus;
}

export interface Control {
  id: string;
  code: string;
  name: string;
  description: string;
  owner: string;
  frequency: string;
  control_type: string;
  automation: string;
  source_document: string;
  source_section: string;
  evidence_expected: string;
  rbi_reference: string;
  topic: string;
}

export interface Mapping {
  id: string;
  obligation_id: string;
  control_id: string;
  coverage: Coverage;
  rationale: string;
  /** Knowledge-graph path that produced the candidate. Replaces any confidence score. */
  graph_path: string[];
  critic: CriticResult;
  status: MappingStatus;
}

export interface Evidence {
  id: string;
  code: string;
  title: string;
  file_name: string;
  control_codes: string[];
  columns: string[];
  rows: string[][];
  /** Cells that support a finding, as [rowIndex, columnIndex]. */
  flagged_cells: [number, number][];
  summary: string;
}

export interface Assessment {
  obligation_id: string;
  design: DesignAssessment;
  design_note: string;
  operating: OperatingAssessment;
  operating_note: string;
  evidence_ids: string[];
}

export interface RiskFactors {
  criticality: number;
  severity: number;
  urgency: number;
  rule_version: string;
}

export interface Gap {
  id: string;
  code: string;
  obligation_id: string;
  gap_type: GapType;
  title: string;
  description: string;
  control_ids: string[];
  evidence_ids: string[];
  origin: GapOrigin;
  change_id: string | null;
  risk_factors: RiskFactors;
  risk_score: number;
  priority: Priority;
  status: GapStatus;
}

export interface Remediation {
  id: string;
  gap_id: string;
  action: string;
  owner_team: string;
  target_days: number;
  closure_evidence: string;
  status: RemediationStatus;
}

export interface ChangeSide {
  ref: string;
  text: string;
}

export interface RegulatoryChange {
  id: string;
  code: string;
  change_type: ChangeType;
  title: string;
  summary: string;
  significance: Significance;
  before: ChangeSide | null;
  after: ChangeSide | null;
  /** Phrases in `before` that were removed and in `after` that were added. */
  removed_phrases: string[];
  added_phrases: string[];
  carried_over: string[];
  impact: { obligations: string[]; controls: string[]; gaps: string[] };
}

export interface MissingCircular {
  row: number;
  reference: string;
  date: string;
  subject: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  actor_role: string;
  action: string;
  entity_type: "obligation" | "mapping" | "gap" | "remediation" | "document" | "pipeline";
  entity_code: string;
  reason: string | null;
  before: Record<string, string> | null;
  after: Record<string, string> | null;
}

export interface RunNode {
  node: string;
  status: NodeStatus;
  offset_ms: number;
  duration_ms: number;
  llm_calls: number;
  input_tokens: number;
  output_tokens: number;
  note: string | null;
  /** True for the change branch that only runs when a document supersedes another. */
  conditional: boolean;
}

export interface AgentRun {
  id: string;
  run_id: string;
  started_at: string;
  status: "running" | "done" | "failed";
  trigger: string;
  cache_hits: number;
  nodes: RunNode[];
}

export interface EvalMetric {
  key: string;
  label: string;
  value: number;
}

export interface EvalReport {
  is_mock: boolean;
  scored_at: string | null;
  method: string;
  metrics: EvalMetric[];
}

export interface DashboardSummary {
  obligations_total: number;
  obligations_applicable: number;
  obligations_not_applicable: number;
  coverage: Record<"covered" | "partial" | "insufficient_info" | "none", number>;
  open_gaps: number;
  gaps_by_priority: Record<Priority, number>;
  gaps_by_type: { gap_type: GapType; counts: Record<Priority, number> }[];
  risk_exposure: number;
  remediation_approved: number;
  remediation_total: number;
  next_deadline: { label: string; date: string; days_remaining: number; context: string };
  review: {
    obligations_suggested: number;
    obligations_accepted: number;
    obligations_edited: number;
    obligations_rejected: number;
    mappings_to_review: number;
    quotes_verified: number;
    quotes_total: number;
  };
  critic_retries: number;
  llm_calls: number;
  last_run_at: string;
}

export interface GapTrace {
  gap: Gap;
  obligation: Obligation;
  document: SourceDocument;
  controls: Control[];
  mappings: Mapping[];
  assessment: Assessment | null;
  evidence: Evidence[];
  remediations: Remediation[];
  change: RegulatoryChange | null;
  audit: AuditEntry[];
}

export interface GraphNode {
  id: string;
  type: "clause" | "obligation" | "control" | "evidence" | "gap" | "remediation";
  label: string;
  detail: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
