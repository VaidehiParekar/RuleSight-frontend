import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { createQueryClient } from "@/app/query-client";

interface AppProvidersProps {
  children: ReactNode;
  /** Injected in tests to control cache state. Defaults to a per-instance client. */
  client?: QueryClient;
}

export function AppProviders({ children, client }: AppProvidersProps) {
  const [queryClient] = useState<QueryClient>(() => client ?? createQueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
