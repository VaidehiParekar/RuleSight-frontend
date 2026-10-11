import { createContext, useContext } from "react";

import type { Actor } from "@/types/domain";

export interface ActorContextValue {
  actor: Actor;
  actors: readonly Actor[];
  setActorId: (id: Actor["id"]) => void;
  /** True once the user has chosen who they are on the sign-in page. */
  signedIn: boolean;
  signIn: (id: Actor["id"]) => void;
  signOut: () => void;
}

/** localStorage key that marks a signed-in session. Holds the actor id. */
export const SESSION_KEY = "rulesight-session";

export const ActorContext = createContext<ActorContextValue | null>(null);

/** The person the UI is acting as. Sent as X-Actor and recorded in the audit log. */
export function useActor(): ActorContextValue {
  const value = useContext(ActorContext);
  if (!value) {
    throw new Error("useActor must be used inside <ActorProvider>.");
  }
  return value;
}
