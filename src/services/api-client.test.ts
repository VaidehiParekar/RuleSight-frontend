import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiError, apiFetchJson, apiGet, apiPatch, apiUploadForm } from "@/services/api-client";
import { getAuthToken, onUnauthorized, setAuthSession } from "@/services/auth-session";

const okSchema = z.object({ status: z.literal("ready") });

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("apiGet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed data for a successful, schema-valid response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ status: "ready" }));

    await expect(apiGet("/health/ready", okSchema)).resolves.toEqual({ status: "ready" });
  });

  it("surfaces the backend error code, message and request ID", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        { error: { code: "not_found", message: "Missing.", request_id: "req-123" } },
        { status: 404 },
      ),
    );

    const error = await apiGet("/missing", okSchema).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: "not_found",
      message: "Missing.",
      requestId: "req-123",
      isClientError: true,
    });
  });

  it("falls back to a generic error when the error body is not in the API format", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>gateway</html>", { status: 502 }),
    );

    await expect(apiGet("/health/ready", okSchema)).rejects.toMatchObject({
      status: 502,
      code: "http_error",
    });
  });

  it("rejects responses that do not match the expected schema", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ status: "unknown" }));

    await expect(apiGet("/health/ready", okSchema)).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("maps network failures to a network_error ApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiGet("/health/ready", okSchema)).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    });
  });

  it("rejects paths that do not start with a slash", async () => {
    await expect(apiGet("health/ready", okSchema)).rejects.toThrow("must start with '/'");
  });

  it("passes the caller's abort signal through to fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    });
    const controller = new AbortController();

    const pending = apiGet("/health/ready", okSchema, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: "request_aborted" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

function sentHeaders(spy: { mock: { calls: unknown[][] } }): Headers {
  const init = spy.mock.calls[0]?.[1] as RequestInit | undefined;
  return new Headers(init?.headers);
}

describe("error bodies", () => {
  it("reads FastAPI's plain detail message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        { detail: "Invalid email or password." },
        { status: 401, headers: { "X-Request-ID": "req-9" } },
      ),
    );

    await expect(apiFetchJson("/auth/login", { auth: false })).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
      message: "Invalid email or password.",
      requestId: "req-9",
    });
  });

  it("joins validation detail messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        { detail: [{ msg: "Field required.", loc: ["body", "email"] }] },
        { status: 422 },
      ),
    );

    await expect(apiFetchJson("/auth/login")).rejects.toMatchObject({
      code: "validation_error",
      message: "Field required.",
    });
  });
});

describe("authentication", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the bearer token on JSON requests and never sends X-Actor", async () => {
    setAuthSession({ token: "tok-123", user: null });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ id: "g-1" }));

    await apiPatch("/gaps/g-1", { status: "confirmed" });

    const headers = sentHeaders(spy);
    expect(headers.get("Authorization")).toBe("Bearer tok-123");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.has("X-Actor")).toBe(false);
  });

  it("sends the bearer token on multipart uploads without forcing a Content-Type", async () => {
    setAuthSession({ token: "tok-456", user: null });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ id: "doc-1" }));

    await apiUploadForm("/documents", new FormData());

    const headers = sentHeaders(spy);
    expect(headers.get("Authorization")).toBe("Bearer tok-456");
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("sends the bearer token on validated GETs", async () => {
    setAuthSession({ token: "tok-789", user: null });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ status: "ready" }));

    await apiGet("/health/ready", okSchema);

    expect(sentHeaders(spy).get("Authorization")).toBe("Bearer tok-789");
  });

  it("omits the token when auth is false", async () => {
    setAuthSession({ token: "tok-123", user: null });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}));

    await apiFetchJson("/auth/login", { method: "POST", body: {}, auth: false });

    expect(sentHeaders(spy).has("Authorization")).toBe(false);
  });

  it("clears the session and notifies listeners on a 401 for an authenticated request", async () => {
    setAuthSession({ token: "tok-123", user: null });
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ detail: "Not authenticated" }, { status: 401 }),
    );

    await expect(apiFetchJson("/gaps")).rejects.toMatchObject({ status: 401 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getAuthToken()).toBeNull();
    unsubscribe();
  });

  it("keeps the session on a 403, which only means a missing permission", async () => {
    setAuthSession({ token: "tok-123", user: null });
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ detail: "Permission denied" }, { status: 403 }),
    );

    await expect(apiPatch("/gaps/g-1", {})).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
    });

    expect(listener).not.toHaveBeenCalled();
    expect(getAuthToken()).toBe("tok-123");
    unsubscribe();
  });
});
