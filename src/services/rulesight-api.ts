import { mockDataEnabled } from "@/lib/env";
import { toActor } from "@/lib/roles";
import * as db from "@/mocks/mock-db";
import { ApiError, apiFetchJson, apiPatch, apiPost, apiUploadForm } from "@/services/api-client";
import { getSessionUser } from "@/services/auth-session";
import type {
  Actor,
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

const isTest = import.meta.env.MODE === "test";
const LATENCY_MS = isTest ? 0 : 320;
const shouldUseMocks = mockDataEnabled;

/**
 * Who a mock write is recorded under. The live API takes this from the bearer token;
 * mock mode reads the signed-in user the same way.
 */
function mockActor(): Actor {
  const user = getSessionUser();
  if (!user) {
    throw new ApiError({ status: 401, code: "unauthorized", message: "Sign in to continue." });
  }
  return toActor(user);
}

/** Runs a mock write as the signed-in user, rejecting (not throwing) when nobody is. */
function withMockActor<T>(write: (actor: Actor) => Promise<T>): Promise<T> {
  try {
    return write(mockActor());
  } catch (error: unknown) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

async function mock<T>(produce: (now: number) => T): Promise<T> {
  if (LATENCY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  }
  return structuredClone(produce(Date.now()));
}

/** GET /dashboard/summary */
export const getDashboardSummary = (): Promise<DashboardSummary> =>
  shouldUseMocks
    ? mock(db.getDashboardSummary)
    : apiFetchJson<DashboardSummary>("/dashboard/summary");

/** GET /documents */
export const listDocuments = (): Promise<SourceDocument[]> =>
  shouldUseMocks ? mock(db.listDocuments) : apiFetchJson<SourceDocument[]>("/documents");

/** POST /documents (multipart) */
export const uploadDocument = (input: db.NewDocumentInput): Promise<SourceDocument> => {
  if (shouldUseMocks) {
    return withMockActor((actor) => mock((now) => db.addDocument(input, actor, now)));
  }
  const formData = new FormData();
  if (input.file) {
    formData.append("file", input.file, input.file_name || input.file.name);
  } else {
    const fileBlob = new Blob([input.title], { type: "text/plain" });
    formData.append("file", fileBlob, input.file_name || "document.txt");
  }
  formData.append("doc_type", input.doc_type);
  formData.append("title", input.title);
  if (input.regulator) formData.append("regulator", input.regulator);
  if (input.version_label) formData.append("version_label", input.version_label);
  if (input.supersedes_id) formData.append("supersedes_id", input.supersedes_id);
  return apiUploadForm<SourceDocument>("/documents", formData);
};

/** POST /pipeline/run */
export const startPipelineRun = (): Promise<AgentRun> =>
  shouldUseMocks
    ? withMockActor((actor) => mock((now) => db.startRun(actor, now)))
    : apiPost<AgentRun>("/pipeline/run", {});

/** GET /pipeline/runs */
export const listRuns = (): Promise<AgentRun[]> =>
  shouldUseMocks ? mock(db.listRuns) : apiFetchJson<AgentRun[]>("/pipeline/runs");

/** GET /pipeline/runs/{run_id} */
export const getRun = (id: string): Promise<AgentRun> =>
  shouldUseMocks
    ? mock((now) => db.getRun(id, now))
    : apiFetchJson<AgentRun>(`/pipeline/runs/${id}`);

/** GET /obligations */
export const listObligations = (): Promise<Obligation[]> =>
  shouldUseMocks ? mock(db.listObligations) : apiFetchJson<Obligation[]>("/obligations");

/** PATCH /obligations/{id} */
export const updateObligation = (id: string, update: db.ObligationUpdate): Promise<Obligation> =>
  shouldUseMocks
    ? withMockActor((actor) => mock((now) => db.updateObligation(id, update, actor, now)))
    : apiPatch<Obligation>(`/obligations/${id}`, update);

/** GET /controls */
export const listControls = (): Promise<Control[]> =>
  shouldUseMocks ? mock(db.listControls) : apiFetchJson<Control[]>("/controls");

/** GET /mappings */
export const listMappings = (): Promise<Mapping[]> =>
  shouldUseMocks ? mock(db.listMappings) : apiFetchJson<Mapping[]>("/mappings");

/** PATCH /mappings/{id} */
export const updateMapping = (id: string, status: MappingStatus): Promise<Mapping> =>
  shouldUseMocks
    ? withMockActor((actor) => mock((now) => db.updateMapping(id, status, actor, now)))
    : apiPatch<Mapping>(`/mappings/${id}`, { status });

/** GET /gaps (sorted by risk_score desc) */
export const listGaps = (): Promise<Gap[]> =>
  shouldUseMocks ? mock(db.listGaps) : apiFetchJson<Gap[]>("/gaps");

/** GET /gaps/{id}/trace */
export const getGapTrace = (id: string): Promise<GapTrace> =>
  shouldUseMocks ? mock(() => db.getGapTrace(id)) : apiFetchJson<GapTrace>(`/gaps/${id}/trace`);

/** PATCH /gaps/{id} */
export const updateGapStatus = (
  id: string,
  status: GapStatus,
  reason: string | null,
): Promise<Gap> =>
  shouldUseMocks
    ? withMockActor((actor) => mock((now) => db.updateGapStatus(id, status, reason, actor, now)))
    : apiPatch<Gap>(`/gaps/${id}`, { status, reason });

/** GET /remediations (via gaps) */
export const listRemediations = (): Promise<Remediation[]> =>
  shouldUseMocks ? mock(db.listRemediations) : apiFetchJson<Remediation[]>("/remediations");

/** PATCH /remediations/{id} */
export const updateRemediation = (
  id: string,
  update: db.RemediationUpdate,
): Promise<Remediation> =>
  shouldUseMocks
    ? withMockActor((actor) => mock((now) => db.updateRemediation(id, update, actor, now)))
    : apiPatch<Remediation>(`/remediations/${id}`, update);

/** POST /changes/compare */
export const getChangeComparison = () =>
  shouldUseMocks
    ? mock(db.getChangeComparison)
    : apiPost<ReturnType<typeof db.getChangeComparison>>("/changes/compare", {
        old_document_id: "doc-nsm-v1",
        new_document_id: "doc-nsm-v2",
      });

/** GET /audit */
export const listAudit = (): Promise<AuditEntry[]> =>
  shouldUseMocks ? mock(db.listAudit) : apiFetchJson<AuditEntry[]>("/audit");

/** GET /eval/latest */
export const getEvalReport = (): Promise<EvalReport> =>
  shouldUseMocks ? mock(db.getEvalReport) : apiFetchJson<EvalReport>("/eval/latest");

/** GET /graph */
export const getKnowledgeGraph = (): Promise<KnowledgeGraph> =>
  shouldUseMocks ? mock(db.getKnowledgeGraph) : apiFetchJson<KnowledgeGraph>("/graph");

export type { NewDocumentInput, ObligationUpdate, RemediationUpdate } from "@/mocks/mock-db";
