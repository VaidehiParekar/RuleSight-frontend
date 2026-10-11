import { mockDataEnabled } from "@/lib/env";
import { MOCK_USERS } from "@/mocks/fixtures";
import { ApiError, apiFetchJson, apiGet } from "@/services/api-client";
import { getAuthToken } from "@/services/auth-session";
import {
  loginResponseSchema,
  userResponseSchema,
  type LoginResponse,
  type UserResponse,
} from "@/services/types/api";

/** Mock-mode tokens name the demo user, so a reload can restore the session offline. */
const MOCK_TOKEN_PREFIX = "mock-session:";
const MOCK_LATENCY_MS = import.meta.env.MODE === "test" ? 0 : 320;

const INVALID_CREDENTIALS = "Invalid email or password.";

async function mockDelay(): Promise<void> {
  if (MOCK_LATENCY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  }
}

function mockLogin(email: string, password: string): LoginResponse {
  const needle = email.trim().toLowerCase();
  const user = MOCK_USERS.find((candidate) => candidate.email.toLowerCase() === needle);
  if (!user || password.length === 0) {
    throw new ApiError({ status: 401, code: "unauthorized", message: INVALID_CREDENTIALS });
  }
  if (!user.is_active) {
    throw new ApiError({ status: 403, code: "forbidden", message: "This account is deactivated." });
  }
  return {
    access_token: `${MOCK_TOKEN_PREFIX}${user.id}`,
    token_type: "bearer",
    user: structuredClone({ ...user, last_login_at: new Date().toISOString() }),
  };
}

function mockMe(): UserResponse {
  const token = getAuthToken() ?? "";
  const id = token.startsWith(MOCK_TOKEN_PREFIX) ? token.slice(MOCK_TOKEN_PREFIX.length) : "";
  const user = MOCK_USERS.find((candidate) => candidate.id === id);
  if (!user) {
    throw new ApiError({ status: 401, code: "unauthorized", message: "Your session has ended." });
  }
  return structuredClone(user);
}

/** The mock-mode token for a demo user. Used by tests to start signed in. */
export function mockTokenFor(userId: string): string {
  return `${MOCK_TOKEN_PREFIX}${userId}`;
}

/** POST /auth/login. A wrong email or password rejects with a 401 {@link ApiError}. */
export async function login(email: string, password: string): Promise<LoginResponse> {
  if (mockDataEnabled) {
    await mockDelay();
    return mockLogin(email, password);
  }
  const body = await apiFetchJson<unknown>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  const parsed = loginResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError({
      status: 200,
      code: "invalid_response",
      message: "The RuleSight API returned an unexpected response.",
    });
  }
  return parsed.data;
}

/** GET /auth/me for the current token. */
export async function getCurrentUser(
  options: { signal?: AbortSignal } = {},
): Promise<UserResponse> {
  if (mockDataEnabled) {
    await mockDelay();
    return mockMe();
  }
  return apiGet("/auth/me", userResponseSchema, options);
}
