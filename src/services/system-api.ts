import { apiGet, type RequestOptions } from "@/services/api-client";
import { readinessResponseSchema, type ReadinessResponse } from "@/services/types/api";

/** Calls the backend readiness probe (`GET /api/v1/health/ready`). */
export function getReadiness(options: RequestOptions = {}): Promise<ReadinessResponse> {
  return apiGet("/health/ready", readinessResponseSchema, options);
}
