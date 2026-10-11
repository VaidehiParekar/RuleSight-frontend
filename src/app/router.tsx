import { createBrowserRouter, createMemoryRouter, type RouteObject } from "react-router";

import { RequireSession } from "@/app/require-session";
import { AppLayout } from "@/components/layout/app-layout";
import { AuditPage } from "@/features/audit/audit-page";
import { LoginPage } from "@/features/auth/login-page";
import { ChangesPage } from "@/features/changes/changes-page";
import { ControlsPage } from "@/features/controls/controls-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { DocumentsPage } from "@/features/documents/documents-page";
import { GapTracePage } from "@/features/gaps/gap-trace-page";
import { GapsPage } from "@/features/gaps/gaps-page";
import { GraphPage } from "@/features/graph/graph-page";
import { NotFoundPage } from "@/features/not-found/not-found-page";
import { ObligationsPage } from "@/features/obligations/obligations-page";
import { RemediationPage } from "@/features/remediation/remediation-page";
import { RunDetailPage } from "@/features/runs/run-detail-page";
import { RunsPage } from "@/features/runs/runs-page";

/** Route table. Paths match NAV_GROUPS in lib/navigation.ts. Everything except /login
 * needs a session. */
export const appRoutes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireSession>
        <AppLayout />
      </RequireSession>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "documents", element: <DocumentsPage /> },
      { path: "changes", element: <ChangesPage /> },
      { path: "obligations", element: <ObligationsPage /> },
      { path: "controls", element: <ControlsPage /> },
      { path: "gaps", element: <GapsPage /> },
      { path: "gaps/:gapId", element: <GapTracePage /> },
      { path: "remediation", element: <RemediationPage /> },
      { path: "graph", element: <GraphPage /> },
      { path: "runs", element: <RunsPage /> },
      { path: "runs/:runId", element: <RunDetailPage /> },
      { path: "audit", element: <AuditPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

/** In-memory router for tests, so they never touch the real browser history. */
export function createTestRouter(initialPath: string) {
  return createMemoryRouter(appRoutes, { initialEntries: [initialPath] });
}
