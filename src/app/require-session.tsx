import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { useActor } from "@/app/actor-context";

/** Sends anyone who has not signed in to /login, and brings them back afterwards. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { signedIn } = useActor();
  const location = useLocation();
  if (!signedIn) {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }
  return children;
}
