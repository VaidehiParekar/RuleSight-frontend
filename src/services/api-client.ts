import type { z } from "zod";

import { env } from "@/lib/env";
import { errorResponseSchema } from "@/services/types/api";
import type { Actor } from "@/types/domain";

const DEFAULT_TIMEOUT_MS = 10_000;

export type ApiErrorCode =
  "network_error" | "timeout" | "invalid_response" | "http_error" | "request_aborted";

/**
 * Error thrown for every failed API call. The message is safe to display; it
 * never contains request bodies, headers or configuration values.
 */
export class ApiError extends Error {
  readonly status: number;
  /** One of ApiErrorCode for client-side failures, or the backend error code. */
  readonly code: string;
  readonly requestId: string | undefined;

  constructor(options: {
    status: number;
    code: string;
    message: string;
    requestId?: string | undefined;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
  }

  /** True for 4xx responses, which are not worth retrying. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export interface RequestOptions {
  /** Cancels the request when the caller (for example TanStack Query) aborts. */
  signal?: AbortSignal | undefined;
  timeoutMs?: number;
}

function buildUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("API paths must start with '/'");
  }
  return `${env.VITE_API_BASE_URL.replace(/\/$/, "")}${path}`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function errorFromResponse(status: number, body: unknown): ApiError {
  const parsed = errorResponseSchema.safeParse(body);
  if (parsed.success) {
    return new ApiError({
      status,
      code: parsed.data.error.code,
      message: parsed.data.error.message,
      requestId: parsed.data.error.request_id ?? undefined,
    });
  }
  return new ApiError({
    status,
    code: "http_error",
    message: `The request failed with status ${String(status)}.`,
  });
}

/**
 * GET a JSON resource and validate the response against `schema`.
 * Throws {@link ApiError} for every failure mode so callers handle one type.
 */
export async function apiGet<S extends z.ZodType>(
  path: string,
  schema: S,
  options: RequestOptions = {},
): Promise<z.output<S>> {
  // Validate the path before the request, so a programming error is not reported as a network error.
  const url = buildUrl(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("timeout", "TimeoutError"));
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const forwardAbort = (): void => {
    controller.abort(options.signal?.reason);
  };
  options.signal?.addEventListener("abort", forwardAbort);

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
      });
    } catch (error: unknown) {
      if (options.signal?.aborted) {
        throw new ApiError({
          status: 0,
          code: "request_aborted",
          message: "The request was cancelled.",
        });
      }
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new ApiError({
          status: 0,
          code: "timeout",
          message: "The RuleSight API did not respond in time.",
        });
      }
      throw new ApiError({
        status: 0,
        code: "network_error",
        message: "Could not reach the RuleSight API.",
      });
    }

    const body = await readJson(response);
    if (!response.ok) {
      throw errorFromResponse(response.status, body);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError({
        status: response.status,
        code: "invalid_response",
        message: "The RuleSight API returned an unexpected response.",
      });
    }
    return parsed.data;
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}

/**
 * Generic typed HTTP request that surfaces {@link ApiError}.
 * Automatically attaches X-Actor header when actor is provided.
 */
export async function apiFetchJson<T>(
  path: string,
  options: RequestOptions & {
    method?: string;
    body?: unknown;
    actor?: Actor | string;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const url = buildUrl(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("timeout", "TimeoutError"));
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const forwardAbort = (): void => {
    controller.abort(options.signal?.reason);
  };
  options.signal?.addEventListener("abort", forwardAbort);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers,
    };

    if (options.actor) {
      headers["X-Actor"] = typeof options.actor === "string" ? options.actor : options.actor.id;
    }

    let requestBody: string | undefined = undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: requestBody,
        credentials: "same-origin",
        signal: controller.signal,
      });
    } catch (error: unknown) {
      if (options.signal?.aborted) {
        throw new ApiError({
          status: 0,
          code: "request_aborted",
          message: "The request was cancelled.",
        });
      }
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new ApiError({
          status: 0,
          code: "timeout",
          message: "The RuleSight API did not respond in time.",
        });
      }
      throw new ApiError({
        status: 0,
        code: "network_error",
        message: "Could not reach the RuleSight API.",
      });
    }

    const body = await readJson(response);
    if (!response.ok) {
      throw errorFromResponse(response.status, body);
    }

    return body as T;
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}

/** POST request sending JSON */
export function apiPost<T>(
  path: string,
  body?: unknown,
  actor?: Actor | string,
  options?: RequestOptions,
): Promise<T> {
  return apiFetchJson<T>(path, { method: "POST", body, actor, ...options });
}

/** PATCH request sending JSON */
export function apiPatch<T>(
  path: string,
  body?: unknown,
  actor?: Actor | string,
  options?: RequestOptions,
): Promise<T> {
  return apiFetchJson<T>(path, { method: "PATCH", body, actor, ...options });
}

/** Multipart FormData upload */
export async function apiUploadForm<T>(
  path: string,
  formData: FormData,
  actor?: Actor | string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("timeout", "TimeoutError"));
  }, options.timeoutMs ?? 30_000);
  const forwardAbort = (): void => {
    controller.abort(options.signal?.reason);
  };
  options.signal?.addEventListener("abort", forwardAbort);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (actor) {
      headers["X-Actor"] = typeof actor === "string" ? actor : actor.id;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
        credentials: "same-origin",
        signal: controller.signal,
      });
    } catch (error: unknown) {
      if (options.signal?.aborted) {
        throw new ApiError({
          status: 0,
          code: "request_aborted",
          message: "The request was cancelled.",
        });
      }
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new ApiError({
          status: 0,
          code: "timeout",
          message: "The RuleSight API did not respond in time.",
        });
      }
      throw new ApiError({
        status: 0,
        code: "network_error",
        message: "Could not reach the RuleSight API.",
      });
    }

    const body = await readJson(response);
    if (!response.ok) {
      throw errorFromResponse(response.status, body);
    }

    return body as T;
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}
