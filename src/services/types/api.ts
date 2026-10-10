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
