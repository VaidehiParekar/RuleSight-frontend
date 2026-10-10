import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { RouterProvider } from "react-router";

import { AppProviders } from "@/app/providers";
import { createTestRouter } from "@/app/router";

/** Query client with retries disabled so failure states render immediately in tests. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

/** Renders the full application tree at a given path, using an in-memory router. */
export function renderAppAt(path: string) {
  const router = createTestRouter(path);
  return render(
    <AppProviders client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}
