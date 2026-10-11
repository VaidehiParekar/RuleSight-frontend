import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { RouterProvider } from "react-router";

import { SESSION_KEY } from "@/app/actor-context";
import { AppProviders } from "@/app/providers";
import { createTestRouter } from "@/app/router";
import type { Actor } from "@/types/domain";

/** Query client with retries disabled so failure states render immediately in tests. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

interface RenderOptions {
  /** Who is signed in. Pass null to start signed out (the sign-in page). */
  signedInAs?: Actor["id"] | null;
}

/** Renders the full application tree at a given path, using an in-memory router. */
export function renderAppAt(path: string, { signedInAs = "priya" }: RenderOptions = {}) {
  if (signedInAs) {
    window.localStorage.setItem(SESSION_KEY, signedInAs);
  }
  const router = createTestRouter(path);
  return render(
    <AppProviders client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}
