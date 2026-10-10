import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { getReadiness } from "@/services/system-api";

/** Server state for the backend readiness probe. */
export function useReadiness() {
  return useQuery({
    queryKey: queryKeys.system.readiness(),
    queryFn: ({ signal }) => getReadiness({ signal }),
    refetchInterval: 60_000,
  });
}
