import { ApiError } from "@/services/api-client";

/** Turns an unknown query or mutation error into display-safe text. */
export function describeError(error: unknown): { message: string; requestId: string | undefined } {
  if (error instanceof ApiError) {
    return { message: error.message, requestId: error.requestId };
  }
  if (error instanceof Error) {
    return { message: error.message, requestId: undefined };
  }
  return { message: "An unexpected error occurred.", requestId: undefined };
}
