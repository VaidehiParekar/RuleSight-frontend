/**
 * Central TanStack Query key factory. Keeping keys in one place makes cache
 * invalidation consistent across features.
 */
export const queryKeys = {
  system: {
    readiness: () => ["system", "readiness"] as const,
  },
} as const;
