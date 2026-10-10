import { createMemoryRouter, createBrowserRouter, type RouteObject } from "react-router";

import { AppLayout } from "@/components/layout/app-layout";
import { PlannedFeaturePage } from "@/components/layout/planned-feature-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { NAV_ITEMS } from "@/lib/navigation";

/**
 * Route table. Only the dashboard is a scaffold screen; every other nav item renders
 * a clearly labelled placeholder until its feature is built.
 */
export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      ...NAV_ITEMS.filter((item) => item.path !== "/").map((item) => ({
        path: item.path.slice(1),
        element: <PlannedFeaturePage title={item.label} />,
      })),
      { path: "*", element: <PlannedFeaturePage title="Page not found" /> },
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
