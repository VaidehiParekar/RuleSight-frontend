import { ApiError, apiFetchJson, apiPatch, apiPost, apiUploadForm } from "@/services/api-client";
import type {
  ChangeComparison,
  NewDocumentInput,
  ObligationUpdate,
  RemediationUpdate,
} from "@/types/api";
import type {
  AgentRun,
  AuditEntry,
  Control,
  DashboardSummary,
  EvalReport,
  Gap,
  GapStatus,
  GapTrace,
  KnowledgeGraph,
  Mapping,
  MappingStatus,
  Obligation,
  Remediation,
  SourceDocument,
} from "@/types/domain";

/** GET /dashboard/summary */
export const getDashboardSummary = (): Promise<DashboardSummary> =>
  apiFetchJson<DashboardSummary>("/dashboard/summary");

/** GET /documents */
export const listDocuments = (): Promise<SourceDocument[]> =>
  apiFetchJson<SourceDocument[]>("/documents");

/** POST /documents (multipart). The file is required; the API stores and parses it. */
export const uploadDocument = (input: NewDocumentInput): Promise<SourceDocument> => {
  if (!input.file) {
    return Promise.reject(
      new ApiError({ status: 0, code: "validation_error", message: "Choose a file to upload." }),
    );
  }
  const formData = new FormData();
  formData.append("file", input.file, input.file_name || input.file.name);
  formData.append("doc_type", input.doc_type);
  formData.append("title", input.title);
  if (input.regulator) formData.append("regulator", input.regulator);
  if (input.version_label) formData.append("version_label", input.version_label);
  if (input.supersedes_id) formData.append("supersedes_id", input.supersedes_id);
  return apiUploadForm<SourceDocument>("/documents", formData);
};

/** POST /pipeline/run */
export const startPipelineRun = (): Promise<AgentRun> => apiPost<AgentRun>("/pipeline/run", {});

/** GET /pipeline/runs */
export const listRuns = (): Promise<AgentRun[]> => apiFetchJson<AgentRun[]>("/pipeline/runs");

/** GET /pipeline/runs/{run_id} */
export const getRun = (id: string): Promise<AgentRun> =>
  apiFetchJson<AgentRun>(`/pipeline/runs/${encodeURIComponent(id)}`);

/** GET /obligations */
export const listObligations = (): Promise<Obligation[]> =>
  apiFetchJson<Obligation[]>("/obligations");

/** PATCH /obligations/{id} */
export const updateObligation = (id: string, update: ObligationUpdate): Promise<Obligation> =>
  apiPatch<Obligation>(`/obligations/${encodeURIComponent(id)}`, update);

/** GET /controls */
export const listControls = (): Promise<Control[]> => apiFetchJson<Control[]>("/controls");

/** GET /mappings */
export const listMappings = (): Promise<Mapping[]> => apiFetchJson<Mapping[]>("/mappings");

/** PATCH /mappings/{id} */
export const updateMapping = (id: string, status: MappingStatus): Promise<Mapping> =>
  apiPatch<Mapping>(`/mappings/${encodeURIComponent(id)}`, { status });

/** GET /gaps (sorted by risk_score desc) */
export const listGaps = (): Promise<Gap[]> => apiFetchJson<Gap[]>("/gaps");

/** GET /gaps/{id}/trace */
export const getGapTrace = (id: string): Promise<GapTrace> =>
  apiFetchJson<GapTrace>(`/gaps/${encodeURIComponent(id)}/trace`);

/** PATCH /gaps/{id} */
export const updateGapStatus = (
  id: string,
  status: GapStatus,
  reason: string | null,
): Promise<Gap> => apiPatch<Gap>(`/gaps/${encodeURIComponent(id)}`, { status, reason });

/** GET /remediations */
export const listRemediations = (): Promise<Remediation[]> =>
  apiFetchJson<Remediation[]>("/remediations");

/** PATCH /remediations/{id} */
export const updateRemediation = (id: string, update: RemediationUpdate): Promise<Remediation> =>
  apiPatch<Remediation>(`/remediations/${encodeURIComponent(id)}`, update);

/**
 * POST /changes/compare with no ids: the API compares the most recent document that
 * supersedes another with its previous version. Resolves to null when no document
 * supersedes another yet (the API answers 404), so the page can explain what to upload.
 */
export const getChangeComparison = async (): Promise<ChangeComparison | null> => {
  try {
    return await apiPost<ChangeComparison>("/changes/compare", {});
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
};

/** GET /audit */
export const listAudit = (): Promise<AuditEntry[]> => apiFetchJson<AuditEntry[]>("/audit");

/** GET /eval/latest */
export const getEvalReport = (): Promise<EvalReport> => apiFetchJson<EvalReport>("/eval/latest");

/** GET /graph */
export const getKnowledgeGraph = (): Promise<KnowledgeGraph> =>
  apiFetchJson<KnowledgeGraph>("/graph");
