import { readSessionStorage, writeSessionStorage } from "@/lib/storage";
import type { UserResponse } from "@/services/types/api";

/** sessionStorage key for the bearer token. sessionStorage, so it ends with the tab. */
export const TOKEN_KEY = "rulesight-token";

/**
 * The current sign-in, outside React so the API client can attach the token to every
 * request. AuthProvider is the only writer; components read it through useAuth().
 */
let token: string | null = readSessionStorage(TOKEN_KEY);
let user: UserResponse | null = null;
const unauthorizedListeners = new Set<() => void>();

export function getAuthToken(): string | null {
  return token;
}

/** The validated user for the current token, or null before /auth/me has answered. */
export function getSessionUser(): UserResponse | null {
  return user;
}

export function setAuthSession(next: { token: string; user: UserResponse | null }): void {
  token = next.token;
  user = next.user;
  writeSessionStorage(TOKEN_KEY, next.token);
}

export function setSessionUser(next: UserResponse): void {
  user = next;
}

export function clearAuthSession(): void {
  token = null;
  user = null;
  writeSessionStorage(TOKEN_KEY, null);
}

/** Subscribes to "the API rejected our token". Returns an unsubscribe function. */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

/** Called by the API client on a 401 for an authenticated request: the session is over. */
export function handleUnauthorized(): void {
  clearAuthSession();
  for (const listener of unauthorizedListeners) {
    listener();
  }
}
