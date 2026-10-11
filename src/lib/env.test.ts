import { describe, expect, it } from "vitest";

import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("defaults the API base URL to the versioned relative path and enables mocks", () => {
    expect(parseEnv({})).toEqual({ VITE_API_BASE_URL: "/api/v1", VITE_USE_MOCKS: true });
  });

  it("accepts an absolute http(s) API base URL", () => {
    expect(parseEnv({ VITE_API_BASE_URL: "https://api.example.test/api/v1" })).toEqual({
      VITE_API_BASE_URL: "https://api.example.test/api/v1",
      VITE_USE_MOCKS: true,
    });
  });

  it("turns mock data off only when VITE_USE_MOCKS is 'false'", () => {
    expect(parseEnv({ VITE_USE_MOCKS: "false" }).VITE_USE_MOCKS).toBe(false);
    expect(() => parseEnv({ VITE_USE_MOCKS: "yes" })).toThrow(/VITE_USE_MOCKS/);
  });

  it("rejects values that are neither a relative path nor an http(s) URL", () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: "api.example.test" })).toThrow(
      /VITE_API_BASE_URL: must be a relative path/,
    );
  });

  it("does not echo the rejected value in the error message", () => {
    const secretLookingValue = "ftp://user:not-a-real-password@host";
    let message = "";
    try {
      parseEnv({ VITE_API_BASE_URL: secretLookingValue });
    } catch (error: unknown) {
      message = error instanceof Error ? error.message : "";
    }
    expect(message).toContain("VITE_API_BASE_URL");
    expect(message).not.toContain("not-a-real-password");
  });
});
