import type { AgentRun } from "@/types/domain";

/** Aggregates a run's nodes for the runs list and the run detail page. */
export function runTotals(run: AgentRun) {
  const last = run.nodes.at(-1);
  return {
    duration: last ? last.offset_ms + last.duration_ms : 0,
    llmCalls: run.nodes.reduce((sum, node) => sum + node.llm_calls, 0),
    inputTokens: run.nodes.reduce((sum, node) => sum + node.input_tokens, 0),
    outputTokens: run.nodes.reduce((sum, node) => sum + node.output_tokens, 0),
    retries: run.nodes.filter((node) => node.status === "retried").length,
    errors: run.nodes.filter((node) => node.status === "failed").length,
  };
}
