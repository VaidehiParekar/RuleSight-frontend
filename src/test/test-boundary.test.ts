import { describe, expect, it } from "vitest";

/** Source of every app module (tests and src/test excluded), keyed by path. */
const appSources = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>(["/src/**/*.{ts,tsx}", "!/src/test/**", "!/src/**/*.test.{ts,tsx}"], {
      query: "?raw",
      import: "default",
      eager: true,
    }),
  ),
);

describe("test boundary", () => {
  it("finds the app modules", () => {
    expect(Object.keys(appSources)).toContain("/src/services/rulesight-api.ts");
  });

  it("keeps test data and the fake API out of app code", () => {
    const offenders = Object.entries(appSources)
      .filter(([, source]) => /from\s+["'](@\/test|[./]+\/test)\b/.test(source))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("has no mock-data mode in app code", () => {
    const offenders = Object.entries(appSources)
      .filter(([, source]) => /mocks\/|VITE_USE_MOCKS|mockDataEnabled/.test(source))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
