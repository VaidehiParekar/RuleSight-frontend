import type {
  DocType,
  MissingCircular,
  Obligation,
  RegulatoryChange,
  RemediationStatus,
  ReviewStatus,
  SourceDocument,
} from "@/types/domain";

/**
 * Request and response shapes for RuleSight API calls that are not plain domain records.
 * Snake_case, as on the wire.
 */

/** Fields for `POST /documents` (sent as multipart form data). */
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

/** Body of `PATCH /obligations/{id}`. */
export interface ObligationUpdate {
  review_status: ReviewStatus;
  reason?: string | undefined;
  fields?: Partial<
    Pick<Obligation, "action" | "frequency" | "deadline" | "threshold" | "condition">
  >;
}

/** Body of `PATCH /remediations/{id}`. */
export interface RemediationUpdate {
  status: RemediationStatus;
  reason?: string | undefined;
  action?: string | undefined;
  owner_team?: string | undefined;
}

/** Response of `POST /changes/compare`. */
export interface ChangeComparison {
  old_document: SourceDocument;
  new_document: SourceDocument;
  changes: RegulatoryChange[];
  missing_circulars: MissingCircular[];
}
