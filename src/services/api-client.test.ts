import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiError, apiGet } from "@/services/api-client";

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
