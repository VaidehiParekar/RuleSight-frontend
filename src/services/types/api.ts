import { z } from "zod";

/**
 * Wire-format schemas for the RuleSight API. These mirror backend Pydantic models
 * (snake_case JSON). Responses are validated at runtime before use.
 */

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    request_id: z.string().nullable().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const readinessResponseSchema = z.object({
  status: z.enum(["ready", "unavailable"]),
  database: z.enum(["ok", "unavailable"]),
});
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;

/** FastAPI's default error body: `{"detail": "..."}`, or a list of validation issues. */
export const detailErrorResponseSchema = z.object({
  detail: z.union([z.string(), z.array(z.object({ msg: z.string() })).min(1)]),
});
export type DetailErrorResponse = z.infer<typeof detailErrorResponseSchema>;

/** The signed-in user (`GET /auth/me`). Role is kept as a string so new roles do not break the UI. */
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string(),
  role: z.string(),
  initials: z.string(),
  is_active: z.boolean(),
  created_at: z.string().nullable(),
  last_login_at: z.string().nullable(),
  permissions: z.array(z.string()),
});
export type UserResponse = z.infer<typeof userResponseSchema>;

/** `POST /auth/login` response. */
export const loginResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  user: userResponseSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;
