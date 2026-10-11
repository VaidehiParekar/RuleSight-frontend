import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { RouterProvider } from "react-router";

import { AppProviders } from "@/app/providers";
import { createTestRouter } from "@/app/router";
import { MOCK_USERS } from "@/mocks/fixtures";
import { mockTokenFor } from "@/services/auth-api";
import { setAuthSession } from "@/services/auth-session";

/** Query client with retries disabled so failure states render immediately in tests. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

interface RenderOptions {
  /**
   * Mock user id to start signed in as: "usr-priya" (Compliance Officer, default),
   * "usr-rahul" (Compliance Analyst), "usr-admin" or "usr-auditor". Pass null to start
   * signed out (the sign-in page).
   */
  signedInAs?: string | null;
  /**
   * Start with only the saved token, as after a page reload, so the app validates it with
   * /auth/me before rendering. By default the user is already known, as after sign-in.
   */
  restoreFromToken?: boolean;
}

/** Renders the full application tree at a given path, using an in-memory router. */
export function renderAppAt(
  path: string,
  { signedInAs = "usr-priya", restoreFromToken = false }: RenderOptions = {},
) {
  if (signedInAs) {
    const user = MOCK_USERS.find((candidate) => candidate.id === signedInAs);
    if (!user) {
      throw new Error(`Unknown mock user: ${signedInAs}`);
    }
    setAuthSession({
      token: mockTokenFor(user.id),
      user: restoreFromToken ? null : structuredClone(user),
    });
  }
  const router = createTestRouter(path);
  return render(
    <AppProviders client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}
