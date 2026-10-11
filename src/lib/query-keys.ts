/**
 * Central TanStack Query key factory. Keeping keys in one place makes cache
 * invalidation consistent across features. Every RuleSight key starts with
 * "rulesight", so a write can refresh all dependent screens at once.
 */
export const queryKeys = {
  system: {
    readiness: () => ["system", "readiness"] as const,
  },
  all: ["rulesight"] as const,
  dashboard: () => ["rulesight", "dashboard"] as const,
  documents: () => ["rulesight", "documents"] as const,
  runs: () => ["rulesight", "runs"] as const,
  run: (id: string) => ["rulesight", "runs", id] as const,
  obligations: () => ["rulesight", "obligations"] as const,
  controls: () => ["rulesight", "controls"] as const,
  mappings: () => ["rulesight", "mappings"] as const,
  gaps: () => ["rulesight", "gaps"] as const,
  gapTrace: (id: string) => ["rulesight", "gaps", id, "trace"] as const,
  remediations: () => ["rulesight", "remediations"] as const,
  changes: () => ["rulesight", "changes"] as const,
  audit: () => ["rulesight", "audit"] as const,
  evaluation: () => ["rulesight", "evaluation"] as const,
  graph: () => ["rulesight", "graph"] as const,
} as const;
