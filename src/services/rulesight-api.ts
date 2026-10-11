import { env } from "@/lib/env";
import * as db from "@/mocks/mock-db";
import { ApiError } from "@/services/api-client";
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

/*
 * RuleSight API surface used by the screens. Each function names the endpoint it
 * stands in for (TEAM_PLAN_ONE_NIGHT.md §5). With VITE_USE_MOCKS=true the data
 * comes from src/mocks; swapping a function body for apiGet/apiSend is the only
 * change needed when the backend endpoint is ready. Writes send the acting user,
 * which the live API receives as the X-Actor header.
 */

const LATENCY_MS = import.meta.env.MODE === "test" ? 0 : 320;

async function mock<T>(produce: (now: number) => T): Promise<T> {
  if (!env.VITE_USE_MOCKS) {
    throw new ApiError({
      status: 0,
      code: "not_connected",
      message:
        "This screen is not connected to the live API yet. Set VITE_USE_MOCKS=true to use the demo data.",
    });
  }
  if (LATENCY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  }
  // Clone so React Query never holds references the mock store mutates later.
  return structuredClone(produce(Date.now()));
}

/** GET /dashboard/summary */
export const getDashboardSummary = (): Promise<DashboardSummary> => mock(db.getDashboardSummary);

/** GET /documents */
export const listDocuments = (): Promise<SourceDocument[]> => mock(db.listDocuments);

/** POST /documents (multipart) */
export const uploadDocument = (input: db.NewDocumentInput, actor: Actor): Promise<SourceDocument> =>
  mock((now) => db.addDocument(input, actor, now));

/** POST /pipeline/run */
export const startPipelineRun = (actor: Actor): Promise<AgentRun> =>
  mock((now) => db.startRun(actor, now));

/** GET /pipeline/runs */
export const listRuns = (): Promise<AgentRun[]> => mock(db.listRuns);

/** GET /pipeline/runs/{run_id} */
export const getRun = (id: string): Promise<AgentRun> => mock((now) => db.getRun(id, now));

/** GET /obligations */
export const listObligations = (): Promise<Obligation[]> => mock(db.listObligations);

/** PATCH /obligations/{id} */
export const updateObligation = (
  id: string,
  update: db.ObligationUpdate,
  actor: Actor,
): Promise<Obligation> => mock((now) => db.updateObligation(id, update, actor, now));

/** GET /controls */
export const listControls = (): Promise<Control[]> => mock(db.listControls);

/** GET /mappings */
export const listMappings = (): Promise<Mapping[]> => mock(db.listMappings);

/** PATCH /mappings/{id} */
export const updateMapping = (id: string, status: MappingStatus, actor: Actor): Promise<Mapping> =>
  mock((now) => db.updateMapping(id, status, actor, now));

/** GET /gaps (sorted by risk_score desc) */
export const listGaps = (): Promise<Gap[]> => mock(db.listGaps);

/** GET /gaps/{id}/trace */
export const getGapTrace = (id: string): Promise<GapTrace> => mock(() => db.getGapTrace(id));

/** PATCH /gaps/{id} */
export const updateGapStatus = (
  id: string,
  status: GapStatus,
  reason: string | null,
  actor: Actor,
): Promise<Gap> => mock((now) => db.updateGapStatus(id, status, reason, actor, now));

/** GET /remediations (via gaps) */
export const listRemediations = (): Promise<Remediation[]> => mock(db.listRemediations);

/** PATCH /remediations/{id} */
export const updateRemediation = (
  id: string,
  update: db.RemediationUpdate,
  actor: Actor,
): Promise<Remediation> => mock((now) => db.updateRemediation(id, update, actor, now));

/** POST /changes/compare */
export const getChangeComparison = () => mock(db.getChangeComparison);

/** GET /audit */
export const listAudit = (): Promise<AuditEntry[]> => mock(db.listAudit);

/** GET /eval/latest */
export const getEvalReport = (): Promise<EvalReport> => mock(db.getEvalReport);

/** GET /graph */
export const getKnowledgeGraph = (): Promise<KnowledgeGraph> => mock(db.getKnowledgeGraph);

export type { NewDocumentInput, ObligationUpdate, RemediationUpdate } from "@/mocks/mock-db";
