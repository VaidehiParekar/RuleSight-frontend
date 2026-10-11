import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { RouterProvider } from "react-router";

import { AppProviders } from "@/app/providers";
import { createTestRouter } from "@/app/router";
import { setAuthSession } from "@/services/auth-session";
import {
  installFakeApi,
  TEST_USERS,
  tokenFor,
  type FakeApi,
  type FakeDb,
  type TestUserKey,
} from "@/test/fake-api";

/** Query client with retries disabled so failure states render immediately in tests. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

interface RenderOptions {
  /**
   * Test account to start signed in as (see TEST_USERS in fake-api.ts): "officer"
   * (Compliance Officer, default), "analyst", "auditor" or "admin". Pass null to start
   * signed out (the sign-in page).
   */
  signedInAs?: TestUserKey | null;
  /**
   * Start with only the saved token, as after a page reload, so the app validates it with
   * /auth/me before rendering. By default the user is already known, as after sign-in.
   */
  restoreFromToken?: boolean;
  /** Data the fake API serves. Defaults to createFakeDb(). */
  db?: FakeDb;
}

/**
 * Renders the full application tree at a given path, using an in-memory router and the
 * fake API (global fetch is stubbed). Returns the render result and the fake API.
 */
export function renderAppAt(
  path: string,
  { signedInAs = "officer", restoreFromToken = false, db }: RenderOptions = {},
) {
  const api: FakeApi = installFakeApi(db ? { db } : {});
  if (signedInAs) {
    // The real session helper stores the token in sessionStorage, as sign-in does.
    setAuthSession({
      token: tokenFor(signedInAs),
      user: restoreFromToken ? null : structuredClone(TEST_USERS[signedInAs]),
    });
  }
  const router = createTestRouter(path);
  const view = render(
    <AppProviders client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...view, api };
}
