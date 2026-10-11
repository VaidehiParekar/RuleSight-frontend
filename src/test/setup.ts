import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { resetMockDb } from "@/mocks/mock-db";
import { clearAuthSession } from "@/services/auth-session";

// Vitest runs without globals, so RTL's automatic cleanup is not registered.
afterEach(() => {
  cleanup();
  resetMockDb();
  clearAuthSession();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});
