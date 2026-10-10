import { Outlet } from "react-router";

import { PrimaryNav } from "@/components/layout/primary-nav";
import { StatusBadge } from "@/components/data-display/status-badge";

/** Application shell: skip link, header with navigation, and the routed content area. */
export function AppLayout() {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to main content
      </a>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-primary">RuleSight</span>
            <StatusBadge tone="warning" label="Scaffold" />
          </div>
          <PrimaryNav />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
