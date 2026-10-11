import { createContext, useContext } from "react";

import type { UserResponse } from "@/services/types/api";
import type { Actor } from "@/types/domain";

/**
 * "checking": a saved token is being validated with /auth/me.
 * "error": the token could not be validated because the API was unreachable.
 */
export type AuthStatus = "checking" | "signed_in" | "signed_out" | "error";

/** Why the user was last signed out, so the sign-in page can explain it. */
export type SignOutReason = "expired" | null;

export interface AuthContextValue {
  status: AuthStatus;
  /** The signed-in user, or null when signed out or still checking. */
  user: UserResponse | null;
  /** The user as the UI shows them (name, role label, initials). */
  actor: Actor | null;
  signOutReason: SignOutReason;
  /** Display-safe message when status is "error". */
  errorMessage: string | null;
  /** Signs in with the backend. Rejects with an ApiError on bad credentials. */
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  /** Retries validating the saved token after an "error" status. */
  retry: () => void;
  /** True when the signed-in user holds the permission (e.g. "gaps:signoff"). */
  can: (permission: string) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return value;
}

/**
 * The signed-in user, for components rendered behind <RequireSession>. Throws if
 * nobody is signed in, which would be a routing bug.
 */
export function useSession(): { user: UserResponse; actor: Actor; can: (p: string) => boolean } {
  const { user, actor, can } = useAuth();
  if (!user || !actor) {
    throw new Error("useSession must be used behind <RequireSession>.");
  }
  return { user, actor, can };
}
