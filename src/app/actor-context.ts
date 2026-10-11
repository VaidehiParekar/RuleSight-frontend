import { createContext, useContext } from "react";

import type { Actor } from "@/types/domain";

export interface ActorContextValue {
  actor: Actor;
  actors: readonly Actor[];
  setActorId: (id: Actor["id"]) => void;
}

export const ActorContext = createContext<ActorContextValue | null>(null);

/** The person the UI is acting as. Sent as X-Actor and recorded in the audit log. */
export function useActor(): ActorContextValue {
  const value = useContext(ActorContext);
  if (!value) {
    throw new Error("useActor must be used inside <ActorProvider>.");
  }
  return value;
}
