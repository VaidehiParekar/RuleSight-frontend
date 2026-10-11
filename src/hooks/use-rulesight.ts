import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import * as api from "@/services/rulesight-api";
import type { NewDocumentInput, ObligationUpdate, RemediationUpdate } from "@/types/api";
import type { GapStatus, MappingStatus } from "@/types/domain";

/** Polling interval while a pipeline run or an upload is still processing. */
const LIVE_POLL_MS = 700;

export function useDashboardSummary() {
  return useQuery({ queryKey: queryKeys.dashboard(), queryFn: api.getDashboardSummary });
}

export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents(),
    queryFn: api.listDocuments,
    refetchInterval: (query) =>
      query.state.data?.some((doc) => doc.status === "processing") ? LIVE_POLL_MS : false,
  });
}

export function useRuns() {
  return useQuery({ queryKey: queryKeys.runs(), queryFn: api.listRuns });
}

export function useRun(id: string | null) {
  return useQuery({
    queryKey: queryKeys.run(id ?? "none"),
    queryFn: () => api.getRun(id ?? ""),
    enabled: id !== null,
    refetchInterval: (query) => (query.state.data?.status === "running" ? LIVE_POLL_MS : false),
  });
}

export function useObligations() {
  return useQuery({ queryKey: queryKeys.obligations(), queryFn: api.listObligations });
}

export function useControls() {
  return useQuery({ queryKey: queryKeys.controls(), queryFn: api.listControls });
}

export function useMappings() {
  return useQuery({ queryKey: queryKeys.mappings(), queryFn: api.listMappings });
}

export function useGaps() {
  return useQuery({ queryKey: queryKeys.gaps(), queryFn: api.listGaps });
}

export function useGapTrace(id: string) {
  return useQuery({ queryKey: queryKeys.gapTrace(id), queryFn: () => api.getGapTrace(id) });
}

export function useRemediations() {
  return useQuery({ queryKey: queryKeys.remediations(), queryFn: api.listRemediations });
}

export function useChangeComparison() {
  return useQuery({ queryKey: queryKeys.changes(), queryFn: api.getChangeComparison });
}

export function useAudit() {
  return useQuery({ queryKey: queryKeys.audit(), queryFn: api.listAudit });
}

export function useEvalReport() {
  return useQuery({ queryKey: queryKeys.evaluation(), queryFn: api.getEvalReport });
}

export function useKnowledgeGraph() {
  return useQuery({ queryKey: queryKeys.graph(), queryFn: api.getKnowledgeGraph });
}

/** Every write can change counts on several screens, so it refreshes all RuleSight queries. */
function useRefreshAll() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: queryKeys.all });
}

export function useUploadDocument() {
  const onSuccess = useRefreshAll();
  return useMutation({
    mutationFn: (input: NewDocumentInput) => api.uploadDocument(input),
    onSuccess,
  });
}

export function useStartPipelineRun() {
  const onSuccess = useRefreshAll();
  return useMutation({ mutationFn: () => api.startPipelineRun(), onSuccess });
}

export function useUpdateObligation() {
  const onSuccess = useRefreshAll();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: ObligationUpdate }) =>
      api.updateObligation(id, update),
    onSuccess,
  });
}

export function useUpdateMapping() {
  const onSuccess = useRefreshAll();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MappingStatus }) =>
      api.updateMapping(id, status),
    onSuccess,
  });
}

export function useUpdateGapStatus() {
  const onSuccess = useRefreshAll();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: GapStatus;
      reason: string | null;
    }) => api.updateGapStatus(id, status, reason),
    onSuccess,
  });
}

export function useUpdateRemediation() {
  const onSuccess = useRefreshAll();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: RemediationUpdate }) =>
      api.updateRemediation(id, update),
    onSuccess,
  });
}
