import { useMemo, useState, type ReactNode } from "react";

import { ActorContext, SESSION_KEY, type ActorContextValue } from "@/app/actor-context";
import { readStorage, writeStorage } from "@/lib/storage";
import { ACTORS } from "@/mocks/fixtures";
import type { Actor } from "@/types/domain";

const ACTOR_KEY = "rulesight-actor";

function isActorId(value: string | null): value is Actor["id"] {
  return ACTORS.some((candidate) => candidate.id === value);
}

function initialActorId(): Actor["id"] {
  const session = readStorage(SESSION_KEY);
  if (isActorId(session)) return session;
  const saved = readStorage(ACTOR_KEY);
  if (isActorId(saved)) return saved;
  const first = ACTORS[0];
  if (!first) throw new Error("No actors are configured.");
  return first.id;
}

/**
 * Who is using the app. Authentication is out of scope for the prototype: the sign-in page
 * records who is acting, and every action is written to the audit log under that name.
 */
export function ActorProvider({ children }: { children: ReactNode }) {
  const [actorId, setActorIdState] = useState<Actor["id"]>(initialActorId);
  const [signedIn, setSignedIn] = useState<boolean>(() => isActorId(readStorage(SESSION_KEY)));

  const value = useMemo<ActorContextValue>(() => {
    const actor = ACTORS.find((candidate) => candidate.id === actorId) ?? ACTORS[0];
    if (!actor) {
      throw new Error("No actors are configured.");
    }
    const choose = (id: Actor["id"]) => {
      setActorIdState(id);
      writeStorage(ACTOR_KEY, id);
    };
    return {
      actor,
      actors: ACTORS,
      setActorId: (id) => {
        choose(id);
        if (signedIn) writeStorage(SESSION_KEY, id);
      },
      signedIn,
      signIn: (id) => {
        choose(id);
        writeStorage(SESSION_KEY, id);
        setSignedIn(true);
      },
      signOut: () => {
        writeStorage(SESSION_KEY, null);
        setSignedIn(false);
      },
    };
  }, [actorId, signedIn]);

  return <ActorContext.Provider value={value}>{children}</ActorContext.Provider>;
}
