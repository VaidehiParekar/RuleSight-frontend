import { ApiError, apiFetchJson, apiGet } from "@/services/api-client";
import {
  loginResponseSchema,
  userResponseSchema,
  type LoginResponse,
  type UserResponse,
} from "@/services/types/api";

/** POST /auth/login. A wrong email or password rejects with a 401 {@link ApiError}. */
export async function login(email: string, password: string): Promise<LoginResponse> {
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
export function getCurrentUser(
  options: { signal?: AbortSignal } = {},
): Promise<UserResponse> {
  return apiGet("/auth/me", userResponseSchema, options);
}
