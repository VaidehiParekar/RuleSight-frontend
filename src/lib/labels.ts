import type {
  Applicability,
  ChangeType,
  Coverage,
  DesignAssessment,
  DocStatus,
  DocType,
  GapStatus,
  GapType,
  MappingStatus,
  NodeStatus,
  OperatingAssessment,
  RemediationStatus,
  ReviewStatus,
  Significance,
} from "@/types/domain";

/** Tones map to the status tokens in styles/index.css. Each tag also carries text, never colour alone. */
export type Tone = "success" | "warning" | "critical" | "neutral" | "primary" | "accent";

export interface LabelTone {
  label: string;
  tone: Tone;
}

export const GAP_TYPE: Record<GapType, LabelTone> = {
  missing: { label: "Missing", tone: "critical" },
  design: { label: "Design", tone: "warning" },
  operating: { label: "Operating", tone: "warning" },
  design_operating: { label: "Design + operating", tone: "critical" },
  insufficient_info: { label: "Insufficient info", tone: "neutral" },
};

export const GAP_STATUS: Record<GapStatus, LabelTone> = {
  potential: { label: "Potential", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "critical" },
  dismissed: { label: "Dismissed", tone: "neutral" },
  needs_info: { label: "Needs info", tone: "neutral" },
};

export const COVERAGE: Record<Coverage, LabelTone & { glyph: string }> = {
  covered: { label: "Covered", tone: "success", glyph: "●" },
  partial: { label: "Partial", tone: "warning", glyph: "◐" },
  none: { label: "Missing", tone: "critical", glyph: "○" },
  insufficient_info: { label: "Insufficient info", tone: "neutral", glyph: "?" },
  not_applicable: { label: "Not applicable", tone: "neutral", glyph: "–" },
};

export const REVIEW_STATUS: Record<ReviewStatus, LabelTone> = {
  suggested: { label: "Suggested by agent", tone: "primary" },
  accepted: { label: "Accepted", tone: "success" },
  edited: { label: "Edited", tone: "accent" },
  rejected: { label: "Rejected", tone: "critical" },
};

export const MAPPING_STATUS: Record<MappingStatus, LabelTone> = {
  suggested: { label: "Suggested by agent", tone: "primary" },
  accepted: { label: "Accepted", tone: "success" },
  rejected: { label: "Rejected", tone: "critical" },
  needs_review: { label: "Needs review", tone: "warning" },
};

export const DESIGN: Record<DesignAssessment, LabelTone> = {
  adequate: { label: "Adequate", tone: "success" },
  inadequate: { label: "Inadequate", tone: "critical" },
  unknown: { label: "Unknown", tone: "neutral" },
};

export const OPERATING: Record<OperatingAssessment, LabelTone> = {
  effective: { label: "Effective", tone: "success" },
  partially_effective: { label: "Partially effective", tone: "warning" },
  ineffective: { label: "Ineffective", tone: "critical" },
  insufficient_evidence: { label: "Insufficient evidence", tone: "neutral" },
  not_applicable: { label: "Not assessed", tone: "neutral" },
};

export const REMEDIATION_STATUS: Record<RemediationStatus, LabelTone> = {
  draft: { label: "Draft", tone: "neutral" },
  approved: { label: "Approved", tone: "primary" },
  in_progress: { label: "In progress", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  verified: { label: "Verified", tone: "success" },
  rejected: { label: "Rejected", tone: "critical" },
};

export const DOC_STATUS: Record<DocStatus, LabelTone> = {
  uploaded: { label: "Uploaded", tone: "neutral" },
  processing: { label: "Processing", tone: "primary" },
  ready: { label: "Ready", tone: "success" },
  failed: { label: "Failed", tone: "critical" },
  superseded: { label: "Withdrawn", tone: "critical" },
};

export const DOC_TYPE: Record<DocType, string> = {
  regulation: "Regulation",
  policy: "Policy",
  rcm: "RCM",
  evidence: "Evidence",
};

export const CHANGE_TYPE: Record<ChangeType, LabelTone> = {
  modified: { label: "Modified", tone: "warning" },
  withdrawn: { label: "Withdrawn", tone: "critical" },
  corpus_gap: { label: "Corpus gap", tone: "warning" },
  consolidated: { label: "Carried over", tone: "neutral" },
};

export const SIGNIFICANCE: Record<Significance, LabelTone> = {
  high: { label: "High significance", tone: "critical" },
  medium: { label: "Medium significance", tone: "warning" },
  low: { label: "Low significance", tone: "neutral" },
  administrative: { label: "Administrative", tone: "neutral" },
};

export const APPLICABILITY_LABEL: Record<Applicability, string> = {
  applicable: "Applicable",
  not_applicable: "Not applicable",
  unknown: "Unknown",
};

export const NODE_STATUS: Record<NodeStatus, LabelTone> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "primary" },
  done: { label: "Done", tone: "success" },
  retried: { label: "Retried", tone: "warning" },
  failed: { label: "Failed", tone: "critical" },
};
