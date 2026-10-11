import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { clearAuthSession } from "@/services/auth-session";

// Vitest runs without globals, so RTL's automatic cleanup is not registered.
afterEach(() => {
  cleanup();
  // Removes the fake API's fetch stub (src/test/fake-api.ts) and any other spies.
  vi.restoreAllMocks();
  clearAuthSession();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});
