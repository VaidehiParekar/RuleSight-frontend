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
  /** Glyph shown before the label, so status never relies on colour alone. */
  icon?: string;
  /** Outlined rather than tinted, for provisional states such as "Potential". */
  outline?: boolean;
}

export const GAP_TYPE: Record<GapType, LabelTone> = {
  missing: { label: "Missing", tone: "critical" },
  design: { label: "Design", tone: "warning" },
  operating: { label: "Operating", tone: "warning" },
  design_operating: { label: "Design + operating", tone: "critical" },
  insufficient_info: { label: "Insufficient info", tone: "neutral" },
};

export const GAP_STATUS: Record<GapStatus, LabelTone> = {
  potential: { label: "Potential", tone: "warning", outline: true },
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
  suggested: { label: "Suggested by agent", tone: "primary", outline: true },
  accepted: { label: "Accepted", tone: "success", icon: "✓" },
  edited: { label: "Edited", tone: "accent", icon: "✎", outline: true },
  rejected: { label: "Rejected", tone: "critical", icon: "✕" },
};

export const MAPPING_STATUS: Record<MappingStatus, LabelTone> = {
  suggested: { label: "Suggested by agent", tone: "primary", outline: true },
  accepted: { label: "Accepted", tone: "success", icon: "✓" },
  rejected: { label: "Rejected", tone: "critical", icon: "✕" },
  needs_review: { label: "Needs review", tone: "warning", icon: "!" },
};

export const DESIGN: Record<DesignAssessment, LabelTone> = {
  adequate: { label: "Adequate", tone: "success", icon: "✓" },
  inadequate: { label: "Inadequate", tone: "critical", icon: "✕" },
  unknown: { label: "Unknown", tone: "neutral", icon: "?" },
};

export const OPERATING: Record<OperatingAssessment, LabelTone> = {
  effective: { label: "Effective", tone: "success", icon: "✓" },
  partially_effective: { label: "Partially effective", tone: "warning", icon: "~" },
  ineffective: { label: "Ineffective", tone: "critical", icon: "✕" },
  insufficient_evidence: { label: "Insufficient evidence", tone: "neutral", icon: "⊘" },
  not_applicable: { label: "Not assessed", tone: "neutral" },
};

export const REMEDIATION_STATUS: Record<RemediationStatus, LabelTone> = {
  draft: { label: "Draft", tone: "neutral" },
  approved: { label: "Approved", tone: "primary" },
  in_progress: { label: "In progress", tone: "warning" },
  completed: { label: "Completed", tone: "success", outline: true },
  verified: { label: "Verified", tone: "success" },
  rejected: { label: "Rejected", tone: "critical" },
};

export const DOC_STATUS: Record<DocStatus, LabelTone> = {
  uploaded: { label: "Uploaded", tone: "neutral" },
  processing: { label: "Processing", tone: "primary", icon: "●" },
  ready: { label: "Ready", tone: "success", icon: "✓" },
  failed: { label: "Failed", tone: "critical", icon: "✕" },
  superseded: { label: "Withdrawn", tone: "critical", outline: true },
};

export const DOC_TYPE: Record<DocType, string> = {
  regulation: "Regulation",
  policy: "Policy",
  rcm: "RCM",
  evidence: "Evidence",
};

export const CHANGE_TYPE: Record<ChangeType, LabelTone> = {
  modified: { label: "Modified", tone: "warning", icon: "~" },
  withdrawn: { label: "Withdrawn", tone: "critical", icon: "−", outline: true },
  corpus_gap: { label: "Corpus gap", tone: "warning", icon: "?" },
  consolidated: { label: "Consolidated", tone: "neutral", icon: "=" },
};

export const SIGNIFICANCE: Record<Significance, LabelTone> = {
  high: { label: "High significance", tone: "critical", outline: true },
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
  queued: { label: "Queued", tone: "neutral", icon: "○" },
  running: { label: "Running", tone: "primary", icon: "●" },
  done: { label: "Done", tone: "success", icon: "✓" },
  retried: { label: "Retried", tone: "warning", icon: "↻" },
  failed: { label: "Failed", tone: "critical", icon: "✕" },
};
