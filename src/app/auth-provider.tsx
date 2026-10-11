import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type SignOutReason,
} from "@/app/auth-context";
import { describeError } from "@/lib/errors";
import { hasPermission, toActor } from "@/lib/roles";
import { ApiError } from "@/services/api-client";
import { getCurrentUser, login } from "@/services/auth-api";
import {
  clearAuthSession,
  getAuthToken,
  getSessionUser,
  onUnauthorized,
  setAuthSession,
  setSessionUser,
} from "@/services/auth-session";
import type { UserResponse } from "@/services/types/api";

interface AuthState {
  status: AuthStatus;
  user: UserResponse | null;
  signOutReason: SignOutReason;
  errorMessage: string | null;
}

/**
 * A token from sessionStorage (a reload) is checked with /auth/me before the app renders.
 * A user already in memory for the current token (set by sign-in) is trusted as is.
 */
function initialState(): AuthState {
  const token = getAuthToken();
  const user = token ? getSessionUser() : null;
  return {
    status: user ? "signed_in" : token ? "checking" : "signed_out",
    user,
    signOutReason: null,
    errorMessage: null,
  };
}

const EXPIRED: AuthState = {
  status: "signed_out",
  user: null,
  signOutReason: "expired",
  errorMessage: null,
};

/**
 * Holds the signed-in user and their bearer token (kept in sessionStorage by
 * services/auth-session). A saved token is checked with /auth/me on load, and any 401
 * from the API ends the session; <RequireSession> then sends the user to /login.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(initialState);

  // Validate a token saved from an earlier visit in this tab.
  useEffect(() => {
    if (state.status !== "checking") return;
    const controller = new AbortController();
    getCurrentUser({ signal: controller.signal }).then(
      (user) => {
        if (controller.signal.aborted) return;
        setSessionUser(user);
        setState({ status: "signed_in", user, signOutReason: null, errorMessage: null });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearAuthSession();
          setState(EXPIRED);
          return;
        }
        setState({
          status: "error",
          user: null,
          signOutReason: null,
          errorMessage: describeError(error).message,
        });
      },
    );
    return () => {
      controller.abort();
    };
  }, [state.status]);

  // Any 401 from the API means the token expired or was revoked.
  useEffect(
    () =>
      onUnauthorized(() => {
        queryClient.clear();
        setState(EXPIRED);
      }),
    [queryClient],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await login(email, password);
      queryClient.clear();
      setAuthSession({ token: response.access_token, user: response.user });
      setState({
        status: "signed_in",
        user: response.user,
        signOutReason: null,
        errorMessage: null,
      });
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    clearAuthSession();
    queryClient.clear();
    setState({ status: "signed_out", user: null, signOutReason: null, errorMessage: null });
  }, [queryClient]);

  const retry = useCallback(() => {
    setState((current) =>
      current.status === "error" ? { ...current, status: "checking", errorMessage: null } : current,
    );
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const { user } = state;
    return {
      status: state.status,
      user,
      actor: user ? toActor(user) : null,
      signOutReason: state.signOutReason,
      errorMessage: state.errorMessage,
      signIn,
      signOut,
      retry,
      can: (permission) => (user ? hasPermission(user, permission) : false),
    };
  }, [state, signIn, signOut, retry]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
