import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { useAuth } from "@/app/auth-context";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";

/** Sends anyone who has not signed in to /login, and brings them back afterwards. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status, errorMessage, retry } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <main className="session-check" id="main-content">
        <LoadingState message="Checking your session…" rows={3} />
      </main>
    );
  }
  if (status === "error") {
    return (
      <main className="session-check" id="main-content">
        <ErrorState
          title="Could not check your session"
          message={errorMessage ?? "The RuleSight API is unavailable."}
          onRetry={retry}
        />
      </main>
    );
  }
  if (status !== "signed_in") {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }
  return children;
}
