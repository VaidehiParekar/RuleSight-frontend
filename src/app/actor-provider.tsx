import { useMemo, useState, type ReactNode } from "react";

import { ActorContext, type ActorContextValue } from "@/app/actor-context";
import { readStorage, writeStorage } from "@/lib/storage";
import { ACTORS } from "@/mocks/fixtures";
import type { Actor } from "@/types/domain";

const STORAGE_KEY = "rulesight-actor";

function initialActorId(): Actor["id"] {
  const saved = readStorage(STORAGE_KEY);
  return saved === "rahul" ? "rahul" : "priya";
}

/** Auth is out of scope for the prototype; the header dropdown chooses who is acting. */
export function ActorProvider({ children }: { children: ReactNode }) {
  const [actorId, setActorIdState] = useState<Actor["id"]>(initialActorId);

  const value = useMemo<ActorContextValue>(() => {
    const actor = ACTORS.find((candidate) => candidate.id === actorId) ?? ACTORS[0];
    if (!actor) {
      throw new Error("No actors are configured.");
    }
    return {
      actor,
      actors: ACTORS,
      setActorId: (id) => {
        setActorIdState(id);
        writeStorage(STORAGE_KEY, id);
      },
    };
  }, [actorId]);

  return <ActorContext.Provider value={value}>{children}</ActorContext.Provider>;
}
