import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/services/api-client";

const MAX_RETRIES = 2;

/**
 * Creates a QueryClient with project defaults. A factory (rather than a module-level
 * singleton) keeps cache state per app instance and per test.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Client errors (bad input, auth, not found) will not succeed on retry.
          if (error instanceof ApiError && error.isClientError) {
            return false;
          }
          return failureCount < MAX_RETRIES;
        },
      },
    },
  });
}
