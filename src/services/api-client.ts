import type { z } from "zod";

import { env } from "@/lib/env";
import { getAuthToken, handleUnauthorized } from "@/services/auth-session";
import { detailErrorResponseSchema, errorResponseSchema } from "@/services/types/api";

const DEFAULT_TIMEOUT_MS = 10_000;
const UPLOAD_TIMEOUT_MS = 30_000;

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
  /**
   * Send the signed-in user's bearer token (default true). A 401 on an authenticated
   * request ends the session. Sign-in itself passes false.
   */
  auth?: boolean;
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

/** Error code used when the backend replies with FastAPI's plain `{"detail": ...}` body. */
function codeForStatus(status: number): string {
  switch (status) {
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 422:
      return "validation_error";
    default:
      return "http_error";
  }
}

function errorFromResponse(response: Response, body: unknown): ApiError {
  const { status } = response;
  const headerRequestId = response.headers.get("X-Request-ID") ?? undefined;
  const parsed = errorResponseSchema.safeParse(body);
  if (parsed.success) {
    return new ApiError({
      status,
      code: parsed.data.error.code,
      message: parsed.data.error.message,
      requestId: parsed.data.error.request_id ?? headerRequestId,
    });
  }
  const detail = detailErrorResponseSchema.safeParse(body);
  if (detail.success) {
    const value = detail.data.detail;
    return new ApiError({
      status,
      code: codeForStatus(status),
      message: typeof value === "string" ? value : value.map((issue) => issue.msg).join(" "),
      requestId: headerRequestId,
    });
  }
  return new ApiError({
    status,
    code: "http_error",
    message: `The request failed with status ${String(status)}.`,
    requestId: headerRequestId,
  });
}

interface SendOptions extends RequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: BodyInit | undefined;
  defaultTimeoutMs: number;
}

/**
 * Shared request path: timeout, caller abort, bearer token, error mapping and 401 handling.
 * Returns the status and parsed JSON body of a successful response.
 */
async function send(
  path: string,
  options: SendOptions,
): Promise<{ status: number; body: unknown }> {
  // Validate the path before the request, so a programming error is not reported as a network error.
  const url = buildUrl(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("timeout", "TimeoutError"));
  }, options.timeoutMs ?? options.defaultTimeoutMs);
  const forwardAbort = (): void => {
    controller.abort(options.signal?.reason);
  };
  options.signal?.addEventListener("abort", forwardAbort);

  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
  const token = options.auth === false ? null : getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ?? null,
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
      // Only a token we sent can expire. Without one, a 401 is an ordinary failure
      // (for example a wrong password) and is left to the caller.
      if (response.status === 401 && token) {
        handleUnauthorized();
      }
      throw errorFromResponse(response, body);
    }
    return { status: response.status, body };
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
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
  const { status, body } = await send(path, {
    ...options,
    method: "GET",
    headers: {},
    defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError({
      status,
      code: "invalid_response",
      message: "The RuleSight API returned an unexpected response.",
    });
  }
  return parsed.data;
}

/** Generic JSON request that surfaces {@link ApiError}. The body is sent as JSON when given. */
export async function apiFetchJson<T>(
  path: string,
  options: RequestOptions & {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, ...rest } = options;
  const hasBody = body !== undefined;
  const { body: responseBody } = await send(path, {
    ...rest,
    method,
    headers: hasBody ? { ...headers, "Content-Type": "application/json" } : headers,
    body: hasBody ? JSON.stringify(body) : undefined,
    defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
  });
  return responseBody as T;
}

/** POST request sending JSON */
export function apiPost<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return apiFetchJson<T>(path, { method: "POST", body, ...options });
}

/** PATCH request sending JSON */
export function apiPatch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return apiFetchJson<T>(path, { method: "PATCH", body, ...options });
}

/** Multipart FormData upload. The browser sets the multipart Content-Type and boundary. */
export async function apiUploadForm<T>(
  path: string,
  formData: FormData,
  options: RequestOptions = {},
): Promise<T> {
  const { body } = await send(path, {
    ...options,
    method: "POST",
    headers: {},
    body: formData,
    defaultTimeoutMs: UPLOAD_TIMEOUT_MS,
  });
  return body as T;
}
